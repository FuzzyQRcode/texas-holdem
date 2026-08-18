const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GameController } = require('./src/GameController');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function getRoomPlayerList(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];
  return Array.from(room.players.entries()).map(([socketId, info]) => ({
    id: socketId,
    name: info.name,
    isHost: socketId === room.host,
    connected: info.connected
  }));
}

function broadcastState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;

  for (const [socketId] of room.players) {
    const state = room.game.getPublicState(socketId);
    io.to(socketId).emit('gameState', state);
  }

  io.to(roomCode).emit('playerList', getRoomPlayerList(roomCode));
}

io.on('connection', (socket) => {
  console.log(`[连接] ${socket.id}`);

  socket.on('createRoom', ({ name }) => {
    if (!name || name.trim().length === 0) {
      socket.emit('error', { message: '请输入昵称' });
      return;
    }

    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      players: new Map([[socket.id, { name: name.trim(), connected: true }]]),
      host: socket.id,
      game: null,
      started: false
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode });
    io.to(roomCode).emit('playerList', getRoomPlayerList(roomCode));
    console.log(`[建房] ${socket.id} 创建房间 ${roomCode}`);
  });

  socket.on('joinRoom', ({ roomCode, name }) => {
    if (!name || !roomCode) {
      socket.emit('error', { message: '房间号和昵称不能为空' });
      return;
    }

    const room = rooms.get(roomCode.toUpperCase());
    if (!room) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    if (room.players.size >= 9) {
      socket.emit('error', { message: '房间已满（最多 9 人）' });
      return;
    }

    if (room.started) {
      socket.emit('error', { message: '游戏已开始，无法加入' });
      return;
    }

    room.players.set(socket.id, { name: name.trim(), connected: true });
    socket.join(roomCode.toUpperCase());
    socket.emit('roomJoined', { roomCode: roomCode.toUpperCase() });
    io.to(roomCode.toUpperCase()).emit('playerList', getRoomPlayerList(roomCode.toUpperCase()));
    console.log(`[加入] ${socket.id} 加入房间 ${roomCode}`);
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    if (socket.id !== room.host) {
      socket.emit('error', { message: '只有房主才能开始游戏' });
      return;
    }

    const connectedPlayers = Array.from(room.players.entries())
      .filter(([_, info]) => info.connected)
      .map(([socketId, info]) => ({
        id: socketId,
        name: info.name,
        chips: 1000
      }));

    if (connectedPlayers.length < 2) {
      socket.emit('error', { message: '至少需要 2 名玩家' });
      return;
    }

    room.game = new GameController(connectedPlayers, { smallBlind: 10, bigBlind: 20 });
    room.started = true;
    room.game.startHand();
    broadcastState(room.code);
    console.log(`[开始] 房间 ${roomCode} 游戏开始，${connectedPlayers.length} 人`);
  });

  socket.on('action', ({ roomCode, action, amount }) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room || !room.game) return;

    const result = room.game.handleAction(socket.id, action, amount);
    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    broadcastState(room.code);

    if (room.game.phase === 'handComplete') {
      setTimeout(() => {
        if (room.game && room.game.phase === 'handComplete') {
          room.game.startHand();
          broadcastState(room.code);
        }
      }, 4000);
    }
  });

  socket.on('nextHand', ({ roomCode }) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room || !room.game) return;

    if (socket.id !== room.host) {
      socket.emit('error', { message: '只有房主才能开始下一手' });
      return;
    }

    room.game.startHand();
    broadcastState(room.code);
  });

  socket.on('leaveRoom', ({ roomCode }) => {
    handleDisconnect(socket, roomCode);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
    console.log(`[断开] ${socket.id}`);
  });
});

function handleDisconnect(socket, roomCode) {
  for (const [code, room] of rooms) {
    if (room.players.has(socket.id)) {
      const playerInfo = room.players.get(socket.id);
      room.players.delete(socket.id);

      if (room.game) {
        room.game.removePlayer(socket.id);
        if (room.game.phase !== 'waiting' && room.game.phase !== 'handComplete') {
          const nonFolded = room.game.players.filter(p => !p.folded && p.connected);
          if (nonFolded.length <= 1) {
            room.game.endHandEarly();
          }
        }
        broadcastState(code);
      }

      io.to(code).emit('playerList', getRoomPlayerList(code));
      io.to(code).emit('message', { text: `${playerInfo.name} 离开了房间` });

      if (room.host === socket.id) {
        const remaining = Array.from(room.players.keys());
        if (remaining.length > 0) {
          room.host = remaining[0];
          io.to(code).emit('message', { text: `${room.players.get(room.host).name} 成为新房主` });
        } else {
          rooms.delete(code);
          console.log(`[关闭] 房间 ${code} 已空，自动关闭`);
        }
      }

      if (roomCode) break;
    }
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`德州扑克服务器运行中: http://localhost:${PORT}`);
});

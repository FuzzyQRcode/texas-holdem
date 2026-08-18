const Poker = {
  socket: null,
  roomCode: null,

  init() {
    this.socket = io();
    this.bindEvents();
  },

  bindEvents() {
    this.socket.on('roomCreated', (data) => {
      this.roomCode = data.roomCode;
      UI.showWaitingRoom(data.roomCode);
    });

    this.socket.on('roomJoined', (data) => {
      this.roomCode = data.roomCode;
      UI.showWaitingRoom(data.roomCode);
    });

    this.socket.on('gameState', (state) => {
      UI.renderGame(state);
    });

    this.socket.on('playerList', (players) => {
      UI.renderPlayerList(players);
    });

    this.socket.on('error', (data) => {
      UI.showError(data.message);
    });

    this.socket.on('message', (data) => {
      UI.showGameMessage(data.text);
    });
  },

  createRoom(name) {
    this.socket.emit('createRoom', { name });
  },

  joinRoom(roomCode, name) {
    this.socket.emit('joinRoom', { roomCode, name });
  },

  startGame(roomCode) {
    this.socket.emit('startGame', { roomCode });
  },

  action(action, amount) {
    this.socket.emit('action', { roomCode: this.roomCode, action, amount });
  },

  nextHand() {
    this.socket.emit('nextHand', { roomCode: this.roomCode });
  },

  leaveRoom() {
    this.socket.emit('leaveRoom', { roomCode: this.roomCode });
    this.roomCode = null;
  }
};

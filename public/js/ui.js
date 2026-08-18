const UI = {
  currentState: null,

  init() {
    document.getElementById('createBtn').addEventListener('click', () => {
      const name = document.getElementById('playerName').value.trim();
      if (!name) { this.showError('请输入昵称'); return; }
      Poker.createRoom(name);
    });

    document.getElementById('joinBtn').addEventListener('click', () => {
      const name = document.getElementById('playerName').value.trim();
      const code = document.getElementById('roomCode').value.trim().toUpperCase();
      if (!name) { this.showError('请输入昵称'); return; }
      if (!code) { this.showError('请输入房间号'); return; }
      Poker.joinRoom(code, name);
    });

    document.getElementById('startGameBtn').addEventListener('click', () => {
      Poker.startGame(Poker.roomCode);
    });

    document.getElementById('leaveLobbyBtn').addEventListener('click', () => {
      Poker.leaveRoom();
      this.showScreen('lobby');
    });

    document.getElementById('leaveGameBtn').addEventListener('click', () => {
      Poker.leaveRoom();
      this.showScreen('lobby');
    });

    document.getElementById('foldBtn').addEventListener('click', () => {
      Poker.action('fold');
    });

    document.getElementById('checkCallBtn').addEventListener('click', () => {
      const state = this.currentState;
      if (!state) return;
      const toCall = state.currentBet - this.getMyPlayer(state).bet;
      Poker.action(toCall === 0 ? 'check' : 'call');
    });

    document.getElementById('raiseBtn').addEventListener('click', () => {
      const amount = parseInt(document.getElementById('raiseSlider').value);
      Poker.action('raise', amount);
    });

    document.getElementById('allInBtn').addEventListener('click', () => {
      const me = this.getMyPlayer(this.currentState);
      if (me) Poker.action('raise', me.chips + me.bet);
    });

    document.getElementById('nextHandBtn').addEventListener('click', () => {
      Poker.nextHand();
    });

    const slider = document.getElementById('raiseSlider');
    slider.addEventListener('input', () => {
      document.getElementById('raiseAmount').textContent = slider.value;
    });

    document.getElementById('playerName').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('createBtn').click();
    });
    document.getElementById('roomCode').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('joinBtn').click();
    });
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  showWaitingRoom(roomCode) {
    document.getElementById('displayRoomCode').textContent = roomCode;
    document.getElementById('gameRoomCode').textContent = roomCode;
    this.showScreen('waitingRoom');
  },

  showError(msg) {
    const el = document.getElementById('lobbyMessage');
    if (el && this.isActive('lobby')) {
      el.textContent = msg;
      setTimeout(() => { el.textContent = ''; }, 3000);
    } else {
      this.showGameMessage(msg);
    }
  },

  showGameMessage(msg) {
    const el = document.getElementById('gameMessage');
    if (el) el.textContent = msg;
  },

  isActive(id) {
    return document.getElementById(id).classList.contains('active');
  },

  renderPlayerList(players) {
    const list = document.getElementById('playerList');
    list.innerHTML = '';
    players.forEach(p => {
      const div = document.createElement('div');
      div.className = 'player-list-item';
      div.innerHTML = `<span>${p.name}</span>${p.isHost ? '<span class="host-tag">房主</span>' : ''}`;
      list.appendChild(div);
    });

    const startBtn = document.getElementById('startGameBtn');
    const isHost = players.find(p => p.id === Poker.socket.id)?.isHost;
    startBtn.style.display = isHost ? 'block' : 'none';
  },

  renderGame(state) {
    this.currentState = state;
    this.showScreen('game');

    document.getElementById('phaseInfo').textContent = state.phase;
    document.getElementById('potAmount').textContent = state.pot;
    this.showGameMessage(state.message || '');

    const commEl = document.getElementById('communityCards');
    commEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      if (i < state.communityCards.length) {
        commEl.appendChild(this.createCardEl(state.communityCards[i]));
      } else {
        const ph = document.createElement('div');
        ph.className = 'card placeholder';
        commEl.appendChild(ph);
      }
    }

    const me = state.players.find(p => p.id === Poker.socket.id);
    const opponents = state.players.filter(p => p.id !== Poker.socket.id);
    this.renderOpponents(opponents, state);
    this.renderMyHand(me, state);
    this.renderActionPanel(state, me);

    const nextPanel = document.getElementById('nextHandPanel');
    nextPanel.style.display = 'none';
    if (state.phase === 'handComplete') {
      const isHost = me && state.players.find(p => p.id === Poker.socket.id);
      nextPanel.style.display = 'flex';
    }
  },

  renderOpponents(opponents, state) {
    const area = document.getElementById('opponentsArea');
    area.innerHTML = '';
    opponents.forEach(p => {
      const seat = document.createElement('div');
      seat.className = 'seat';
      if (p.isCurrentPlayer) seat.classList.add('active');
      if (p.folded) seat.classList.add('folded');

      let tags = '';
      if (p.isDealer) tags += '<span class="dealer-tag">D</span> ';
      if (p.folded) tags += '<span class="folded-tag">弃牌</span>';
      if (p.allIn) tags += '<span class="allin-tag">全押</span>';

      const winner = state.winners?.find(w => w.playerId === p.id);
      if (winner) tags += `<span class="winner-tag">获胜 +${winner.amount}</span>`;

      let cardsHTML = '';
      if (p.holeCards && p.holeCards.length > 0) {
        p.holeCards.forEach(c => { cardsHTML += this.cardHTML(c); });
      } else if (!p.folded) {
        cardsHTML = '<div class="card card-back"></div><div class="card card-back"></div>';
      }

      seat.innerHTML = `
        <span class="seat-name">${p.name}</span>
        <div class="seat-cards">${cardsHTML}</div>
        <span class="seat-chips">${p.chips}</span>
        ${p.bet > 0 ? `<span class="seat-bet">下注: ${p.bet}</span>` : ''}
        <div>${tags}</div>
      `;
      area.appendChild(seat);
    });
  },

  renderMyHand(me, state) {
    if (!me) return;
    document.getElementById('myName').textContent = me.name;
    document.getElementById('myChips').textContent = me.chips;
    const betEl = document.getElementById('myBet');
    betEl.textContent = me.bet > 0 ? `· 下注: ${me.bet}` : '';

    const cardsEl = document.getElementById('myCards');
    cardsEl.innerHTML = '';
    if (me.holeCards && me.holeCards.length > 0) {
      me.holeCards.forEach(c => { cardsEl.appendChild(this.createCardEl(c)); });
    } else {
      cardsEl.innerHTML = '<div class="card placeholder"></div><div class="card placeholder"></div>';
    }
  },

  renderActionPanel(state, me) {
    const panel = document.getElementById('actionPanel');
    if (!me || state.phase === 'handComplete' || me.folded || me.allIn) {
      panel.classList.add('hidden');
      return;
    }
    panel.classList.remove('hidden');

    const isMyTurn = state.currentPlayerId === me.id;
    const toCall = state.currentBet - me.bet;

    const foldBtn = document.getElementById('foldBtn');
    const checkCallBtn = document.getElementById('checkCallBtn');
    const raiseBtn = document.getElementById('raiseBtn');
    const allInBtn = document.getElementById('allInBtn');
    const slider = document.getElementById('raiseSlider');

    foldBtn.disabled = !isMyTurn;

    if (!isMyTurn) {
      checkCallBtn.textContent = '等待...';
      checkCallBtn.disabled = true;
      raiseBtn.disabled = true;
      allInBtn.disabled = true;
      slider.disabled = true;
      return;
    }

    checkCallBtn.disabled = false;
    if (toCall === 0) {
      checkCallBtn.textContent = '过牌';
    } else {
      checkCallBtn.textContent = `跟注 ${toCall}`;
    }

    const canRaise = me.chips > toCall;
    raiseBtn.disabled = !canRaise;
    allInBtn.disabled = !canRaise;
    slider.disabled = !canRaise;

    const minRaise = Math.max(state.currentBet * 2, state.currentBet + 20);
    const maxRaise = me.chips + me.bet;
    slider.min = minRaise;
    slider.max = maxRaise;
    slider.value = Math.min(Math.max(parseInt(slider.value), minRaise), maxRaise);
    document.getElementById('raiseAmount').textContent = slider.value;
  },

  getMyPlayer(state) {
    if (!state) return null;
    return state.players.find(p => p.id === Poker.socket.id);
  },

  createCardEl(card) {
    const div = document.createElement('div');
    div.className = `card ${card.color}`;
    div.innerHTML = `<span class="card-rank">${card.display.slice(0, -1)}</span><span class="card-suit">${card.display.slice(-1)}</span>`;
    return div;
  },

  cardHTML(card) {
    return `<div class="card ${card.color}"><span class="card-rank">${card.display.slice(0, -1)}</span><span class="card-suit">${card.display.slice(-1)}</span></div>`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Poker.init();
  UI.init();
});

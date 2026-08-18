const { Deck } = require('./Deck');
const { evaluateHand, compareHands } = require('./HandEvaluator');
const { Pot } = require('./Pot');
const { BettingRound } = require('./BettingRound');

const PHASES = ['waiting', 'preflop', 'flop', 'turn', 'river', 'showdown', 'handComplete'];

class GameController {
  constructor(players, options = {}) {
    this.players = players.map(p => ({
      id: p.id,
      name: p.name,
      chips: p.chips || 1000,
      holeCards: [],
      bet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      hasActed: false,
      connected: true
    }));

    this.smallBlind = options.smallBlind || 10;
    this.bigBlind = options.bigBlind || 20;
    this.dealerIndex = 0;
    this.phase = 'waiting';
    this.communityCards = [];
    this.pot = new Pot();
    this.deck = new Deck();
    this.bettingRound = null;
    this.currentPlayerIndex = -1;
    this.handNumber = 0;
    this.winners = [];
    this.message = '';
  }

  startHand() {
    const eligible = this.players.filter(p => p.chips > 0 && p.connected);
    if (eligible.length < 2) {
      this.message = '至少需要 2 名有筹码的玩家';
      return false;
    }

    this.handNumber++;
    this.communityCards = [];
    this.pot.reset();
    this.winners = [];
    this.deck.reset().shuffle();

    for (const p of this.players) {
      p.holeCards = [];
      p.bet = 0;
      p.totalBet = 0;
      p.folded = p.chips <= 0;
      p.allIn = false;
      p.hasActed = false;
    }

    this.dealerIndex = this.findNextActivePlayer(this.dealerIndex);

    for (const p of this.players) {
      if (p.chips > 0) {
        p.holeCards = this.deck.deal(2);
      }
    }

    this.postBlinds();
    this.phase = 'preflop';
    this.bettingRound = new BettingRound(this.players, this.bigBlind, this.bigBlind);
    this.currentPlayerIndex = this.findNextActivePlayer(
      this.findNextActivePlayer(this.findNextActivePlayer(this.dealerIndex))
    );
    this.message = '新一手开始';
    return true;
  }

  postBlinds() {
    const sbIndex = this.findNextActivePlayer(this.dealerIndex);
    const bbIndex = this.findNextActivePlayer(sbIndex);

    const sbPlayer = this.players[sbIndex];
    const sbAmount = Math.min(this.smallBlind, sbPlayer.chips);
    sbPlayer.chips -= sbAmount;
    sbPlayer.bet = sbAmount;
    sbPlayer.totalBet = sbAmount;
    if (sbPlayer.chips === 0) sbPlayer.allIn = true;

    const bbPlayer = this.players[bbIndex];
    const bbAmount = Math.min(this.bigBlind, bbPlayer.chips);
    bbPlayer.chips -= bbAmount;
    bbPlayer.bet = bbAmount;
    bbPlayer.totalBet = bbAmount;
    if (bbPlayer.chips === 0) bbPlayer.allIn = true;
  }

  handleAction(playerId, action, amount = 0) {
    if (this.phase === 'waiting' || this.phase === 'handComplete') {
      return { success: false, error: '当前无法操作' };
    }

    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.currentPlayerIndex) {
      return { success: false, error: '还没轮到你' };
    }

    const player = this.players[playerIndex];
    const result = this.bettingRound.processAction(player, action, amount);
    if (!result.success) return result;

    player.totalBet = player.bet;

    const nonFolded = this.players.filter(p => !p.folded);
    if (nonFolded.length <= 1) {
      this.endHandEarly();
      return { success: true };
    }

    if (this.bettingRound.complete) {
      this.advanceRound();
    } else {
      this.currentPlayerIndex = this.bettingRound.findNextActor(playerIndex);
    }

    return { success: true };
  }

  advanceRound() {
    for (const p of this.players) {
      this.pot.contribute(p.id, p.bet);
    }

    const allInPlayers = this.players.filter(p => p.allIn && !p.folded);
    if (allInPlayers.length > 0) {
      this.pot.calculateSidePots(this.players);
    }

    const activeCount = this.players.filter(p => !p.folded && !p.allIn).length;

    if (this.phase === 'preflop') {
      this.phase = 'flop';
      this.communityCards.push(...this.deck.deal(3));
    } else if (this.phase === 'flop') {
      this.phase = 'turn';
      this.communityCards.push(this.deck.deal(1)[0]);
    } else if (this.phase === 'turn') {
      this.phase = 'river';
      this.communityCards.push(this.deck.deal(1)[0]);
    } else if (this.phase === 'river') {
      this.showdown();
      return;
    }

    for (const p of this.players) {
      p.bet = 0;
      p.hasActed = false;
    }

    if (activeCount <= 1) {
      this.runOutBoard();
      return;
    }

    this.bettingRound = new BettingRound(this.players, 0, this.bigBlind);
    this.currentPlayerIndex = this.findNextActivePlayer(this.dealerIndex);
    this.message = `${this.phase} 下注轮`;
  }

  runOutBoard() {
    while (this.communityCards.length < 5) {
      this.communityCards.push(this.deck.deal(1)[0]);
    }
    this.showdown();
  }

  endHandEarly() {
    const winner = this.players.find(p => !p.folded);
    if (winner) {
      const totalPot = this.players.reduce((sum, p) => sum + p.bet, 0) + this.pot.total;
      winner.chips += totalPot;
      this.winners = [{ player: winner, hand: null, amount: totalPot }];
      this.message = `${winner.name} 赢得底池 ${totalPot}（其他玩家弃牌）`;
    }
    this.phase = 'handComplete';
  }

  showdown() {
    this.phase = 'showdown';
    const contenders = this.players.filter(p => !p.folded);

    const evaluations = contenders.map(p => ({
      player: p,
      eval: evaluateHand([...p.holeCards, ...this.communityCards])
    }));

    evaluations.sort((a, b) => compareHands(b.eval, a.eval));

    const best = evaluations[0].eval;
    const winners = evaluations.filter(e => compareHands(e.eval, best) === 0);

    const totalPot = this.pot.total +
      this.players.reduce((sum, p) => sum + p.bet, 0);

    for (const p of this.players) {
      this.pot.contribute(p.id, p.bet);
    }
    this.pot.calculateSidePots(this.players);

    const distribution = this.pot.distribute(winners.map(w => w.player.id));

    this.winners = winners.map(w => ({
      player: w.player,
      hand: w.eval,
      amount: distribution[w.player.id] || 0
    }));

    for (const w of this.winners) {
      w.player.chips += w.amount;
    }

    this.message = `${this.winners.map(w => w.player.name).join(', ')} 获胜（${this.winners[0].hand.name}）`;
    this.phase = 'handComplete';
  }

  findNextActivePlayer(fromIndex) {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (fromIndex + i) % n;
      const p = this.players[idx];
      if (!p.folded && p.chips > 0) {
        return idx;
      }
    }
    return fromIndex;
  }

  isCurrentPlayer(playerId) {
    return this.players[this.currentPlayerIndex]?.id === playerId;
  }

  getValidActions(playerId) {
    if (!this.isCurrentPlayer(playerId)) return [];
    if (this.phase === 'handComplete' || this.phase === 'waiting') return [];

    const player = this.players.find(p => p.id === playerId);
    if (!player || player.folded || player.allIn) return [];

    const actions = [];
    const toCall = this.bettingRound.currentBet - player.bet;

    actions.push('fold');
    if (toCall === 0) actions.push('check');
    if (toCall > 0 && toCall < player.chips) actions.push('call');
    if (toCall >= player.chips) actions.push('call');
    if (player.chips > toCall) actions.push('raise');

    return actions;
  }

  getPublicState(requestingPlayerId) {
    const showHoleCards = this.phase === 'showdown' || this.phase === 'handComplete';

    return {
      phase: this.phase,
      handNumber: this.handNumber,
      pot: this.pot.total + this.players.reduce((s, p) => s + p.bet, 0),
      communityCards: this.communityCards.map(c => ({
        suit: c.suit,
        rank: c.rank,
        display: c.display,
        color: c.color
      })),
      currentBet: this.bettingRound?.currentBet || 0,
      currentPlayerId: this.players[this.currentPlayerIndex]?.id || null,
      dealerId: this.players[this.dealerIndex]?.id || null,
      message: this.message,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        bet: p.bet,
        folded: p.folded,
        allIn: p.allIn,
        isDealer: this.players[this.dealerIndex]?.id === p.id,
        isCurrentPlayer: this.currentPlayerIndex >= 0 && this.players[this.currentPlayerIndex]?.id === p.id,
        holeCards: (p.id === requestingPlayerId || showHoleCards) && !p.folded
          ? p.holeCards.map(c => ({ suit: c.suit, rank: c.rank, display: c.display, color: c.color }))
          : []
      })),
      winners: this.winners.map(w => ({
        playerId: w.player.id,
        name: w.player.name,
        handName: w.hand?.name || '对手弃牌',
        amount: w.amount
      }))
    };
  }

  addPlayer(player) {
    this.players.push({
      id: player.id,
      name: player.name,
      chips: player.chips || 1000,
      holeCards: [],
      bet: 0,
      totalBet: 0,
      folded: true,
      allIn: false,
      hasActed: false,
      connected: true
    });
  }

  removePlayer(playerId) {
    const idx = this.players.findIndex(p => p.id === playerId);
    if (idx >= 0) {
      this.players[idx].connected = false;
      this.players[idx].folded = true;
    }
  }

  setPlayerConnected(playerId, connected) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.connected = connected;
    }
  }
}

module.exports = { GameController, PHASES };

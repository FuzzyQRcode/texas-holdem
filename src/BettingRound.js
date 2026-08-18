class BettingRound {
  constructor(players, startingBet, minRaise) {
    this.players = players;
    this.currentBet = startingBet;
    this.minRaise = minRaise;
    this.lastRaiserId = null;
    this.complete = false;
  }

  processAction(player, action, amount) {
    if (this.complete) return { success: false, error: '下注轮已结束' };
    if (player.folded || player.allIn) return { success: false, error: '无法操作' };

    switch (action) {
      case 'fold':
        player.folded = true;
        player.hasActed = true;
        break;

      case 'check':
        if (this.currentBet > player.bet) {
          return { success: false, error: '需要跟注或弃牌' };
        }
        player.hasActed = true;
        break;

      case 'call':
        const callAmount = Math.min(this.currentBet - player.bet, player.chips);
        player.chips -= callAmount;
        player.bet += callAmount;
        if (player.chips === 0) player.allIn = true;
        player.hasActed = true;
        break;

      case 'raise':
        const raiseTo = amount;
        const raiseDiff = raiseTo - player.bet;
        if (raiseTo <= this.currentBet) {
          return { success: false, error: '加注金额必须高于当前下注' };
        }
        if (raiseDiff > player.chips) {
          return { success: false, error: '筹码不足' };
        }
        const raiseIncrement = raiseTo - this.currentBet;
        if (raiseIncrement < this.minRaise && raiseDiff < player.chips) {
          return { success: false, error: `最小加注 ${this.minRaise}` };
        }
        player.chips -= raiseDiff;
        player.bet = raiseTo;
        this.currentBet = raiseTo;
        this.minRaise = raiseIncrement;
        if (player.chips === 0) player.allIn = true;
        player.hasActed = true;
        this.lastRaiserId = player.id;
        for (const p of this.players) {
          if (p.id !== player.id && !p.folded && !p.allIn) {
            p.hasActed = false;
          }
        }
        break;

      default:
        return { success: false, error: '未知操作: ' + action };
    }

    this.checkComplete();
    return { success: true };
  }

  checkComplete() {
    const active = this.players.filter(p => !p.folded && !p.allIn);
    if (active.length === 0) {
      this.complete = true;
      return;
    }
    if (active.length === 1) {
      this.complete = active[0].hasActed && active[0].bet === this.currentBet;
      return;
    }
    this.complete = active.every(p => p.hasActed && p.bet === this.currentBet);
  }

  findNextActor(currentIndex) {
    const n = this.players.length;
    for (let i = 1; i <= n; i++) {
      const idx = (currentIndex + i) % n;
      const p = this.players[idx];
      if (!p.folded && !p.allIn && (!p.hasActed || p.bet < this.currentBet)) {
        return idx;
      }
    }
    return -1;
  }

  getActivePlayers() {
    return this.players.filter(p => !p.folded);
  }

  getNonFoldedPlayers() {
    return this.players.filter(p => !p.folded);
  }
}

module.exports = { BettingRound };

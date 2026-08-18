class Pot {
  constructor() {
    this.mainPot = 0;
    this.contributions = new Map();
    this.sidePots = [];
  }

  contribute(playerId, amount) {
    this.mainPot += amount;
    const current = this.contributions.get(playerId) || 0;
    this.contributions.set(playerId, current + amount);
  }

  getContribution(playerId) {
    return this.contributions.get(playerId) || 0;
  }

  get total() {
    return this.mainPot;
  }

  calculateSidePots(players) {
    const eligible = players.filter(p => this.getContribution(p.id) > 0);

    const allInLevels = eligible
      .filter(p => p.allIn)
      .map(p => this.getContribution(p.id))
      .sort((a, b) => a - b);

    const uniqueLevels = [...new Set(allInLevels)];
    const pots = [];
    let prevLevel = 0;

    for (const level of uniqueLevels) {
      const eligibleForPot = eligible.filter(p => this.getContribution(p.id) >= level);
      const amount = (level - prevLevel) * eligibleForPot.length;
      pots.push({
        amount,
        eligiblePlayerIds: eligibleForPot.map(p => p.id)
      });
      prevLevel = level;
    }

    const notAllIn = eligible.filter(p => !p.allIn && this.getContribution(p.id) > prevLevel);
    if (notAllIn.length > 0) {
      let remaining = 0;
      for (const p of notAllIn) {
        remaining += this.getContribution(p.id) - prevLevel;
      }
      if (remaining > 0) {
        pots.push({
          amount: remaining,
          eligiblePlayerIds: notAllIn.map(p => p.id)
        });
      }
    }

    this.sidePots = pots;
    return pots;
  }

  distribute(winners) {
    if (this.sidePots.length === 0) {
      const winCount = winners.length;
      const share = Math.floor(this.mainPot / winCount);
      const remainder = this.mainPot - share * winCount;
      const result = {};
      winners.forEach((w, i) => {
        result[w] = share + (i < remainder ? 1 : 0);
      });
      return result;
    }

    const result = {};
    for (const pot of this.sidePots) {
      const potWinners = winners.filter(w => pot.eligiblePlayerIds.includes(w));
      if (potWinners.length === 0) {
        const fallbackWinners = pot.eligiblePlayerIds;
        fallbackWinners.forEach((w, i) => {
          result[w] = (result[w] || 0) + Math.floor(pot.amount / fallbackWinners.length);
        });
      } else {
        const share = Math.floor(pot.amount / potWinners.length);
        const remainder = pot.amount - share * potWinners.length;
        potWinners.forEach((w, i) => {
          result[w] = (result[w] || 0) + share + (i < remainder ? 1 : 0);
        });
      }
    }
    return result;
  }

  reset() {
    this.mainPot = 0;
    this.contributions.clear();
    this.sidePots = [];
  }
}

module.exports = { Pot };

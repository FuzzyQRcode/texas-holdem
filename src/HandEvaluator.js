const { RANK_DISPLAY } = require('./Deck');

const HAND_NAMES = [
  '高牌',
  '一对',
  '两对',
  '三条',
  '顺子',
  '同花',
  '葫芦',
  '四条',
  '同花顺',
  '皇家同花顺'
];

function getCombinations(arr, k) {
  const result = [];
  const helper = (start, combo) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  };
  helper(0, []);
  return result;
}

function isFlush(cards) {
  const suit = cards[0].suit;
  return cards.every(c => c.suit === suit);
}

function isStraight(ranks) {
  const sorted = [...ranks].sort((a, b) => b - a);
  const unique = [...new Set(sorted)];

  if (unique.length < 5) return false;

  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i] - unique[i + 4] === 4) {
      return unique[i];
    }
  }

  if (unique.includes(14) && unique.includes(5) && unique.includes(4) &&
      unique.includes(3) && unique.includes(2)) {
    return 5;
  }

  return false;
}

function evaluateFive(cards) {
  const ranks = cards.map(c => c.rank);
  const flush = isFlush(cards);
  const straightHigh = isStraight(ranks);

  const rankCount = {};
  for (const r of ranks) {
    rankCount[r] = (rankCount[r] || 0) + 1;
  }

  const counts = Object.entries(rankCount)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  if (flush && straightHigh) {
    if (straightHigh === 14) {
      return { rank: 9, tiebreakers: [14], cards };
    }
    return { rank: 8, tiebreakers: [straightHigh], cards };
  }

  if (counts[0].count === 4) {
    return { rank: 7, tiebreakers: [counts[0].rank, counts[1].rank], cards };
  }

  if (counts[0].count === 3 && counts[1].count === 2) {
    return { rank: 6, tiebreakers: [counts[0].rank, counts[1].rank], cards };
  }

  if (flush) {
    return { rank: 5, tiebreakers: ranks.sort((a, b) => b - a), cards };
  }

  if (straightHigh) {
    return { rank: 4, tiebreakers: [straightHigh], cards };
  }

  if (counts[0].count === 3) {
    const kickers = counts.slice(1).map(c => c.rank).sort((a, b) => b - a);
    return { rank: 3, tiebreakers: [counts[0].rank, ...kickers], cards };
  }

  if (counts[0].count === 2 && counts[1].count === 2) {
    const highPair = Math.max(counts[0].rank, counts[1].rank);
    const lowPair = Math.min(counts[0].rank, counts[1].rank);
    const kicker = counts[2].rank;
    return { rank: 2, tiebreakers: [highPair, lowPair, kicker], cards };
  }

  if (counts[0].count === 2) {
    const kickers = counts.slice(1).map(c => c.rank).sort((a, b) => b - a);
    return { rank: 1, tiebreakers: [counts[0].rank, ...kickers], cards };
  }

  return { rank: 0, tiebreakers: ranks.sort((a, b) => b - a), cards };
}

function compareTiebreakers(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function evaluateHand(cards) {
  if (cards.length < 5) {
    throw new Error('至少需要 5 张牌');
  }

  if (cards.length === 5) {
    const result = evaluateFive(cards);
    return {
      rank: result.rank,
      name: HAND_NAMES[result.rank],
      tiebreakers: result.tiebreakers,
      bestFive: result.cards
    };
  }

  const combos = getCombinations(cards, 5);
  let best = null;

  for (const combo of combos) {
    const result = evaluateFive(combo);
    if (!best || result.rank > best.rank ||
        (result.rank === best.rank && compareTiebreakers(result.tiebreakers, best.tiebreakers) > 0)) {
      best = result;
    }
  }

  return {
    rank: best.rank,
    name: HAND_NAMES[best.rank],
    tiebreakers: best.tiebreakers,
    bestFive: best.cards
  };
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return compareTiebreakers(a.tiebreakers, b.tiebreakers);
}

module.exports = { evaluateHand, compareHands, HAND_NAMES };

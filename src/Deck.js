const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const RANK_DISPLAY = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

const SUIT_SYMBOL = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

const SUIT_COLOR = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black'
};

function createCard(suit, rank) {
  return {
    suit,
    rank,
    display: RANK_DISPLAY[rank] + SUIT_SYMBOL[suit],
    color: SUIT_COLOR[suit]
  };
}

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(createCard(suit, rank));
      }
    }
    return this;
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  deal(n = 1) {
    const dealt = [];
    for (let i = 0; i < n && this.cards.length > 0; i++) {
      dealt.push(this.cards.pop());
    }
    return dealt;
  }

  get remaining() {
    return this.cards.length;
  }
}

module.exports = { Deck, createCard, RANK_DISPLAY, SUIT_SYMBOL, SUIT_COLOR };

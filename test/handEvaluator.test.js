const { evaluateHand, compareHands } = require('../src/HandEvaluator');
const { Deck } = require('../src/Deck');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

function makeCard(suit, rank) {
  return { suit, rank };
}

console.log('=== 牌型评估测试 ===\n');

console.log('皇家同花顺');
const royalFlush = [
  makeCard('hearts', 10), makeCard('hearts', 11), makeCard('hearts', 12),
  makeCard('hearts', 13), makeCard('hearts', 14), makeCard('clubs', 2), makeCard('clubs', 3)
];
const rf = evaluateHand(royalFlush);
assert(rf.rank === 9, `rank=9 (皇家同花顺), got ${rf.rank}`);
assert(rf.name === '皇家同花顺', `name=皇家同花顺, got "${rf.name}"`);

console.log('同花顺');
const straightFlush = [
  makeCard('spades', 5), makeCard('spades', 6), makeCard('spades', 7),
  makeCard('spades', 8), makeCard('spades', 9), makeCard('hearts', 2), makeCard('hearts', 3)
];
const sf = evaluateHand(straightFlush);
assert(sf.rank === 8, `rank=8 (同花顺), got ${sf.rank}`);

console.log('四条');
const fourKind = [
  makeCard('hearts', 7), makeCard('diamonds', 7), makeCard('clubs', 7),
  makeCard('spades', 7), makeCard('hearts', 2), makeCard('hearts', 3), makeCard('hearts', 5)
];
const fk = evaluateHand(fourKind);
assert(fk.rank === 7, `rank=7 (四条), got ${fk.rank}`);

console.log('葫芦');
const fullHouse = [
  makeCard('hearts', 10), makeCard('diamonds', 10), makeCard('clubs', 10),
  makeCard('spades', 5), makeCard('hearts', 5), makeCard('hearts', 2), makeCard('hearts', 3)
];
const fh = evaluateHand(fullHouse);
assert(fh.rank === 6, `rank=6 (葫芦), got ${fh.rank}`);

console.log('同花');
const flush = [
  makeCard('hearts', 2), makeCard('hearts', 4), makeCard('hearts', 6),
  makeCard('hearts', 8), makeCard('hearts', 10), makeCard('clubs', 14), makeCard('clubs', 3)
];
const fl = evaluateHand(flush);
assert(fl.rank === 5, `rank=5 (同花), got ${fl.rank}`);

console.log('顺子');
const straight = [
  makeCard('hearts', 5), makeCard('diamonds', 6), makeCard('clubs', 7),
  makeCard('spades', 8), makeCard('hearts', 9), makeCard('clubs', 2), makeCard('clubs', 3)
];
const st = evaluateHand(straight);
assert(st.rank === 4, `rank=4 (顺子), got ${st.rank}`);

console.log('三条');
const threeKind = [
  makeCard('hearts', 8), makeCard('diamonds', 8), makeCard('clubs', 8),
  makeCard('spades', 3), makeCard('hearts', 5), makeCard('clubs', 10), makeCard('clubs', 14)
];
const tk = evaluateHand(threeKind);
assert(tk.rank === 3, `rank=3 (三条), got ${tk.rank}`);

console.log('两对');
const twoPair = [
  makeCard('hearts', 4), makeCard('diamonds', 4), makeCard('clubs', 9),
  makeCard('spades', 9), makeCard('hearts', 7), makeCard('clubs', 2), makeCard('clubs', 3)
];
const tp = evaluateHand(twoPair);
assert(tp.rank === 2, `rank=2 (两对), got ${tp.rank}`);

console.log('一对');
const onePair = [
  makeCard('hearts', 6), makeCard('diamonds', 6), makeCard('clubs', 3),
  makeCard('spades', 7), makeCard('hearts', 10), makeCard('clubs', 2), makeCard('clubs', 14)
];
const op = evaluateHand(onePair);
assert(op.rank === 1, `rank=1 (一对), got ${op.rank}`);

console.log('高牌');
const highCard = [
  makeCard('hearts', 2), makeCard('diamonds', 5), makeCard('clubs', 7),
  makeCard('spades', 9), makeCard('hearts', 13), makeCard('clubs', 3), makeCard('clubs', 14)
];
const hc = evaluateHand(highCard);
assert(hc.rank === 0, `rank=0 (高牌), got ${hc.rank}`);

console.log('\n=== 特殊情况测试 ===\n');

console.log('A-2-3-4-5 轮子顺子');
const wheel = [
  makeCard('hearts', 14), makeCard('diamonds', 2), makeCard('clubs', 3),
  makeCard('spades', 4), makeCard('hearts', 5), makeCard('clubs', 7), makeCard('clubs', 8)
];
const wh = evaluateHand(wheel);
assert(wh.rank === 4, `rank=4 (顺子), got ${wh.rank}`);
assert(wh.tiebreakers[0] === 5, `顺子最高牌=5, got ${wh.tiebreakers[0]}`);

console.log('\n=== 牌型比较测试 ===\n');

const pairHand = evaluateHand([
  makeCard('hearts', 5), makeCard('diamonds', 5), makeCard('clubs', 7),
  makeCard('spades', 9), makeCard('hearts', 13), makeCard('clubs', 2), makeCard('clubs', 3)
]);
const tripleHand = evaluateHand([
  makeCard('hearts', 5), makeCard('diamonds', 5), makeCard('clubs', 5),
  makeCard('spades', 9), makeCard('hearts', 13), makeCard('clubs', 2), makeCard('clubs', 3)
]);
assert(compareHands(tripleHand, pairHand) > 0, '三条 > 一对');

const highAce = evaluateHand([
  makeCard('hearts', 14), makeCard('diamonds', 13), makeCard('clubs', 12),
  makeCard('spades', 10), makeCard('hearts', 8), makeCard('clubs', 2), makeCard('clubs', 3)
]);
const highKing = evaluateHand([
  makeCard('hearts', 13), makeCard('diamonds', 12), makeCard('clubs', 11),
  makeCard('spades', 10), makeCard('hearts', 8), makeCard('clubs', 2), makeCard('clubs', 3)
]);
assert(compareHands(highAce, highKing) > 0, '高牌 A > 高牌 K');

console.log('\n=== 牌组测试 ===\n');

const deck = new Deck();
assert(deck.remaining === 52, `初始 52 张牌, got ${deck.remaining}`);
deck.shuffle();
assert(deck.remaining === 52, `洗牌后仍 52 张`);
const dealt = deck.deal(2);
assert(dealt.length === 2, `发 2 张牌`);
assert(deck.remaining === 50, `发牌后剩 50 张, got ${deck.remaining}`);
deck.reset();
assert(deck.remaining === 52, `重置后 52 张`);

console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`);
process.exit(failed > 0 ? 1 : 0);

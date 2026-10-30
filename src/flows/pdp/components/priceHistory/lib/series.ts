import type { PricePoint } from './priceMath';

/** Deterministic daily buy-box series, seeded so every session shows the same
 *  graph, scaled to whatever the sheet's current price is. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAYS = 400;
/** With `endOnLow`, every other day in the last 30 sits at least this far above
 *  the current price, so the last point is strictly the 30-day low. */
const LOW_MARGIN = 0.004;

/** Series whose final point is exactly `current`. Prices move the way a buy box
 *  does: they hold for a few days, then step up or down around a slowly easing
 *  level, with short sales that dip and recover and the odd price rise.
 *  `endOnLow` (the verdict case) guarantees the last point is the 30-day low;
 *  without it, a sale three weeks ago dips below today so the verdict stays off. */
export function buildSeries(current: number, today: Date, opts: { endOnLow?: boolean } = {}): PricePoint[] {
  const rnd = mulberry32(20260908);
  const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
  const prices: number[] = [];

  let level = 1.12; // multiple of `current`, mean-reverting toward a gently falling trend
  while (prices.length < DAYS) {
    const t = prices.length / DAYS;
    const trend = 1.14 - 0.08 * t + 0.03 * Math.sin(t * Math.PI * 3);
    level += (trend - level) * 0.35 + between(-0.035, 0.035);

    const roll = rnd();
    if (roll < 0.14) {
      // sale: drops 7–15% for 3–7 days, then back to the level
      const depth = between(0.07, 0.15);
      for (let d = Math.round(between(3, 7)); d > 0; d--) prices.push(level * (1 - depth));
    } else if (roll < 0.22) {
      // price rise: 4–9% for 4–9 days
      const lift = between(0.04, 0.09);
      for (let d = Math.round(between(4, 9)); d > 0; d--) prices.push(level * (1 + lift));
    }
    for (let d = Math.round(between(3, 10)); d > 0; d--) prices.push(level);
  }
  prices.length = DAYS;

  const out = prices.map((m) => m * current);
  // the last few days settle on today's price
  const settle = 4;
  for (let i = DAYS - settle; i < DAYS; i++) out[i] = current;

  if (opts.endOnLow) {
    const floor = current * (1 + LOW_MARGIN);
    for (let i = DAYS - 30; i < DAYS - settle; i++) out[i] = Math.max(out[i], floor);
  } else {
    // a short sale ~3 weeks ago below today's price
    for (let i = DAYS - 22; i < DAYS - 17; i++) out[i] = Math.min(out[i], current * 0.95);
  }

  return out.map((price, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (DAYS - 1 - i));
    return { date, price: Math.round(price * 100) / 100 };
  });
}

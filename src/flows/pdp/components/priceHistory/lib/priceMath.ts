/** The two pieces of the prototype's lib/priceMath.ts the sheet needs: the PRD
 *  y-axis rule and the read-out's number format. */
export type PricePoint = { date: Date; price: number | null };

/** 6549.4 -> "6,549" (read-out and axis labels). */
export function formatMoney(n: number): string {
  const r = Math.round(n);
  return r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// PRD "Graph scale — Y-axis": variation rule + magnitude rounding + 4 gridlines.
export type YAxis = { min: number; max: number; gridValues: number[] };

function roundingStep(avg: number): number {
  if (avg < 100) return 5;
  if (avg < 1000) return 10;
  if (avg < 10000) return 50;
  return 100;
}

export function computeYAxis(prices: number[]): YAxis {
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variation = avg === 0 ? 0 : (hi - lo) / avg;
  let rawMin: number;
  let rawMax: number;
  if (variation >= 0.1) {
    rawMin = lo * 0.95;
    rawMax = hi * 1.05;
  } else {
    // flat prices: force at least a 10% band centered on the average
    const half = avg * 0.05;
    rawMin = Math.min(avg - half, lo);
    rawMax = Math.max(avg + half, hi);
  }
  const step = roundingStep(avg);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const gridValues = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);
  return { min, max, gridValues };
}

import { createStore } from '../../../../kit/createStore';

/**
 * Price-history cases (Figma PDP-new-features · "Final flow" 24651:78696), applied to the kit's iPhone 17 Pro PDP.
 * Rows are the price-block treatment, columns the 30-day verdict. The Figma frames carry charger prices; these are
 * written iPhone-scale numbers so the block reads right on this product.
 */
export type PriceState = 'normal' | 'best' | 'ltd';
export type HistoryState = 'notLowest' | 'lowest30';

export type CaseOption<T> = { id: T; label: string; note: string };

export const PRICE_STATES: CaseOption<PriceState>[] = [
  { id: 'normal', label: 'Normal', note: 'Offer price with MRP strikethrough' },
  { id: 'best', label: 'Best price', note: 'Best price with offers above the offer price' },
  { id: 'ltd', label: 'LTD', note: 'Limited-time deal with countdown' },
];

export const HISTORY_STATES: CaseOption<HistoryState>[] = [
  { id: 'notLowest', label: 'Not lowest', note: 'Price history chip beside the price' },
  { id: 'lowest30', label: 'Lowest in 30 days', note: 'Verdict tooltip carries the entry point' },
];

export const VERDICT = 'Lowest price in 30 days';

export type PriceCase = {
  price: number;
  mrp: number;
  /** Best price: the larger "best price with offers" figure, and the offer price demotes under it. */
  bestPrice?: number;
  ltd?: { dealName: string; countdownSec: number };
};

const MRP = 7299;

export const PRICE_CASES: Record<PriceState, PriceCase> = {
  normal: { price: 6549, mrp: MRP },
  best: { price: 6549, mrp: MRP, bestPrice: 6349 },
  ltd: { price: 5899, mrp: MRP, ltd: { dealName: 'Flash Deal', countdownSec: 1 * 3600 + 12 * 60 + 23 } },
};

export const copy = {
  priceHistory: 'Price history',
  bestPriceAccent: 'Best price',
  bestPriceRest: ' with offers',
  endsIn: 'Ends in',
  pctOff: (n: number) => `${n}% OFF`,
  pctOffLower: (n: number) => `${n}% off`,
};

const read = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  const v = new URLSearchParams(window.location.search).get(key);
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
};

/** The case being shown. Seeded from `?case=best&history=lowest30` so any cell can be linked. */
export const priceCaseStore = createStore({
  price: read<PriceState>('case', ['normal', 'best', 'ltd'], 'normal'),
  history: read<HistoryState>('history', ['notLowest', 'lowest30'], 'notLowest'),
});

/** Keep the address bar's query in step with the switcher, so the URL always opens the cell on screen. */
priceCaseStore.subscribe(() => {
  const { price, history } = priceCaseStore.get();
  const q = new URLSearchParams(window.location.search);
  q.set('case', price);
  q.set('history', history);
  q.delete('option');
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${q}`);
});

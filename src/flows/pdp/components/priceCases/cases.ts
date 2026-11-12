import { createStore } from '../../../../kit/createStore';
import { money } from '../../../../data';
import { buildSeries, lowestIn, type SeriesOpts } from '../priceHistory/lib/series';
import type { RangeKey } from '../priceHistory/lib/chartGeom';

/**
 * Price-history cases (Figma PDP-new-features · "Final flow" 24651:78696), applied to the kit's iPhone 17 Pro PDP.
 * Rows are the price-block treatment, columns the price verdict. The Figma frames carry charger prices; these are
 * written iPhone-scale numbers so the block reads right on this product.
 */
export type PriceState = 'normal' | 'best' | 'ltd';
export type HistoryState = 'notLowest' | 'lowest30' | 'lowestEarlier';

export type CaseOption<T> = { id: T; label: string; note: string };

export const PRICE_STATES: CaseOption<PriceState>[] = [
  { id: 'normal', label: 'Normal', note: 'Offer price with MRP strikethrough' },
  { id: 'best', label: 'Best price', note: 'Best price with offers above the offer price' },
  { id: 'ltd', label: 'LTD', note: 'Limited-time deal with countdown' },
];

export const HISTORY_STATES: CaseOption<HistoryState>[] = [
  { id: 'notLowest', label: 'Not lowest', note: 'Price history chip beside the price' },
  { id: 'lowest30', label: 'Lowest 30d', note: 'Verdict tooltip carries the entry point' },
  { id: 'lowestEarlier', label: 'Past low', note: 'Today is above a low from 30+ days ago; the tooltip names it' },
];

/** How the sheet's verdict pill arrives: with its own reveal plus the ink sweep, or already in place with only the sweep. */
export type PillState = 'reveal' | 'static';

export const PILL_STATES: CaseOption<PillState>[] = [
  { id: 'reveal', label: 'Reveal + ink', note: 'Pill fades in with the sheet, contents left to right; ink sweeps once the graph has drawn' },
  { id: 'static', label: 'Ink only', note: 'Pill already sitting in place; only the ink sweeps, once the graph has drawn' },
];

/** How the sheet's loading skeleton (Figma 26711:36897) is staged. */
export type LoadingState = 'brief' | 'hold' | 'off';

export const LOADING_STATES: CaseOption<LoadingState>[] = [
  { id: 'brief', label: '1.5s', note: 'Skeleton for 1.5s after the sheet lands, then the data' },
  { id: 'hold', label: 'Hold', note: 'Skeleton stays up, to review the shimmer' },
  { id: 'off', label: 'Off', note: 'Data straight away' },
];

/** How long each loading state holds the skeleton; null holds it until the sheet closes. */
export const LOADING_MS: Record<LoadingState, number | null> = { brief: 1500, hold: null, off: 0 };

/** The price history each verdict case is drawn from (see buildSeries). */
export const SERIES_OPTS: Record<HistoryState, SeriesOpts> = {
  notLowest: {},
  lowest30: { lowDays: 30 },
  lowestEarlier: { lowAgo: 47 },
};

export type Verdict = {
  /** Price-block tooltip, beside "Price history ›" */
  short: string;
  /** Sheet pill, under the current price */
  long: string;
  icon: 'trend-down' | 'calendar';
  /** The tab the sheet opens on, so the low the verdict claims is on screen */
  range: RangeKey;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** The verdict copy for a case, read off the same series the sheet draws. */
export function verdictFor(state: HistoryState, price: number, today = new Date()): Verdict | undefined {
  if (state === 'notLowest') return undefined;
  const series = buildSeries(price, today, SERIES_OPTS[state]);
  if (state === 'lowest30') {
    // 26211:55300 — "Price dropped by 20% in last 30 days": the drop from the series' price 30 days ago
    const monthAgo = series[series.length - 30]?.price ?? price;
    const dropPct = Math.max(0, Math.round(((monthAgo - price) / monthAgo) * 100));
    return { short: 'Lowest price in 30 days', long: `Price dropped by ${dropPct}% in last 30 days`, icon: 'trend-down', range: '1M' };
  }
  const low = lowestIn(series, 90)!;
  const daysAgo = Math.round((today.getTime() - low.date.getTime()) / 86_400_000);
  const lowerPct = Math.max(1, Math.round(((price - (low.price as number)) / price) * 100));
  return {
    short: `Lowest ${money(low.price as number)} on ${dayMonth(low.date)}`,
    // as a share of today's price, so it reads like the 30-day pill ("Price dropped by 5%…")
    long: `Price dropped by ${lowerPct}%, ${daysAgo} days ago`,
    icon: 'trend-down',
    range: '3M',
  };
}

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

/** The case being shown. Seeded from `?case=best&history=lowest30` (or `lowestEarlier`) so any cell can be linked. */
export const priceCaseStore = createStore({
  price: read<PriceState>('case', ['normal', 'best', 'ltd'], 'normal'),
  history: read<HistoryState>('history', ['notLowest', 'lowest30', 'lowestEarlier'], 'notLowest'),
  loading: read<LoadingState>('loading', ['brief', 'hold', 'off'], 'brief'),
  pill: read<PillState>('pill', ['reveal', 'static'], 'reveal'),
});

/** Keep the address bar's query in step with the switcher, so the URL always opens the cell on screen. */
priceCaseStore.subscribe(() => {
  const { price, history, loading, pill } = priceCaseStore.get();
  const q = new URLSearchParams(window.location.search);
  q.set('case', price);
  q.set('history', history);
  q.set('loading', loading);
  q.set('pill', pill);
  q.delete('reveal');
  q.delete('option');
  window.history.replaceState(window.history.state, '', `${window.location.pathname}?${q}`);
});

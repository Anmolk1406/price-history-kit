import type { RangeKey } from './chartGeom';

/** Bottom-sheet metrics, transcribed from the "Final flow" sheet frames
 *  (24660:45606 static, 24660:63803 hover).
 *
 *    grabber (28)           outside the card
 *    price header           20 + container + extra + 20
 *                             [10 + 32] best-price pill (26505:131181)
 *    chart card (296)       + [30 + 12] verdict bar (26505:131472)
 *    ATC footer (72)        always
 *    home indicator (33)    outside the card
 *
 *  The frame is bottom-anchored in its container; only `height` is used for it
 *  (the source's `top` assumed an 812 canvas).
 */
export type SheetMetrics = {
  height: number;
  sheetHeight: number;
  headerHeight: number;
  priceGap: number;
  verdict: boolean;
  defaultRange: RangeKey;
};

export const GRABBER_H = 28;
export const HOME_H = 33;
const CHART_CARD_H = 296;
const ATC_H = 72;
/** Static-frame values (24660:45606): subtitle-to-price gap 4, container 56. */
const PRICE_GAP = 4;
const PRICE_CONTAINER_H = 56;

/** 26505:131488: the best price is a 32h pill 10 under the price, and the verdict is a 30h bar inside the chart
 *  card's bottom (12 inset). */
const BEST_PILL_GAP = 10;
const BEST_PILL_H = 32;
const CARD_VERDICT_H = 30 + 12;

export function sheetMetrics(opts: { verdict: boolean; bestPill: boolean }): SheetMetrics {
  const headerExtra = opts.bestPill ? BEST_PILL_GAP + BEST_PILL_H : 0;
  const headerHeight = 20 + PRICE_CONTAINER_H + headerExtra + 20;
  const cardHeight = CHART_CARD_H + (opts.verdict ? CARD_VERDICT_H : 0);
  const sheetHeight = headerHeight + cardHeight + ATC_H;
  const height = GRABBER_H + sheetHeight + HOME_H;
  return {
    height,
    sheetHeight,
    headerHeight,
    priceGap: PRICE_GAP,
    verdict: opts.verdict,
    defaultRange: '1M',
  };
}

/** Best-price copy (the value comes from the `bestPrice` prop). */
export const SHEET_BANNER = {
  labelAccent: 'Best price',
  label: ' with offers',
} as const;

/** All three drawn frames inset the x-axis by 48. */
export const X_AXIS_PAD: Record<RangeKey, number> = { '1M': 48, '3M': 48, '1Y': 48 };

export const SHEET_CHROME = {
  priceLabel: 'Current price',
  title: 'Price trend',
  ranges: ['1M', '3M', '1Y'] as const,
  buyNow: 'Buy now',
  addToCart: 'Add to cart',
  close: 'Close price history',
} as const;

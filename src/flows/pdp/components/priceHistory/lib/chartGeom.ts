import { computeYAxis, type PricePoint } from './priceMath';

/** Plot geometry, from the design's own structure.
 *
 *  The grid is a flex column of four 18px label rows with gap 36 (24660:45704),
 *  so the rules sit at y 9 / 63 / 117 / 171; the plot box is placed at top:1,
 *  height 170, so in plot coordinates the rules land at 8 / 62 / 116 / 170.
 *
 *  Horizontally the design's line runs from x -8 to x (width - 8) inside the plot
 *  box (257 wide on a 375 screen, chart-1m.svg). The box width follows the card
 *  here (see plotWidthFor), so xEnd is derived per width.
 */
export const PLOT = {
  /** Designed box width (375 screen: 327 chart region less 58 left and 12 right). */
  width: 257,
  height: 170,
  /** Top and bottom gridlines in plot coordinates. */
  yTop: 8,
  yBottom: 170,
  /** First data point x, and how far the last point sits in from the box's right edge. */
  xStart: -8,
  xEndInset: 8,
  fillTopOpacity: 0.5,
  strokeWidth: 1.5,
  /** The exported gradients run to y 197, past the bottom of the box. */
  gradientBottom: 197,
} as const;

/** Chart region (card) width -> plot box width. 327 -> 257, as designed. */
export const REGION_PLOT_LEFT = 12 + 46;
export const REGION_PLOT_RIGHT = 12;
export function plotWidthFor(regionWidth: number) {
  return Math.max(120, regionWidth - REGION_PLOT_LEFT - REGION_PLOT_RIGHT);
}
export const xEndFor = (plotWidth: number) => plotWidth - PLOT.xEndInset;

export type ChartWindow = {
  points: PricePoint[];
  /** Axis values, top row first (the order the label rows render in). */
  yLabels: number[];
  xLabels: string[];
  linePath: string;
  fillPath: string;
  last: { x: number; y: number };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDay(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** All three drawn frames carry 4 x-axis labels (24660:66559 / 67228 / 67647). */
export const WINDOWS = {
  '1M': { days: 30, labels: 4 },
  '3M': { days: 90, labels: 4 },
  '1Y': { days: 365, labels: 4 },
} as const;

export type RangeKey = keyof typeof WINDOWS;

/** `alsoFit` are prices drawn on the plot that aren't in the series (option B's best price), so the axis must reach them. */
export function buildWindow(all: PricePoint[], range: RangeKey, plotWidth: number = PLOT.width, alsoFit: number[] = []): ChartWindow {
  const { days, labels } = WINDOWS[range];
  const points = all.slice(Math.max(0, all.length - days));
  const prices = points.map((p) => p.price).filter((p): p is number => p !== null);

  const axis = computeYAxis([...prices, ...alsoFit]);
  // computeYAxis returns ascending; the label rows read top-down.
  const yLabels = [...axis.gridValues].reverse();

  const n = points.length;
  const xEnd = xEndFor(plotWidth);
  const span = xEnd - PLOT.xStart;
  const x = (i: number) => PLOT.xStart + (span * i) / (n - 1);
  const y = (price: number) => {
    const t = (price - axis.min) / (axis.max - axis.min || 1);
    return PLOT.yBottom - t * (PLOT.yBottom - PLOT.yTop);
  };

  const coords = points.map((p, i) => ({ x: x(i), y: y(p.price ?? axis.min) }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');
  // close the area down past the bottom of the box, as the exports do
  const fillPath = `${linePath} L${xEnd.toFixed(2)} ${PLOT.gradientBottom} ` + `L${PLOT.xStart.toFixed(2)} ${PLOT.gradientBottom} Z`;

  const xLabels = Array.from({ length: labels }, (_, i) => {
    const idx = Math.round(((n - 1) * i) / (labels - 1));
    return fmtDay(points[idx].date);
  });

  return { points, yLabels, xLabels, linePath, fillPath, last: coords[coords.length - 1] };
}

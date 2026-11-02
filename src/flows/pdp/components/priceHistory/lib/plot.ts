import { buildWindow, fmtDay, PLOT, xEndFor, type RangeKey } from './chartGeom';
import { formatMoney, type PricePoint } from './priceMath';
import { X_AXIS_PAD } from './sheet';

export { fmtDay };

/** One shape for the plot, so the chart component and the scrub logic don't care
 *  how the curve was produced. Always a computed window here: the designer's
 *  exports carry a charger's 2,489–5,299 axis, so the curve is rebuilt from
 *  `price` (series.ts + buildWindow). */
export type PlotData = {
  fill: string;
  line: string;
  gradientY1: number;
  gradientY2: number;
  /** Plot box width and the last point's x (the parked crosshair). */
  width: number;
  xEnd: number;
  /** Price at the top gridline (plot y 8) and the bottom one (plot y 170). */
  axisTop: number;
  axisBottom: number;
  /** Formatted values without the glyph ("6,550"); the sheet prefixes glyph + space. */
  yLabels: string[];
  xLabels: string[];
  xAxisPadLeft: number;
  firstDate: Date;
  lastDate: Date;
  /** Marker box top, in chart-region coordinates, before any scrubbing. */
  restMarkerTop: number;
  /** Lowest price in the window — the read-out turns warm ink when it sits on it. */
  minPrice: number;
};

export function computedPlot(series: PricePoint[], range: RangeKey, plotWidth: number): PlotData {
  const w = buildWindow(series, range, plotWidth);
  return {
    fill: w.fillPath,
    line: w.linePath,
    gradientY1: PLOT.yTop,
    gradientY2: PLOT.gradientBottom,
    width: plotWidth,
    xEnd: xEndFor(plotWidth),
    axisTop: w.yLabels[0],
    axisBottom: w.yLabels[w.yLabels.length - 1],
    yLabels: w.yLabels.map(formatMoney),
    xLabels: w.xLabels,
    xAxisPadLeft: X_AXIS_PAD[range],
    firstDate: w.points[0].date,
    lastDate: w.points[w.points.length - 1].date,
    restMarkerTop: 32 + 1 + w.last.y - 4,
    minPrice: Math.min(...w.points.flatMap((pt) => (pt.price === null ? [] : [pt.price]))),
  };
}

/** Invert plot y back to a price; exact, since the computed axis is linear. */
export function priceAtY(p: PlotData, y: number) {
  const t = (y - PLOT.yTop) / (PLOT.yBottom - PLOT.yTop);
  return p.axisTop - t * (p.axisTop - p.axisBottom);
}

/** Date under a plot x, interpolated across the window. */
export function dateAtX(p: PlotData, x: number) {
  const t = Math.min(1, Math.max(0, x / p.xEnd));
  const ms = p.firstDate.getTime() + t * (p.lastDate.getTime() - p.firstDate.getTime());
  return new Date(ms);
}

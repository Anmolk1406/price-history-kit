import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import crosshair from '@assets/pdp/price-history/hover-crosshair.svg';
import hoverDot from '@assets/pdp/price-history/hover-dot.svg';
import hoverMarker from '@assets/pdp/price-history/hover-marker.svg';
import { PLOT, REGION_PLOT_LEFT } from './lib/chartGeom';
import { dateAtX, fmtDay, priceAtY, type PlotData } from './lib/plot';
import { formatMoney } from './lib/priceMath';
import { glyph } from './lib/money';
import styles from './Chart.module.css';

/** Chart region insets — the region has pt-32 / px-12 and the plot sits at
 *  grid-top + 1, so plot(0,0) is at region (58, 33). */
const REGION_X = REGION_PLOT_LEFT;
const REGION_Y = 32 + 1;

/** The read-out is clamped to the region's inner bounds (px-12) so it travels
 *  with the crosshair without overhanging the card. */
const REGION_INNER_LEFT = 12;
const REGION_PAD_RIGHT = 12;

/** Must match the chartReveal keyframe duration in Chart.module.css — the pointer
 *  waits for the graph to finish drawing before it appears. */
const REVEAL_MS = 900;

/** The plot plus its scrub interaction.
 *
 *  The curve is rendered inline so the crosshair can ask the line where it is at
 *  a given x via getPointAtLength — that is what makes the read-out's price and
 *  date follow the finger. Everything stays inside the plot box; no panning.
 */
export function Chart({
  plot,
  regionWidth,
  pointerAtRest = true,
  /** Hold the reveal back this long after mount — the sheet's slide-in. 0 on a tab change. */
  enterDelay = 0,
}: {
  plot: PlotData;
  /** Chart region width (the white card), for clamping the read-out. */
  regionWidth: number;
  pointerAtRest?: boolean;
  enterDelay?: number;
}) {
  const gradientId = useId();
  const lineRef = useRef<SVGPathElement | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const [scrubX, setScrubX] = useState<number | null>(null);
  const [sampledY, setSampledY] = useState<number | null>(null);
  // Gate moves on our own drag flag rather than hasPointerCapture: capture can
  // silently fail, and losing it would silently kill scrubbing mid-drag.
  const dragging = useRef(false);

  // Held back until the graph has drawn. A timer rather than an animation-delay:
  // timers still fire on a hidden tab, animations freeze.
  const [pointerIn, setPointerIn] = useState(false);

  // Whether the wipe has started. While waiting out enterDelay the clip is held
  // shut by an inline style rather than a backwards animation fill.
  const [drawing, setDrawing] = useState(enterDelay === 0);

  useEffect(() => {
    if (enterDelay === 0) return;
    const t = setTimeout(() => setDrawing(true), enterDelay);
    return () => clearTimeout(t);
  }, [enterDelay]);

  // reset the scrub and re-stage the pointer whenever the curve changes (tab switch)
  useEffect(() => {
    setScrubX(null);
    setSampledY(null);
    setPointerIn(false);
    const t = setTimeout(() => setPointerIn(true), enterDelay + REVEAL_MS);
    return () => clearTimeout(t);
  }, [plot.line, enterDelay]);

  /** Walk the path to find y at a given x. Charts are monotonic in x, so a
   *  bisection over path length converges in ~20 steps. */
  const yAt = useCallback((x: number) => {
    const path = lineRef.current;
    if (!path) return null;
    const total = path.getTotalLength();
    let lo = 0;
    let hi = total;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const p = path.getPointAtLength(mid);
      if (p.x < x) lo = mid;
      else hi = mid;
    }
    return path.getPointAtLength((lo + hi) / 2).y;
  }, []);

  const onScrub = useCallback(
    (clientX: number) => {
      const el = regionRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // clientX -> plot x, clamped to the drawn data range. The phone frame may be
      // scaled (CSS transform), so convert screen px back to layout px.
      const scale = el.offsetWidth ? r.width / el.offsetWidth : 1;
      const x = Math.min(plot.xEnd, Math.max(0, (clientX - r.left) / (scale || 1)));
      setScrubX(x);
      setSampledY(yAt(x));
    },
    [yAt, plot.xEnd],
  );

  const endScrub = () => {
    dragging.current = false;
    setScrubX(null);
    setSampledY(null);
  };

  const active = scrubX !== null && sampledY !== null;
  const restMarkerTop = plot.restMarkerTop;
  const markerX = active ? scrubX! : plot.xEnd;
  const markerTopRegion = active ? REGION_Y + sampledY! - 4 : restMarkerTop;
  const readPrice = active ? priceAtY(plot, sampledY!) : priceAtY(plot, restMarkerTop + 4 - REGION_Y);
  const readDate = active ? dateAtX(plot, scrubX!) : plot.lastDate;
  const priceText = formatMoney(readPrice);

  return (
    <>
      <div
        ref={regionRef}
        // Plot origin is region (58, 33): the grid sits at region x 12 / y 32 and
        // the plot at 46 / 1 inside the grid.
        className={`${styles.plot} ${drawing ? styles.reveal : ''}`}
        style={{
          width: plot.width,
          height: PLOT.height,
          clipPath: drawing ? undefined : 'inset(0 100% 0 0)',
        }}
        onPointerDown={(e) => {
          dragging.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* capture is a nicety — dragging.current is what drives the scrub */
          }
          onScrub(e.clientX);
        }}
        onPointerMove={(e) => {
          // drag on touch; plain hover is enough with a mouse
          if ((dragging.current || e.pointerType === 'mouse')) onScrub(e.clientX);
        }}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onPointerLeave={endScrub}
      >
        <svg
          width={plot.width}
          height={PLOT.height}
          viewBox={`0 0 ${plot.width} ${PLOT.height}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Price trend"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1={plot.gradientY1} x2="0" y2={plot.gradientY2} gradientUnits="userSpaceOnUse">
              <stop className={styles.stopTop} stopOpacity={PLOT.fillTopOpacity} />
              <stop className={styles.stopBottom} offset="1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={plot.fill} fill={`url(#${gradientId})`} />
          <path ref={lineRef} className={styles.line} d={plot.line} strokeWidth={PLOT.strokeWidth} strokeLinejoin="round" />
        </svg>
      </div>

      {/* Scrubbing shows the pointer immediately; the parked pointer waits for
          the reveal and then animates in. */}
      {(active || (pointerAtRest && pointerIn)) && (
        <Pointer
          x={REGION_X + markerX}
          markerTop={markerTopRegion}
          innerRight={regionWidth - REGION_PAD_RIGHT}
          priceText={priceText}
          dateText={fmtDay(readDate)}
          lowest={priceText === formatMoney(plot.minPrice)}
          animateIn={!active}
        />
      )}
    </>
  );
}

/** Scrub read-out — Group 28267 (24660:66565): a 0.5px dashed crosshair spanning
 *  the plot, an 8px marker on the curve, and a pill that travels with them.
 *
 *  Centring is a translateX on a wrapper, not on the pill itself: the pill's own
 *  transform belongs to the pointerPillIn entrance, and a keyframe's `transform`
 *  replaces the whole property rather than composing with it. */
function Pointer({
  x,
  markerTop,
  innerRight,
  priceText,
  dateText,
  lowest,
  animateIn,
}: {
  x: number;
  markerTop: number;
  innerRight: number;
  priceText: string;
  dateText: string;
  /** On the window's lowest price — 4.png: the price in warm ink. */
  lowest: boolean;
  animateIn: boolean;
}) {
  // Measured rather than assumed — the pill's width moves with the value and the
  // date. useLayoutEffect so the clamp is applied before the browser paints.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [pillW, setPillW] = useState(0);
  useLayoutEffect(() => {
    const w = wrapRef.current?.offsetWidth ?? 0;
    if (w) setPillW(w);
  }, [priceText, dateText]);

  const half = pillW / 2;
  const pillX = Math.min(innerRight - half, Math.max(REGION_INNER_LEFT + half, x));

  return (
    <>
      <div aria-hidden className={`${styles.crosshair} ${animateIn ? styles.lineIn : ''}`} style={{ left: x, top: 30.19, height: 172.806 }}>
        <div className={styles.crosshairInner}>
          <img src={crosshair} alt="" className={styles.fill} />
        </div>
      </div>

      <div ref={wrapRef} className={styles.pillWrap} style={{ left: pillX, top: 9 }}>
        <div className={`${styles.pill} ${animateIn ? styles.pillIn : ''}`} aria-live="polite">
          <p className={`${styles.pillPrice} ${lowest ? styles.pillPriceLowest : ''}`}>
            {glyph} {priceText}
          </p>
          <img src={hoverDot} alt="" aria-hidden className={styles.dot} />
          <p className={styles.pillDate}>{dateText}</p>
        </div>
      </div>

      <img src={hoverMarker} alt="" aria-hidden className={`${styles.marker} ${animateIn ? styles.dotIn : ''}`} style={{ left: x - 4, top: markerTop }} />
    </>
  );
}


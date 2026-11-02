import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import discountTagBest from '@assets/pdp/price-history/discount-tag-best.svg';
import chevRightBold16 from '@assets/pdp/price-history/chev-right-bold-16.svg';
import trendDown from '@assets/pdp/price-history/trend-down.svg';
import { SheetDecor } from './SheetDecor';
import { Chart } from './Chart';
import { glyph, moneyParts, plainAmount } from './lib/money';
import { plotWidthFor, type RangeKey } from './lib/chartGeom';
import { computedPlot } from './lib/plot';
import { buildSeries } from './lib/series';
import { SHEET_BANNER, SHEET_CHROME, sheetMetrics } from './lib/sheet';
import styles from './PriceHistorySheet.module.css';

/** Sheet motion, from the noon-motion standard (choreography "Bottom sheet"):
 *  the scrim fades in-out over 400ms and the sheet rises 50ms later on the MOVE
 *  spring (ProtoPie 300/28, ζ 0.81), which overshoots ~1.3% before settling. The
 *  exit runs the same values back. Reduced motion fades in place instead. */
const MOVE_SPRING = { type: 'spring', stiffness: 280.6, damping: 27.14, mass: 1 } as const;
const SCRIM_FADE = { duration: 0.4, ease: [0.65, 0, 0.35, 1] } as const;
const REDUCED_FADE = { duration: 0.2, ease: [0.33, 1, 0.68, 1] } as const;
/** noonSheet: dismiss past this drag (px) or release velocity (px/s). */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 650;
/** MOVE peaks at ~320ms (plus the 50ms lead) — the chart starts drawing as the
 *  sheet settles out of its overshoot. */
const SHEET_ENTER_MS = 370;
/** The white chart card on a 375 screen (351 sheet less its 12px gutters). */
const DESIGN_REGION_W = 327;

/** Price-history bottom sheet — nodes 24660:45606 (static) and 24660:63803 (hover).
 *
 *  Scrim -> grabber (28) -> sheet card (#F9F9FB, r16, 2px inset white ring) ->
 *  ATC footer (72) -> home-indicator gap (33). Bottom-anchored and full width of
 *  its container (the phone screen's overlay layer); the card keeps a 12px inset.
 *
 *  The white stroke is an inset ring, not a border: a Figma stroke doesn't push
 *  children, so a CSS border would shift every child 2px and shrink the footer.
 */
export function PriceHistorySheet({
  open,
  onClose,
  price,
  bestPrice,
  verdict,
  onAddToCart,
  onBuyNow,
}: {
  open: boolean;
  onClose: () => void;
  price: number;
  bestPrice?: number;
  verdict?: string;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
}) {
  // The sheet composes per case (26505:131488): a best price adds a pill under the price, a verdict adds a bar at the
  // bottom of the chart card, and the sheet's height follows.
  const bestPill = bestPrice !== undefined;
  const v = sheetMetrics({ verdict: !!verdict, bestPill });
  const [range, setRange] = useState<RangeKey>(v.defaultRange);
  // The graph waits out the slide so it draws on a sheet that has already
  // landed; a tab change has no slide to wait for, so it draws immediately.
  const [chartDelay, setChartDelay] = useState(SHEET_ENTER_MS);
  const drag = useDragControls();
  const reduce = useReducedMotion();

  // The plot box follows the card width (257 at the designed 327).
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [regionW, setRegionW] = useState(DESIGN_REGION_W);
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth;
      if (w) setRegionW(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // Series ends exactly on `price`; with a verdict, that last point is the 30-day low.
  const series = useMemo(() => buildSeries(price, new Date(), { endOnLow: !!verdict }), [price, verdict]);
  const plot = useMemo(() => computedPlot(series, range, plotWidthFor(regionW)), [series, range, regionW]);
  // 26211:55300 — "Price dropped by 20% in last 30 days": the drop from the series' price 30 days ago.
  const monthAgo = series[series.length - 30]?.price ?? price;
  const dropPct = Math.max(0, Math.round(((monthAgo - price) / monthAgo) * 100));
  const verdictText = `Price dropped by ${dropPct}% in last 30 days`;

  // AnimatePresence keeps the sheet mounted through its exit, so closing is
  // just handing control back to the parent.
  const close = () => {
    setChartDelay(SHEET_ENTER_MS);
    onClose();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) close();
  };

  const p = moneyParts(price);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div key="sheet" className={styles.root} initial="hidden" animate="shown" exit="hidden">
          {/* Scrim — 24660:45605 */}
          <motion.button
            type="button"
            aria-label={SHEET_CHROME.close}
            onClick={close}
            variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
            transition={SCRIM_FADE}
            className={styles.scrim}
          />

          {/* The whole frame — grabber, card, footer, home-indicator gap — travels
              as one unit. Dragged from the grabber only, so the chart's scrub
              keeps its own pointer events. */}
          <motion.div
            className={styles.frame}
            style={{ height: v.height }}
            role="dialog"
            aria-modal="true"
            aria-label={SHEET_CHROME.title}
            variants={reduce ? { hidden: { opacity: 0 }, shown: { opacity: 1 } } : { hidden: { y: '100%' }, shown: { y: 0, transition: { ...MOVE_SPRING, delay: 0.05 } } }}
            transition={reduce ? REDUCED_FADE : MOVE_SPRING}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.8 }}
            onDragEnd={onDragEnd}
          >
            {/* Grabber — 24660:45607 */}
            <div onPointerDown={(e) => drag.start(e)} className={styles.grabber}>
              <div className={styles.grabberBar} />
            </div>

            {/* Sheet wrapper — 24660:45609 */}
            <div className={styles.wrapper} style={{ height: v.sheetHeight }}>
              {/* Sheet — 24660:45610 */}
              <div className={styles.sheet} style={{ height: v.sheetHeight }}>
                <SheetDecor />

                <div className={styles.body}>
                  {/* price header — 24660:45678 */}
                  <div className={styles.header} style={{ height: v.headerHeight }}>
                    <div className={styles.priceBlock} style={{ gap: v.priceGap }}>
                      <span className={styles.priceLabel}>{SHEET_CHROME.priceLabel}</span>
                      {/* the 34px span carries leading-0 and the 24px span leading-32,
                          so the line box is exactly 32 (24660:45682) */}
                      <p className={styles.price}>
                        <span className={styles.priceMajor}>
                          {p.glyph} {p.major}
                        </span>
                        <span className={styles.priceMinor}>.{p.minor}</span>
                      </p>
                    </div>

                    {/* Best-price pill — 26520:132816: tag, then "Best price Đ 2699 with offers" in one line */}
                    {bestPill && (
                      <button type="button" className={styles.bestPill}>
                        <span className={styles.bestPillInner}>
                          <img src={discountTagBest} alt="" aria-hidden className={styles.icon16} />
                          <span className={styles.bestPillLabel}>
                            {SHEET_BANNER.labelAccent}{' '}
                            <span className={styles.bestPillPrice}>
                              {glyph} {plainAmount(bestPrice!)}
                            </span>
                            {SHEET_BANNER.label}
                          </span>
                        </span>
                        <img src={chevRightBold16} alt="" aria-hidden className={styles.icon16} />
                      </button>
                    )}
                  </div>

                  {/* chart card — 24660:45689 / 45690 */}
                  <div className={styles.chartOuter}>
                    <div ref={cardRef} className={styles.chartCard}>
                      {/* header — 24660:45692 */}
                      <div className={styles.chartHeader}>
                        <p className={styles.chartTitle}>{SHEET_CHROME.title}</p>
                        <div className={styles.pills}>
                          {SHEET_CHROME.ranges.map((r) => (
                            <RangePill
                              key={r}
                              label={r}
                              active={r === range}
                              onClick={() => {
                                setChartDelay(0);
                                setRange(r);
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* chart region — 24660:45703 / 66535 */}
                      <div className={styles.region}>
                        {/* grid: four 18px rows, gap 36 -> 180, rules at 9/63/117/171 */}
                        <div className={styles.grid}>
                          {plot.yLabels.map((label, i) => (
                            <div key={`${label}-${i}`} className={styles.gridRow}>
                              <span className={styles.yLabel}>
                                {glyph} {label}
                              </span>
                              {/* 1px rule, no padding (see the source note on Figma's fixed 1px height) */}
                              <div className={styles.rule} />
                            </div>
                          ))}
                        </div>

                        {/* x axis — 24660:45727 / 66559 */}
                        <div className={styles.xAxis} style={{ paddingLeft: plot.xAxisPadLeft }}>
                          <div className={styles.xLabels}>
                            {plot.xLabels.map((l, i) => (
                              <span key={`${l}-${i}`} className={i === plot.xLabels.length - 1 ? styles.xLabelToday : styles.xLabel}>
                                {l}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* plot + scrub — 24660:45721 / 66553, pointer 24660:66565.
                            Keyed so switching tab remounts it and replays the reveal. */}
                        <Chart key={range} plot={plot} regionWidth={regionW} enterDelay={chartDelay} />
                      </div>

                      {/* Verdict, under the graph — 26505:131472 */}
                      {verdict && (
                        <div className={styles.cardVerdictWrap}>
                          <div className={styles.cardVerdict}>
                            <img src={trendDown} alt="" aria-hidden className={`${styles.icon20} ${styles.trendIn}`} />
                            <p className={`${styles.verdictText} ${styles.textShimmer}`}>{verdictText}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ATC footer — 24660:45735 */}
                <div className={styles.footer}>
                  <div className={styles.footerRow}>
                    <button type="button" className={styles.buyNow} onClick={onBuyNow}>
                      {SHEET_CHROME.buyNow}
                    </button>
                    <button type="button" className={styles.addToCart} onClick={onAddToCart}>
                      {SHEET_CHROME.addToCart}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Home-indicator gap — 24660:45740 (the phone frame draws the bar itself) */}
            <div className={styles.homeGap} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Range pill — 24660:45696. 52x30; the active pill inverts to #1D2539. */
function RangePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${styles.pill} ${active ? styles.pillActive : ''}`}>
      <span className={styles.pillLabel}>{label}</span>
    </button>
  );
}

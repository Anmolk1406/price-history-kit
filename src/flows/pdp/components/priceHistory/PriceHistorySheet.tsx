import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';
import trendDown from '@assets/pdp/price-history/trend-down.svg';
import { SheetDecor } from './SheetDecor';
import { Chart, REVEAL_MS } from './Chart';
import { glyph, moneyParts } from './lib/money';
import { plotWidthFor, type RangeKey } from './lib/chartGeom';
import { computedPlot } from './lib/plot';
import { buildSeries, type SeriesOpts } from './lib/series';
import { OriginIcon } from '../../../../components';
import { SHEET_CHROME, sheetMetrics } from './lib/sheet';
import styles from './PriceHistorySheet.module.css';
import sk from './Skeleton.module.css';

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
/** When the verdict pill's reveal starts, counted from when the graph starts drawing: 100ms before the sheet's slide
 *  ends, so the pill is already arriving as the sheet settles. */
const VERDICT_AFTER_GRAPH_MS = -100;
/** Skeleton label widths (26711:36897): y labels alternate so the column doesn't read as one stripe. */
const SK_Y_W = [38, 34, 38, 34];
const SK_X_W = [36, 34, 36, 30, 36];

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
  loadingMs = 0,
  verdict,
  seriesOpts,
  pillReveal = true,
  onAddToCart,
  onBuyNow,
}: {
  open: boolean;
  onClose: () => void;
  price: number;
  /** Loading skeleton (26711:36897): shown this long after the sheet lands; null holds it, 0 skips it. */
  loadingMs?: number | null;
  /** Verdict pill copy and icon, and the range tab the sheet opens on. */
  verdict?: { long: string; icon: 'trend-down' | 'calendar'; range: RangeKey };
  /** How the price history is drawn (see buildSeries); built from the same opts as the verdict copy. */
  seriesOpts?: SeriesOpts;
  /** false: the verdict pill is already in place when the sheet lands, and only its ink sweep plays. */
  pillReveal?: boolean;
  onAddToCart?: () => void;
  onBuyNow?: () => void;
}) {
  // A verdict adds its pill under the price, and the sheet's height follows.
  const v = sheetMetrics({ verdict: !!verdict });
  // the verdict picks the opening tab, so the low it claims is the one on screen
  const [range, setRange] = useState<RangeKey>(verdict?.range ?? v.defaultRange);
  // The graph waits out the slide so it draws on a sheet that has already
  // landed; a tab change has no slide to wait for, so it draws immediately.
  const [chartDelay, setChartDelay] = useState(SHEET_ENTER_MS);
  const drag = useDragControls();
  const reduce = useReducedMotion();

  // Each open starts on the skeleton (unless it's off) and swaps to the data once the simulated fetch lands; the
  // graph then draws straight away, since the sheet has long settled. Layout effect, so no frame of data shows first.
  const [loaded, setLoaded] = useState(loadingMs === 0);
  useLayoutEffect(() => {
    if (!open) return;
    if (loadingMs === 0) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    if (loadingMs === null) return;
    const t = setTimeout(() => {
      setChartDelay(0);
      setLoaded(true);
    }, SHEET_ENTER_MS + loadingMs);
    return () => clearTimeout(t);
  }, [open, loadingMs]);
  const skeleton = !loaded;
  // data that replaces a skeleton fades in over it
  const fadeIn = loadingMs === 0 ? '' : styles.contentIn;

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

  // The shared shimmer needs each placeholder's x inside the body (see Skeleton.module.css). The phone frame may be
  // scaled, so screen px are converted back to layout px.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!skeleton || !body) return;
    const r = body.getBoundingClientRect();
    const scale = body.offsetWidth ? r.width / body.offsetWidth : 1;
    body.querySelectorAll<HTMLElement>('[data-sk]').forEach((el) => {
      el.style.setProperty('--sk-x', `${(el.getBoundingClientRect().left - r.left) / (scale || 1)}px`);
    });
  }, [skeleton, regionW, open]);

  // Series ends exactly on `price`; the opts place the low the verdict talks about.
  const { lowDays, lowAgo } = seriesOpts ?? {};
  const series = useMemo(() => buildSeries(price, new Date(), { lowDays, lowAgo }), [price, lowDays, lowAgo]);
  const plot = useMemo(() => computedPlot(series, range, plotWidthFor(regionW)), [series, range, regionW]);

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
            aria-busy={skeleton}
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

                <div ref={bodyRef} className={`${styles.body} ${skeleton ? sk.sweep : ''}`}>
                  {/* price header — 24660:45678 */}
                  <div className={styles.header} style={{ height: v.headerHeight }}>
                    <div className={styles.priceBlock} style={{ gap: v.priceGap }}>
                      {skeleton ? (
                        <span aria-hidden className={styles.skPriceLabel} />
                      ) : (
                        <span className={`${styles.priceLabel} ${fadeIn}`}>{SHEET_CHROME.priceLabel}</span>
                      )}
                      {/* the 34px span carries leading-0 and the 24px span leading-32,
                          so the line box is exactly 32 (24660:45682) */}
                      {skeleton ? (
                        <span aria-hidden data-sk className={`${sk.sk} ${styles.skPrice}`} />
                      ) : (
                        <p className={`${styles.price} ${fadeIn}`}>
                          <span className={styles.priceMajor}>
                            {p.glyph} {p.major}
                          </span>
                          <span className={styles.priceMinor}>.{p.minor}</span>
                        </p>
                      )}
                    </div>

                    {/* Verdict pill — 26211:55298. h-30 explicit so the 1px stroke sits inside, as it does in Figma.
                        Animates once the graph has drawn: the arrow, then a shimmer through the text. */}
                    {verdict && skeleton && <span aria-hidden data-sk className={`${sk.sk} ${styles.skVerdict}`} />}
                    {verdict && !skeleton && (
                      <div
                        className={styles.verdict}
                        data-static={pillReveal ? undefined : ''}
                        style={{ '--ph-after-graph': `${chartDelay + VERDICT_AFTER_GRAPH_MS}ms`, '--ph-ink-at': `${chartDelay + REVEAL_MS}ms` } as CSSProperties}
                      >
                        <span className={styles.verdictIcon}>
                          {verdict.icon === 'trend-down' ? (
                            <img src={trendDown} alt="" aria-hidden className={styles.icon20} />
                          ) : (
                            <OriginIcon name={verdict.icon} size={20} color="#913d09" /* custom-color — verdict ink, as the trend arrow (no token) */ />
                          )}
                        </span>
                        <p className={styles.verdictText}>{verdict.long}</p>
                      </div>
                    )}
                  </div>

                  {/* chart card — 24660:45689 / 45690 */}
                  <div className={styles.chartOuter}>
                    <div ref={cardRef} className={styles.chartCard}>
                      {/* header — 24660:45692 */}
                      <div className={styles.chartHeader}>
                        {skeleton ? (
                          <span aria-hidden data-sk className={`${sk.sk} ${sk.onCard} ${styles.skTitle}`} />
                        ) : (
                          <p className={`${styles.chartTitle} ${fadeIn}`}>{SHEET_CHROME.title}</p>
                        )}
                        {skeleton ? (
                          <div aria-hidden className={styles.pills}>
                            {SHEET_CHROME.ranges.map((r) => (
                              <span key={r} data-sk className={`${sk.sk} ${sk.onCard} ${styles.skPill}`} />
                            ))}
                          </div>
                        ) : (
                          <div className={`${styles.pills} ${fadeIn}`}>
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
                        )}
                      </div>

                      {/* chart region — 24660:45703 / 66535 */}
                      <div className={styles.region}>
                        {/* grid: four 18px rows, gap 36 -> 180, rules at 9/63/117/171 */}
                        <div className={styles.grid}>
                          {plot.yLabels.map((label, i) => (
                            <div key={`${label}-${i}`} className={styles.gridRow}>
                              {skeleton ? (
                                <span aria-hidden data-sk className={`${sk.sk} ${sk.onCard} ${styles.skLabel}`} style={{ width: SK_Y_W[i % SK_Y_W.length] }} />
                              ) : (
                                <span className={`${styles.yLabel} ${fadeIn}`}>
                                  {glyph} {label}
                                </span>
                              )}
                              {/* 1px rule, no padding (see the source note on Figma's fixed 1px height) */}
                              <div className={styles.rule} />
                            </div>
                          ))}
                        </div>

                        {/* x axis — 24660:45727 / 66559 */}
                        <div className={styles.xAxis} style={{ paddingLeft: plot.xAxisPadLeft }}>
                          <div className={styles.xLabels}>
                            {plot.xLabels.map((l, i) =>
                              skeleton ? (
                                <span key={`${l}-${i}`} aria-hidden data-sk className={`${sk.sk} ${sk.onCard} ${styles.skLabel}`} style={{ width: SK_X_W[i % SK_X_W.length] }} />
                              ) : (
                                <span key={`${l}-${i}`} className={`${i === plot.xLabels.length - 1 ? styles.xLabelToday : styles.xLabel} ${fadeIn}`}>
                                  {l}
                                </span>
                              ),
                            )}
                          </div>
                        </div>

                        {/* plot + scrub — 24660:45721 / 66553, pointer 24660:66565.
                            Keyed so switching tab remounts it and replays the reveal. The skeleton draws no graph: only
                            the axis placeholders show until the data lands. */}
                        {!skeleton && <Chart key={range} plot={plot} regionWidth={regionW} enterDelay={chartDelay} />}
                      </div>
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

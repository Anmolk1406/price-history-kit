import { useId } from 'react';
import priceHistoryDown from '@assets/pdp/price-history/price-history-down.svg?raw';
import styles from './PriceCaseBlock.module.css';

/** The Figma "Price history" tag icon (PDP-new-features 26968:11763), read from the asset so every shape stays the
 *  file's own: three bars and the down-trend arrow, in the asset's group offset. */
const part = (name: string) => new RegExp(`data-part="${name}" d="([^"]+)"`).exec(priceHistoryDown)?.[1] ?? '';
const OFFSET = /translate\(([^)]+)\)/.exec(priceHistoryDown)?.[1] ?? '0 0';
const BARS = ['bar1', 'bar2', 'bar3'].map(part);
const ARROW = part('arrow');

/**
 * "Past low" chip icon, looping (PriceCaseBlock.module.css, "trend icon").
 *
 * Bars: each changes height in place (scaleY from its own bottom edge, so it stays on the arrow), one after another.
 * Arrow: a trim path. The asset's arrow is a filled outline, which can't be trimmed, so the outline is the mask and a
 * stroke down the arrow's centre line, wider than the outline, is what animates (stroke-dashoffset on the line and
 * the two head legs, measured in one shared length so the legs move together); what shows is always the asset's own
 * arrow. The dash pattern is one arrow's length then a gap, so as the
 * trim clips the arrow away tail first, the next arrow is already drawing in behind it after that gap: the icon is
 * never empty. The tail starts a little behind the round end and the head's legs run past theirs, so nothing peeks
 * through before the trim reaches it.
 */
export function TrendIcon() {
  const maskId = useId();
  return (
    <span className={styles.trendIcon} aria-hidden>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <g transform={`translate(${OFFSET})`}>
          {BARS.map((d, i) => (
            <path key={i} className={styles.trendBar} style={{ animationDelay: `calc(var(--trend-bars-at) + ${i * 90}ms)` }} d={d} fill="#913D09" />
          ))}
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-2" y="-2" width="18" height="18">
            <path d={ARROW} fill="#fff" />
          </mask>
          <g mask={`url(#${maskId})`} stroke="#913D09" strokeWidth={2.2} strokeLinecap="butt" strokeLinejoin="round" fill="none">
            {/* The arrow in "arrow units" (TREND_UNITS): the line tail → kink → peak → corner is 0–16.877, then both
                head legs run 16.877–20.977 side by side, so the head trims on and off symmetrically. Every path
                carries the same dash pattern (one arrow, then the gap), offset by where it starts along the arrow. */}
            <path className={styles.trendTrimLine} pathLength={16.877} d="M-0.1 6.567 L4.5 11.167 L7.167 8.5 L11.833 13.167" />
            <path className={styles.trendTrimHead} pathLength={4.1} d="M11.833 13.167 L7.9 13.167" />
            <path className={styles.trendTrimHead} pathLength={4.1} d="M11.833 13.167 L11.833 8.9" />
          </g>
        </g>
      </svg>
    </span>
  );
}

import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { layout } from '../foundations/tokens';
import { COVER_HINGE_RADIUS, deviceLayout, RAIL_WIDTH, type DeviceLayout } from './deviceLayout';
import type { RailSlot } from './Rail';
import { squircleCorners, squirclePath } from './squircle';
import styles from './PhoneFrame.module.css';

/**
 * The device screen: status bar + home indicator, no bezel, no island, corners clipped to a smoothed squircle
 * (layout.screenRadius, layout.screenSmoothing). Default size is the iPhone (390×844); `size` gives another device
 * (the iPhone Duo postures, src/kit/deviceLayout.ts). `frameless` renders the bare viewport; `fit` fills the browser
 * window instead (a prototype opened on a phone or foldable), using the browser's own safe areas and no fake chrome.
 *
 * On the Duo rail postures (`closed`, `landscape`) it draws the 84pt rail column with its slots (`onRailSlot`) and
 * moves the clock into it; screens pad themselves clear of it through `--nk-inset-left` / `--nk-inset-right`.
 */
export function PhoneFrame({
  children,
  statusBar = 'dark',
  frameless,
  scale = 1,
  time = '9:41',
  size,
  fit,
  onRailSlot,
}: {
  children: ReactNode;
  statusBar?: 'dark' | 'light';
  frameless?: boolean;
  scale?: number;
  time?: string;
  size?: { width: number; height: number };
  fit?: boolean;
  onRailSlot?: (slot: RailSlot) => (el: HTMLElement | null) => void;
}) {
  const width = size?.width ?? layout.deviceWidth;
  const height = size?.height ?? layout.deviceHeight;
  const dl = useMemo(() => deviceLayout(width, height), [width, height]);
  // the folded cover's hinge side (left) is nearly square
  const clip = useMemo(() => {
    const r = layout.screenRadius;
    const h = COVER_HINGE_RADIUS;
    const path = dl.posture === 'closed' ? squircleCorners(width, height, [h, r, r, h], layout.screenSmoothing) : squirclePath(width, height, r, layout.screenSmoothing);
    return `path('${path}')`;
  }, [width, height, dl.posture]);
  const chrome = !fit;
  const vars = {
    ...insetVars(dl, fit),
    width,
    height,
    clipPath: frameless || fit ? undefined : clip,
  } as CSSProperties;
  return (
    <div className={fit ? styles.fit : frameless ? styles.frameless : styles.device} style={{ transform: scale !== 1 && !fit ? `scale(${scale})` : undefined }}>
      <div className={styles.viewport} style={vars} data-posture={dl.posture}>
        {children}
        {dl.hasRail && (
          <div className={styles.rail} data-side={dl.railSide} data-tone={statusBar}>
            <div className={styles.railHeader}>
              {chrome && (
                <div className={styles.railStatus}>
                  <span className={styles.railTime}>{time}</span>
                  <span className={styles.railSignal} aria-hidden>
                    <span className={styles.railRing} />
                    <span className={styles.railWifi} />
                    <span className={styles.railDots}><i /><i /><i /><i /></span>
                  </span>
                </div>
              )}
              <div className={styles.railButtons}>
                <div className={styles.railGroup} ref={onRailSlot?.('leading')} />
                <div className={styles.railGroup} ref={onRailSlot?.('trailing')} />
              </div>
            </div>
            <div className={styles.railTabs} ref={onRailSlot?.('tabs')} />
          </div>
        )}
        {chrome && !dl.hasRail && (
          <div className={styles.statusBar} data-tone={statusBar} data-wide={dl.posture === 'widePortrait' || undefined}>
            <span className={styles.time}>{time}</span>
            <span className={styles.sysIcons}>
              {/* Figma iOS status bar (Cellular 19.2 × 12.23, Wifi 17.14 × 12.33, Battery 27.33 × 13), snapped to whole pixels so
                  the edges stay crisp: every box is 13 high and starts on a pixel, every straight edge sits on a pixel or half pixel */}
              <svg width="18" height="13" viewBox="0 0 18 13" fill="currentColor" aria-hidden><rect x="0" y="9" width="3" height="4" rx="1" /><rect x="5" y="7" width="3" height="6" rx="1" /><rect x="10" y="4" width="3" height="9" rx="1" /><rect x="15" y="1" width="3" height="12" rx="1" /></svg>
              <svg width="17" height="13" viewBox="0 -0.5 15.27 11.97" fill="currentColor" aria-hidden><path d="M7.63 2.3c2.2 0 4.33.85 5.93 2.36.12.12.31.12.43 0l1.15-1.17a.32.32 0 0 0 0-.45 10.07 10.07 0 0 0-15.03 0 .32.32 0 0 0 0 .45l1.15 1.17c.12.12.31.12.43 0A8.55 8.55 0 0 1 7.63 2.3Zm0 3.81c1.2 0 2.37.45 3.26 1.26.12.12.31.11.43 0l1.15-1.17a.32.32 0 0 0 0-.46 6.61 6.61 0 0 0-9.68 0 .32.32 0 0 0 0 .46l1.15 1.17c.12.11.31.12.43 0a4.84 4.84 0 0 1 3.26-1.26Zm2.3 2.73a.31.31 0 0 0 0-.46 3.5 3.5 0 0 0-4.6 0 .31.31 0 0 0 0 .46l1.99 2a.32.32 0 0 0 .45 0l2.16-2Z" /></svg>
              <svg width="27" height="13" viewBox="0 0 27 13" fill="none" aria-hidden><rect x=".5" y=".5" width="24" height="12" rx="3.8" stroke="currentColor" opacity=".35" /><rect x="2" y="2" width="21" height="9" rx="2.5" fill="currentColor" /><path d="M25.5 4.5v4c.9-.3 1.5-1.1 1.5-2s-.6-1.7-1.5-2Z" fill="currentColor" opacity=".4" /></svg>
            </span>
          </div>
        )}
        {chrome && <div className={styles.homeIndicator} data-tone={statusBar} />}
      </div>
    </div>
  );
}

/**
 * The insets every screen reads: `--nk-inset-top` / `-bottom` (status bar, home indicator; the Duo values from
 * bappzaar NoonScreenInsetsUtil), `--nk-inset-left` / `-right` (the rail column) and `--nk-layout-tab-bar` (0 where the
 * tabs live in the rail: bappzaar getBottomTabsHeight). `fit` takes top / bottom from the browser's safe areas.
 */
function insetVars(dl: DeviceLayout, fit?: boolean): Record<string, string> {
  const rail = `${RAIL_WIDTH}px`;
  const edge = dl.posture === 'none' ? 0 : dl.insets.bottom;
  const vars: Record<string, string> = {
    '--nk-inset-top': fit ? `max(env(safe-area-inset-top, 0px), ${dl.hasRail ? dl.insets.top : 0}px)` : `${dl.insets.top}px`,
    '--nk-inset-bottom': fit ? `max(env(safe-area-inset-bottom, 0px), ${edge}px)` : `${dl.insets.bottom}px`,
    '--nk-inset-left': dl.railSide === 'left' ? rail : '0px',
    '--nk-inset-right': dl.railSide === 'right' ? rail : '0px',
    '--nk-window-width': `${dl.width}px`,
  };
  if (dl.hasRail) vars['--nk-layout-tab-bar'] = '0px';
  return vars;
}

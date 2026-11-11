import { useDeviceLayout, type Posture } from '../../../kit/deviceLayout';

/**
 * iPhone Duo rules for review submission — bappzaar `marketplaces/noon/utils/NoonReviewSubmissionSafeAreaUtil.ts`
 * (folded = `closed`, openPortrait = `widePortrait`, openLandscape = `landscape`) and
 * `components/NoonReviewsProductInputChrome` (static chrome). Phone (`none`) has no rule: every screen keeps its own.
 * Top / bottom insets equal the shell's `--nk-inset-top` (16 · 84 · 16) except the sticky footer's bottom (16 · 24 · 16),
 * which ReviewFooter applies in CSS.
 */
export const reviewDuo = {
  /** getNoonDuoBottomInset: sticky footer bottom padding (replaces home indicator + 8) */
  footerBottom: { closed: 16, widePortrait: 24, landscape: 16 },
  /** InputChrome STATIC_HEIGHT = 152 − 40 (close) − 8 − 20: product row 64 + 20 below */
  chromeHeight: 84,
  /** InputChrome STATIC_TOP_GAP */
  chromeTopGap: 16,
  /** NOON_DUO_WIDE_PORTRAIT_RAIL_TOP_INSET (NoonDuoLayout.ts): the open-portrait top rail */
  wideRailTop: 76,
} as const;

export interface ReviewDuo {
  posture: Exclude<Posture, 'none'>;
  /** back lives in the rail (closed, landscape); widePortrait keeps the JS button (the kit has no top rail) */
  hasRail: boolean;
  /** top of the static product chrome from the screen top: 16 (closed, landscape) · 76 + 16 = 92 (widePortrait) */
  chromeTop: number;
  /** bottom of the static chrome from the screen top: 100 · 176 · 100 */
  chromeBottom: number;
}

/** The Duo submission layout, or null on a phone (layout unchanged). */
export function useReviewDuo(): ReviewDuo | null {
  const { posture, hasRail } = useDeviceLayout();
  if (posture === 'none') return null;
  const chromeTop = (posture === 'widePortrait' ? reviewDuo.wideRailTop : 0) + reviewDuo.chromeTopGap;
  return { posture, hasRail, chromeTop, chromeBottom: chromeTop + reviewDuo.chromeHeight };
}

import { createContext, useContext, useMemo } from 'react';
import { useDeviceLayout } from '../../../kit/deviceLayout';
import { bz, NOON_IPHONE_WIDTH, VERTICAL_SWITCHER_WIDTH, type BzMetrics, type FeedEnv } from '../tokens.feed';

/**
 * The home feed's width and module geometry. bappzaar's StaticPage measures its list and hands the width to every
 * module (b31db06c621); the kit derives the same width from the device layout:
 * - phone (`none`): the 390pt device, exactly as before;
 * - Duo `closed`: the whole 466 window (home opts out of the root safe area and runs under the 84 rail column);
 * - `widePortrait`: 669;
 * - `landscape`: 951 − 111 (the vertical experience switcher) = 840; the tab rail floats over the right edge.
 */
export function useFeedEnv(): FeedEnv {
  const { posture, width } = useDeviceLayout();
  return useMemo(
    () =>
      posture === 'none'
        ? { W: NOON_IPHONE_WIDTH, windowWidth: NOON_IPHONE_WIDTH, duo: false }
        : { W: width - (posture === 'landscape' ? VERTICAL_SWITCHER_WIDTH : 0), windowWidth: width, duo: true },
    [posture, width],
  );
}

export const BzCtx = createContext<BzMetrics>(bz);
/** The live feed geometry (`bzMetrics` at the feed width); the phone values outside a provider. */
export const useBz = () => useContext(BzCtx);

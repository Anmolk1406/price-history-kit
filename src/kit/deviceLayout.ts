import { createContext, useContext } from 'react';
import { layout } from '../foundations/tokens';

/**
 * Device posture, ported from bappzaar's iPhone Duo support (src/components/NativeRail/NativeRailPosture.ts,
 * src/constants/WindowClassConstants.ts, marketplaces/noon/utils/NoonScreenInsetsUtil.ts).
 *
 * - `none`: a phone. Today's layout, bottom tab bar, status bar on top.
 * - `closed`: the folded Duo cover (466×678). An 84pt camera / rail column on the physical right, the outer edge away
 *   from the hinge, holds the tabs and the header buttons; the JS header and the bottom tab bar hide. The screen's
 *   hinge-side corners (left) are nearly square (`COVER_HINGE_RADIUS`).
 * - `widePortrait`: the open Duo held upright (669×951). The status area sits on top (84); screens keep their JS
 *   header and the bottom tab bar.
 * - `landscape`: the open Duo on its side (951×669), or any window wider than tall and at least 600 wide. The rail
 *   column stays on the physical right.
 *
 * The side follows the noon screens (home header start padding 100 when folded, getPdpDuoContentSize,
 * useNoonLandscapeRtlRailInset: landscape keeps the rail on the physical right in RTL too). On a device the column
 * follows whichever safe-area inset is larger (ping's pingDuoControlsOnLeadingEdge), which the web can't read.
 *
 * A web page can't ask whether it runs on an iPhone Duo, so the posture comes from the window size: at least 600 wide
 * (WindowClassBreakpoints.LG) is a wide window, and a narrow portrait window much squarer than a phone (the cover is
 * 1.46:1, phones are 2.1:1 and taller) is the folded cover.
 */
/** corner radius of the folded cover's hinge-side (left) corners; its outer corners keep the phone's */
export const COVER_HINGE_RADIUS = 10;

export type Posture = 'none' | 'closed' | 'widePortrait' | 'landscape';

/** bappzaar WindowClassBreakpoints */
export const WINDOW_LG = 600;
export const WINDOW_XL = 840;

/** bappzaar DUO_SIDE_RAIL_WIDTH (getPdpLayoutMetrics.ts): the side column, measured on device. */
export const RAIL_WIDTH = 84;
/** bappzaar NoonScreenInsetsUtil.RAIL_EDGE_INSET: top / bottom inset on the rail postures. */
const RAIL_EDGE_INSET = 16;
/** bappzaar NOON_DUO_OPEN_PORTRAIT_TOP_INSET (NoonDuoLayout.ts): the open-portrait status area. */
const WIDE_PORTRAIT_TOP_INSET = 84;

/** below this height / width ratio a narrow portrait window is the folded cover, not a phone (pingDuoLayout.ts) */
const COVER_MAX_RATIO = 1.6;

export function resolvePosture(width: number, height: number): Posture {
  if (!width || !height) return 'none';
  if (width > height) return width >= WINDOW_LG ? 'landscape' : 'none';
  if (width >= WINDOW_LG) return 'widePortrait';
  return height / width < COVER_MAX_RATIO ? 'closed' : 'none';
}

export interface DeviceLayout {
  posture: Posture;
  /** the whole window, including the rail column */
  width: number;
  height: number;
  /** the screens' area: the window minus the rail column */
  contentWidth: number;
  /** physical side of the rail column; undefined when there is none */
  railSide?: 'left' | 'right';
  /** tabs and header buttons live in the rail (closed, landscape) */
  hasRail: boolean;
  /** bappzaar useNoonIsWideWindow: at least 600 wide and wider than tall (two-column PDP, split pane) */
  isWide: boolean;
  /** at least 600 wide in any orientation (WindowClass LG): foldables, tablets */
  isLarge: boolean;
  insets: { top: number; bottom: number };
}

export function deviceLayout(width: number, height: number): DeviceLayout {
  const posture = resolvePosture(width, height);
  const railSide = posture === 'closed' || posture === 'landscape' ? 'right' : undefined;
  const hasRail = !!railSide;
  return {
    posture,
    width,
    height,
    contentWidth: width - (hasRail ? RAIL_WIDTH : 0),
    railSide,
    hasRail,
    isWide: width >= WINDOW_LG && width > height,
    isLarge: width >= WINDOW_LG,
    insets:
      posture === 'none'
        ? { top: layout.statusBar, bottom: layout.homeIndicator }
        : posture === 'widePortrait'
          ? { top: WIDE_PORTRAIT_TOP_INSET, bottom: RAIL_EDGE_INSET }
          : { top: RAIL_EDGE_INSET, bottom: RAIL_EDGE_INSET },
  };
}

/** Devices the desktop preview can show with `?device=<id>`; a touch device always uses its own screen. */
export const DEVICES = {
  iphone: { label: 'iPhone', width: layout.deviceWidth, height: layout.deviceHeight },
  'duo-cover': { label: 'iPhone Duo · folded', width: 466, height: 678 },
  'duo-open': { label: 'iPhone Duo · open', width: 669, height: 951 },
  'duo-landscape': { label: 'iPhone Duo · landscape', width: 951, height: 669 },
} as const;
export type DeviceId = keyof typeof DEVICES;

export const DeviceLayoutCtx = createContext<DeviceLayout>(deviceLayout(layout.deviceWidth, layout.deviceHeight));

/** The window's posture and sizes; re-renders when the window is rotated, folded or resized. */
export const useDeviceLayout = () => useContext(DeviceLayoutCtx);

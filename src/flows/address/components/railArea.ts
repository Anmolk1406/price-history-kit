import { RAIL_WIDTH, type DeviceLayout } from '../../../kit/deviceLayout';
import { addressMetrics } from '../tokens';

/**
 * iPhone Duo layout helpers for the address screens (bappzaar AddressFloatingOverlay/styles.ts getRailArea,
 * OverlayBottomSheetWidth.ts, useNoonScreenInsets getNoonRailOffset). Every helper returns `null` on a phone so the
 * phone keeps its stylesheet values untouched.
 */

/** getNoonRailOffset(inset, edge): beside the rail the inset replaces the screen's own edge spacing */
export const railOffset = (inset: number, edge: number) => Math.max(inset - edge, 0);

/** physical rail insets: closed = left 84, landscape = right 84, else 0 */
export function railInsets(dl: DeviceLayout) {
  return { left: dl.railSide === 'left' ? RAIL_WIDTH : 0, right: dl.railSide === 'right' ? RAIL_WIDTH : 0 };
}

/** getOverlayBottomSheetWidth: round(min(avail, clamp(avail × 0.75, 440, 520))) */
const overlayBottomSheetWidth = (avail: number) => Math.round(Math.min(avail, Math.min(Math.max(avail * 0.75, 440), 520)));

/**
 * The floating overlay card beside the rail: width min(area − 24, sheetWidth(area)) in the area clear of the rail
 * (the rail offset 72 replaces the 12 edge). Closed 466: 370 with margins 84 / 12 · open portrait 669: 502 centred
 * (83.5) · landscape 951: 520 centred (215.5). `maxHeight` = 85 % of the window between the insets.
 */
export function overlayArea(dl: DeviceLayout) {
  if (dl.posture === 'none') return null;
  const edge = addressMetrics.overlayEdge;
  const insets = railInsets(dl);
  const start = railOffset(insets.left, edge);
  const end = railOffset(insets.right, edge);
  const area = dl.width - start - end;
  const sheetWidth = Math.min(area - edge * 2, overlayBottomSheetWidth(area));
  const centred = (dl.width - sheetWidth) / 2;
  const fits = centred >= Math.max(start, end) + edge;
  const margin = (area - sheetWidth) / 2;
  return {
    left: fits ? centred : margin + start,
    right: fits ? centred : margin + end,
    sheetWidth,
    maxHeight: (dl.height - dl.insets.top - dl.insets.bottom) * 0.85,
  };
}

/**
 * Horizontal padding of a full-screen address screen on the rail postures (padding = getNoonRailOffset(inset, edge)):
 * the rail side gets inset − edge so the screen's own `edge` spacing lands the content right next to the rail.
 * `cornerInset` (SearchScreen landscape `|| 12`) pads the side without a rail.
 */
export function railPadding(dl: DeviceLayout, edge: number, cornerInset = 0) {
  if (!dl.hasRail) return null;
  const insets = railInsets(dl);
  return { left: railOffset(insets.left, edge) || cornerInset, right: railOffset(insets.right, edge) || cornerInset };
}

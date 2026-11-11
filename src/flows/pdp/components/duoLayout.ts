import type { DeviceLayout } from '../../../kit/deviceLayout';
import { pdpTokens } from '../tokens';

/** The PDP's iPhone Duo layout: bappzaar getPdpLayoutMetrics on getPdpDuoContentSize (MAPPING.md § iPhone Duo). */
export interface PdpDuoLayout {
  /** DUO_SIDE_RAIL_TOP_INSET 24 / DUO_WIDE_PORTRAIT_TOP_INSET 82: the list starts this far down (paddingTop) */
  top: number;
  /** content area: window − rail column, − top */
  width: number;
  height: number;
  /** gallery left, every section up to the reviews right, rails full width below */
  twoColumn: boolean;
  leftPane: number;
  rightPane: number;
  gallery: { width: number; height: number };
}

/**
 * `null` on a phone (the phone layout stays as it is). `hasReviews`: bappzaar splits the page only when it has a reviews
 * section (`reviewsSectionIndex ≥ 0`), else stays one column.
 */
export function pdpDuoLayout(dl: DeviceLayout, hasReviews: boolean): PdpDuoLayout | null {
  if (dl.posture === 'none') return null;
  const d = pdpTokens.duo;
  const top = dl.posture === 'widePortrait' ? d.top.widePortrait : d.top.rail;
  const width = dl.contentWidth;
  const height = dl.height - top;
  const isLarge = width >= 600;
  const twoColumn = isLarge && width > height && hasReviews;
  const leftPane = Math.floor(width / 2);
  const rightPane = width - leftPane;
  const gw = twoColumn ? leftPane - d.contentPad : width;
  const capped = (room: number) => Math.min(Math.round(gw * d.galleryRatio), Math.max(height - room, d.galleryMin), d.galleryMax);
  // closed: the rail takes the header, so the gallery is square (no header over it)
  const gh = twoColumn ? capped(d.galleryRoom.twoColumn) : isLarge ? capped(d.galleryRoom.oneColumn) : dl.hasRail ? width : Math.round(width * pdpTokens.galleryRatio);
  return { top, width, height, twoColumn, leftPane, rightPane, gallery: { width: gw, height: gh } };
}

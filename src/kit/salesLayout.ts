import { useMemo } from 'react';
import { useDeviceLayout, RAIL_WIDTH } from './deviceLayout';

/**
 * The cart / checkout ("sales") layout on wide windows: a pure port of bappzaar `useNoonSalesLayout`
 * (marketplaces/noon/hooks/useNoonSalesLayout.ts @ e961975092b; tokens marketplaces/noon/theme/tokens/layout.ts).
 * Commits: c2ea0ee6b51 (one column), 54bda48789b / 1442a164ba1 (cart / checkout two columns), dfda25ec2ee (no max
 * width), 2ce5aa98d9f / 5a9abfe3e20 (header top padding), da358bf1b9a (RTL insets).
 *
 * - `available` = window − start inset − end inset (the 84pt rail on the rail postures).
 * - `isWideLayout` = available > 504: the footer detaches into a floating card.
 * - Two or more columns only when the screen has a column split AND available > 669 (strictly: the open Duo held
 *   upright, 669, stays one column). Column weights 422 (first) : 340 (others).
 * - A section touching a non-zero inset (the rail) drops its 12 side margin on that side: the inset replaces it.
 *
 * In the kit the screen already pads itself clear of the rail (`Screen` railInset), so a column's `listSpacing` is
 * there only for reference; screens use `width`, `contentWidth` and `touchStart` / `touchEnd`.
 * Resolved (LTR): folded 382 → one column 382 · 370; open portrait 669 → one column 669 · 645 (wide);
 * landscape 867 → 484 · 460 + 383 · 371; phone 390 → 390 · 366.
 */
export const SALES = {
  mediumBreakpoint: 504, // salesMediumBreakpoint
  largeBreakpoint: 669, // salesLargeBreakpoint: "iPhone Duo inner screen width in portrait"
  mainColumnWeight: 422, // salesMainColumContentWidth
  secondaryColumnWeight: 340, // salesSecondaryColumnContentWidth
  detachedFooterMaxWidth: 350, // salesDetachedFooterMaxWidth
  toastMaxWidth: 440, // toastMaxWidth
  sectionMargin: 12, // SECTION_HORIZONTAL_MARGIN
  headerTopGap: 14, // HEADER_TOP_GAP
  headerMinTop: 24, // HEADER_MIN_TOP_PADDING
  floatingBottomGap: 10, // FLOATING_BOTTOM_GAP (src/utils/BottomTabs/VisibilityController.ts)
} as const;

/** logical insets: start / end follow the reading direction (getNoonSalesDirectionalInsets) */
export interface SalesInsets {
  top: number;
  start: number;
  end: number;
}

export interface SalesColumn {
  /** the column's width, its section margins included */
  width: number;
  /** width − its section margins */
  contentWidth: number;
  /** the list margins bappzaar puts on the column (the inset it touches); the kit Screen pads these already */
  listSpacing: { start: number; end: number };
  /** the column touches an inset on that side: its sections drop the 12 margin there */
  touchStart: boolean;
  touchEnd: boolean;
}

export interface SalesLayout {
  available: number;
  isWideLayout: boolean;
  isMultiColumnLayout: boolean;
  headerTopPadding: number;
  columns: SalesColumn[];
}

export type SalesFooterVariant = 'liquid_glass' | 'detached' | 'edge_to_edge';

export const getSalesHeaderTopPadding = (top: number, gap: number = SALES.headerTopGap) => Math.max(top + gap, SALES.headerMinTop);

const sectionMargin = (touchedInset: number) => (touchedInset > 0 ? 0 : SALES.sectionMargin);

function buildColumn(width: number, edges: { start: number; end: number }): SalesColumn {
  return {
    width,
    contentWidth: width - sectionMargin(edges.start) - sectionMargin(edges.end),
    listSpacing: { start: edges.start, end: edges.end },
    touchStart: edges.start > 0,
    touchEnd: edges.end > 0,
  };
}

const columnWeight = (index: number) => (index === 0 ? SALES.mainColumnWeight : SALES.secondaryColumnWeight);

function buildMultiColumns(available: number, count: number, insets: SalesInsets): SalesColumn[] {
  const edges = Array.from({ length: count }, (_, i) => ({ start: i === 0 ? insets.start : 0, end: i === count - 1 ? insets.end : 0 }));
  const margins = edges.map((e) => sectionMargin(e.start) + sectionMargin(e.end));
  const totalMargins = margins.reduce((a, b) => a + b, 0);
  const totalWeight = edges.reduce((a, _, i) => a + columnWeight(i), 0);
  const totalContent = available - totalMargins;
  let remaining = available;
  return edges.map((e, i) => {
    const width = i === count - 1 ? remaining : Math.floor((totalContent * columnWeight(i)) / totalWeight) + margins[i];
    remaining -= width;
    return buildColumn(width, e);
  });
}

export function getSalesLayout({ windowWidth, insets, columnsCount }: { windowWidth: number; insets: SalesInsets; columnsCount: number }): SalesLayout {
  const available = windowWidth - insets.start - insets.end;
  const isMultiColumnLayout = columnsCount > 1 && available > SALES.largeBreakpoint;
  return {
    available,
    isWideLayout: available > SALES.mediumBreakpoint,
    isMultiColumnLayout,
    headerTopPadding: getSalesHeaderTopPadding(insets.top),
    columns: isMultiColumnLayout ? buildMultiColumns(available, columnsCount, insets) : [buildColumn(available, insets)],
  };
}

/** getNoonSalesFooterVariant: liquid glass when the screen has it, else a detached card on wide windows */
export function getSalesFooterVariant({ isWideLayout }: Pick<SalesLayout, 'isWideLayout'>, isLiquidGlass = false): SalesFooterVariant {
  if (isLiquidGlass) return 'liquid_glass';
  return isWideLayout ? 'detached' : 'edge_to_edge';
}

/** a column's section side margins (sectionSpacing): 0 on a side touching an inset, 12 otherwise */
export const getSalesSectionMargins = (column: SalesColumn) => ({ start: column.touchStart ? 0 : SALES.sectionMargin, end: column.touchEnd ? 0 : SALES.sectionMargin });

/** getNoonSalesColumnContentFrame: where column `index`'s sections start (from the content edge) and how wide they are */
export function getSalesColumnContentFrame(columns: SalesColumn[], index: number) {
  const start = columns.slice(0, index).reduce((a, c) => a + c.width, 0) + getSalesSectionMargins(columns[index]).start;
  return { start, width: columns[index].contentWidth };
}

/**
 * NoonCartScreen getFloatingMessagesContainerStyle + getFloatingMessageWidth: the toast / snack bar line up with the
 * main column's sections (from the window edge), at most 440 wide and centred in them (floatingSnackBar alignSelf
 * center). Folded 370 at 84 · open portrait 440 at 114.5 · landscape 440 at 22.
 */
export function getSalesFloatingMessageFrame(columns: SalesColumn[]) {
  const frame = getSalesColumnContentFrame(columns, 0);
  const width = Math.min(frame.width, SALES.toastMaxWidth);
  return { start: columns[0].listSpacing.start + frame.start + (frame.width - width) / 2, width };
}

/** src/utils/OverlayBottomSheetWidth getOverlayBottomSheetWidth (WIDTH_RATIO 0.75, MIN 440, MAX 520) */
export const getOverlaySheetWidth = (available: number) => Math.round(Math.min(available, Math.min(Math.max(available * 0.75, 440), 520)));

/**
 * NoonSnackBar (the wishlist v2 "Item moved to Wishlist" card) on a wide window: the window minus the inset overlaps,
 * a getOverlayBottomSheetWidth box centred in it, the card 12 in from that box. Returns the card's frame from the
 * window edge. Folded 358 at 96 · open portrait 478 at 95.5 · phone 366 at 12.
 */
export function getSalesSnackBarFrame(layout: Pick<SalesLayout, 'available'>, insets: Pick<SalesInsets, 'start'>) {
  const box = getOverlaySheetWidth(layout.available);
  return { start: insets.start + (layout.available - box) / 2 + SALES.sectionMargin, width: box - SALES.sectionMargin * 2 };
}

/** the side of each column a section lives in (wideScreenSectionsOrder), -1 when the split doesn't list it */
export const getSalesSectionColumn = <T,>(order: readonly (readonly T[])[], section: T) => order.findIndex((c) => c.includes(section));

/**
 * The layout for the window the kit is showing. Insets: the rail on its side (84), the posture's top inset; the
 * phone has none at the sides. `columnsCount` = the length of the screen's wideScreenSectionsOrder.
 */
export function useSalesLayout(columnsCount = 1): SalesLayout & { posture: ReturnType<typeof useDeviceLayout>['posture']; hasRail: boolean } {
  const dl = useDeviceLayout();
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  const left = dl.railSide === 'left' ? RAIL_WIDTH : 0;
  const right = dl.railSide === 'right' ? RAIL_WIDTH : 0;
  const start = rtl ? right : left;
  const end = rtl ? left : right;
  const top = dl.insets.top;
  return useMemo(
    () => ({ ...getSalesLayout({ windowWidth: dl.width, insets: { top, start, end }, columnsCount }), posture: dl.posture, hasRail: dl.hasRail }),
    [dl.width, dl.posture, dl.hasRail, top, start, end, columnsCount],
  );
}

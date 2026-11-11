import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDeviceLayout } from './deviceLayout';
import { useIsTopScreen } from './Navigator';

/**
 * The iPhone Duo side rail (bappzaar src/components/NativeRail/*). On the `closed` and `landscape` postures an 84pt
 * column on one side of the window holds the screen's header buttons and the tab bar; the screen's own JS copies of
 * those buttons hide (bappzaar `<NativeRailHeader>` returns null there). The column is drawn by `PhoneFrame`; screens
 * fill it through `<RailButtons>` (`Header` does this for its back button and `right` actions) and the navigator puts
 * the tab bar of a tab root into the `tabs` slot.
 *
 * Only the topmost full screen's buttons show (sheets over it leave them in place), as bappzaar's NativeRailRegistry
 * gives the rail to the visible screen.
 */
export type RailSlot = 'leading' | 'trailing' | 'tabs';
export type RailSlots = Partial<Record<RailSlot, HTMLElement | null>>;

export const RailSlotsCtx = createContext<RailSlots>({});

/** Renders `children` into a rail slot while the rail is on and this is the topmost full screen; nothing otherwise. */
export function RailPortal({ slot, children }: { slot: RailSlot; children: ReactNode }) {
  const { hasRail } = useDeviceLayout();
  const slots = useContext(RailSlotsCtx);
  const isTop = useIsTopScreen();
  const el = slots[slot];
  if (!hasRail || !isTop || !el) return null;
  return createPortal(children, el);
}

/**
 * A screen's rail buttons (bappzaar `<NativeRailHeader leftButtons rightButtons>`): `leading` at the top of the column
 * (back, close), `trailing` under it (share, wishlist, search). Hide the JS copies with `useDeviceLayout().hasRail`.
 */
export function RailButtons({ leading, trailing }: { leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <>
      {leading && <RailPortal slot="leading">{leading}</RailPortal>}
      {trailing && <RailPortal slot="trailing">{trailing}</RailPortal>}
    </>
  );
}

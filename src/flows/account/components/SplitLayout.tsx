import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { SplitPaneHostScope, SplitPaneStack, useSplitPaneHost, type SplitPaneMode } from '../../../kit/splitPane';
import type { NavActions } from '../../../kit/Navigator';
import type { Route, ScreenDef } from '../../../kit/types';
import styles from '../account.module.css';

/**
 * The account split pane on the iPhone Duo (bappzaar NoonSplitLayout + NoonSplitPaneRegistry + ACCOUNT_PANE_SCREEN_ROWS,
 * commits 9e854f013fe, 9dc09a755d7). Landscape: the list (40%, min 300) beside the pane (flex 1, under the rail on
 * the end side); folded / open portrait: a pane screen replaces the list and its back returns to it; phone: off, the
 * list renders exactly as before. The pane navigator itself is `src/kit/splitPane.tsx`.
 */

/** the account row a pane screen highlights (bappzaar AccountPaneRowTypes); ids as in data.ts */
export type PaneRow = 'orders' | 'wishlist' | 'credits' | 'addresses' | 'cards' | 'returns' | 'security';

/** NoonSplitPaneRegistry.register → kit routes (the rest of the table has no kit counterpart, see MAPPING.md) */
const PANE_ROUTES: Record<Route, PaneRow | null> = {
  'orders/list': 'orders',
  'orders/tracking': 'orders',
  'orders/cancel': 'orders',
  'wishlist/wishlist': 'wishlist',
  'credits/credits': 'credits',
  'address/select': 'addresses',
  'cards/cards': 'cards',
  'returns/history': 'returns',
  'returns/returnable': 'returns',
  'returns/submit': 'returns',
  'returns/summary': 'returns',
  'returns/details': 'returns',
  'account/changePassword': 'security',
  'account/manageDevices': 'security',
  'account/editProfile': null,
};
/** flows whose full-screen screens all open in the pane: reviews (from orders, keeps My orders), every non-overlay VIP screen */
const PANE_FLOWS: Record<string, PaneRow | null> = { reviews: 'orders', membership: null, noonone: null };

export function isAccountPaneRoute(route: Route, screen: ScreenDef): boolean {
  if (route in PANE_ROUTES) return true;
  return route.split('/')[0] in PANE_FLOWS && (screen.presentation ?? 'screen') === 'screen';
}

const paneRowOf = (route?: Route): PaneRow | undefined => {
  if (!route) return undefined;
  if (route in PANE_ROUTES) return PANE_ROUTES[route] ?? undefined;
  return PANE_FLOWS[route.split('/')[0]] ?? undefined;
};

export interface AccountSplit {
  mode: SplitPaneMode;
  /** the pane is on screen */
  paneOpen: boolean;
  /** list and pane side by side (landscape) */
  side: boolean;
  /** the row whose screen is the pane root */
  activeRow?: PaneRow;
}
const SplitCtx = createContext<AccountSplit>({ mode: 'off', paneOpen: false, side: false });
export const useAccountSplit = () => useContext(SplitCtx);

/**
 * bappzaar NoonAccountNavigatorRegistry: the account sheets (Account security) push through the host navigator, so
 * Change password / Manage devices land in the pane. `null` while the account list is not mounted or on a phone.
 */
let hostPush: NavActions['push'] | null = null;
export const accountHostPush = () => hostPush;

export function AccountSplitLayout({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  // bappzaar defaultScreen = the orders listing (getOrdersListingScreenId)
  const host = useSplitPaneHost({ enabled, isPaneRoute: isAccountPaneRoute, defaultRoute: 'orders/list' });
  const { mode, isOpen, rootRoute } = host;
  const push = host.hostNav.actions.push;
  useEffect(() => {
    if (mode === 'off') return;
    hostPush = push;
    return () => {
      if (hostPush === push) hostPush = null;
    };
  }, [mode, push]);

  const split = useMemo<AccountSplit>(
    () => ({ mode, paneOpen: isOpen, side: mode === 'side' && isOpen, activeRow: paneRowOf(rootRoute) }),
    [mode, isOpen, rootRoute],
  );
  // phone: the list exactly as before, no wrapper
  if (mode === 'off') return <SplitCtx.Provider value={split}>{children}</SplitCtx.Provider>;
  const listClass = !isOpen ? styles.splitMain : mode === 'side' ? styles.splitSide : styles.splitHidden;
  return (
    <SplitCtx.Provider value={split}>
      <div className={styles.split}>
        <div className={listClass}>
          <SplitPaneHostScope host={host}>{children}</SplitPaneHostScope>
        </div>
        {isOpen && (
          <div className={styles.splitPane} data-pane={mode}>
            <SplitPaneStack host={host} className={styles.splitPaneStack} />
          </div>
        )}
      </div>
    </SplitCtx.Provider>
  );
}

import { motion, useMotionValue } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { IconButton, Screen, Spinner } from '../../components';
import { cartGroupOf, useDemoStore, type CartGroupType, type CartLine } from '../../kit/DemoStore';
import { useNav } from '../../kit/Navigator';
import { useIsNoonOneMember } from '../../kit/membership';
import { RailButtons } from '../../kit/Rail';
import { getSalesFloatingMessageFrame, getSalesFooterVariant, getSalesSectionMargins, getSalesSnackBarFrame, SALES, useSalesLayout } from '../../kit/salesLayout';
import { takeCartVipPush } from '../noonone/components/entry/cartVipPush';
import type { ScreenProps } from '../../kit/types';
import { ref } from '../../foundations/tokens';
import { products, type Product } from '../../data';
import { CartCarousel } from './components/CartCarousel';
import { FreeGifts } from './components/FreeGifts';
import emptyGeneric from '@assets/cart/empty-generic.webp';
import infoFilled from '@assets/cart/info-circle-filled.webp';
import closeQuantity from '@assets/cart/close-quantity.webp';
import { CartFooter } from './components/CartFooter';
import { CartGroup } from './components/CartGroup';
import { CartHeader } from './components/CartHeader';
import { CartSnackBar } from './components/CartSnackBar';
import { CouponInput } from './components/CouponInput';
import { InactiveGroup } from './components/InactiveGroup';
import { CobrandCards } from './components/CobrandCards';
import { PaymentOffers } from './components/PaymentOffers';
import { cartSectionsOrder, cartUpdates, cobrandCards, freeGift, paymentCallouts, t, wideScreenSectionsOrder, type CartSection } from './data';
import { DynamicInvoice } from './components/DynamicInvoice';
import { buildDynamicInvoice } from './invoice';
import styles from './cart.module.css';
import { useReduceMotion } from '../../motion/reducedMotion';

/** NoonCartResponseType.sectionsOrder as the cart API returns it for this cart (data.ts) */
const SECTIONS = cartSectionsOrder;
// All flows 127:39688: supermall → Global → express → market
const GROUP_ORDER: CartGroupType[] = ['supermall', 'xborder', 'express', 'marketplace'];

/**
 * NoonCartScreen (master). FeedbackView loading → animated address header, then the server-ordered sections:
 * cart-updates banner, shipment groups (NoonCartGroup), unavailable items (NoonCartInactiveGroup), coupon
 * (NoonCouponInput), payment offers (NoonCartScreenCallouts), CMS recommendations; empty view when count is 0.
 * Sticky bar: savings tab, sliding NoonDynamicInvoice, footer nudges + Checkout.
 */
export function CartScreen({ params }: ScreenProps<{ state?: 'empty' | 'loading' }>) {
  const nav = useNav();
  const store = useDemoStore();
  const { cart, cartTotals, cartUpdatesDismissed, dismissCartUpdates } = store;
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<Product | null>(null);
  // CART_APPLY_COUPON / CART_REMOVE_COUPON → screenState RELOADING: FeedbackView overlayLoader over the cart
  const [reloading, setReloading] = useState(false);
  const [footerH, setFooterH] = useState(0);
  const scrollY = useMotionValue(0);
  const forcedEmpty = params?.state === 'empty';
  // the forced empty preview leaves the cart untouched, so pin the tab-bar badge to match what's on screen
  const { setCartBadgeOverride } = useDemoStore();
  useEffect(() => {
    if (!forcedEmpty) return;
    setCartBadgeOverride(0);
    return () => setCartBadgeOverride(null);
  }, [forcedEmpty, setCartBadgeOverride]);
  const forcedLoading = params?.state === 'loading';
  const lines = forcedEmpty ? [] : cart;
  const empty = lines.length === 0;
  // the tab bar only renders when Cart is the stack root (tab), not when pushed from PDP
  // read once: the entry under this screen never changes while it is mounted, and reading the stack in render would
  // re-render the whole cart on every push / back anywhere in the app
  const [isTabRoot] = useState(() => nav.stack[0]?.route === nav.route);
  const noonOneMember = useIsNoonOneMember();
  // NoonCartScreen.checkout → showVipPush (noon.VIPCartOverlayScreen) once per session when cart.pushes.vip is set
  const onCheckout = () => (takeCartVipPush(noonOneMember) ? nav.push('noonone/cartOverlay', { coupon: store.coupon }) : nav.push('checkout/checkout', { coupon: store.coupon }));

  // FeedbackView shows ScreenState.LOADING on every appear while getCartData runs
  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(id);
  }, []);

  const onMovedToWishlist = useCallback((line: CartLine) => setSnack(line.product), []);
  const hideSnack = useCallback(() => setSnack(null), []);

  // iPhone Duo (bappzaar useNoonSalesLayout, src/kit/salesLayout.ts): the phone keeps today's layout
  const columnsOrder = empty ? wideScreenSectionsOrder.empty : wideScreenSectionsOrder.filled;
  const sales = useSalesLayout(columnsOrder.length);
  const duo = sales.posture !== 'none';
  const multi = duo && sales.isMultiColumnLayout;
  // the two-column header is not animated (renderMultiColumnHeader)
  const restingY = useMotionValue(0);

  if (loading || forcedLoading) return <CartLoading withTabBar={isTabRoot} />;

  const groups = GROUP_ORDER.map((type) => ({ type, lines: lines.filter((l) => cartGroupOf(l.product) === type), subtotal: cartTotals.groups.find((g) => g.type === type)?.subtotal ?? 0 })).filter((g) => g.lines.length);
  const showUpdates = !empty && !cartUpdatesDismissed && cartUpdates.length > 0;

  const renderSection = (section: CartSection) => {
    switch (section) {
      case 'empty':
        return empty ? <EmptyCart key={section} /> : null;
      case 'invoice':
        // two columns: the invoice is an inline section of the last column (renderSectionInvoice), not the footer sheet
        return empty ? null : (
          <div key={section} className={styles.sectionInvoice}>
            <DynamicInvoice sections={buildDynamicInvoice(cartTotals, lines)} />
          </div>
        );
      case 'updates':
        return showUpdates ? (
          <motion.div key={section} className={styles.updates} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <button type="button" className={styles.updatesInfo} onClick={() => nav.sheet('cart/updates')}>
              <img src={infoFilled} alt="" className={styles.updatesIcon} />
              <span className={styles.updatesText}>
                {t.cartUpdated} <span className={styles.updatesAction}>{t.cartUpdatedAction}</span>
              </span>
            </button>
            <button type="button" className={styles.updatesDismiss} onClick={dismissCartUpdates} aria-label="Dismiss">
              <img src={closeQuantity} alt="" />
            </button>
          </motion.div>
        ) : null;
      case 'groups':
        return groups.map((g) => <CartGroup key={g.type} type={g.type} lines={g.lines} subtotal={g.subtotal} onMovedToWishlist={onMovedToWishlist} />);
      case 'secondary_groups':
        return forcedEmpty ? null : <InactiveGroup key={section} onMovedToWishlist={onMovedToWishlist} />;
      case 'coupon_tray':
        return empty ? null : <CouponInput key={section} onBusyChange={setReloading} />;
      case 'cobrand_cards':
        return empty ? null : <CobrandCards key={section} cards={cobrandCards} />;
      case 'callouts':
        return empty ? null : <PaymentOffers key={section} entries={paymentCallouts} />;
      case 'cms_bottom':
        return empty ? (
          <CartCarousel key={section} title={t.recommended} items={products.slice(0, 8)} />
        ) : (
          <CartCarousel key={section} title={t.offersTitle} sponsored={t.sponsored} items={products.filter((p) => !lines.some((l) => l.product.id === p.id)).slice(0, 8)} />
        );
      case 'wishlist':
        return empty ? null : <CartCarousel key={section} title={t.wishlistTitle} items={store.wishlist.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p)} />;
      case 'free_gifts': {
        const gift = products.find((p) => p.id === freeGift.productId);
        return empty || !gift ? null : <FreeGifts key={section} product={gift} unlockAt={freeGift.unlockAt} current={cartTotals.total} />;
      }
      default:
        return null;
    }
  };

  // getNativeRailRightButtons: heart.fill in watermelonPink (wishlist v2, the kit's wishlist), signed in only (the demo
  // user is). The rail renders outside the flow's token scope, so the palette ref rather than --nk-color-cart-wishlist-pink
  const wishlistRail = <IconButton icon="heart" onPress={() => nav.push('wishlist/wishlist')} label={t.wishlist} color={ref.palette('watermelonPink')} filled />;
  const railButtons = sales.hasRail && <RailButtons leading={!isTabRoot && nav.canGoBack ? <IconButton icon="back" onPress={nav.back} label="Back" /> : undefined} trailing={wishlistRail} />;
  const snackBar = (frame?: { start: number; width: number }) => <CartSnackBar product={snack} onHide={hideSnack} onPress={() => nav.push('wishlist/wishlist')} frame={frame} />;
  const reloader = reloading && (
    <div className={styles.reloading}>
      <Spinner size={28} thickness={3} track="var(--nk-color-border)" color="var(--nk-color-cart-accent-blue)" />
    </div>
  );

  if (!duo) {
    return (
      <>
      <Screen
        header={<CartHeader scrollY={scrollY} showBackButton={!isTabRoot && nav.canGoBack} />}
        footer={empty ? undefined : <CartFooter totals={cartTotals} cart={lines} isTabRoot={isTabRoot} onCheckout={onCheckout} onHeightChange={setFooterH} />}
        background="bgPage"
        withTabBar={empty && isTabRoot}
        // Cart tab (Liquid Glass): the list scrolls behind the floating glass footer (NoonNativeStickyBar over the list)
        // instead of ending above it — so nothing is cut off when the footer follows the hiding tab bar
        floatingFooter={!empty && isTabRoot}
        onScroll={(y) => scrollY.set(y)}
        contentStyle={{
          paddingTop: 0,
          paddingBottom: empty
            ? undefined
            : isTabRoot
              ? // getContentPadding (liquid): savings tab + footer + gap + tab bar + inset
                `calc(${footerH}px + var(--nk-tab-bar-floating-gap) + var(--nk-layout-tab-bar) + var(--nk-inset-bottom) + var(--nk-space-s16))`
              : Math.max(16, footerH - 40),
        }}
      >
        {empty && <EmptyCart />}
        {SECTIONS.map(renderSection)}
      </Screen>
      {snackBar()}
      {reloader}
      </>
    );
  }

  /* ── iPhone Duo (bappzaar NoonCartScreen renderOneColumnLayout / renderMultiColumnLayout) ── */
  const columns = sales.columns;
  const last = columns[columns.length - 1];
  // the Cart tab has Liquid Glass; a pushed cart the bappzaar footer (detached on wide windows, edge to edge otherwise)
  const footerVariant = getSalesFooterVariant(sales, isTabRoot);
  // the glass sheet matches the tab bar only while the tabs are at the bottom (open portrait); in the rail it lines up with the column
  const matchesTabBar = footerVariant === 'liquid_glass' && !sales.hasRail && !multi;
  const footerColumn = multi ? last : columns[0];
  const footerDuo = {
    margins: matchesTabBar || footerVariant === 'edge_to_edge' ? undefined : getSalesSectionMargins(footerColumn),
    detached: footerVariant === 'detached',
    overviewDisabled: multi,
  };
  const footer = empty ? undefined : <CartFooter totals={cartTotals} cart={lines} isTabRoot={isTabRoot} onCheckout={onCheckout} onHeightChange={setFooterH} duo={footerDuo} />;
  const header = (
    <CartHeader
      scrollY={multi ? restingY : scrollY}
      showBackButton={!isTabRoot && nav.canGoBack && !sales.hasRail}
      hideWishlist={sales.hasRail}
      // one column: NoonSalesAnimatedHeader keeps the selector's own 12 on both sides (only the container clears the rail);
      // two columns (renderMultiColumnHeader): the selector takes the first column's sectionSpacing
      duo={{ topPadding: sales.headerTopPadding, margins: multi ? getSalesSectionMargins(columns[0]) : { start: SALES.sectionMargin, end: SALES.sectionMargin }, width: multi ? columns[0].width : undefined }}
    />
  );
  // the "moved to Wishlist" snack bar: one column renders NoonSnackBar (a getOverlayBottomSheetWidth box centred clear of
  // the rail); two columns have no NoonSnackBar, so it takes the floating messages frame (main column, ≤ 440, centred)
  const snackFrame = multi ? getSalesFloatingMessageFrame(columns) : getSalesSnackBarFrame(sales, { start: columns[0].listSpacing.start });
  // getContentPadding: the overlaying footer's height (its bottom gap included) + 10 (+ the bottom tabs while they're there)
  const overFooter =
    footerVariant === 'liquid_glass'
      ? `calc(${footerH}px + var(--nk-tab-bar-floating-gap) + var(--nk-layout-tab-bar) + var(--nk-inset-bottom) + var(--nk-space-s10))`
      : `calc(${footerH}px + max(var(--nk-inset-bottom), var(--nk-space-s10)) + var(--nk-space-s10))`;
  const touch = (i: number) => ({ 'data-touch-start': columns[i].touchStart || undefined, 'data-touch-end': columns[i].touchEnd || undefined });

  if (multi) {
    return (
      <>
      {railButtons}
      <Screen header={header} background="bgPage" contentStyle={{ paddingTop: 0, paddingBottom: 0, overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
        {columnsOrder.map((sections, i) => (
          <div
            key={i}
            className={`nk-scroll ${styles.salesColumn} ${styles.salesColumnList}`}
            {...touch(i)}
            style={{
              width: columns[i].width,
              // getContentPadding: the last column clears the footer (+10), the others end at the safe bottom
              paddingBottom: i === columns.length - 1 && footer ? overFooter : 'var(--nk-inset-bottom)',
            }}
          >
            {sections.map(renderSection)}
          </div>
        ))}
        {/* multiColumnStickyBar: pinned to the last column (right 0, bottom 0, width = column) */}
        {footer && (
          <div className={styles.multiColumnFooter} style={{ width: last.width }}>
            {footer}
          </div>
        )}
      </Screen>
      {snackBar(snackFrame)}
      {reloader}
      </>
    );
  }

  const floating = !empty && footerVariant !== 'edge_to_edge';
  return (
    <>
    {railButtons}
    <Screen
      header={header}
      footer={footer}
      background="bgPage"
      withTabBar={empty && isTabRoot}
      // glass and detached footers overlay the list; the edge-to-edge one is docked under it
      floatingFooter={floating}
      onScroll={(y) => scrollY.set(y)}
      contentStyle={{
        paddingTop: 0,
        paddingBottom: empty
          ? undefined
          : floating
            ? overFooter
            : Math.max(16, footerH - 40),
      }}
    >
      <div className={styles.salesColumn} {...touch(0)}>
        {empty && <EmptyCart />}
        {SECTIONS.map(renderSection)}
      </div>
    </Screen>
    {snackBar(snackFrame)}
    {reloader}
    </>
  );
}

/** renderEmptyCart: white view, 150×150 empty-generic image, 18/bold header + 14 message (marginTop 10 / 5). */
function EmptyCart() {
  return (
    <motion.div className={styles.empty} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <img src={emptyGeneric} alt="" className={styles.emptyImage} />
      <div className={styles.emptyText}>
        <div className={styles.emptyHeader}>{t.emptyHeader}</div>
        <div className={styles.emptyMessage}>{t.emptyMessage}</div>
      </div>
    </motion.div>
  );
}

/** ProgressLoader (followBottomTabs): #F5F7FF screen, 4px bar sweeping (800ms loop) with a #F5F7FF → #3866DF gradient. */
function CartLoading({ withTabBar }: { withTabBar: boolean }) {
  // reduced motion: the bar holds in place and pulses its opacity instead of sweeping (a dropped sweep would park it off-track)
  const reduce = useReduceMotion();
  return (
    <div className={styles.loader} data-tab={withTabBar || undefined}>
      <div className={styles.loaderTrack}>
        {reduce ? (
          <motion.div className={styles.loaderBar} initial={{ opacity: 1 }} animate={{ opacity: 0.45 }} transition={{ duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }} />
        ) : (
          <motion.div className={styles.loaderBar} initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], repeat: Infinity }} />
        )}
      </div>
    </div>
  );
}

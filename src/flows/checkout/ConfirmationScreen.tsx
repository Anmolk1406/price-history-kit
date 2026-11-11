import { motion, useMotionValueEvent, useMotionValue } from 'motion/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon, IconButton, ProductImage, Screen } from '../../components';
import { useDeviceLayout, WINDOW_LG, WINDOW_XL } from '../../kit/deviceLayout';
import { RailButtons } from '../../kit/Rail';
import { useDemoStore } from '../../kit/DemoStore';
import { useNav } from '../../kit/Navigator';
import { easing } from '../../motion/presets';
import { productById, type Product } from '../../data';
import { addressTitle, singleLineAddress } from '../address/data';
import { useAddressStore } from '../address/store';
import { mockNotificationBanner, postorderIcons, smartAssistConfig, tp } from './data.postorder';
import { buildPromises } from './data.shipment';
import { useCheckout } from './store';
import { useOcOneOverlay } from '../noonone/components/entry/useOcOneOverlay';
import styles from './confirmation.module.css';
import { useReduceMotion } from '../../motion/reducedMotion';

const HEADER_BG = smartAssistConfig.backgroundColor; // smartAssistConfig?.backgroundColor || '#2F8E6D'
/** shipmentReducedSpacer — no CMS hero carousel in the prototype */
const SHIPMENT_TOP_Y = 120;

/**
 * iPhone Duo (bappzaar features/o2d/hooks/useO2DOrderConfirmationLayout.ts @ e961975092b, 8e5db4917be):
 * available = window − rail. Wider than tall and ≥ 600 → two columns (promo 42 % | order) with a 16 gutter and 16 edge
 * padding; ≥ 600 upright → one centred column of 480 (600 from 840); otherwise the compact phone layout.
 * Duo landscape: 867 → promo 344, order 475. Open portrait: 669 → 480, 94.5 each side.
 */
type ConfirmationMode = 'compact' | 'single' | 'twoColumn';
const COLUMN_GUTTER = 16;
const PROMO_COLUMN_RATIO = 0.42;
const CONTENT_TOP_GAP = 12;
/** O2D_ORDER_CONFIRMATION_HEADER_HEIGHT below the top inset: back icon 20 + padding 8 × 2 + bottom 12 */
const HEADER_BODY = 20 + 8 * 2 + 12;
const FOOTER_EDGE_SPACING = 15;
function confirmationLayout(available: number, width: number, height: number) {
  if (available >= WINDOW_LG && width > height) {
    const columnsWidth = available - COLUMN_GUTTER * 3;
    const promo = Math.round(columnsWidth * PROMO_COLUMN_RATIO);
    return { mode: 'twoColumn' as ConfirmationMode, promo, order: columnsWidth - promo, side: COLUMN_GUTTER };
  }
  if (available >= WINDOW_LG) {
    const w = Math.min(available, available >= WINDOW_XL ? 600 : 480);
    return { mode: 'single' as ConfirmationMode, promo: w, order: w, side: (available - w) / 2 };
  }
  return { mode: 'compact' as ConfirmationMode, promo: available, order: available, side: 0 };
}

interface ConfirmationItem {
  product: Product;
  qty: number;
}

/**
 * NoonOrderConfirmationV3Screen — the screen NoonPostOrderLoader pushes after a successful order.
 * Absolute header (back + "Order placed" title, solid #2F8E6D background fading in when the shipment card
 * scrolls under it, 100ms), content entering with SlideInDown 600ms out-cubic, shipment card (NoonShipmentV2),
 * delivery details (NoonOrderConfirmationAddress), notifications banner and the sticky black Continue Shopping CTA.
 * CMS modules (hero carousel, fixedCtaModule, recommendations) and the VAT / cross-border banners are server-only.
 */
export function ConfirmationScreen() {
  const nav = useNav();
  useOcOneOverlay();
  const { cart } = useDemoStore();
  const lastOrder = useCheckout((s) => s.lastOrder);
  const instructions = useCheckout((s) => s.deliveryInstructions);
  const receiver = useCheckout((s) => s.receiver);
  const addresses = useAddressStore((s) => s.addresses);
  const defaultId = useAddressStore((s) => s.defaultId);
  const address = addresses.find((a) => a.id === (lastOrder?.addressId ?? defaultId)) ?? addresses[0];

  // opened directly from the sidebar → fall back to the cart / two demo products
  const items: ConfirmationItem[] = useMemo(() => {
    if (lastOrder?.items.length) return lastOrder.items.map((i) => ({ product: productById(i.id), qty: i.qty }));
    if (cart.length) return cart.map((l) => ({ product: l.product, qty: l.qty }));
    return [
      { product: productById('p1'), qty: 1 },
      { product: productById('p4'), qty: 2 },
    ];
  }, [lastOrder, cart]);
  const promiseLabel = lastOrder?.promiseLabel ?? buildPromises()[0].confirmationLabel;

  // useAnimatedReaction: threshold = shipmentTopY < 100 ? 50 : -100 → header shows once scrollY >= topY + threshold
  const scrollY = useMotionValue(0);
  const [headerShown, setHeaderShown] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const threshold = SHIPMENT_TOP_Y < 100 ? 50 : -100;
    setHeaderShown(y >= SHIPMENT_TOP_Y + threshold);
  });

  const continueShopping = () => nav.reset('home/home'); // popToRoot + deep link '/'
  const viewOrder = () => nav.reset('orders/list'); // popToRoot + deep link '/account/orders'

  // iPhone Duo: the layout mode, the back button in the rail (NativeRailHeader showInWidePortrait, back → continueShopping)
  const dl = useDeviceLayout();
  const layout = confirmationLayout(dl.contentWidth, dl.width, dl.height);
  const duo = dl.posture !== 'none';
  const railBack = dl.hasRail;
  // O2DOrderConfirmationHeader is NativeRailHidden showInWidePortrait: on the iPhone Duo bappzaar hides the whole header
  // (title, fading green background, back). The kit keeps the header for its need-help pill (and the back where it has
  // no rail), but never shows the title / background there.
  const isTitleShown = layout.mode === 'compact' && !duo;
  const footerRef = useRef<HTMLDivElement>(null);
  const [footerH, setFooterH] = useState(0);
  useLayoutEffect(() => {
    const el = footerRef.current;
    if (layout.mode !== 'twoColumn' || !el) return;
    const ro = new ResizeObserver(() => setFooterH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout.mode]);

  const header = (
    <div className={styles.headerContainer} style={duo ? { paddingInline: layout.side + 16 } : undefined}>
      {isTitleShown && <motion.div className={styles.headerBackground} style={{ backgroundColor: HEADER_BG }} initial={false} animate={{ opacity: headerShown ? 1 : 0 }} transition={{ duration: 0.1, ease: [0.42, 0, 0.58, 1] }} />}
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          {!railBack && (
            <button type="button" className={styles.backButtonContainer} onClick={continueShopping} aria-label="Back">
              <img src={postorderIcons.back} className={styles.backIcon} alt="" />
            </button>
          )}
          {isTitleShown && (
            <motion.span className={styles.headerTitle} initial={false} animate={{ opacity: headerShown ? 1 : 0 }} transition={{ duration: 0.1 }}>
              {tp.order_placed}
            </motion.span>
          )}
        </div>
        <button type="button" className={styles.needHelpButton} onClick={() => nav.toast('Help (noon.HelpScreen) is not part of this prototype')}>
          <Icon name="help" size={20} color="var(--nk-color-text-inverse)" />
          <span className={styles.needHelpText} style={{ color: smartAssistConfig.textColor }}>
            {smartAssistConfig.text}
          </span>
        </button>
      </div>
    </div>
  );

  const footer = (
    <div
      ref={footerRef}
      className={styles.stickyButtonContainer}
      data-column={layout.mode === 'twoColumn' || undefined}
      // one wide column: the footer spans the window, its button lines up with the column (edgePadding + 15)
      style={layout.mode === 'single' ? { paddingInline: layout.side + FOOTER_EDGE_SPACING } : undefined}
    >
      <button type="button" className={styles.bottomButtonContainer} onClick={continueShopping}>
        <span className={styles.keepShoppingText}>{tp.continue_shopping}</span>
      </button>
    </div>
  );

  const name = receiver.name ?? `${address?.firstName ?? ''} ${address?.lastName ?? ''}`.trim();
  const phone = receiver.phone ?? (address ? `${address.dialCode} ${address.phone}` : '');
  const instructionLabels = [
    instructions.getTogether && 'Get items together',
    instructions.leaveAtDoor && 'Leave at the door',
    instructions.silentDelivery && "Don't ring the doorbell",
    instructions.securityCheck && 'Hand it to security',
  ].filter(Boolean) as string[];

  const shipment = (
    <div className={styles.shipmentContainer}>
      <ShipmentV2 items={items} promiseLabel={promiseLabel} onPress={viewOrder} />
    </div>
  );
  const addressSection = address && (
    <OrderConfirmationAddress
      rows={[
        { icon: 'pin', title: `Delivering to <b>${addressTitle(address)}</b>`, text: `${singleLineAddress(address)}, ${address.area}` },
        { icon: 'account', title: name, text: phone },
      ]}
      instructions={instructionLabels.length ? { title: 'Delivery instructions', data: instructionLabels } : null}
    />
  );
  const rail = railBack && <RailButtons leading={<IconButton icon="back" onPress={continueShopping} label="Back" />} />;
  // contentTop: the header's height + 12 (the need-help pill stays in the kit header, so the content clears it)
  const contentTop = `calc(var(--nk-inset-top) + ${HEADER_BODY + CONTENT_TOP_GAP}px)`;

  if (layout.mode === 'twoColumn') {
    // renderTwoColumns: promo (notifications, CMS) | order (shipment, address) with the footer, r16 on top
    return (
      <>
        {rail}
        <Screen header={header} overlayHeader safeTop={false} background="var(--nk-palette-anti-flash-white)" contentStyle={{ padding: 0, overflow: 'hidden' }}>
          <motion.div className={styles.columns} style={{ paddingInline: layout.side, columnGap: COLUMN_GUTTER }} initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: easing.out }}>
            <div className={`nk-scroll ${styles.columnList}`} style={{ width: layout.promo, paddingTop: contentTop, paddingBottom: `calc(var(--nk-inset-bottom) + ${CONTENT_TOP_GAP}px)` }}>
              <NotificationsBanner />
            </div>
            <div className={styles.orderColumn} style={{ width: layout.order }}>
              <div className={`nk-scroll ${styles.columnList}`} style={{ paddingTop: contentTop, paddingBottom: footerH }}>
                {shipment}
                {addressSection}
              </div>
              {footer}
            </div>
          </motion.div>
        </Screen>
      </>
    );
  }

  return (
    <>
    {rail}
    <Screen header={header} overlayHeader safeTop={false} footer={footer} background="var(--nk-palette-anti-flash-white)" onScroll={(y) => scrollY.set(y)}>
      <motion.div className={styles.wrapper} style={layout.mode === 'single' ? { paddingInline: layout.side, paddingTop: contentTop } : undefined} initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: easing.out }}>
        {layout.mode === 'compact' && <div className={styles.shipmentReducedSpacer} />}
        {shipment}
        {addressSection}
        <NotificationsBanner />
      </motion.div>
    </Screen>
    </>
  );
}

/* ───────────── NoonShipmentV2 ───────────── */

function ShipmentV2({ items, promiseLabel, onPress }: { items: ConfirmationItem[]; promiseLabel: string; onPress: () => void }) {
  const count = items.reduce((n, i) => n + i.qty, 0);
  const [arriving, ...rest] = promiseLabel.split(' · ');
  return (
    <div className={styles.shipCard}>
      <button type="button" className={styles.shipHeaderContainer} onClick={onPress}>
        <span className={styles.shipHeaderContent}>
          <span className={styles.shipHeaderText}>
            <img src={postorderIcons.shipmentTick} className={styles.shipHeaderIcon} alt="" />
            <span className={styles.shipHeaderTitle}>{tp.order_placed}</span>
          </span>
          <img src={postorderIcons.chevronLeft} className={styles.shipRightIcon} alt="" />
        </span>
      </button>
      <div className={styles.bodyCard}>
        <div className={styles.singleShipmentPadding}>
          <button type="button" className={styles.shipmentContentContainer} onClick={onPress}>
            <span className={styles.shipment}>
              <span className={styles.promise}>
                <b>{arriving}</b>
                {rest.length > 0 && <span className={styles.steel}>{rest.join(' · ')}</span>}
              </span>
              {items.length > 1 ? (
                <StackedImageCarousel items={items} />
              ) : (
                <span className={styles.images}>
                  {items.slice(0, 3).map((i) => (
                    <ItemThumb key={i.product.id} item={i} />
                  ))}
                </span>
              )}
            </span>
            <span className={styles.shipmentFooterContainer}>
              <span className={styles.shipmentNumberContainer}>
                <span className={styles.shipmentNumberText}>{tp.noon_shipment_nr(1)}</span>
                <span className={styles.shipmentNumberSeparator} />
                <span className={`${styles.shipmentNumberText} ${styles.lower}`}>{tp.item(count)}</span>
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemThumb({ item }: { item: ConfirmationItem }) {
  return (
    <span className={styles.itemView}>
      <span className={styles.itemViewInner}>
        <ProductImage product={item.product} width={49.88} height={68} radius={8} emojiScale={0.5} />
        {item.qty > 1 && <span className={styles.qtyIndicator}>{`x${item.qty}`}</span>}
      </span>
    </span>
  );
}

/* ───────────── NoonStackedImageCarousel (width 49.88, height 68, offset 14, scale .09, opacity .1, slide 300ms, idle 2000ms) ───────────── */

const CAROUSEL = { width: 49.88, height: 68, stackOffsetX: 14, stackScaleStep: 0.09, stackOpacityStep: 0.1, slideDurationMs: 300, idleMs: 2000 };
const lerp = (t: number, a: number, b: number) => a + (b - a) * t;
const positiveMod = (n: number, m: number) => ((n % m) + m) % m;

function StackedImageCarousel({ items }: { items: ConfirmationItem[] }) {
  const { width, height, stackOffsetX, stackScaleStep, stackOpacityStep, slideDurationMs, idleMs } = CAROUSEL;
  const count = items.length;
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const reduce = useReduceMotion();

  useEffect(() => {
    // reduced motion: the stack holds its first card (no rotation)
    if (count <= 1 || reduce) return;
    const total = (slideDurationMs + idleMs) * count; // withRepeat(withTiming(count, linear))
    const start = performance.now();
    const tick = (now: number) => {
      setProgress((((now - start) % total) / total) * count);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [count, slideDurationMs, idleMs, reduce]);

  const stepIndex = Math.floor(progress);
  const within = progress - stepIndex;
  const idlePortion = idleMs / (idleMs + slideDurationMs);
  const slideT = within <= idlePortion ? 0 : Math.min(1, (within - idlePortion) / (slideDurationMs / (idleMs + slideDurationMs)));
  const front = positiveMod(stepIndex, count);

  const anim = (rel: number) => {
    if (count === 2) {
      const backX = stackOffsetX;
      const backScale = 1 - stackScaleStep;
      const backOpacity = 1 - stackOpacityStep;
      let x = rel * stackOffsetX;
      let scale = 1 - rel * stackScaleStep;
      let opacity = 1 - rel * stackOpacityStep;
      if (slideT > 0) {
        if (rel === 0) [x, scale, opacity] = [lerp(slideT, 0, backX), lerp(slideT, 1, backScale), lerp(slideT, 1, backOpacity)];
        else [x, scale, opacity] = [lerp(slideT, x, 0), lerp(slideT, scale, 1), lerp(slideT, opacity, 1)];
      }
      return { x, scale, opacity, z: slideT > 0 && rel === 1 ? 1000 : 100 - rel };
    }
    const POS = { LEFT: 0, CENTER: stackOffsetX, RIGHT: stackOffsetX * 2 };
    const SIDE = Math.max(0.86, 1 - stackScaleStep - 0.04);
    const OSIDE = Math.max(0.75, 1 - stackOpacityStep);
    if (rel > 2 && slideT === 0) return { x: POS.RIGHT, scale: SIDE, opacity: 0, z: -999 };
    const idle = rel === 0 ? { x: POS.CENTER, scale: 1, opacity: 1 } : rel === 1 ? { x: POS.RIGHT, scale: SIDE, opacity: OSIDE } : rel === 2 ? { x: POS.LEFT, scale: SIDE, opacity: OSIDE } : { x: POS.RIGHT, scale: SIDE, opacity: 0 };
    let { x, scale, opacity } = idle;
    if (slideT > 0) {
      if (rel === 0) [x, scale, opacity] = [lerp(slideT, POS.CENTER, POS.LEFT), lerp(slideT, 1, SIDE), lerp(slideT, 1, 0)];
      else if (rel === 1) [x, scale, opacity] = [lerp(slideT, POS.RIGHT, POS.CENTER), lerp(slideT, SIDE, 1), lerp(slideT, OSIDE, 1)];
      else if (rel === 2) [x, opacity] = [lerp(slideT, POS.LEFT, POS.RIGHT), lerp(slideT, OSIDE, 0)];
      else if (rel === 3) [x, scale, opacity] = [POS.RIGHT, SIDE, lerp(slideT, 0, OSIDE)];
    }
    const z = slideT > 0 && rel === 1 ? 1000 : rel === 0 ? 300 : rel === 2 ? 50 : 100;
    return { x, scale, opacity, z };
  };

  const visibleSlots = count >= 3 ? 3 : count;
  return (
    <span className={styles.carousel} style={{ width: width + stackOffsetX * Math.max(0, visibleSlots - 1), height }}>
      {items.map((item, i) => {
        const a = anim(positiveMod(i - front, count));
        return (
          <span key={item.product.id} className={styles.carouselCard} style={{ width, height, opacity: a.opacity, zIndex: a.z, transform: `translateX(${a.x}px) scale(${a.scale})` }}>
            <ItemThumb item={item} />
          </span>
        );
      })}
    </span>
  );
}

/* ───────────── NoonOrderConfirmationAddress ───────────── */

interface UserDetail {
  icon: 'pin' | 'account';
  /** html: <b> */
  title: string;
  text: string;
}

function AddressRow({ row, className }: { row: UserDetail; className?: string }) {
  return (
    <div className={`${styles.addressContainerRow} ${className ?? ''}`}>
      <span className={styles.iconContainer}>
        <Icon name={row.icon} size={16} color="var(--nk-color-text-strong)" />
      </span>
      <span className={styles.addressContainerRowContent}>
        <span className={styles.rowTitle} dangerouslySetInnerHTML={{ __html: row.title }} />
        <span className={styles.rowText}>{row.text}</span>
      </span>
    </div>
  );
}

function OrderConfirmationAddress({ rows, instructions }: { rows: UserDetail[]; instructions: { title: string; data: string[] } | null }) {
  const list = (r: UserDetail[]) =>
    r.map((row, i) => (
      <div key={i}>
        <AddressRow row={row} />
        {i < r.length - 1 && <div className={styles.separator} />}
      </div>
    ));

  if (instructions && rows.length) {
    const [first, ...rest] = rows;
    return (
      <div className={styles.spacing}>
        <AddressRow row={first} className={styles.firstAddressContainerRow} />
        <div className={styles.addressContainer}>
          {list(rest)}
          <div className={styles.deliveryInstructions}>
            <div className={`nk-hscroll ${styles.deliveryInstructionsContent}`}>
              <span className={styles.deliveryInstructionsTitle}>{instructions.title}</span>
              {instructions.data.map((label) => (
                <span key={label} className={styles.deliveryInstructionsItem}>
                  <Icon name="check" size={12} color="var(--nk-color-success)" />
                  <span className={styles.deliveryInstructionsItemText}>{label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <div className={`${styles.addressContainer} ${styles.spacing}`}>{list(rows)}</div>;
}

/* ───────────── NoonNotificationsBanner (shown while push permission is not granted) ───────────── */

function NotificationsBanner() {
  const nav = useNav();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const { title, subtitle, backgroundColor, cta } = mockNotificationBanner;
  return (
    <div className={`${styles.notifContainer} ${styles.spacing}`} style={{ backgroundColor }}>
      <div className={styles.notifContent}>
        <span className={styles.notifTitle}>{title}</span>
        <span className={styles.notifSubtitle}>{subtitle}</span>
      </div>
      <button
        type="button"
        className={styles.notifCta}
        style={{ backgroundColor: cta.backgroundColor }}
        onClick={() => {
          setHidden(true); // Linking.openSettings() → permission granted → banner no longer shown
          nav.toast('Notifications turned on', { tone: 'success' });
        }}
      >
        <span className={styles.notifCtaText} style={{ color: cta.textColor }}>
          {cta.text}
        </span>
      </button>
    </div>
  );
}

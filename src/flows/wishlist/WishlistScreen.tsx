import { AnimatePresence, motion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Screen } from '../../components';
import { useDemoStore } from '../../kit/DemoStore';
import { useDeviceLayout, WINDOW_LG, WINDOW_XL } from '../../kit/deviceLayout';
import { useSplitPane } from '../../kit/splitPane';
import type { ScreenProps } from '../../kit/types';
import { productById } from '../../data';
import { CollectionTile } from './components/CollectionTile';
import { EmptyState, EmptyWishlist } from './components/EmptyState';
import { NoCollectionWidget } from './components/NoCollectionWidget';
import { ViewCartPill } from './components/ViewCartPill';
import { WishlistHeader } from './components/WishlistHeader';
import { WishlistProductBox } from './components/WishlistProductBox';
import { collections as demoCollections, copy } from './data';
import { wishlistTokens } from './tokens';
import styles from './wishlist.module.css';

/** NOON_WISHLIST_V2_SIDE_PANE_WIDTH (NoonWishlistV2Screen/styles.ts) */
const SIDE_PANE_WIDTH = 280;
/** useNoonWishlistV2GridLayout: SIDE_PANE_GRID_COLUMNS / MIN_CARD_WIDTH */
const SIDE_PANE_COLUMNS = 3;
const MIN_CARD_WIDTH = 160;
/** productCardRow px 12 per side, gap 12 */
const GRID_EDGE = 12;
const GRID_GAP = 12;

/**
 * useNoonWishlistV2GridLayout + useNoonProductGridLayout: columns by the grid's width (≥ 840 → 4, ≥ 600 → 3, else 2);
 * next to the side pane 3 columns as long as each card stays ≥ 160 wide (Duo landscape: 587 → 3 × 179).
 */
function gridColumns(gridWidth: number, sidePane: boolean) {
  const base = gridWidth >= WINDOW_XL ? 4 : gridWidth >= WINDOW_LG ? 3 : 2;
  const sideCard = Math.floor((gridWidth - 2 * GRID_EDGE - GRID_GAP * (SIDE_PANE_COLUMNS - 1)) / SIDE_PANE_COLUMNS);
  return sidePane && base < SIDE_PANE_COLUMNS && sideCard >= MIN_CARD_WIDTH ? SIDE_PANE_COLUMNS : base;
}

/**
 * NoonWishlistV2Screen: header (title swap on scroll) · collections row (or the no-collection widget) · "All Saved Items"
 * 2-column grid of wishlist product boxes · floating View Cart pill. `collections: 'none'` shows the widget.
 *
 * iPhone Duo: the back moves to the rail (WishlistHeader). Landscape (useNoonIsWideWindow, standalone) puts the header
 * and the collections, listed vertically, in a 280 side pane next to the grid; the grid takes 3 columns of 179. Open
 * portrait: phone layout with a 3-column grid (669 → 207); folded: 2 columns (382 → 173).
 */
export function WishlistScreen({ params }: ScreenProps<{ collections?: 'none' }>) {
  const { wishlist, cart } = useDemoStore();
  const listHeaderRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  // useState(false) on the screen: dismissing hides the widget until the screen is left
  const [noCollectionDismissed, setNoCollectionDismissed] = useState(false);
  const collections = params.collections === 'none' ? [] : demoCollections;

  const items = wishlist.map(productById);
  const { isWide, contentWidth } = useDeviceLayout();
  // in the account split pane (isEmbedded): no side pane, and the grid sizes to the pane, not the window
  // (useNoonWishlistV2GridLayout isInPane: frame width − insets; landscape pane 570 − 84 → 2 columns)
  const { inPane } = useSplitPane();
  const stageRef = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(0);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!inPane || !el) return;
    // the pane's width less the rail insets its screens pad (the pane may zero one side, e.g. RTL landscape)
    const measure = () => {
      const cs = getComputedStyle(el);
      const inset = (v: string) => parseFloat(cs.getPropertyValue(v)) || 0;
      setPaneWidth(el.offsetWidth - inset('--nk-inset-left') - inset('--nk-inset-right'));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [inPane]);
  const sidePane = isWide && !inPane;
  const areaWidth = inPane && paneWidth ? paneWidth : contentWidth;
  const columns = gridColumns(areaWidth - (sidePane ? SIDE_PANE_WIDTH : 0), sidePane);
  // phone: the 2-column template from the stylesheet, untouched
  const gridStyle = columns === 2 ? undefined : { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  const onScroll = (y: number) => {
    const h = headingRef.current;
    const header = listHeaderRef.current;
    if (!h || !header) return;
    // onAllSavedItemsTitleLayout: y + height inside the list header (its marginTop 16 is not counted)
    const bottom = h.getBoundingClientRect().bottom - header.getBoundingClientRect().top;
    const o = wishlistTokens.titleSwitchOffset;
    setProgress(Math.min(1, Math.max(0, (y - (bottom - o)) / (2 * o))));
  };

  if (!items.length && !collections.length) {
    return (
      <div ref={stageRef} className={styles.stage}>
        <EmptyWishlist />
        <ViewCartPill />
      </div>
    );
  }

  const collectionList = collections.length ? (
    <div className={sidePane ? `nk-scroll ${styles.collectionsVertical}` : `nk-hscroll ${styles.collections}`}>
      {collections.map((c) => (
        <CollectionTile key={c.id} name={c.name} items={c.items} row={sidePane} />
      ))}
    </div>
  ) : (
    !noCollectionDismissed && <NoCollectionWidget onDismiss={() => setNoCollectionDismissed(true)} />
  );

  if (sidePane) {
    // wide window: side pane (header without the scroll swap + vertical collections) · grid column with the pill
    return (
      <div ref={stageRef} className={`${styles.stage} ${styles.stageWide}`}>
        <aside className={styles.sidePane} style={{ width: SIDE_PANE_WIDTH }}>
          <WishlistHeader wide />
          {collectionList}
        </aside>
        <div className={styles.gridColumn}>
          <Screen background="bgSurface" contentStyle={{ paddingBottom: 'var(--nk-inset-bottom)' }}>
            <div className={styles.listHeader}>
              <h3 className={styles.sectionTitle}>{copy.allSavedItems}</h3>
            </div>
            <div className={styles.grid} style={gridStyle} data-pill={cart.length ? '' : undefined}>
              <AnimatePresence initial={false}>
                {items.map((p) => (
                  <motion.div key={p.id} layout className={styles.cell} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <WishlistProductBox product={p} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {!items.length && <EmptyState />}
          </Screen>
          <ViewCartPill />
        </div>
      </div>
    );
  }

  return (
    // wrapper so the floating pill is positioned against the viewport, not the scroll content
    <div ref={stageRef} className={styles.stage}>
      <Screen header={<WishlistHeader progress={progress} />} background="bgSurface" onScroll={onScroll} contentStyle={{ paddingBottom: 'var(--nk-inset-bottom)' }}>
        <div ref={listHeaderRef} className={styles.listHeader}>
          {collectionList}
          <div ref={headingRef}>
            <h3 className={styles.sectionTitle}>{copy.allSavedItems}</h3>
          </div>
        </div>
        <div className={styles.grid} style={gridStyle} data-pill={cart.length ? '' : undefined}>
          <AnimatePresence initial={false}>
            {items.map((p) => (
              <motion.div key={p.id} layout className={styles.cell} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                <WishlistProductBox product={p} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {/* ListEmptyComponent: collections but no saved items */}
        {!items.length && <EmptyState />}
      </Screen>
      <ViewCartPill />
    </div>
  );
}

import { motion } from 'motion/react';
import { Pressable } from '../../../components';
import { useDeviceLayout } from '../../../kit/deviceLayout';
import { useNav } from '../../../kit/Navigator';
import { experiences, type Experience } from '../data';
import { switcherMetrics, switcherMetricsFor, verticalSwitcher } from '../tokens';
import styles from '../home.module.css';

const transition = { duration: switcherMetrics.duration, ease: [0.5, 1, 0.89, 1] } as const; // Easing.out(Easing.quad)
type Metrics = ReturnType<typeof switcherMetricsFor>;

/** The switcher metrics for this window: the 390 phone values, or bappzaar's window-width ones on the iPhone Duo. */
export function useSwitcherMetrics(adaptive: boolean): Metrics {
  const { posture, width } = useDeviceLayout();
  return adaptive && posture !== 'none' ? switcherMetricsFor(width) : switcherMetrics;
}

/**
 * ExperienceSwitcher (src/components/ExperienceSwitcher + ExperienceSwitcherItem + useExperienceSwitcher).
 * Horizontal row of marketplace tiles above the home header. Expanded: square tiles with the full logo.
 * Collapsed (scrolled ≥100): tiles shrink to width/2.2 with the compact logo, radius 20 → 12 (bappzaar useExperienceSwitcher).
 * `adaptive` (home): on the iPhone Duo the tiles size from the window (93.2 folded, 95.57 open, gap 12 on LG), the row
 * sits at max(top inset, 15) and keeps clear of the rail column (`shouldHandleSideInset`, 684398de96c). In landscape
 * home renders `VerticalExperienceSwitcher` instead.
 */
export function ExperienceSwitcher({ expanded, selected = 'noon', adaptive = false }: { expanded: boolean; selected?: string; adaptive?: boolean }) {
  const m = useSwitcherMetrics(adaptive);
  const duo = m !== switcherMetrics;
  return (
    <div className={`${styles.switcher} nk-hscroll`} data-duo={duo || undefined} style={duo ? { gap: m.gap } : undefined}>
      {experiences.map((e) => (
        <SwitcherItem key={e.key} experience={e} expanded={expanded} isSelected={e.key === selected} m={m} />
      ))}
    </div>
  );
}

function SwitcherItem({ experience: e, expanded, isSelected, m }: { experience: Experience; expanded: boolean; isSelected: boolean; m: Metrics }) {
  const nav = useNav();
  const { itemWidth, itemHeight, collapsedItemHeight, itemPadding, collapsedItemPadding, itemRadius, collapsedItemRadius } = m;
  const logo = isSelected ? e.selectedImage : e.image;
  const compact = isSelected ? e.selectedImageCompact : e.imageCompact;
  return (
    <Pressable
      className={styles.switcherItem}
      onClick={() => !isSelected && nav.toast(`Switch to ${e.name}`)}
      aria-label={e.name}
      aria-current={isSelected || undefined}
      style={{ width: itemWidth, minHeight: collapsedItemHeight }}
    >
      <motion.div
        initial={false}
        animate={{ height: expanded ? itemHeight : collapsedItemHeight, borderRadius: expanded ? itemRadius : collapsedItemRadius }}
        transition={transition}
        className={styles.switcherItemInner}
        style={isSelected ? { background: e.bkgColor } : undefined}
      >
        <motion.div className={styles.switcherTitle} initial={false} animate={{ opacity: expanded ? 0 : 1, marginTop: expanded ? 48 : 0 }} transition={transition}>
          <img src={compact} alt="" style={{ width: itemWidth - collapsedItemPadding, height: collapsedItemHeight - collapsedItemPadding }} />
        </motion.div>
        <motion.div className={styles.switcherLogo} initial={false} animate={{ scale: expanded ? 1 : 0, opacity: expanded ? 1 : 0 }} transition={transition}>
          <img src={logo} alt="" style={{ width: itemWidth - itemPadding, height: itemHeight - itemPadding }} />
        </motion.div>
      </motion.div>
    </Pressable>
  );
}

/**
 * VerticalExperienceSwitcher (bappzaar src/components/VerticalExperienceSwitcher, 9a563cf6c68): the iPhone Duo
 * landscape switcher. A column at the start edge, full height, 111 wide (87 tiles, 12 / 24 padding, 12 apart), a
 * 0.75 whiteSmoke end border over a blurred glass (systemThinMaterialLight + 50% overlay → white-alpha50). Tiles are the
 * same tile, always expanded (no collapse): 87 × 87 r20, 67 × 67 logo, selected = the experience colour. Scrolls only
 * when the tiles don't fit (more than floor((H − 48) / 99)).
 */
export function VerticalExperienceSwitcher({ selected = 'noon' }: { selected?: string }) {
  const { height } = useDeviceLayout();
  const { itemSize, topPadding, gap } = verticalSwitcher;
  const fit = Math.floor((height - 2 * topPadding) / (itemSize + gap));
  const m: Metrics = { ...switcherMetrics, itemWidth: itemSize, itemHeight: itemSize, collapsedItemHeight: itemSize / 2.2, gap };
  return (
    <nav className={styles.vSwitcher} aria-label="Experiences">
      <div className={experiences.length > fit ? `${styles.vSwitcherList} nk-scroll` : styles.vSwitcherList}>
        {experiences.map((e) => (
          <SwitcherItem key={e.key} experience={e} expanded isSelected={e.key === selected} m={m} />
        ))}
      </div>
    </nav>
  );
}

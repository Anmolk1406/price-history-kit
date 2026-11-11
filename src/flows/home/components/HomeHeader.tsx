import { motion } from 'motion/react';
import { Pressable, SearchBarButton } from '../../../components';
import { IconButton } from '../../../components/Header/Header';
import { useDeviceLayout } from '../../../kit/deviceLayout';
import { RailButtons } from '../../../kit/Rail';
import { useNav } from '../../../kit/Navigator';
import { tween } from '../../../motion/presets';
import stars from '@assets/home/2025/header/stars.svg';
import glow from '@assets/home/2025/header/bg-glow.svg';
import swoosh from '@assets/home/2025/header/bg-swoosh.svg';
import dividerLine from '@assets/home/2025/header/divider.svg';
// bappzaar NoonAddressSelector / NoonHomeToggle artwork (same files as ClassicHomeScreen)
import chevronDownIcon from '@assets/icons/noon-chevron-down.webp';
import deliveryHomeIcon from '@assets/icons/noon-delivery-home.webp';
import wishlistIcon from '@assets/icons/noon-wishlist-home-v2.webp';
import { addressRow, searchBrands, searchPrefix } from '../data.header';
import { verticalSwitcher } from '../tokens';
import { ref } from '../../../foundations/tokens';
import { ExperienceSwitcher, useSwitcherMetrics } from './ExperienceSwitcher';
import styles from './HomeHeader.module.css';

/**
 * Homepage Revamp 2025 header (Figma 1337:6688): light-blue radial gradient with a cyan glow, a white swoosh and
 * star dots, r12 bottom corners. Rows: experience switcher → address (bappzaar NoonAddressSelector + wishlist button, 1:1) → search
 * (the "All flows" Eid frame's festive teal + lantern background is not used, by request). bappzaar builds the same rows
 * in NoonHomeToggle (NoonAddressSelector, NoonSearchBarButton) under the ExperienceSwitcher.
 * The experience switcher is the existing app one (`ExperienceSwitcher`, `switcherMetrics`), unchanged — same
 * absolute placement, header padding and collapse as ClassicHomeScreen; it is not restyled to the Figma tiles.
 * Past 100px of scroll (`collapsed`) the switcher compacts and the address row folds away; the search bar stays.
 * iPhone Duo (bappzaar NoonHomeToggle, 6ff5767803e / caef1c946d2): the rows keep clear of the rail column (start inset
 * when folded, end inset in landscape, 150ms ease-out-cubic), the heart goes to the rail, and on an open Duo (≥ 600)
 * the artwork is bottom-aligned 400 tall. Values in HomeHeader.module.css.
 */
export function HomeHeader({ collapsed }: { collapsed: boolean }) {
  const nav = useNav();
  const fold = tween('medium', 'out'); // bappzaar: react-native-collapsible 300ms easeOutCubic
  const { posture, hasRail } = useDeviceLayout();
  const { itemHeight, collapsedItemHeight, bottomMargin, topOffset, duration } = useSwitcherMetrics(true);
  const tile = collapsed ? collapsedItemHeight : itemHeight;
  // ExperienceSwitcherProvider paddingTop: the switcher's top + its height + 8 (phone: status bar + 5; Duo: max(top
  // inset, 15)); landscape has the vertical switcher beside the content instead, which is padded a fixed 22
  const paddingTop =
    posture === 'none' ? `calc(var(--nk-inset-top) + ${topOffset + tile + bottomMargin}px)` : posture === 'landscape' ? `${verticalSwitcher.contentTop}px` : `calc(max(var(--nk-inset-top), 15px) + ${tile + bottomMargin}px)`;
  const openWishlist = () => nav.push('wishlist/wishlist');
  return (
    <motion.header className={styles.header} initial={false} animate={{ paddingTop }} transition={{ duration, ease: [0.5, 1, 0.89, 1] }}>
      {/* iPhone Duo folded / landscape: the wishlist heart moves into the rail (bappzaar NativeRailHeader rightButtons
          `noon-home-wishlist`, 9b882983f93: SF heart.fill tinted pink600 with Wishlist V2) and the 40 × 40 button in the
          address row goes */}
      <RailButtons trailing={<IconButton icon="heart" onPress={openWishlist} label="Wishlist" color={ref.palette('pink600')} filled />} />
      <div className={styles.decor} aria-hidden>
        <div className={styles.glowBox}>
          <div className={styles.glowShape}>
            <div className={styles.glowPad}>
              <img src={glow} alt="" />
            </div>
          </div>
        </div>
        <div className={styles.swoosh}>
          <img src={swoosh} alt="" />
        </div>
        <img className={styles.stars} src={stars} alt="" />
      </div>
      <div className={styles.fade} aria-hidden />
      {posture !== 'landscape' && <ExperienceSwitcher expanded={!collapsed} adaptive />}

      <div className={styles.content}>
        <motion.div initial={false} animate={collapsed ? { height: 0, opacity: 0 } : { height: 'auto', opacity: 1 }} transition={fold} style={{ overflow: 'hidden' }}>
          <div className={styles.addressRow}>
            <Pressable className={styles.address} onClick={() => nav.push('address/selectSheet')} scale={0.98}>
              <span className={styles.addressLine1}>
                <img src={deliveryHomeIcon} alt="" className={styles.addressIcon} />
                <span className={styles.addressLabel}>{addressRow.label}</span>
                <img src={chevronDownIcon} alt="" className={styles.chevron} />
              </span>
              <span className={styles.addressLine2}>
                <span>{addressRow.line}</span>
              </span>
            </Pressable>
            {!hasRail && (
              <Pressable className={styles.wishlistButton} onClick={openWishlist} aria-label="Wishlist">
                <img src={wishlistIcon} alt="" width={40} height={40} />
              </Pressable>
            )}
          </div>
        </motion.div>
        <div className={styles.searchRow}>
          <SearchBarButton
            variant="2025"
            height={48}
            // bappzaar NoonSearchBarButton artwork (search-bar.webp, search-bar-camera.webp — the SearchBarButton defaults); Figma divider line
            icons={{ divider: dividerLine }}
            rotatingPrefix={searchPrefix}
            rotatingWords={searchBrands}
            onPress={() => nav.push('search/search')}
          />
        </div>
      </div>
    </motion.header>
  );
}

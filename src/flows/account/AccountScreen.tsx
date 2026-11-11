import { motion } from 'motion/react';
import { memo, useCallback, useState } from 'react';
import { NeedHelpButton, Pressable, Screen } from '../../components';
import { useNav } from '../../kit/Navigator';
import { useDemoStore } from '../../kit/DemoStore';
import { useDeviceLayout } from '../../kit/deviceLayout';
import { currency, formatPrice } from '../../data';
import { AccountFooter } from './components/AccountFooter';
import { ActionCards } from './components/ActionCards';
import { AccountSection, AccountSectionItem } from './components/AccountSection';
import { CountryRow, LanguageRow, MenuGroup } from './components/MenuGroup';
import { ProfileCard } from './components/ProfileCard';
import { AccountSplitLayout, useAccountSplit } from './components/SplitLayout';
import { accountSection, securitySection, settingsSection } from './data';
import { AccountIconImg, AccountImageImg } from './icons';
import styles from './account.module.css';

const enter = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring' as const, mass: 1, damping: 15, stiffness: 120, delay: 0.05 * i },
});

/**
 * Signed-in Account (NoonAccountScreen → NoonAccountSignedInState).
 * Page #F2F3F7, sections 12 apart, edgeSpacing 15.
 *
 * iPhone Duo: the list hosts the split pane (components/SplitLayout.tsx; signed in = this screen). Landscape: list
 * beside the pane, which opens on My orders; folded / open portrait: a pane screen replaces the list.
 */
export function AccountScreen() {
  return (
    <AccountSplitLayout enabled>
      <AccountList />
    </AccountSplitLayout>
  );
}

function AccountList() {
  const nav = useNav();
  const { paneOpen, side } = useAccountSplit();
  const { hasRail } = useDeviceLayout();
  // the floating "Need help?" pill folds into its icon once the page scrolls (Accounts Figma 8924:67388)
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback((y: number) => setScrolled(y > 24), []);
  return (
    <Screen
      // white beside an open pane (bappzaar splitSideContainer)
      background={side ? 'bgSurface' : 'bgPage'}
      withTabBar
      safeTop={false}
      onScroll={onScroll}
      // rail postures: the rows pad themselves (getContentInsetStyle: the rail inset replaces the 15 edge, max(inset − 15, 0))
      railInset={!hasRail}
      // Smart Assist hides while a pane is open
      overlay={paneOpen ? undefined : <NeedHelpButton collapsed={scrolled} onPress={() => nav.toast('Opening Customer happiness center')} />}
    >
      <AccountBody />
    </Screen>
  );
}

/** rail offset (bappzaar getNoonRailOffset, edge 15) on each side of the list */
const railPadding = { paddingLeft: 'max(calc(var(--nk-inset-left, 0px) - 15px), 0px)', paddingRight: 'max(calc(var(--nk-inset-right, 0px) - 15px), 0px)' };

/** The page under the pill; memoised so the scroll flag doesn't re-render (and re-animate) every section. */
const AccountBody = memo(function AccountBody() {
  const nav = useNav();
  const { hasRail } = useDeviceLayout();
  const { side, activeRow } = useAccountSplit();
  return (
    <>
      <div className={styles.statusCover} style={side ? { background: 'var(--nk-color-bg-surface)' } : undefined} />
      <div className={styles.page} style={hasRail ? railPadding : undefined} data-acct-stroke={side || undefined}>
        <motion.div {...enter(0)}>
          <ProfileCard />
        </motion.div>
        {side ? (
          // landscape (bappzaar isWideWindow): the action cards become one stroked section of rows
          <motion.div {...enter(1)}>
            <AccountSection>
              <AccountSectionItem before={<AccountImageImg name="myOrders" style={{ margin: '0 2.5px' }} />} title="My Orders" isActive={activeRow === 'orders'} onPress={() => nav.push('orders/list')} />
              <AccountSectionItem before={<AccountImageImg name="myWishlist" style={{ margin: '0 2.5px' }} />} title="My Wishlist" isActive={activeRow === 'wishlist'} onPress={() => nav.push('wishlist/wishlist')} />
              <CreditsRow flat isActive={activeRow === 'credits'} />
            </AccountSection>
          </motion.div>
        ) : (
          <>
            <motion.div {...enter(1)}>
              <ActionCards />
            </motion.div>
            <motion.div {...enter(2)}>
              <CreditsRow />
            </motion.div>
          </>
        )}
        <motion.div {...enter(3)}>
          <MenuGroup items={accountSection} extra={[<LanguageRow key="lang" />, <CountryRow key="country" />]} active={side ? activeRow : undefined} />
        </motion.div>
        <motion.div {...enter(4)}>
          <MenuGroup items={settingsSection} />
        </motion.div>
        <motion.div {...enter(5)}>
          <MenuGroup
            active={side ? activeRow : undefined}
            items={securitySection}
            extra={[<AccountSectionItem key="signout" before={<AccountIconImg name="signOut" size={20} />} title="Sign out" onPress={() => nav.sheet('account/signOut')} />]}
          />
        </motion.div>
        <motion.div {...enter(6)}>
          <AccountFooter />
        </motion.div>
      </div>
    </>
  );
});

/**
 * NoonAccountNoonCreditsButton. `flat`: inside the landscape orders section (sectionCreditsButton margin 0, radius 0);
 * `isActive`: the wallet is the pane root.
 */
function CreditsRow({ flat, isActive }: { flat?: boolean; isActive?: boolean }) {
  const nav = useNav();
  const credits = useDemoStore((s) => s.credits);
  const cls = [styles.creditsRow, flat && styles.creditsFlat, isActive && styles.creditsActive].filter(Boolean).join(' ');
  return (
    <Pressable className={cls} scale={0.98} onClick={() => nav.push('credits/credits')}>
      <AccountIconImg name="credits" size={20} />
      <span className={styles.creditsLabel}>noon Credits</span>
      <span className={styles.creditsPill}>
        <span>
          {currency} {formatPrice(credits)}
        </span>
        <AccountIconImg name="chevron" size={12} />
      </span>
    </Pressable>
  );
}

import { motion, useTransform, type MotionValue } from 'motion/react';
import chevronLeft from '@assets/vip/chevron-left-rounded.svg';
import { Pressable } from '../../../../components';
import { NOON_ONE } from '../../data.landing';
import { landingTokens } from '../../tokens';
import { NpBackButton, npHeaderWrapperClass } from './npModules';
import styles from './landing.module.css';
import { duo, useVipHeaderInRail, VipRailBack } from '../duo';
import type { CSSProperties } from 'react';

/** VIPLandingScreen.renderHeader: white shadow2 bg + "noon One" title fade in over the first 20px of scroll. */
/** `variant="np"`: non-member prod header (Figma 24:2607 back button). */
/**
 * iPhone Duo: the header sits in the VIP frame, the back moves to the rail on the folded / landscape postures (the
 * "noon One" title stays), and the scrolled background fades in as `duoBg` (the page colour) instead of white.
 */
export function LandingHeader({ scrollY, onBack, variant, duoBg }: { scrollY: MotionValue<number>; onBack: () => void; variant?: 'np'; duoBg?: string }) {
  const opacity = useTransform(scrollY, [0, landingTokens.headerFadeEnd], [0, 1], { clamp: true });
  const inRail = useVipHeaderInRail();
  return (
    <div
      className={[styles.headerWrapper, variant === 'np' && npHeaderWrapperClass, duo.frame].filter(Boolean).join(' ')}
      style={duoBg ? ({ '--vip-duo-header-bg': duoBg } as CSSProperties) : undefined}
    >
      <motion.div className={styles.headerBg} style={{ opacity }} />
      <div className={styles.header}>
        {inRail ? (
          <VipRailBack onBack={onBack} />
        ) : variant === 'np' ? (
          <NpBackButton onBack={onBack} />
        ) : (
          <Pressable className={styles.backButton} scale={1} whileTap={{ opacity: 0.2 }} onClick={onBack} aria-label="Back">
            <img className={styles.backIcon} src={chevronLeft} alt="" />
          </Pressable>
        )}
        <motion.div style={{ opacity }}>
          <span className={styles.headerTitle}>{NOON_ONE}</span>
        </motion.div>
      </div>
    </div>
  );
}

import { motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cardsIcons } from '../data';
import { cardsMetrics } from '../tokens';
import { HeaderButton } from './primitives';
import { IconButton, MaskIcon } from '../../../components';
import { useDeviceLayout } from '../../../kit/deviceLayout';
import { RailButtons } from '../../../kit/Rail';
import { useNav } from '../../../kit/Navigator';
import { useSplitPane } from '../../../kit/splitPane';
import s from './components.module.css';

const HEADER_SCROLL_MID = cardsMetrics.headerContentHeight * 0.5; // PaymentAnimationMetrics.HEADER_SCROLL_MID = 34
const HEADER_SCROLL_FINAL = cardsMetrics.headerContentHeight; // 68
const useClampMap = (v: MotionValue<number>, from: [number, number], to: [number, number]) => useTransform(v, from, to, { clamp: true });

/**
 * iPhone Duo rail postures (PaymentScreenHeader / PaymentScrollableHeader NativeRailHeader): the back goes to the rail
 * and a spacer of its size keeps the JS row in place.
 */
function RailBack({ onBack }: { onBack: () => void }) {
  return <RailButtons leading={<IconButton icon="back" onPress={onBack} label="Back" />} />;
}
/** the account split pane's root is embedded: no back (spacer instead); read once, like Header */
function useShowBack() {
  const nav = useNav();
  const { inPane } = useSplitPane();
  const [canGoBack] = useState(() => nav.canGoBack);
  return !inPane || canGoBack;
}
const backSpacer = <span style={{ width: cardsMetrics.headerButtonSize, height: cardsMetrics.headerButtonSize, flexShrink: 0 }} />;

/** components/PaymentScreenHeader — back button, centred custom content, optional trailing action. */
export function PaymentScreenHeader({ onBack, transparent, children, action }: { onBack: () => void; transparent?: boolean; children?: ReactNode; action?: { icon: { src: string; w: number; h: number }; onPress: () => void } }) {
  const { hasRail } = useDeviceLayout();
  const showBack = useShowBack();
  return (
    <div className={s.screenHeader}>
      {showBack && <RailBack onBack={onBack} />}
      {hasRail || !showBack ? backSpacer : <HeaderButton icon={cardsIcons.back} onPress={onBack} transparent={transparent} label="Back" />}
      <div className={s.screenHeaderInner}>{children}</div>
      {action && (
        <div style={{ marginLeft: 'auto' }}>
          <HeaderButton icon={action.icon} onPress={action.onPress} transparent={transparent} />
        </div>
      )}
    </div>
  );
}

/** components/PaymentScrollableTextButton — pill that collapses into the trailing circle as the list scrolls. */
function ScrollableTextButton({ icon, title, onPress, scrollY }: { icon: { src: string; w: number; h: number }; title: string; onPress: () => void; scrollY: MotionValue<number> }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => setWidth(ref.current?.offsetWidth ?? 0), []);
  const collapse = Math.max(width - cardsMetrics.headerButtonSize, 0);
  const x = useClampMap(scrollY, [0, HEADER_SCROLL_MID], [0, collapse]);
  const titleOpacity = useClampMap(scrollY, [0, HEADER_SCROLL_MID], [1, 0]);
  return (
    <motion.button ref={ref} type="button" className={s.textBtn} whileTap={{ scale: 0.96 }} transition={{ duration: 0 }} onClick={onPress}>
      <motion.span className={s.textBtnBg} style={{ x }} />
      <span className={s.textBtnCap} />
      <span className={s.textBtnContent}>
        <motion.span style={{ x, display: 'flex' }}>
          <MaskIcon src={icon.src} width={icon.w} height={icon.h} color="var(--nk-color-cards-dark-navy)" />
        </motion.span>
        <motion.span className={s.textBtnTitle} style={{ x, opacity: titleOpacity }}>
          {title}
        </motion.span>
      </span>
    </motion.button>
  );
}

/** components/PaymentScrollableButton — cross-fades the light button into the dark glass one between 34 → 68pt of scroll. */
function ScrollableButton({ icon, title, onPress, scrollY, label }: { icon: { src: string; w: number; h: number }; title?: string; onPress: () => void; scrollY: MotionValue<number>; label?: string }) {
  const v = useClampMap(scrollY, [HEADER_SCROLL_MID, HEADER_SCROLL_FINAL], [0, 1]);
  const base = useTransform(v, (n) => 1 - n);
  const pe = useTransform(v, (n) => (n > 0.5 ? 'auto' : 'none'));
  const peBase = useTransform(v, (n) => (n > 0.5 ? 'none' : 'auto'));
  return (
    <div className={s.scrollBtn}>
      <motion.div className={s.scrollBtnScrolled} style={{ opacity: v, pointerEvents: pe }}>
        <HeaderButton icon={icon} onPress={onPress} transparent label={label ?? title} />
      </motion.div>
      <motion.div style={{ opacity: base, pointerEvents: peBase }}>
        {title ? <ScrollableTextButton icon={icon} title={title} onPress={onPress} scrollY={scrollY} /> : <HeaderButton icon={icon} onPress={onPress} label={label} />}
      </motion.div>
    </div>
  );
}

/** components/PaymentScrollableHeader — floating header of the saved cards list with the top gradient. */
export function PaymentScrollableHeader({ onBack, action, scrollY }: { onBack: () => void; action?: { title: string; icon: { src: string; w: number; h: number }; onPress: () => void }; scrollY?: MotionValue<number> }) {
  const fallback = useMotionValue(0);
  const y = scrollY ?? fallback;
  const gradient = useClampMap(y, [cardsMetrics.statusBar, HEADER_SCROLL_FINAL], [0, 1]);
  const { hasRail } = useDeviceLayout();
  const showBack = useShowBack();
  return (
    <div className={s.scrollHeader}>
      {scrollY && <motion.div className={s.scrollHeaderGradient} style={{ opacity: gradient }} />}
      {showBack && <RailBack onBack={onBack} />}
      {hasRail || !showBack ? backSpacer : <ScrollableButton icon={cardsIcons.back} onPress={onBack} scrollY={y} label="Back" />}
      {action && (
        <div style={{ marginLeft: 'auto' }}>
          <ScrollableButton icon={action.icon} title={action.title} onPress={action.onPress} scrollY={y} />
        </div>
      )}
    </div>
  );
}

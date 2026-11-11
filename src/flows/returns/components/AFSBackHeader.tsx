import { useState, type ReactNode } from 'react';
import { IconButton, MaskIcon, Pressable } from '../../../components';
import { useDeviceLayout } from '../../../kit/deviceLayout';
import { RailButtons } from '../../../kit/Rail';
import { useNav } from '../../../kit/Navigator';
import { useSplitPane } from '../../../kit/splitPane';
import { icons } from '../assets';
import styles from './afs.module.css';

/**
 * features/afs/common/components/AFSBackHeader — absolute header, statusBar + 8 / 8 / 12 padding, 40px white back
 * circle (1px #F2F3F7, pressed 0.96), title 18/700 #1D2539. `blur` = iOS ProgressiveBlurView (#F9F9FBCC overlay,
 * blur 10, blurred top → clear bottom from 0.4); otherwise a flat `background` (Request summary: #F9F9FB).
 * iPhone Duo rail postures (AFS NativeRailHeader): the back is the rail's and the JS circle unmounts.
 */
export function AFSBackHeader({ title, onBack, blur, solid, titleClassName, children }: { title?: ReactNode; onBack: () => void; blur?: boolean; solid?: boolean; titleClassName?: string; children?: ReactNode }) {
  const { hasRail } = useDeviceLayout();
  // the account split pane's root is embedded: no back; read once, like Header
  const nav = useNav();
  const { inPane } = useSplitPane();
  const [canGoBack] = useState(() => nav.canGoBack);
  const showBack = !inPane || canGoBack;
  return (
    <div className={styles.backHeader}>
      {showBack && <RailButtons leading={<IconButton icon="back" onPress={onBack} label="Back" />} />}
      {blur && <div className={styles.backHeaderBlur} aria-hidden />}
      {solid && <div className={styles.backHeaderSolid} aria-hidden />}
      <div className={styles.backHeaderContent}>
        {showBack && !hasRail && (
          <Pressable className={styles.backButton} scale={0.96} onClick={onBack} aria-label="Back">
            <MaskIcon src={icons.slimChevronLeft} size={20} color="var(--nk-color-text-primary)" className={styles.flipRtl} />
          </Pressable>
        )}
        <span className={[styles.backHeaderTitle, titleClassName].filter(Boolean).join(' ')}>{title}</span>
        {children}
      </div>
    </div>
  );
}

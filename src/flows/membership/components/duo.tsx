import type { ReactNode } from 'react';
import { IconButton } from '../../../components';
import { useDeviceLayout, type DeviceLayout } from '../../../kit/deviceLayout';
import { RailButtons } from '../../../kit/Rail';
import { membershipSpacing as S } from '../tokens';
import duo from './duo.module.css';

/** iPhone Duo classes (duo.module.css): `column` inside a rail-padded <Screen>, `frame` across the whole window, `flat` */
export { duo };

/**
 * bappzaar VIPNativeRailHeader / VIPNativeRailHidden (useVIPHeaderRail): on the folded and landscape postures the
 * screen's back (and share) live in the rail and the in-page copies unmount. The open portrait keeps them in the page.
 */
export const useVipHeaderInRail = () => useDeviceLayout().hasRail;

/** Buttons in the rail: `leading` = back chevron (VIP sends a back chevron for close too), `trailing` = share etc. */
export function VipRail({ onBack, label = 'Back', trailing }: { onBack?: () => void; label?: string; trailing?: ReactNode }) {
  return <RailButtons leading={onBack && <IconButton icon="back" onPress={onBack} label={label} />} trailing={trailing} />;
}

/** getVIPColumnWidth(parentW): 504 when the window's short side is ≥ 600 and the area is wider, else min(area, 700). */
export function vipColumnWidth({ width, height, contentWidth, posture }: DeviceLayout) {
  const parent = contentWidth - (posture === 'landscape' ? S.mbDuoLandscapeStart : 0);
  return Math.min(width, height) >= 600 && parent > S.mbDuoColumn ? S.mbDuoColumn : Math.min(parent, 700);
}

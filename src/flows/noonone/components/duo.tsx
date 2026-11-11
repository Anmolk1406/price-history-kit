import { IconButton } from '../../../components';
import { useDeviceLayout, type DeviceLayout } from '../../../kit/deviceLayout';
import { RailButtons } from '../../../kit/Rail';
import { baseTokens } from '../tokens';
import duo from './duo.module.css';

/** iPhone Duo column classes (duo.module.css): `column` inside a rail-padded <Screen>, `frame` across the whole window */
export { duo };

/**
 * bappzaar VIPNativeRailHeader / VIPNativeRailHidden (useVIPHeaderRail): on the folded and landscape postures the
 * screen's back (and share) live in the rail and the in-page copies, with their balancing spacer, unmount. The open
 * portrait keeps the in-page header. Returns true when the in-page buttons hide.
 */
export const useVipHeaderInRail = () => useDeviceLayout().hasRail;

/** Back chevron in the rail (NativeRailButtons.back; VIP sends a back chevron for close too). */
export function VipRailBack({ onBack, label = 'Back' }: { onBack: () => void; label?: string }) {
  return <RailButtons leading={<IconButton icon="back" onPress={onBack} label={label} />} />;
}

/**
 * getVIPColumnWidth(parentW): 504 when the window's short side is ≥ 600 and the area is wider, else min(area, 700).
 * The area is the window clear of the rail, less the landscape start spacing (getVIPRailPadding).
 */
export function vipColumnWidth({ width, height, contentWidth, posture }: DeviceLayout) {
  const d = baseTokens.duo;
  const parent = contentWidth - (posture === 'landscape' ? d.landscapeStart : 0);
  return Math.min(width, height) >= d.largeWindow && parent > d.column ? d.column : Math.min(parent, d.columnMax);
}

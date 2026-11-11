import { useState } from 'react';
import { IconButton, Pressable } from '../../../components';
import { useNav } from '../../../kit/Navigator';
import { useDeviceLayout } from '../../../kit/deviceLayout';
import { RailButtons } from '../../../kit/Rail';
import { AccountIconImg } from '../icons';

/**
 * The back arrow of the account inner screens' own headers (edit profile, manage devices). iPhone Duo (bappzaar
 * NoonAccountEditProfileScreen / ManageAllDevicesScreen): the root of the landscape split pane is embedded and has no
 * back; on the rail postures the back moves into the rail (NativeRailHeader) and the JS copy hides. Phone: unchanged.
 */
export function AccountBackButton() {
  const nav = useNav();
  const { posture, hasRail } = useDeviceLayout();
  // fixed while mounted (the pane remounts its root when the window folds or unfolds)
  const [canGoBack] = useState(() => nav.canGoBack);
  const js = (
    <Pressable onClick={nav.back} aria-label="Back" style={{ display: 'flex' }}>
      <AccountIconImg name="back" flipRtl />
    </Pressable>
  );
  if (posture === 'none') return js;
  if (!canGoBack) return null;
  if (hasRail) return <RailButtons leading={<IconButton icon="back" onPress={nav.back} label="Back" />} />;
  return js;
}

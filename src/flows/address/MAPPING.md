# address · bappzaar → kit mapping

Source: bappzaar **master** (read-only). This file only records the iPhone Duo port; the phone port is described in each screen's `source`.

## iPhone Duo

bappzaar `src/screens/AddressV2/*` (`SelectScreen/{SelectScreen,Wrapper,styles}`, `SearchScreen`, `LatLngMapScreen`, `LocationAccessScreen`), `src/components/AddressV2/AddressFloatingOverlay/styles.ts` (`getRailArea`, `getSheetSizeStyle`, `getFixedActionHorizontalStyle`), `src/utils/OverlayBottomSheetWidth.ts`, `src/components/TabSwitcher` (commits 05b27c7e828, 23255b0ffb7, 8a656227018). Phone (390×844) unchanged: the helpers in `components/railArea.ts` return `null` on a phone.

| bappzaar | Kit | Rule per posture |
|---|---|---|
| Select Wrapper rail back, `withBackButton = !rail` | `SelectScreen.tsx`, `components/select.tsx` `SelectHeader` (optional `onBack`) | closed / landscape: back in the rail, JS back hidden (title re-centred); account pane root: no back |
| paddingStart / End = max(inset − 11, 0), `clipPages`, measured pager, `TabSwitcher containerWidth` | `railPadding(dl, 11)`, `.clipPages`, `tabPaneWidth`, `listTabWidth` = pane / 2 − 25 | closed 73 left · landscape 73 right · open portrait full 669 width; in the account pane the pager is measured from the pane |
| floating overlay sheet beside the rail (`getRailArea`, sheet width min(area − 24, round(min(area, clamp(area × .75, 440, 520))))) | `components/railArea.ts` `overlayArea`, `components/map.tsx` `FloatingOverlay` | closed 370 (margins 84 / 12) · open portrait 502 (83.5) · landscape 520 (215.5); max height 85 % of the window; fixed action left / right + 1; top content follows |
| `address/selectSheet` (isBottomSheet, rail inset kept expanded and loading) | `SelectScreen` sheet branch | panes = sheet width, tab = (sheet + 24 − 40) / 2 − 12, body height from the window |
| map screens: rail back, `searchBarWithBackButton = !rail` | `MapScreen.tsx` | rail back (closes the form first: the create / update form hides its back, `isBackButtonHidden = rail`); search bar padded by the rail offset (72); map runs under the rail and centres on the window |
| SearchScreen rail back, padding = rail offsets (edge 12), landscape `|| 12` | `SearchScreen.tsx` | closed 72 / 0 · landscape 12 / 72 |
| controls / location access sheets | navigator classic sheets | sized by the kit navigator (382 folded, 502, 520), not 370 |

Not ported (no kit screen): address-update confirm, collection-point map / create.

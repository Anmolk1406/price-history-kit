# search: bappzaar mapping

## iPhone Duo (bappzaar master @ 05615e53f4b, re-audited 2026-10-27)

Postures and the shell: `src/kit/deviceLayout.ts`, `src/kit/Rail.tsx`. The screen keeps the default `<Screen>` rail inset:
content width 390 phone · 382 closed · 669 widePortrait · 867 landscape. Since the first port (e961975092b) master only
changed `src/utils/RecentSearches.ts` (an optional `landingData` on stored queries, food): no layout effect.

| bappzaar source | Kit file | phone | closed | widePortrait | landscape |
|---|---|---|---|---|---|
| `NoonSearchScreen` `<NativeRailHeader leftButtons>` back: dismiss keyboard, then pop (0c325ae406b) | `SearchScreen.tsx` `<RailButtons leading>` (`IconButton icon="back"`, blurs the field, then `nav.back`) | JS chevron in the bar | **rail back**, bar chevron hidden | JS chevron | **rail back**, bar chevron hidden |
| `NoonSearchBar` inside `<Header>` (paddingTop `$statusBarHeight` + 4.5; `SafeArea.getStatusBarHeight()` = 0 on the Duo, the root keeps the `top` safe-area edge) | `SearchInput` unchanged, header `padding-top: calc(var(--nk-inset-top) + 4px)`, full content width | 358 · top 58 | 350 · top 20 | 637 · top 88 | 835 · top 20 |
| `NoonRecentlySearchedModule` + `NoonRecentlySearchedItem`: item width `useWindowDimensions().width ÷ numberPerRow` (the WINDOW, rail included), `numberPerRow` ×1.5 from `TABLET_BREAKPOINT` 768; image h = w × 1.2, r = w ÷ 10 | `components/RecentSearches.tsx` → `tokens.ts` `recentItemWidthFor(window)` (÷ 5.2, ÷ 7.8 from 768); the emoji placeholder scales with the item (image is w × 0.99, contain) | 75 (unchanged constant) | **90** (466 ÷ 5.2) | **129** (669 ÷ 5.2) | **122** (951 ÷ 7.8) |
| Recent list `contentInsetAdjustmentBehavior={getRailScrollInset()}` | n/a: the screen is already padded clear of the rail (Screen `railInset`), so the list never runs under it | | | | |
| Suggestion rows (`NoonSearchListItem`, FlatList), trending pills (kit only, no bappzaar module) | `SuggestionRow.tsx`, `SearchScreen.tsx`: no Duo logic in bappzaar, full-width rows / wrapping pills | | | | |
| `KeyboardAwareView bottomOffset = bottomTabsHeight` | n/a (the web prototype has no keyboard avoidance) | | | | |

**Deviation from master (R6):** master keeps the bar's own chevron (`NoonSearchBarBackButton` is not rail-aware), so it
shows two backs on the rail postures. The kit hides the bar's chevron there (`onBack` unset when `hasRail`).

Not ported (no kit counterpart): `PreSearchModule` CMS modules (sized on the list's measured width, d4c307f5723; the kit
presearch is a static recent + trending, and its recent module follows `NoonRecentlySearchedModule`'s own window rule
above), the VIP slim banner, image search (`NoonImageSearchScreenV2`, 5af6c0a6fb6 / 984294dafd9), Reels
(`NoonReelsFeedScreen`, aa818c051eb) and the CMS sheet (`NoonCMSSheetScreen`, f52b4213021).

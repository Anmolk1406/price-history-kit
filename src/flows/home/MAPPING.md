# Home · bappzaar mapping

The feed and header mapping lives in [FIGMA-MAPPING.md](./FIGMA-MAPPING.md). This file records the iPhone Duo port.

## iPhone Duo

bappzaar master, read-only, audited at `05615e53f4b` (2026-10-26; no home-path changes since the first port at e961975092b). Line numbers below are at that commit. Postures from `src/kit/deviceLayout.ts`: phone `none` (390, unchanged), `closed` 466×678 (rail left), `widePortrait` 669×951, `landscape` 951×669 (rail right). Spec: `duo-map-home-search.md` §0, §2–§4.

**Feed width** (`components/feedLayout.ts` `useFeedEnv`): the home tab opts out of the root safe area (`marketplaces/noon/NoonApp.ts:204-208`, `rootSafeAreaConfig.optOut`, `switcherConfig.shouldHandleTopOffset: false`), so it is full bleed; kit `<Screen railInset={false}>`. StaticPage measures its list (`src/components/StaticPage/StaticPage.tsx:145`) and hands that width to every module as `effectiveScreenWidth`. phone 390 · closed **466** (runs under the rail column) · widePortrait 669 · landscape **840** (951 − 111 `switcherPaddingLeftOffsetStyle`; the tab rail floats over the right 84).

| bappzaar source (master `05615e53f4b`) | Kit file | phone | closed | widePortrait | landscape |
|---|---|---|---|---|---|
| `StaticPage.tsx:145` measured `contentWidth` → `effectiveScreenWidth` (b31db06c621) | `tokens.feed.ts` `bzMetrics(env)`, `components/feedLayout.ts` (`BzCtx`, `useBz`) | 390 | 466 | 669 | 840 |
| `NoonMetrics.ts:487` `itemsPerViewWithPeek`, `:499` `isDuoFolded`, `:507` `responsiveItemsPerView` (7d55bb98912, bbaf72ce0eb) | `tokens.feed.ts` | phone value | iPhone-sized + 0.3 peek (466 > 440) | same | same |
| `useNoonDynamicCarouselLayout.ts:25` + `NoonDynamicCarouselUtils.ts:6` `getDeviceNumPerView` | `EidBanners.tsx` (`bz.hero`) | 1.4 · 263.67×395.67 | **1.8** · 244×366 | 2.3 · 276×414 | 3.3 · 239.67×359.67 |
| `BannerModuleScrollerMetricsUtil.ts:92` `computeBannerScrollerMetrics` (3.7 / 3.5) | `BannerScroller.tsx` | 86 / 92 | 89 / 89 | 88 / 108 | 98 / 98 |
| `EasyBannerScrollerModule.tsx:27` `getNumPerView` (2.5 / 3 / 3.5) | `EasyBannerScroller.tsx` | 135 / 110 / 92 | 121 / 121 / 89 | 137 / 108 / 108 | 140 / 115 / 98 |
| `BannerModuleScrollerMetricsUtil.ts:122` `computeBannerCarouselMetrics` free 3.5 | `BannerCarousel.tsx` `BannerCarousel` | 94.29 | 90.93 | 109.25 | 98.63 |
| same, snapped 1.1 (NoonSlider) | `BannerCarousel.tsx` `SnappedBannerCarousel` | 341 | 347 | 278 | 353 |
| `carouselLayout.ts:21` `createCarouselLayout` / `NoonMetrics.productBoxCarouselWidth` | `ProductCarousel.tsx`, `ItemCarousel.tsx` | 138 (img 169) | 129 (157) | 145 (178) | 148 (182) |
| `NoonMegaDealsModule.tsx:88-98` rows / cols / slot rule (4 slots) | `MegaDeals.tsx` (`bz.mega`) | 2×2 · 177 | 2×2 · 215 | 1 row · 187, scrolls | 1 row × 4 · 195 |
| `ModuleHeader/styles.ts:114` `timerWithCtaWidth` `$screenWidth * 0.34` (window width) | `tokens.feed.ts` `megaTitleMaxWidth` → `MegaDeals.tsx` | 132.6 | 158.44 | 227.46 | **323.34** |
| `AdBannerModule.tsx:27`: window ≥ 600 and one banner → null | `HomeScreen.tsx` `HomeFeed` filter (`adBannerModule` only; the emaar `bannerModule` stays) | shown | shown | hidden | hidden |
| `constants/ExperienceSwitcher.ts:5` `getItemWidth`, `ITEM_GAP` | `tokens.ts` `switcherMetricsFor`, `ExperienceSwitcher.tsx` (`adaptive`) | 78, gap 8 | 93.2, gap 8 | 95.57, gap 12 | n/a |
| `ExperienceSwitcherProvider.tsx:56` top `max(uncovered inset, homeSwitcherTopOffset)` (75273ed3678; `SafeArea.getStatusBarHeight()` is 0 on the Duo, so the base is 15) | `home.module.css` `.switcher[data-duo]`, `HomeHeader.tsx` paddingTop | inset + 5 | max(16, 15) | max(84, 15) = 84 | content top **22** (`:77`) |
| `ExperienceSwitcher.tsx:108` `shouldHandleSideInset` (684398de96c): `paddingStart/End` = safe-area insets on the clipping container; ScrollView content padding 16; not animated | `.switcher[data-duo]` `left/right` = inset, padding 0 16 | 0 + 16 | **84 + 16** (tiles clip at 84) | 0 + 16 | n/a |
| `VerticalExperienceSwitcher` + `styles.ts:6`, `useVerticalExperienceSwitcher` (9a563cf6c68) | `ExperienceSwitcher.tsx` `VerticalExperienceSwitcher`, `home.module.css` `.vSwitcher` (Screen `overlay`) | – | – | – | 111 column, 87 tiles r20, 12/24 padding, gap 12, 0.75 whiteSmoke border, blur 30 over white-alpha50; scrolls past floor((H − 48)/99) = 6 |
| `ExperienceSwitcherProvider.tsx:68` `switcherPaddingLeftOffsetStyle` 111 / `:77` paddingTop 22 | `HomeScreen.tsx` `contentStyle.paddingInlineStart`, `HomeHeader.module.css` margin-inline-start | – | – | – | 111 / 22 |
| `NoonHomeToggle.tsx:229-231` `useNoonSideRailPaddingStyle` (6ff5767803e; 150 ms ease-out-cubic) | `HomeHeader.module.css` `.addressRow` / `.searchRow` | 16·16 / 15·16 | start + 84 | base | end + 84 |
| `NoonHomeToggle.tsx:264` wishlist `NativeRailHeader rightButtons` (9b882983f93) | `HomeHeader.tsx` `<RailButtons trailing>` (`IconButton icon="heart"`) | JS 40×40 | **rail** | JS | **rail** |
| `NoonHomeToggleAnimatedBackground.tsx:55` `isUnfolded` → `ExperienceSwitcherBackgroundMedia` bottom-aligned 400 (caef1c946d2) | `HomeHeader.module.css` `.decor` | top layer | top layer | bottom, max(100%, 400) | bottom, max(100%, 400) |

Audit 2026-10-27 (code level, all postures): every row re-derived from the source above. Fixed: the Mega deals title cap used the feed width (landscape 285.6) instead of the window width (323.34); the folded switcher padded its scroll content, so tiles scrolled under the rail, and animated the inset, which bappzaar does not. Everything else matched.

Notes
- The phone path always uses the 390 geometry (`phoneFeedEnv`); `bz` (phone) is still exported for code outside the provider.
- The feed is re-keyed by width so carousels restart on fold / rotate (spec R9).
- Search row base stays the kit's Figma 15 / 16 (bappzaar `NoonHomeToggle/styles.ts` searchRow 12 / 12, a phone-wide difference kept on purpose); the rail inset is added on top.
- `home/classic` keeps the phone switcher (no `adaptive`) and the default rail inset; not ported.
- Not ported (no kit counterpart, so no Duo behaviour to carry): NoonHomeToggle toggle row (`toggleRowInsetStyle`, `:231`), the switcher nudge (`ExperienceSwitcherNudge`, end = inset), floating banner strip, hero offer list, frenzy deals, multi-step carousel, CMS sheet.

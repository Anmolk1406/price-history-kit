# Deals · bappzaar mapping

## iPhone Duo

bappzaar `marketplaces/noon/screens/NoonDynamicTabScreen` → StaticPage has no Duo code of its own; the CMS modules' rules apply at the tab's content width (default `<Screen>` rail inset: 382 folded · 669 open portrait · 867 landscape). Spec `duo-map-home-search.md` §7, rules from `NoonMetrics.responsiveItemsPerView` (7d55bb98912) and `Metrics.productBoxNumPerRow`.

| Module | Kit file | phone | closed (382) | widePortrait (669) | landscape (867) |
|---|---|---|---|---|---|
| hero carousel (iPhone-sized + 0.3 peek, gap 15) | `tokens.ts` `dealsDuoLayout`, `DealsScreen.tsx` | 357×162 | 357×162 (≤ 440) | 1.3 · 487×221 | 2.3 · 355×161 |
| deal rails, product card (gap 8) | `Rail cardWidth` | 156 | 156 | 4.3 · 144 | 5.3 · 153 |
| category tiles (gap 14) | `tile` | 87×121 | 87×121 | iPhone-sized | iPhone-sized |
| savings cards (gap 10) | `savings` | 102×193 | 102×193 | iPhone-sized | iPhone-sized |
| product grid `productBoxNumPerRow` | `.grid` columns | 2 | 2 | 3 | 4 |
| cashback strips (bannerModule numPerRow 1) | unchanged, full width | | | | |

The phone (posture `none`) keeps `dealsTokens` as is.

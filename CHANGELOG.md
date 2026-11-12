# Changelog

All notable changes to `noon-kit`. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [semver](https://semver.org/).

## [Unreleased]

### Added
- PDP price history: a "Past low" verdict case (today above a low from 30+ days ago), with a Price history chip whose bars tip into a falling staircase and a sheet pill "Price dropped by N%, N days ago" that opens on 3M.
- PDP price history sheet: the verdict pill's "Ink" reveal (contents left to right, a warm band sweeping through once the graph has drawn) and an "Ink only" variant; switcher rows "Price verdict" and "Verdict pill".
- PDP price history chart: scrubbing onto today's price when it is the window's low turns the marker warm ink and makes it breathe; range pills press to 0.96 and release on a soft spring.

### Changed
- PDP price history sheet: the loading skeleton draws no graph, only the axis placeholders.
- `vercel.json` for deploying the dev preview as a single-page app.

### Fixed
- iPhone Duo preview: the device is centred in the desktop window, and the rail tab bar stays put across pages (it is centred on the whole rail, not on the space the page's rail buttons leave).
- iPhone Duo PDP: matches bappzaar master in every posture: 8 above the pinned gallery, the open-portrait add-to-cart card as wide as the tab bar, and the bappzaar widths for trust tiles, warranty plans, variant chips and frequently-bought-together tiles.
- iPhone Duo home, search, PLP, cart, checkout and order confirmation re-audited against bappzaar master: mega-deal title width from the window, switcher tiles clip at the rail, recent-search items and PLP image heights from the window, cart and checkout headers 12 / 12 in one column, the pink filled rail wishlist on cart, snack bar and list-end paddings, the 45° checkout footer fade, and no confirmation header on the Duo.
- iPhone Duo rail redrawn after the "noon on iPhone Duo" Figma (what iOS draws for bappzaar's native rail): clock and status ring at the top, back in a glass circle, the screen's actions in one glass pill, and a 48-wide tab pill anchored to the bottom.
- iPhone Duo shell: one rail tab bar (switching tabs no longer shows two side by side), and floating sheets reach the full 502 / 520 cap.
- iPhone Duo folded cover: the rail sits on the physical right, the outer edge away from the hinge, and the hinge-side corners are nearly square.

## [0.3.0] — 2026-10-27

### Added
- **Skill memory layer (`/learn`)**: the noon skills learn from people's corrections. Capture hooks (`.claude/settings.json`, and `hooks/hooks.json` in the noon-ui plugin) record correction prompts, hand edits to files Claude wrote, design-guard blocks and failed lints in a local store. `/learn` distils them into lessons (`.claude/resources/learnings/LESSONS.md`) that are injected when a matching skill loads, and promotes recurring ones into the references, the guard and the evals. npm users add it with `npx noon-kit learn setup` (the package now ships a `noon-kit` bin and the learn skill), clones of the kit contribute by default, and maintainers opt in with `npm run learn -- maintainer on`. Plugin, npm and clone users contribute after a one-time consent. Their signals stay local; Claude distils them into general rules, which arrive at most daily as a PR adding one file to `learnings/inbox/`, and maintainers fold them in with `npm run learn -- merge-inbox`. `npm run learn -- <cmd>`; `NOON_LEARN=off` disables capture.
- **iPhone Duo (foldable) layouts**, ported from bappzaar master. The prototype now follows the device it is opened on: a phone keeps today's layout, a folded Duo cover (`closed`), the open Duo upright (`widePortrait`) and on its side (`landscape`) take bappzaar's Duo layouts. `NoonPrototype` `device` prop (`'auto'` default: a touch screen fills the window; a desktop shows the iPhone; `'duo-cover' | 'duo-open' | 'duo-landscape'` preview a Duo on a computer, `?device=` in the dev preview, `--device` in `scripts/shot.mjs`).
- **Shell**: `useDeviceLayout()` (posture, sizes, rail), the 84pt side rail with the header buttons (`<RailButtons>`, `Header` moves its back / actions there) and the vertical glass tab bar (`TabBar orientation="rail"`), `--nk-inset-left` / `--nk-inset-right` (`Screen railInset`), sheets capped and centred on wide windows, `useIsTopScreen()`, `IconButton` `color` / `filled`.
- **Flows**: two-column PDP, cart and checkout (`src/kit/salesLayout.ts`), order confirmation; account split pane (`src/kit/splitPane.tsx`, `useSplitPane()`); home feed, experience switcher (vertical in landscape), categories, deals, search and PLP grids; reviews, wishlist, address, cards, credits, orders, returns, noon One and membership. Each flow's `MAPPING.md` has an `## iPhone Duo` table.

## [0.2.0] — 2026-10-24

### Upgrade notes
- The package is now `noon-kit` (was `@noon/flow-kit`): `npm i noon-kit`, imports from `noon-kit`, `noon-kit/components`, `noon-kit/data`, `noon-kit/style.css`.
- `presentation: 'sheet'` screens get the Origin M-BottomSheet frame by default; add `sheet: 'classic'` to keep the old one.
- `TabBar` is the floating Liquid Glass bar by default; `variant: 'classic'` keeps the opaque bar.
- `NoonPrototype` `reducedMotion` defaults to `'user'` (follows the OS); pass `'never'` to always animate.

### Added
- **Data layer for pages**: `content.ts` per product (all 98), variant families, promotions, PDP copy and `pdpView(product)`; new `src/data` exports `productContent`, `defineContent`, `defineFamily`, `bankOffers` and format helpers.
- **noon motion standard**: `src/motion/noonMotion.ts` (`noonSpring`, `noonTransition`, `noonStagger`, WAAPI helpers, `protoPieSpring`) and `--nk-motion-*` CSS tokens.
- **New flows**: noon Credits (`/credits`), Yellow Friday × Orbi (`/yellow-friday`) and the `fieldds` component gallery.
- **Components**: Field Design System parts (`Radio`, `ActionBar`, `Accordion`, `TextField`, `TextArea` and Field variants of existing ones), `EmptyState` with the noon illustrations, `EtaBadge`, `Glass` / `GlassFade`, Origin `Snackbar`, Origin icons.
- **Runtime**: `useIsTop()`, `useScreenActive()`, `nav.preload()`, sheet layouts `floating` / `gorhom`, `useDemoStore().credits`.
- **Skills and tooling**: screen skills `/orders`, `/account`, `/noon-one`, `/reviews`, `/returns` and `/noon-motion`; the `noon-ui` Claude Code plugin; folder contract (`check:structure`), no-custom-colour lint, `handoff`, `lint:design`, `test:journeys`, `visual:ref`, `perf`.

### Changed
- PDP is a pure template: every product shows its own content and sections without data hide themselves.
- Home, cart, checkout, orders, account, wishlist, PLP and noon One screens matched more closely to bappzaar master and the noon Figma files.
- Faster transitions and screen loads (lazy screens, memoised Navigator stack); reduced motion handled kit-wide.

### Fixed
- PDP variant switching, gallery pin and scroll; PLP filters sheet and marketplace tabs; cart coupons and empty state; checkout and order confirmation layout; status bar; accessibility of covered screens and sheets.

### Removed
- Unused pre-Storefront PDP components and the home department tabs.

## [0.1.0] — first package release

### Added
- 17 flows / 133 screens ported 1:1 from bappzaar master and noon Figma files: home (live CMS creatives, marketplace switcher), search, categories (live CMS tree), deals, PLP, PDP (live iPhone 17 Pro data, variants, FBT, reviews), cart (Figma Cart 2.0), checkout (Figma Checkout 2.0, payments, points, slide-to-order, confirmation, failure), orders, returns, account, addresses (AddressV2), cards (Payment Cards V2), noon One acquisition + membership management, wishlist.
- Design tokens: full noon palette (`--nk-palette-*`), semantic colours, type scale, spacing, radius, shadows, component token groups (`--nk-button-*`, `--nk-pill-*` …), typed `ref.*` helpers; Noontree font with the dirham sign.
- Shared components incl. Button with NoonButton presets, Switch, Checkbox, Spinner, Toast, HtmlText, Divider family, MaskIcon, MarketplaceTag/Wordmark (Figma pills).
- Runtime: in-device Navigator (push / sheet / modal / custom transitions, logical-parent back), page URLs (`src/kit/routes.ts`), `createStore`, DemoStore (cart, wishlist, coupon), noon One membership store.
- Package: ESM, one module per file, tree-shakeable `sideEffects`, sub-path exports (`/components`, `/tokens`, `/flows`, `/flows/<id>`, `/style.css`), assets emitted as files.
- Tooling: token lint, asset optimiser + budget check, route smoke test, pixel regression (`visual-snap`), flow scaffolder.

# cart: bappzaar mapping

The Cart 2.0 visuals are mapped in [FIGMA-MAPPING.md](./FIGMA-MAPPING.md). This file records the bappzaar layout ports.

## iPhone Duo

Source: bappzaar `origin/master` @ e961975092b, re-audited against 05615e53f4b (read-only; the only later changes to the
sales screens pass a noon One `planCode` to the API, no layout). Commits: c2ea0ee6b51 (one column), 54bda48789b (cart
two columns), d9ecab71a1f (detached footer), a91a855af72 (native rail buttons), 93c7aed7b43 (footer clear of the side
nav), 2ce5aa98d9f / 5a9abfe3e20 (header top padding), dcb5d64f993 (toast aligned to a column), dfda25ec2ee (no max
width), a573e5a3982 (no client column split). The phone (posture `none`) renders the pre-Duo JSX unchanged (checked
byte-identical with `shot.mjs --device iphone --no-meta`).

| bappzaar | kit | closed 466 (rail left) | widePortrait 669 | landscape 951 (rail right) |
|---|---|---|---|---|
| `hooks/useNoonSalesLayout.ts` (getNoonSalesLayout, footer variant, column frame) | `src/kit/salesLayout.ts` (shared with checkout) | available 382 · one column 382 / 370 | 669 · one column 669 / 645 · wide | 867 · two columns 484 / 460 + 383 / 371 |
| `getNativeRailRightButtons` (heart.fill, watermelonPink with wishlist v2), `hideWishlistButton = isNativeRailEnabled` | `CartScreen.tsx` `<RailButtons trailing>` (filled `watermelonPink`) + `CartHeader hideWishlist` | wishlist in the rail, header copy hidden; pushed cart: back in the rail | JS header keeps the wishlist | as closed |
| `NoonSalesAnimatedHeader` (one column: container clear of the rail, selector keeps its own px 12) / `renderMultiColumnHeader` (selector takes `sectionSpacing`) | `components/CartHeader.tsx` `duo` | paddingTop max(top + 14, 24) = 30; row 12 / 12 | paddingTop 98; row 12 / 12 | not animated, spans column 0 (484), row = col0 sectionSpacing (12 / 12), paddingBottom 12 |
| `sectionSpacing` (0 on a side touching an inset) | `cart.module.css` `.salesColumn[data-touch-*] > *` | sections flush with the rail, 12 on the other side | 12 / 12 | col0 12 / 12 · col1 12 / 0 |
| `wideScreenSectionsOrder` (API; mock removed in a573e5a3982) | `data.ts` `wideScreenSectionsOrder` | — | — | filled: [updates, groups, secondary_groups, cms_bottom, wishlist, free_gifts, cobrand_cards, callouts] · [coupon_tray, invoice]; empty: [empty, secondary_groups] · [cms_bottom] (the kit's phone `sectionsOrder` split at the mock's rule: coupon + invoice go right) |
| `renderColumn` (own list per column, `flex 0`, no top padding, bottom padding footer + 10 / safe bottom) | `CartScreen.tsx` multi branch | — | — | two scroll lists |
| `getContentPadding` (overlaying footer: its height + 10 + the bottom tabs) | `CartScreen.tsx` `overFooter` | glass: footer + 10 + inset + 10 | Cart tab: footer + 10 + tab bar + inset + 10; pushed: footer + max(inset, 10) + 10 | last column as closed |
| `getNoonSalesFooterVariant` + `renderFooter` / `renderLiquidGlassFooterSheet` / `renderEdgeToEdgeFooter` | `CartFooter.tsx` / `CartGlassFooter.tsx` `duo` | Cart tab: glass sheet lined up with the column (0 / 12); pushed: edge to edge | Cart tab: glass matching the bottom tab bar (unchanged); pushed: detached card 645 (r16, px 8 py 12, gap 24, 0 0 15 4 shadow) | pinned to col1 (`.multiColumnFooter`, width 383), glass or detached card 12 / 0; overview not tappable |
| `renderSectionInvoice` (invoice inline in two columns) | `CartScreen.tsx` `invoice` section, `.sectionInvoice` | — | — | in col1: mt 12, r16, 1px border |
| `NoonSnackBar` (one column: a `getOverlayBottomSheetWidth` box centred clear of the rail, card 12 in) | `CartSnackBar.tsx` `frame` ← `getSalesSnackBarFrame` | card 358 at 96 | card 478 at 95.5 | — |
| `getFloatingMessagesContainerStyle` / `getFloatingMessageWidth` (main column sections, ≤ 440, centred) | `getSalesFloatingMessageFrame` | — | — | 440 at 22 (bappzaar renders no `NoonSnackBar` in two columns; the kit shows the wishlist snack bar in the floating-messages frame instead of dropping it) |

Fixed in this audit (kit before → now): one-column header row 0 on the rail side → 12 / 12 (closed); rail heart outline
black → filled watermelonPink; snack bar 370 at 84 / 440 at 12 / 440 at 12 → 358 at 96 / 478 at 95.5 / 440 at 22; glass
list end padding + 16 → + 10.

Not ported: `cms_top`, `cobrand_banner`, `nudges`, `raffles` sections (no kit component or data); the keyboard-lifted
compact footer (no soft keyboard lift on the web); the cobrand slider width per column (the kit cobrand row already
fills its column); the customization success toast (`NoonCartFloatingMessages` toast) and the coupon `NoonToastV2`
framed on the coupon column, because the kit shows those through the shell `nav.toast` (Navigator, not
column-aware); the one-column list `paddingTop 10` (the kit sections follow the Figma Cart 2.0 spacing, as on the phone).

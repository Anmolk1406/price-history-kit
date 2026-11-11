# iPhone Duo (foldable) layouts

The kit follows the device it is opened on (bappzaar's iPhone Duo support, `src/components/NativeRail/*`,
`marketplaces/noon/utils/NoonDuoLayout.ts`, `NoonScreenInsetsUtil.ts`). A phone keeps the normal layout; every Duo rule
is gated on the posture, so **a change for the Duo must leave the 390×844 phone render byte-identical**.

## Postures (`src/kit/deviceLayout.ts`, `useDeviceLayout()`)

| Posture | Window | Rail | Insets (top / bottom) | Notes |
|---|---|---|---|---|
| `none` | phone (< 600 wide, phone-shaped) | none | 54 / 34 | today's layout |
| `closed` | folded cover 466×678 (narrow, squarer than 1.6) | 84 on the physical right (hinge-side corners near square) | 16 / 16 | tabs + header buttons in the rail |
| `widePortrait` | open upright 669×951 (≥ 600, portrait) | none | 84 / 16 | JS header and bottom tab bar stay |
| `landscape` | open on its side 951×669 (≥ 600, wider than tall) | 84 on the physical right | 16 / 16 | `isWide`: two columns, split pane |

`useDeviceLayout()` also gives `width`, `height`, `contentWidth` (window − rail), `hasRail`, `isWide` (bappzaar
`useNoonIsWideWindow`, landscape only), `isLarge` (≥ 600). CSS: the viewport carries `data-posture` and is a size
container; gate rules with `:global([data-posture='landscape']) .x { … }`. Vars: `--nk-inset-top / -bottom / -left /
-right`, `--nk-window-width`, and `--nk-layout-tab-bar` = 0 on rail postures.

## Shell pieces

- **Rail** (`src/kit/Rail.tsx`): `<RailButtons leading trailing />` puts a screen's back / actions into the rail while
  the rail is on and it is the topmost full screen; hide the JS copies when `hasRail`. `Header` does it for `back` and
  `right`. Rail buttons are `IconButton` (`color` / `filled` for the pink wishlist heart).
- **Rail look** (Figma "noon on iPhone Duo" `5bhpdnIN0eKC10cYDKX6kI · 1:42296`, what iOS draws for bappzaar's native rail):
  clock + status ring at the top, then the button groups (leading: back, a 44 glass circle; trailing: one 48 glass
  pill, 36 buttons 12 apart), and the tab pill anchored 24 from the bottom. `PhoneFrame` draws the groups; screens hand
  in plain `IconButton`s.
- **Tab bar**: tab roots get the glass bar stood up in the rail (`TabBar orientation="rail"`), icons only: 48 wide,
  50 per tab, 42×54 selection capsule. The navigator draws one for the top tab root (never one per screen).
- **Screen**: pads itself clear of the rail (`railInset`, default true); `railInset={false}` for full-bleed screens
  that pad their own rows (home).
- **Sheets**: capped and centred clear of the rail: 382 folded, 502 open portrait, 520 landscape.
- **Split pane** (`src/kit/splitPane.tsx`, account tab): landscape list 40 % + pane; folded / open portrait pane-only;
  `useSplitPane().inPane` for screens that lay out differently inside it.
- **Sales layout** (`src/kit/salesLayout.ts`): cart / checkout columns (422 : 340, two columns above 669).

## Checking

- `node scripts/shot.mjs <route> out.png --device duo-cover | duo-open | duo-landscape | iphone`
- Dev preview: `?device=duo-open` on a computer; a touch screen fills the window and follows its own size.
- Each flow's `MAPPING.md` → `## iPhone Duo` lists the bappzaar source and per-posture rule of every screen.

# cards · bappzaar → kit mapping

Source: bappzaar **master** `features/payment/` (read-only). This file only records the iPhone Duo port.

## iPhone Duo

bappzaar `features/payment/navigation/{paymentRegisterScreens.ts,withPaymentSafeArea.tsx}`, `hooks/{usePaymentContentWidth,usePaymentContainerWidth}.ts`, `components/{PaymentScreenHeader,PaymentScrollableHeader,PaymentContentColumn,PaymentCardFormV2}` (commit 509b2561870). Phone unchanged.

| bappzaar | Kit | Rule per posture |
|---|---|---|
| headers' NativeRailHeader back (JS back → spacer) | `components/Headers.tsx` `PaymentScreenHeader`, `PaymentScrollableHeader` | closed / landscape: back in the rail, a 36 spacer keeps the row; account pane root: no back (spacer). Open portrait keeps the JS back (the kit has no rail there; bappzaar shows it in the native top bar, `showInWidePortrait`) |
| `PaymentContentColumn` maxWidth min(500, container − horizontal) when the window > 600; `formLG` | `cards.module.css` `.section`, `addCard.module.css` `.cardContainer` / `.optionsContainer` (`@container (min-width: 601px)`) | open portrait / landscape: list sections and the add-card art, options and form in a 500 column, centred |

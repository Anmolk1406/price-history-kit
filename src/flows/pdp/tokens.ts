import { palette } from '../../foundations/palette';
import { layout, type TokenOverrides } from '../../foundations/tokens';
import { pdpSfAFlowTokens } from './tokens.sfA';
import { pdpSfBFlowTokens } from './tokens.sfB';
import { pdpSfCFlowTokens } from './tokens.sfC';
import { pdpSfDFlowTokens } from './tokens.sfD';
import { pdpSfEFlowTokens } from './tokens.sfE';
import { pdpNpAFlowTokens } from './tokens.npA';
import { pdpNpBFlowTokens } from './tokens.npB';
import { pdpNpCFlowTokens } from './tokens.npC';
import { pdpNpDFlowTokens } from './tokens.npD';
import { pdpNpEFlowTokens } from './tokens.npE';

/**
 * PDP tokens, values from bappzaar master. See MAPPING.md for the component → value → token table.
 * - `pdpTokens`: JS-only numbers (thresholds, ratios, motion).
 * - `pdpFlowTokens`: exposed as CSS variables on every PDP screen (type → var(--nk-type-pdp-*),
 *   layout → var(--nk-layout-pdp-*), radius → var(--nk-radius-pdp-*), …). Only values with no
 *   equal global token live here; everything else uses --nk-color-* / --nk-palette-* / --nk-space-*.
 */
export const pdpTokens = {
  /** NoonMetrics.productImageHeightNoon: screenWidth × 1.2 */
  galleryRatio: 1.2,
  /** NoonMetrics.pdpHeaderChangeAfter (150) − measured headerInner height (50) */
  headerChangeAfter: 150,
  headerInnerHeight: 50,
  /** NoonScreenWithDrawBehindHeader.animateHeaderBackground: 200ms Easing.inOut(ease) */
  headerFadeMs: 200,
  headerEase: [0.42, 0, 0.58, 1] as [number, number, number, number],
  /** NoonExpandableSearch SPRING_CONFIG */
  searchSpring: { damping: 30, stiffness: 400, mass: 1 },
  /** NoonProductUtil.scaleGallery / translateYGallery (gallery stays pinned and shrinks under the content) */
  parallax: { pullPx: -50, stops: [0, 0.25, 0.5, 1], scale: [1.1, 1, 0.95, 0.9, 0.9] },
  /** NoonMediaPageController */
  dots: { max: 6, min: 4, step: 1, visible: 5, container: 12, containerActive: 14, activeWidth: 12, ms: 150 },
  /** NoonProductInfo nudge ticker (offsetValue / entering / exiting / NoonNudgeTag delayMs) */
  nudge: { offset: 20, enterMs: 400, holdMs: 1000, exitMs: 550, card: { offset: 18, enterMs: 300, holdMs: 1000, exitMs: 450 } },
  /** NoonFrequentlyBoughtTogether: "Added to cart" resets after 3s */
  fbtAddedMs: 3000,
  /** NoonAiProductReviewsSummary shimmer: 2s linear loop, band left −30% → 100% */
  aiShimmerMs: 2000,
  /** NoonTextToggle: 2 lines collapsed */
  titleLines: 2,
  /** NoonQuantitySelector: SECTION_PAD 12, GAP 12, 4.5 visible */
  qty: { sectionPad: 12, gap: 12, maxVisible: 4.5, max: 10 },
  /** NoonProductDetails.onScroll: back to top once scrollY > screenHeight */
  backToTopAfter: layout.deviceHeight,
  /** demo: NoonAddToCartQuantity loading (cart API round-trip) */
  atcLoadingMs: 700,
  /** NoonQuickCartScreen: row translateX 150 → 0 (delay 1500, 500ms bezier(.4,0,.2,1)); text FadeInRight 500 → 0 (delay 1000, 700ms). Demo delays shortened ×0.5. */
  quickCart: { rowFrom: 150, rowDelay: 0.75, rowMs: 0.5, textFrom: 500, textDelay: 0.5, textMs: 0.7, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  /** NoonProductCarousel productBoxV2 width: round((screenWidth − staticPagePadding 15 − 2 × carousel margin 8) / 2.5) */
  recoCardWidth: (screenWidth: number = layout.deviceWidth) => Math.round((screenWidth - 15 - 2 * 8) / 2.5),
  /**
   * iPhone Duo (bappzaar getPdpLayoutMetrics.ts, f47df278074 / 16b0f49593c; components/duoLayout.ts):
   * `top` DUO_SIDE_RAIL_TOP_INSET 24 (closed, landscape) / DUO_WIDE_PORTRAIT_TOP_INSET 82 (open portrait);
   * gallery height ×1.1 capped by `max(H − 140 | 370, 400)` and 700 at ≥600; the two-column left pane starts
   * drawBehindHeaderHeight (status bar + 40) down and its row is 40 + 20 tall (twoColumnGalleryRow);
   * the gallery releases when the right pane's bottom reaches the viewport − 64 (updateTwoColumnOffsets).
   */
  duo: {
    top: { rail: 24, widePortrait: 82 },
    contentPad: 16,
    galleryRatio: 1.1,
    galleryRoom: { twoColumn: 140, oneColumn: 370 },
    galleryMin: 400,
    galleryMax: 700,
    headerHeight: 40,
    galleryRowExtra: 20,
    releaseBar: 64,
    /** NoonMetrics.cappedWidth: min(STICKY_BAR_MAX_FALLBACK_WIDTH 396, w − 2 × 16); tab-bar fallback 358 (unused: the
     *  open-portrait bar always has a measured horizontal tab bar) */
    barMax: 396,
    barFallback: 358,
  },
} as const;

/** RN Text without lineHeight → CSS `line-height: normal`. */
const t = (size: number, weight: number, line: number | string = 'normal') => ({ size, line, weight });

const pdpBaseFlowTokens: TokenOverrides = {
  colors: {
    /** NoonProductDetails container: secondaryBackgroundColor */
    bgPage: palette.secondaryBackgroundColor,
    /** NoonQuickCartScreen backgroundOverlay */
    pdpQuickCartOverlay: 'rgba(240, 244, 249, 0.2)',
    /** NoonAiProductReviewsSummary card gradient: indigo / violet at 4% */
    pdpAiIndigo4: 'rgba(65, 70, 206, 0.04)',
    pdpAiViolet4: 'rgba(191, 61, 235, 0.04)',
    /** shimmer band: white 70% */
    pdpAiShimmer: 'var(--nk-palette-white-alpha70)',
    /** NoonBuyingOption separator: darkGrayColorAlpha(0.15) */
    pdpBuyOptionSep: 'rgba(128, 128, 128, 0.15)',
    /** NoonColors.errorMessageColor (NoonProductSizeVariantSelection size-missing warning) */
    pdpErrorMessage: '#FB0B0B',
  },
  spacing: {
    pdpS1: 1, // NoonAccordion contentInner marginTop
    pdpS3: 3, // NoonTag tagInner paddingVertical, Discount paddingHorizontal
    pdpS5: 5, // nudge paddingHorizontal / text marginLeft, PriceDiscounted info marginStart
  },
  radius: {
    pdpR5: 5, // nudgeContainer, NoonBestValueTag
    pdpR18: 18, // NoonSeller metricContainer
    pdpR25: 25, // NoonPressableIcon, NoonBackToTop
    pdpR40: 40, // NoonQuickCartScreen checkWrapper
  },
  layout: {
    pdpHeaderHeight: 55,
    pdpHeaderInner: 50,
    pdpHeaderButtons: 34,
    pdpIconButton: 40,
    pdpSearchHeight: 40,
    pdpHeart: 32,
    pdpGalleryFade: 10,
    pdpGalleryFooterBottom: 30,
    pdpInfoOverlap: -20,
    pdpPillHeight: 26,
    pdpNudgeHeight: 20,
    pdpDeliveryHeader: 22,
    pdpExpressW: 70,
    pdpExpressH: 22,
    pdpNoonOneW: 34,
    pdpNoonOneH: 20,
    pdpPaymentW: 90,
    pdpPaymentH: 60,
    pdpVariantImageW: 77,
    pdpVariantImageH: 88,
    pdpBorderSelected: 1.5,
    pdpBestValueHeight: 14,
    pdpBestValueOffset: -6,
    pdpSellerLogo: 54,
    pdpQtyMinWidth: 60,
    pdpQtySquare: 48,
    pdpAtcLoader: 32,
    pdpBackToTopOffset: -48,
    pdpListBottom: 64,
    /** iPhone Duo sticky bar (NoonProductDetailsStickyBar): cappedWidth(382, 16) folded · cappedWidth(434, 16) under the
     *  landscape right pane, centred in it ((434 − 396) / 2 = 19 from its end). Open portrait keeps the bottom tab bar, so
     *  the card takes the measured tab bar's width (getStickyBarTabBarWidthStyle): the phone rule, window − 2 × 21. */
    pdpDuoBarClosed: 350,
    pdpDuoBarLandscape: 396,
    pdpDuoBarLandscapeEnd: 19,
    /** iPhone Duo product carousels (useNoonProductCarouselSize, 7d55bb98912): 2.5 / 4.3 / 5.3 per view at 382 / 669 / 867 */
    pdpDuoRecoClosed: 140,
    pdpDuoRecoWide: 145,
    pdpDuoRecoLandscape: 153,
    /** iPhone Duo NoonPaymentsForYou card: (W − 48 − 8 − 50) × (W ≥ 600 ? 0.5 : 1) at W 382 / 669 / 434 (right pane) */
    pdpDuoOfferClosed: 276,
    pdpDuoOfferWide: 281.5,
    pdpDuoOfferLandscape: 328,
    /** iPhone Duo NoonCustomerReviewItem compact photo (da9b9fe48e3): 93 × 116, r5, 0.75 borderPrimary */
    pdpDuoReviewPhotoW: 93,
    pdpDuoReviewPhotoH: 116,
    pdpDuoReviewPhotoBorder: 0.75,
    /** iPhone Duo NoonWarrantyPlans plan card: phoneScaledWidth(W, 0.7) = (W ≥ 600 ? 440 : W) × 0.7 at W 382 / 669 / 434
     *  (right pane); a single plan is W − 48 */
    pdpDuoWarrantyClosed: 267.4,
    pdpDuoWarrantyWide: 308,
    pdpDuoWarrantyLandscape: 303.8,
    /** iPhone Duo NoonSelectionItem: image chip phoneScaledWidth(W, 0.3), every chip min phoneScaledWidth(W, 0.15) */
    pdpDuoChipClosed: 114.6,
    pdpDuoChipWide: 132,
    pdpDuoChipLandscape: 130.2,
    pdpDuoChipMinClosed: 57.3,
    pdpDuoChipMinWide: 66,
    pdpDuoChipMinLandscape: 65.1,
    /** iPhone Duo NoonFrequentlyBoughtItem: 100 × 140, × 1.5 on an LG window (open portrait, landscape) */
    pdpDuoFbtTile: 100,
    pdpDuoFbtImage: 140,
    pdpDuoFbtTileLg: 150,
    pdpDuoFbtImageLg: 210,
    pdpCheckWrapper: 80,
    pdpCheckImage: 64,
    pdpCheckLottie: 120,
    pdpVariantsImage: 80,
    pdpVariantsDelivery: 32,
    /** TouchableOpacity activeOpacity (0.6 most rows, 0.7 store header, RN default 0.2 for Button / HapticsButton / NoonPressableIcon) */
    pdpPressOpacity: 0.6,
    pdpPressSoftOpacity: 0.7,
    pdpPressDefaultOpacity: 0.2,
    /** NoonExpandableSearch activeOpacity */
    pdpPressSearchOpacity: 0.8,
    /** NoonSelectionItem imageOverlay opacity */
    pdpDimOpacity: 0.4,
    /** NoonVariantsOverlayScreen imageOverlay borderWidth */
    pdpBorderImage: 1.2,
    /** NoonProductSizeVariantSelection title letterSpacing */
    pdpTrackingWide: 1,
    /** NoonFrequentlyBoughtItem: 100 × 140 tile, 28px check circle at −8, "+" at −18 */
    pdpFbtW: 100,
    pdpFbtH: 140,
    pdpFbtCheck: 28,
    pdpFbtCheckOffset: -8,
    pdpFbtPlusOffset: -18,
    /** NoonCustomerReviewItem reviewImage 120 × 128 */
    pdpReviewImageW: 120,
    pdpReviewImageH: 128,
    /** NoonCategoryBestSeller icon 32 */
    pdpCtaIcon: 32,
    /** NoonBuyingOptionItem rocketLogo 80 × 20 */
    pdpRocketW: 80,
    /** NoonAiProductReviewsSummary bullet 6, shimmer band 28 */
    pdpAiBullet: 6,
    pdpAiShimmerBand: 28,
    /** shimmer loop (…Duration → ms) */
    pdpAiShimmerDuration: 2000,
    /** carouselNudge text letterSpacing −0.12; nudge height 18 */
    pdpTrackingTight: -0.12,
    pdpCardNudgeHeight: 18,
    pdpIcon14: 14,
    pdpIcon10: 10,
    pdpIcon11: 11,
    pdpIcon12: 12,
    pdpIcon16: 16,
    pdpIcon17: 17,
    pdpIcon18: 18,
    pdpIcon20: 20,
    pdpIcon22: 22,
    pdpIcon24: 24,
    pdpIcon28: 28,
  },
  type: {
    pdpText12: t(12, 400),
    pdpText12Medium: t(12, 500),
    pdpText12Semibold: t(12, 600),
    pdpText13: t(13, 400),
    pdpText13Medium: t(13, 500),
    pdpText13Semibold: t(13, 600),
    pdpText13Bold: t(13, 700),
    pdpText14: t(14, 400),
    pdpText14Medium: t(14, 500),
    pdpText14Semibold: t(14, 600),
    pdpText14Bold: t(14, 700),
    pdpText15Bold: t(15, 700),
    pdpText16: t(16, 400),
    pdpText16Bold: t(16, 700),
    pdpText18Bold: t(18, 700),
    pdpText19Bold: t(19, 700),
    pdpText20Bold: t(20, 700),
    pdpText24Extrabold: t(24, 800),
    /** NoonProductInfo productTitle 16/500/20 */
    pdpTitle: t(16, 500, 20),
    /** noonSellingPrice / noonSaleCurrency 22/700/24 */
    pdpPrice: t(22, 700, 24),
    /** NoonPDPBestPriceTagV2 price 24/700/28 */
    pdpBestPrice: t(24, 700, 28),
    /** salePriceV2 18/500/24 */
    pdpSaleV2: t(18, 500, 24),
    /** NoonDeliveryText 15/600/24 */
    pdpDelivery: t(15, 600, 24),
    /** nudgeText 14/500 over NoonNudgeItem lineHeight 20 */
    pdpNudge: t(14, 500, 20),
    /** NoonSelectionItem outOfStockTextNewVariant 11/600/20 */
    pdpOos: t(11, 600, 20),
    /** carouselNudgeText 13/16 */
    pdpCardNudge: t(13, 400, 16),
    /** NoonBuyingOption rocket <b>: Nippo-Medium 13 (font not bundled → kit font, 500) */
    pdpRocket: t(13, 500),
    /** NoonBestValueTag text 8/800/14 (italic, uppercase) */
    pdpBestValue: t(8, 800, 14),
  },
  shadow: {
    /** NoonQuantitySelector quantitySelected: skyBlue, offset 1/1, radius 3, opacity .3 */
    pdpQtySelected: '1px 1px 3px rgba(150, 198, 255, 0.3)',
    /** NoonVariantsOverlayScreen addToCartContainer: offset 0/−1, radius 8, black .08 */
    pdpVariantsFooter: `0 -1px 8px ${palette.blackAlpha8}`,
    /** NoonFrequentlyBoughtTogether buyTogether: skyBlue, offset 1/1, radius 3, opacity .3 (same as qty selected) */
    pdpBuyTogether: '1px 1px 3px rgba(150, 198, 255, 0.3)',
  },
};

function mergeTokens(...parts: TokenOverrides[]): TokenOverrides {
  const out: Record<string, Record<string, unknown>> = {};
  for (const part of parts) for (const [group, values] of Object.entries(part)) out[group] = { ...(out[group] ?? {}), ...(values as Record<string, unknown>) };
  return out as TokenOverrides;
}

/**
 * Exposed as CSS variables on every PDP screen: the bappzaar port's values plus the Storefront PDP restyle
 * (Figma 2ldJbjmQq4RkhnrNFCfXQB · 3499:75115), one file per section group: tokens.sfA (header, gallery, main info,
 * sponsored row) · sfB (delivery, newer model, variants) · sfC (trust, payment offers, details, warranty, additional
 * info, bestseller) · sfD (seller, A+ features, sponsored brand, FBT) · sfE (reviews, rails, ATC bar); then the New PDP
 * deltas (Figma Af34gfmhQ1D0wstXUEHSIF · 64:5571) per group in tokens.npA–npE.
 */
export const pdpFlowTokens: TokenOverrides = mergeTokens(pdpBaseFlowTokens, pdpSfAFlowTokens, pdpSfBFlowTokens, pdpSfCFlowTokens, pdpSfDFlowTokens, pdpSfEFlowTokens, pdpNpAFlowTokens, pdpNpBFlowTokens, pdpNpCFlowTokens, pdpNpDFlowTokens, pdpNpEFlowTokens);

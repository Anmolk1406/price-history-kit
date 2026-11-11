import type { TokenOverrides } from '../../foundations/tokens';

/**
 * Home feed · bappzaar modules (master ba159e20). Values resolved from bappzaar `styles.ts` + NoonTokens / Colors /
 * Metrics, and the live CMS home payload (`/_svc/catalog/api/v3/u/`, Oct 2026). Keys are prefixed `homeBz`.
 * Colours with no central token stay here as literals.
 */
export const homeFeedFlowTokens: TokenOverrides = {
  colors: {
    // Sponsored (src/components/Sponsored): CMS label textColor
    homeBzAdLabel: '#828282', // token-lint-ignore — CMS label textColor
    // CMS bgColor of homepage-explore-more-icons
    homeBzExploreBg: '#F9F2A4', // token-lint-ignore — CMS bgColor
    // CMS bgColor of homepage-mega-deals
    homeBzMegaBg: '#EFEEFF', // token-lint-ignore — CMS bgColor
    // CMS timerBgColor / headerColor of homepage-mega-deals
    homeBzMegaTimer: '#0A0A0A', // token-lint-ignore — CMS timerBgColor
    homeBzMegaInk: '#141414', // token-lint-ignore — CMS link text colour
    // CMS slot tagBgColor of homepage-mega-deals
    homeBzMegaTag: '#9242F8', // token-lint-ignore — CMS tagBgColor
    // NoonMegaDealsSlotItem old price / discount
    homeBzMegaWas: 'var(--nk-palette-bluish-grey)', // token-lint-ignore — NoonMegaDealsModule styles
    homeBzMegaOff: 'var(--nk-palette-green-color)', // token-lint-ignore — NoonMegaDealsModule styles
    // NoonItemCarouselModule description pill
    homeBzItemPillBg: 'var(--nk-palette-light-baby-blue)', // token-lint-ignore — NoonItemCarouselModule styles
    homeBzItemPillInk: 'var(--nk-palette-new-accent-color)', // token-lint-ignore — NoonItemCarouselModule styles
    homeBzItemTitle: 'var(--nk-palette-charcoal-navy)', // token-lint-ignore — NoonItemCarouselModule styles
    // AdProductLedDisplayCard
    homeBzPldDivider: 'var(--nk-palette-light-grey-color)', // token-lint-ignore — AdProductLedDisplayCard styles
    homeBzPldPrice: 'var(--nk-palette-blue-gray900)', // token-lint-ignore — AdProductLedDisplayCard styles
    homeBzPldOff: '#02A31E', // token-lint-ignore — AdProductLedDisplayCard styles
    homeBzPldAdBg: 'rgba(38, 38, 38, 0.3)', // token-lint-ignore — Sponsored dark tag
    homeBzPldAdInk: 'var(--nk-palette-white-alpha64)', // token-lint-ignore — Sponsored dark tag
    homeBzPldAdBorder: 'var(--nk-palette-white-alpha20)', // token-lint-ignore — Sponsored dark tag border
    // BannerModule scroller / ModuleHeader titles set by the CMS
    homeBzTitleGrey: '#313131', // token-lint-ignore — CMS titleColor (Explore More)
  },
  type: {
    homeBzTitle18: { size: 18, line: 22, weight: 700 }, // ModuleHeader title (18 bold, font default line)
    homeBzLink15: { size: 15, line: 20, weight: 700 }, // ModuleHeader "View all"
    homeBzAd13: { size: 13, line: 16, weight: 400 }, // Sponsored text (base text 13)
    homeBzMegaPrice: { size: 18, line: 22, weight: 700 },
    homeBzMegaWas: { size: 14, line: 18, weight: 600 },
    homeBzMegaTimer: { size: 14, line: 19, weight: 700 },
    homeBzPldTitle: { size: 20, line: 26, weight: 600 },
    homeBzPldPrice: { size: 26, line: 30, weight: 700 },
    homeBzPldSmall: { size: 11, line: 15, weight: 400 },
    homeBzPldSmallBold: { size: 11, line: 15, weight: 600 },
  },
};

/**
 * Home feed geometry. bappzaar computes these from the feed width (StaticPage measures its list and passes
 * `effectiveScreenWidth`, b31db06c621); the formulas are kept next to each number. `bzMetrics(env)` sizes every
 * module for a feed `W` wide; the phone (posture `none`) always uses the 390pt device, so it renders as before.
 * On the iPhone Duo the modules follow bappzaar's "iPhone-sized" rule (marketplaces/noon/theme/NoonMetrics.ts,
 * 7d55bb98912): wider than 440, items keep the size they have on a 390–440 iPhone and more of them fit, with a 0.3 peek.
 */
export const NOON_IPHONE_WIDTH = 390; // NoonMetrics NOON_IPHONE_WIDTH
const NOON_IPHONE_MAX_WIDTH = 440; // NoonMetrics NOON_IPHONE_MAX_WIDTH
const CAROUSEL_PEEK = 0.3; // NoonMetrics CAROUSEL_PEEK
const WINDOW_LG = 600; // WindowClassBreakpoints.LG
const WINDOW_XL = 840; // WindowClassBreakpoints.XL
/** ExperienceSwitcher VERTICAL_RAIL_WIDTH: 87 tile + 2 · 12 (landscape vertical switcher column) */
export const VERTICAL_SWITCHER_WIDTH = 87 + 2 * 12;

const PAD = 15; // Metrics.staticPagePadding
const r3 = (n: number) => Math.round(n * 3) / 3; // PixelRatio.roundToNearestPixel @3x

/** What the feed is laid out for: its width `W`, the window width (window classes) and whether this is the Duo. */
export interface FeedEnv {
  W: number;
  windowWidth: number;
  /** iPhone Duo in any posture (bappzaar IS_IPHONE_DUO) */
  duo: boolean;
}
export const phoneFeedEnv: FeedEnv = { W: NOON_IPHONE_WIDTH, windowWidth: NOON_IPHONE_WIDTH, duo: false };

/** NoonMetrics.itemsPerViewWithPeek */
export function itemsPerViewWithPeek(width: number, { gap, minItemWidth, maxItemWidth }: { gap: number; minItemWidth: number; maxItemWidth: number }) {
  const peeked = Math.max(1, Math.floor(width / (minItemWidth + gap) - CAROUSEL_PEEK)) + CAROUSEL_PEEK;
  const oversize = width / peeked - gap - maxItemWidth;
  if (oversize <= 0) return peeked;
  const undersize = minItemWidth - (width / (peeked + 1) - gap);
  return oversize <= undersize ? peeked : peeked + 1;
}
/** NoonMetrics.isWideScreen: the Duo in any posture, or a tablet-wide window */
export const isWideScreen = (env: FeedEnv, screenWidth = env.W) => env.duo || screenWidth >= WINDOW_LG;
/** NoonMetrics.isDuoFolded */
export const isDuoFolded = (env: FeedEnv, layoutWidth = env.W) => env.duo && layoutWidth < WINDOW_LG;
/** NoonMetrics.responsiveItemsPerView: the phone value up to 440 wide, else iPhone-sized items with a peek */
export function responsiveItemsPerView<T extends number | undefined>(
  env: FeedEnv,
  phoneItemsPerView: T,
  { screenWidth = env.W, contentWidth, gap, itemWidthAt }: { screenWidth?: number; contentWidth: number; gap: number; itemWidthAt: (width: number) => number },
): T | number {
  return isWideScreen(env, screenWidth) && screenWidth > NOON_IPHONE_MAX_WIDTH
    ? itemsPerViewWithPeek(contentWidth, { gap, minItemWidth: itemWidthAt(NOON_IPHONE_WIDTH), maxItemWidth: itemWidthAt(NOON_IPHONE_MAX_WIDTH) })
    : phoneItemsPerView;
}
/** Metrics.responsiveNumPerView: window class LG adds 2, XL adds 3 (n ≤ 1 unchanged) */
export const responsiveNumPerView = (env: FeedEnv, n: number) => (n <= 1 || env.windowWidth < WINDOW_LG ? n : n + (env.windowWidth >= WINDOW_XL ? 3 : 2));
/** Metrics.productBoxNumPerRow */
export const productBoxNumPerRow = (width: number) => (width >= WINDOW_XL ? 4 : width >= WINDOW_LG ? 3 : 2);

/** NoonMetrics.productBoxCarouselWidth (productBoxCarousellMargin 8) */
const productBoxCarouselWidth = (numPerRow: number | undefined, W: number) => {
  const n = numPerRow ?? (W >= WINDOW_LG ? 4.6 : 2.6);
  return Math.round((W - PAD - Math.floor(n) * 8) / (W <= 320 ? 2.4 : n));
};

export function bzMetrics(env: FeedEnv) {
  const { W } = env;
  const riv = (phone: number, o: { contentWidth: number; gap: number; itemWidthAt: (w: number) => number }) => responsiveItemsPerView(env, phone, o);

  /** bannerModuleScroller (computeBannerScrollerMetrics): n = responsive(numPerRow), floor((W − 2·iS − (n−1)·iS) / n) */
  const scrollerPerView = (n: number, iS = 15) => riv(n, { contentWidth: W - iS, gap: iS, itemWidthAt: (sw) => (sw - 2 * iS - (n - 1) * iS) / n });
  /** easyBannerScroller (EasyBannerScrollerModule.getNumPerView / getBannerWidth) */
  const easyBannerWidth = (w: number, iS: number, n: number) => Math.floor((w - iS * 2 - (n - 1) * iS) / n);
  /** default (free) carousel (computeBannerCarouselMetrics, snapped false) */
  const carouselPerView = (npv: number, iS = 15) => riv(npv, { contentWidth: W, gap: iS, itemWidthAt: (sw) => (sw - Math.ceil(npv) * iS) / npv });
  /** productCarousel (createCarouselLayout → productBoxCarouselItemsPerView) */
  const productPerView = responsiveItemsPerView(env, undefined, { contentWidth: W - PAD, gap: 8, itemWidthAt: (sw) => productBoxCarouselWidth(2.5, sw) });
  const productWidth = productBoxCarouselWidth(productPerView, W);
  /** NoonDynamicCarousel (useNoonDynamicCarouselLayout): 1.8 on the folded Duo (getDeviceNumPerView), else responsive */
  const heroPerView = isDuoFolded(env) ? 1.8 : riv(1.4, { contentWidth: W, gap: 15, itemWidthAt: (sw) => sw / 1.4 - 15 });
  const heroWidth = r3(W / heroPerView - 15);
  /** snapped carousel (NoonSlider, computeBannerCarouselMetrics snapped): npv 1.1, iS 15 */
  const stripPerView = carouselPerView(1.1);
  const stripSpaces = (stripPerView - 1) % 2 === 0 ? Math.floor(stripPerView - 1) + 2 : Math.floor(stripPerView - 1) + 1;

  return {
    W,
    pad: PAD,
    radius: 20, // BannerContent roundedCornerStyles
    /** bappzaar AdBannerModule renders nothing for a single banner on a window ≥ 600 (useCustomWindowDimension) */
    hideSingleAdBanner: env.windowWidth >= WINDOW_LG,
    /** adBannerModule / bannerModule grid, numPerRow 1: floor(W − 2·15) wide, height = round3x(w · ratio / 100) */
    gridWidth: Math.floor(W - 2 * PAD), // 360
    /** snapped carousel: ceil((W − slideSpaceCount·iS) / npv), npv 1.1 → slideSpaceCount 1 → 341 at 390 */
    stripWidth: Math.ceil((W - stripSpaces * 15) / stripPerView),
    sliderInterval: 3000, // NoonSlider slideDelayInMs
    sliderAdvance: 0.45, // AUTO_ADVANCE_DURATION_MS 450, Easing.out(cubic)
    sliderFade: 0.85, // NoonSliderSlot: off-centre slides fade to 0.85
    /** default (free) carousel: (W − ceil(n)·iS) / n, npv 3.5, iS 15 → 94.29 at 390 */
    carouselWidth: (npv: number, iS = 15) => {
      const n = carouselPerView(npv, iS);
      return (W - Math.ceil(n) * iS) / n;
    },
    /** bannerModuleScroller: floor((W − 2·iS − (n − 1)·iS) / n) */
    scrollerWidth: (numPerRow: number, iS = 15) => {
      const n = scrollerPerView(numPerRow, iS);
      return Math.floor((W - 2 * iS - (n - 1) * iS) / n);
    },
    /** easyBannerScroller: floor((W − 2·iS − (n − 1)·iS) / n) */
    easyWidth: (npv: number, iS = 15) => easyBannerWidth(W, iS, riv(npv, { contentWidth: W - iS, gap: iS, itemWidthAt: (sw) => easyBannerWidth(sw, iS, npv) })),
    easyPxPerSecond: 1000 / 96, // marquee: linear, 96 ms per px
    /** productCarousel: round((W − 15 − floor(n)·8) / n), n 2.6 → 138 at 390; image round((138 − 12 − 2) · 1.361) = 169 */
    productWidth,
    productImageHeight: Math.round((productWidth - 12 - 2) * 1.361),
    productGap: 8,
    /** NoonDynamicCarousel with the live CMS layout (numPerView 1.4, gap 15, ratio 150): 263.67 × 395.67 at 390 */
    hero: { width: heroWidth, height: r3((heroWidth * 150) / 100), gap: 15 },
    /** hpMegaDealModule (NoonMegaDealsModule): rows / columns / slot width for `slots` slots */
    mega: (slots: number) => {
      const fitted = riv(2, { contentWidth: W - 12, gap: 12, itemWidthAt: (sw) => Math.floor((sw - 12) / 2 - 12) });
      const wide = isWideScreen(env);
      const rows = wide ? Math.min(2, Math.max(1, Math.floor(slots / Math.floor(fitted)))) : 2;
      const columns = Math.ceil(slots / rows);
      const perView = wide && columns <= fitted ? Math.max(columns, Math.floor(fitted)) : fitted;
      const width = Math.floor((W - 12) / perView - 12); // getSlotWidth → 177 at 390
      return { rows, columns, width, imageHeight: (3.85 / 3) * width, scrolls: columns > perView };
    },
    /** ModuleHeader title max width when a timer and a link share the row: `$screenWidth * 0.34` (ModuleHeader styles
     *  timerWithCtaWidth), the window width, not the feed's: 132.6 phone · 158.44 folded · 227.46 open · 323.34 landscape */
    megaTitleMaxWidth: env.windowWidth * 0.34,
    r3,
  };
}
export type BzMetrics = ReturnType<typeof bzMetrics>;

/** The phone geometry (390pt). Feed modules read the live one with `useBz()` (components/feedLayout.ts). */
export const bz = bzMetrics(phoneFeedEnv);

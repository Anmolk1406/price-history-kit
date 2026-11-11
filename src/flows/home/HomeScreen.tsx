import { memo, useCallback, useMemo, useState } from 'react';
import { Screen, Text } from '../../components';
import { AdBannerModule } from './components/AdBannerModule';
import { AdProductLedDisplay } from './components/AdProductLedDisplay';
import { BannerCarousel, SnappedBannerCarousel } from './components/BannerCarousel';
import { BannerScroller } from './components/BannerScroller';
import { BzModuleWrapper } from './components/BzModuleWrapper';
import { EasyBannerScroller } from './components/EasyBannerScroller';
import { EidBanners } from './components/EidBanners';
import { VerticalExperienceSwitcher } from './components/ExperienceSwitcher';
import { BzCtx, useBz, useFeedEnv } from './components/feedLayout';
import { HomeHeader } from './components/HomeHeader';
import { ItemCarousel } from './components/ItemCarousel';
import { MegaDeals } from './components/MegaDeals';
import { ProductCarousel } from './components/ProductCarousel';
import { homeFeed, type BzModule } from './data.feed';
import { bzMetrics, VERTICAL_SWITCHER_WIDTH } from './tokens.feed';
import { useDeviceLayout } from '../../kit/deviceLayout';
import styles from './home2025.module.css';
import { Deferred } from '../../kit/Deferred';

/** home feed modules mounted on the first frame (about one viewport); the rest come after the screen settles */
const FIRST_PAINT_MODULES = 3;

/**
 * Home — the noon app home feed 1:1 with bappzaar master (ba159e20): NoonHomeScreen → NoonHomeToggle header (kept as
 * the kit's custom header: switcher, address, search; collapses past 100px) → NoonHomeToggleContent → StaticPage →
 * Module / ModuleRenderer. The feed renders the live home CMS payload's modules in its order (`homeFeed` in
 * data.feed.ts, one `switch`); spacing comes from each module's ModuleWrapper (innerPadding / bottomMargin), not a feed
 * gap. Hero creatives are the Eid Figma's (Af34gfmhQ1D0wstXUEHSIF · 89:34722) at the live carousel geometry.
 * Mapping: FIGMA-MAPPING.md → "Home feed · bappzaar modules". The previous bappzaar port is `home/classic`.
 */
export function HomeScreen() {
  const [collapsed, setCollapsed] = useState(false);
  // scroll only flips one boolean; the feed is memoised below, so a flip re-renders the header, not every rail
  const onScroll = useCallback((y: number) => {
    setCollapsed(y >= 100);
  }, []);
  // iPhone Duo: the feed sizes from its own width (bappzaar StaticPage effectiveScreenWidth); landscape puts the
  // experience switcher in a 111-wide column at the start and pads the header and feed clear of it
  const env = useFeedEnv();
  const metrics = useMemo(() => bzMetrics(env), [env]);
  const vertical = useDeviceLayout().posture === 'landscape';
  return (
    <BzCtx.Provider value={metrics}>
      <Screen
        header={<HomeHeader collapsed={collapsed} />}
        background="bgSurface"
        withTabBar
        safeTop={false}
        onScroll={onScroll}
        // bappzaar home opts out of RootSafeArea: full bleed, only the header rows and the switcher keep clear of the rail
        railInset={false}
        contentStyle={vertical ? { paddingInlineStart: VERTICAL_SWITCHER_WIDTH } : undefined}
        overlay={vertical ? <VerticalExperienceSwitcher /> : undefined}
      >
        {/* re-keyed on fold / rotate: carousels re-measure and restart, as bappzaar's do (spec R9) */}
        <HomeFeed key={metrics.W} />
      </Screen>
    </BzCtx.Provider>
  );
}

/** Everything under the header; memoised so scroll-driven state in HomeScreen doesn't re-render it. */
const HomeFeed = memo(function HomeFeed() {
  const { hideSingleAdBanner } = useBz();
  // bappzaar AdBannerModule renders nothing for a single banner on a window ≥ 600 (open Duo)
  const modules = homeFeed.filter((m) => !m.hidden && !(hideSingleAdBanner && m.type === 'adBannerModule'));
  return (
    <div className={styles.feed}>
      {/* the first viewport's modules paint with the screen; the long tail mounts a beat later (Deferred) */}
      {modules.map((m, i) => (i < FIRST_PAINT_MODULES ? <FeedModule key={m.key} m={m} /> : <Deferred key={m.key} minHeight={320}><FeedModule m={m} /></Deferred>))}
    </div>
  );
});

/** ModuleRenderer: CMS module type → component. */
function FeedModule({ m }: { m: BzModule }) {
  switch (m.type) {
    case 'adBannerModuleCarousel':
      return <SnappedBannerCarousel wrap={m.wrap} banners={m.banners} flat={m.flat} />;
    case 'noonDynamicCarousel':
      return (
        <BzModuleWrapper wrap={m.wrap}>
          <EidBanners />
        </BzModuleWrapper>
      );
    case 'bannerModuleScroller':
      return <BannerScroller wrap={m.wrap} header={m.header} rows={m.rows} numPerRow={m.numPerRow} banners={m.banners} />;
    case 'adBannerModule':
    case 'bannerModule':
      return <AdBannerModule wrap={m.wrap} header={m.header} banner={m.banner} ad={m.ad} creativeAd={m.creativeAd} crop={m.crop} />;
    case 'productCarousel':
      return <ProductCarousel wrap={m.wrap} header={m.header} products={m.products} />;
    case 'easyBannerScroller':
    case 'adEasyBannerScroller':
      return <EasyBannerScroller wrap={m.wrap} header={m.header} numPerView={m.numPerView} rows={m.rows} banners={m.banners} />;
    case 'hpMegaDealModule':
      return <MegaDeals wrap={m.wrap} header={m.header} />;
    case 'adProductLedDisplayModule':
      return <AdProductLedDisplay wrap={m.wrap} product={m.product} />;
    case 'itemCarousel':
      return <ItemCarousel wrap={m.wrap} header={m.header} />;
    case 'bannerModuleCarousel':
      return <BannerCarousel wrap={m.wrap} header={m.header} banners={m.banners} numPerView={m.numPerView} mediaHeader={m.mediaHeader} />;
  }
}

/** A feed module with the 2025 section title (Figtree Bold 17/22, `new-black`, x=14); `gap` = title → content (Figma, default 8). Kept for the 2025 components. */
export function Module({ title, gap, children }: { title: string; gap?: number; children: React.ReactNode }) {
  return (
    <section className={styles.module} style={gap === undefined ? undefined : { gap }}>
      <Text variant="heading" as="h2" color="var(--nk-palette-new-black)" className={styles.title}>
        {title}
      </Text>
      {children}
    </section>
  );
}

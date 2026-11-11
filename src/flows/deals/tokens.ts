import type { TokenOverrides } from '../../foundations/tokens';

/** Deals tab (CMS page /noon-deals-ae) measurements, from the live mobile page at 390pt. */
export const dealsTokens = {
  stripRatio: 357 / 39,
  heroWidth: 357,
  heroHeight: 162,
  railCardWidth: 156, // screen ÷ 2.5, as on Home
} as const;

/**
 * iPhone Duo layout of the deals tab (bappzaar NoonDynamicTabScreen → StaticPage, no Duo code of its own: the CMS
 * modules' rules apply at the tab's content width, 382 folded · 669 open portrait · 867 landscape).
 * - Carousels follow NoonMetrics.responsiveItemsPerView (7d55bb98912): up to 440 wide the phone size; wider, items keep
 *   the size they have on a 390–440 iPhone and more of them fit, with a 0.3 peek (itemsPerViewWithPeek).
 * - The product grid follows Metrics.productBoxNumPerRow: 2 · 3 from 600 · 4 from 840.
 * The phone (posture `none`) keeps `dealsTokens` as is.
 */
const PEEK = 0.3;
function itemsPerViewWithPeek(width: number, gap: number, min: number, max: number) {
  const peeked = Math.max(1, Math.floor(width / (min + gap) - PEEK)) + PEEK;
  const oversize = width / peeked - gap - max;
  if (oversize <= 0) return peeked;
  const undersize = min - (width / (peeked + 1) - gap);
  return oversize <= undersize ? peeked : peeked + 1;
}
/** item width for a rail `W` wide whose items are `phoneWidth` on the 390 phone (scaling with the phone up to 440) */
function phoneSized(W: number, phoneWidth: number, gap: number, inset = 16) {
  if (W <= 440) return phoneWidth;
  const content = W - inset;
  const n = itemsPerViewWithPeek(content, gap, phoneWidth, (phoneWidth * 440) / 390);
  return content / n - gap;
}
export function dealsDuoLayout(W: number) {
  const hero = phoneSized(W, dealsTokens.heroWidth, 15);
  const tile = phoneSized(W, 87, 14);
  const savings = phoneSized(W, 102, 10);
  return {
    hero: { width: hero, height: (hero * dealsTokens.heroHeight) / dealsTokens.heroWidth },
    railCardWidth: phoneSized(W, dealsTokens.railCardWidth, 8),
    tile: { width: tile, height: (tile * 121) / 87 },
    savings: { width: savings, height: (savings * 193) / 102 },
    gridColumns: W >= 840 ? 4 : W >= 600 ? 3 : 2,
  };
}

export const dealsFlowTokens: TokenOverrides = {
  colors: { bgPage: 'var(--nk-palette-white)' },
};

import { currency } from '../../../../../data';

/** Every money string is the dirham glyph (U+E001, Noontree), a space, then the
 *  value — never the `dhm` ligature (negative tracking suppresses it). */
export const glyph = currency;

/** "2699" / "2759.5" — trailing zeros trimmed, no grouping (as the source banner). */
export function plainAmount(v: number) {
  return String(Number(v.toFixed(2)));
}

/** Splits into major / minor so the sheet can render small decimals. */
export function moneyParts(value: number) {
  const [major, minor] = value.toFixed(2).split('.');
  return { glyph, major, minor };
}

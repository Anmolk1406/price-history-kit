import { useEffect, useState } from 'react';
import { OriginIcon } from '../../../../components';
import { discountPercent, formatPrice, money } from '../../../../data';
import flashDealBg from '@assets/pdp/price-cases/flash-deal-bg.svg';
import flashDealLogo from '@assets/pdp/price-cases/flash-deal-logo.svg';
import { copy, PRICE_CASES, priceCaseStore, VERDICT, type PriceCase } from './cases';
import styles from './PriceCaseBlock.module.css';

/**
 * Price block for the price-history cases, replacing SfMainInfo's price row. Six cells:
 *
 *   normal · not lowest     price row + "Price history" chip          (24660:43629)
 *   normal · lowest 30      price row, then the verdict tooltip        (24651:128669)
 *   best   · either         best-price row above a demoted offer price (24660:52952 / 53209)
 *   ltd    · either         flash-deal header, red price chip          (24660:57916 / 59548)
 */
export function PriceCaseBlock({ onOpenHistory }: { onOpenHistory: () => void }) {
  const { price: state, history } = priceCaseStore.useStore();
  const c = PRICE_CASES[state];
  const lowest = history === 'lowest30';

  if (c.ltd) return <LtdBlock c={c} lowest={lowest} onOpenHistory={onOpenHistory} />;

  const priceRow = <PriceText c={c} demoted={c.bestPrice !== undefined} />;
  return (
    <div className={styles.block} data-best={c.bestPrice !== undefined || undefined}>
      {c.bestPrice !== undefined && <BestPriceRow value={c.bestPrice} />}
      {lowest ? (
        <div className={styles.withTooltip}>
          {priceRow}
          <VerdictTooltip onOpen={onOpenHistory} />
        </div>
      ) : (
        <div className={styles.withChip}>
          {priceRow}
          <PriceHistoryChip onOpen={onOpenHistory} />
        </div>
      )}
    </div>
  );
}

function PriceText({ c, demoted }: { c: PriceCase; demoted: boolean }) {
  return (
    <span className={styles.priceText}>
      <span className={demoted ? styles.saleDemoted : styles.sale}>{money(c.price)}</span>
      <span className={styles.meta}>
        <span className={styles.was}>{formatPrice(c.mrp)}</span>
        <span className={styles.off}>{copy.pctOff(discountPercent(c.mrp, c.price))}</span>
      </span>
    </span>
  );
}

/** Best-price row — 24660:52953: 24/700 price, then the mint pill "Best price with offers" + chevron. */
function BestPriceRow({ value }: { value: number }) {
  return (
    <div className={styles.bestRow}>
      <span className={styles.bestValue}>{money(value)}</span>
      <span className={styles.bestPill}>
        <OriginIcon name="discount-tag" filled size={16} color="var(--nk-color-best-price-ink)" />
        <span className={styles.bestLabel}>
          {copy.bestPriceAccent}
          {copy.bestPriceRest}
        </span>
        <OriginIcon name="chevron-right" size={16} color="var(--nk-color-best-price-ink)" />
      </span>
    </div>
  );
}

/** Entry point — 24824:202774: white, 1px border, r8, h28, brown bars + "Price history" + chevron. */
export function PriceHistoryChip({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className={styles.chip} onClick={onOpen} aria-label={copy.priceHistory}>
      <span className={styles.chipBody}>
        <PriceHistoryBars />
        <span className={styles.chipLabel}>{copy.priceHistory}</span>
      </span>
      <OriginIcon name="chevron-right" size={12} color="var(--nk-color-text-secondary)" />
    </button>
  );
}

/** The 16px four-bar glyph from the chip (no Origin icon draws bars of these heights). */
function PriceHistoryBars() {
  return (
    <span className={styles.bars} aria-hidden>
      {[4.3, 8.2, 10.4, 6.8].map((h, i) => (
        <span key={i} style={{ height: h }} />
      ))}
    </span>
  );
}

/** Verdict tooltip — 26211:55341: peach, r8, pointer above at x 24–40; verdict left, "Price history ›" right. */
function VerdictTooltip({ onOpen }: { onOpen: () => void }) {
  return (
    <div className={styles.tooltip}>
      <span className={styles.verdict}>
        <OriginIcon name="trend-down" size={20} color="var(--ph-ink)" />
        {VERDICT}
      </span>
      <button type="button" className={styles.tooltipLink} onClick={onOpen} aria-label={copy.priceHistory}>
        {copy.priceHistory}
        <OriginIcon name="chevron-right" size={20} color="var(--ph-ink)" />
      </button>
    </div>
  );
}

/** "Deal active" — 24660:57916 / 59548: flash-deal header with a live countdown, the price in a slanted red chip, MRP
 *  + % off, and the chip on the right (or the verdict tooltip under the row). */
function LtdBlock({ c, lowest, onOpenHistory }: { c: PriceCase; lowest: boolean; onOpenHistory: () => void }) {
  const ltd = c.ltd!;
  const left = useCountdown(ltd.countdownSec);
  return (
    <div className={styles.ltd}>
      <div className={styles.dealHeader}>
        <img src={flashDealBg} alt="" aria-hidden className={styles.dealBg} />
        <img src={flashDealLogo} alt={ltd.dealName} className={styles.dealLogo} />
        <span className={styles.dealTimer}>
          {copy.endsIn} <b>{left}</b>
        </span>
      </div>

      <div className={styles.ltdRow}>
        <span className={styles.ltdPrice}>{money(c.price)}</span>
        <span className={styles.meta}>
          <span className={styles.was}>{formatPrice(c.mrp)}</span>
          <span className={styles.off}>{copy.pctOffLower(discountPercent(c.mrp, c.price))}</span>
        </span>
        {!lowest && (
          <span className={styles.ltdChip}>
            <PriceHistoryChip onOpen={onOpenHistory} />
          </span>
        )}
      </div>

      {lowest && <VerdictTooltip onOpen={onOpenHistory} />}
    </div>
  );
}

function useCountdown(startSec: number) {
  const [sec, setSec] = useState(startSec);
  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => (s > 0 ? s - 1 : startSec)), 1000);
    return () => window.clearInterval(id);
  }, [startSec]);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}`;
}

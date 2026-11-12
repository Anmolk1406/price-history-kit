import { useState } from 'react';
import { HISTORY_STATES, LOADING_STATES, PILL_STATES, PRICE_STATES, priceCaseStore, type CaseOption } from './cases';
import styles from './CaseSwitcher.module.css';

/**
 * Review control for the six price-history cells. Lives outside the phone (desktop: beside it; touch: a "Cases" pill
 * top-right that opens the panel), so the PDP itself stays untouched.
 */
export function CaseSwitcher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={styles.side}>
        <Panel />
      </div>
      <div className={styles.touch}>
        <button type="button" className={styles.pill} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Cases'}
        </button>
        {open && <Panel />}
      </div>
    </>
  );
}

function Panel() {
  const { price, history, loading, pill } = priceCaseStore.useStore();
  return (
    <div className={styles.panel}>
      <div className={styles.title}>Price history cases</div>
      <Group label="Price block" options={PRICE_STATES} value={price} onChange={(v) => priceCaseStore.patch({ price: v })} />
      <Group label="Price verdict" options={HISTORY_STATES} value={history} onChange={(v) => priceCaseStore.patch({ history: v })} />
      <Group label="Loading" options={LOADING_STATES} value={loading} onChange={(v) => priceCaseStore.patch({ loading: v })} />
      <Group label="Verdict pill" options={PILL_STATES} value={pill} onChange={(v) => priceCaseStore.patch({ pill: v })} />
    </div>
  );
}

function Group<T extends string>({ label, options, value, onChange }: { label: string; options: CaseOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className={styles.group}>
      <div className={styles.label}>{label}</div>
      <div className={styles.segments} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={o.id === value} title={o.note} className={styles.segment} data-on={o.id === value || undefined} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

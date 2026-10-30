import horiLines from '@assets/pdp/price-history/sheet-hori-lines.svg';
import vertiLines from '@assets/pdp/price-history/sheet-verti-lines.svg';
import glow1 from '@assets/pdp/price-history/sheet-glow-1.svg';
import glow2 from '@assets/pdp/price-history/sheet-glow-2.svg';
import styles from './SheetDecor.module.css';

/** Sheet background decoration — nodes 24660:45611 / 45674 / 45675 / 45676.
 *
 *  A 7%-opacity grid (two line exports plus a scatter of alpha-black blocks) and
 *  two soft glow vectors over a gradient. Barely visible, but it gives the sheet's
 *  top half its texture. Positions are the 351-wide card's; the grid is centred so
 *  it stays balanced on wider cards.
 */
type Block = [x: number, y: number, w: number, h: number, alpha: number];

const BLOCKS: Block[] = [
  [213.68, 216.41, 21.246, 21.246, 0.5],
  [106.84, 216.41, 21.246, 21.246, 0.2],
  [299.27, 67.08, 21.246, 20.943, 0.25],
  [128.09, 131.1, 21.246, 20.943, 0.15],
  [277.72, 88.32, 21.246, 20.943, 0.25],
  [106.8, 67.08, 21.246, 20.943, 0.15],
  [277.72, 67.08, 21.246, 20.943, 0.25],
  [106.8, 131.1, 21.246, 20.943, 0.15],
  [85.59, 216.41, 21.246, 21.246, 0.2],
  [85.59, 237.65, 21.246, 21.55, 0.2],
  [42.8, 195.16, 21.246, 21.246, 0.2],
];

/** Group "top" — 24660:45660, at (235.23, 0). */
const TOP_GROUP: Block[] = [
  [21.25, 24.28, 21.246, 21.246, 0.15],
  [-0.23, 2.91, 21.246, 21.056, 0.15],
  [-0.23, 24.16, 21.246, 21.194, 0.15],
];

/** Group "top left" — 24660:45664, at (19.73, 22.46). */
const TOP_LEFT_GROUP: Block[] = [
  [23.07, 22.76, 21.55, 21.853, 0.2],
  [1.52, 1.52, 21.55, 21.246, 0.2],
  [-19.73, 1.82, 21.55, 21.246, 0.2],
  [1.52, 22.76, 21.55, 21.853, 0.2],
  [87.11, -19.73, 21.55, 21.246, 0.25],
  [23.07, 65.56, 21.246, 21.55, 0.2],
  [279.54, 172.7, 21.246, 21.246, 0.15],
  [300.79, 193.95, 21.246, 21.246, 0.15],
];

function Blocks({ list }: { list: Block[] }) {
  return (
    <>
      {list.map(([x, y, w, h, a], i) => (
        // the 7%-opacity grid's alpha-black squares; alpha per block from Figma
        <div key={i} className={styles.block} style={{ left: x, top: y, width: w, height: h, opacity: a }} />
      ))}
    </>
  );
}

export function SheetDecor() {
  return (
    <>
      {/* grid lines — 24660:45611, 7% opacity */}
      <div aria-hidden className={styles.grid}>
        <div className={styles.horiWrap}>
          <div className={styles.rotate}>
            <img src={horiLines} alt="" style={{ width: 309.057, height: 400.423 }} />
          </div>
        </div>
        <img src={vertiLines} alt="" className={styles.abs} style={{ left: 12.35, top: -0.05, width: 405.987, height: 309.164 }} />
        <div className={styles.abs} style={{ left: 12.54, top: 4.71, width: 341.762, height: 259.205 }}>
          <Blocks list={BLOCKS} />
          <div className={styles.abs} style={{ left: 235.23, top: 0, width: 42.493, height: 45.528 }}>
            <Blocks list={TOP_GROUP} />
          </div>
          <div className={styles.abs} style={{ left: 19.73, top: 22.46, width: 42.493, height: 45.528 }}>
            <Blocks list={TOP_LEFT_GROUP} />
          </div>
        </div>
      </div>

      {/* gradient — 24660:45674 */}
      <div aria-hidden className={styles.fade} />

      {/* glows — 24660:45675 / 45676 */}
      <div aria-hidden className={styles.glow1}>
        <div className={styles.flipY}>
          <img src={glow1} alt="" style={{ width: 444, height: 185 }} />
        </div>
      </div>
      <div aria-hidden className={styles.glow2}>
        <div className={styles.rotFlip}>
          <img src={glow2} alt="" style={{ width: 490, height: 179 }} />
        </div>
      </div>
    </>
  );
}

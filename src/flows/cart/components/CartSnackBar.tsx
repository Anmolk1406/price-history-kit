import { ProductImage, Toast } from '../../../components';
import type { Product } from '../../../data';
import { t } from '../data';
import styles from './snackbar.module.css';

/**
 * NoonSnackBar (wishlist_v2 move-to-wishlist): white r16 card (1px newBorderColor, padding 12, margin 12)
 * over a soft blue gradient; 36×48 product image in a #F2F3F7 r8 box, "Item moved to " + bold "Wishlist" (16px).
 * Slides in with a spring (damping 16, stiffness 120, mass .7) and hides after 3s.
 */
export function CartSnackBar({ product, onHide, onPress, frame }: { product: Product | null; onHide: () => void; onPress: () => void; /** iPhone Duo: the main column's section frame (start from the window edge, width ≤ 440) */ frame?: { start: number; width: number } }) {
  return (
    <Toast
      item={product}
      duration={3000}
      onHide={onHide}
      layerClassName={styles.overlay}
      className={styles.wrapper}
      // the card keeps its 12 margin, so the wrapper is the frame + 12 on each side
      style={frame && { width: frame.width + 24, marginInlineStart: frame.start - 12 }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '110%' }}
      transition={{ type: 'spring', damping: 16, stiffness: 120, mass: 0.7 }}
    >
      {(p) => (
        <>
          <span className={styles.gradient} />
          <button type="button" className={styles.container} onClick={onPress}>
            <span className={styles.imageContainer}>
              <span className={styles.imageInner}>
                <ProductImage product={p} width={36} height={48} radius={6} emojiScale={0.6} />
              </span>
            </span>
            <span className={styles.textContainer}>
              <span className={styles.title}>
                {t.movedToPrefix}
                <b>{t.wishlist}</b>
              </span>
            </span>
          </button>
        </>
      )}
    </Toast>
  );
}

import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { NoonThemeProvider } from '../foundations/ThemeProvider';
import type { TokenOverrides } from '../foundations/tokens';
import { DemoStoreProvider } from './DemoStore';
import { Navigator } from './Navigator';
import { PhoneFrame } from './PhoneFrame';
import { DEVICES, DeviceLayoutCtx, deviceLayout, type DeviceId } from './deviceLayout';
import { RailSlotsCtx, type RailSlot, type RailSlots } from './Rail';
import { StatusBarCtx, type StatusBarTone } from './statusBar';
import { createRegistry } from './registry';
import type { FlowDef, Route, StackEntry } from './types';
import { REDUCED_MOTION_ATTR, useReduceMotion } from '../motion/reducedMotion';
import '../foundations/global.css';
import '../motion/noonMotion.css';

export interface NoonPrototypeProps {
  /** flows to register — import only the ones your demo needs */
  flows: FlowDef[];
  /** e.g. 'home/home' or 'pdp/detail' */
  initialRoute?: Route;
  initialParams?: Record<string, unknown>;
  /** wrap in an iPhone frame (default true) */
  frame?: boolean;
  /**
   * The device the prototype lays out for (src/kit/deviceLayout.ts). `'auto'` (default): on a touch screen (a phone, a
   * foldable, a tablet) the prototype fills the window and follows its size and rotation, so an iPhone Duo gets the
   * folded / open / landscape layouts by itself; on a desktop it shows the iPhone. An id (`'duo-cover'`, `'duo-open'`,
   * `'duo-landscape'`, `'iphone'`) shows that device's screen on any computer, e.g. to review the Duo layouts.
   */
  device?: DeviceId | 'auto';
  scale?: number;
  rtl?: boolean;
  /** global token overrides (rebrand / A-B a colour across every flow) */
  tokens?: TokenOverrides;
  emptyCart?: boolean;
  /**
   * Reduced motion (default `'user'`: follow the OS `prefers-reduced-motion` setting). `'always'` forces it on,
   * `'never'` always animates (e.g. a recorded demo). Drives motion/react's MotionConfig, the CSS rule in
   * global.css, Lottie / Spinner / Skeleton and every flow's autoplay (`useReduceMotion`, src/motion/reducedMotion.ts).
   */
  reducedMotion?: 'never' | 'always' | 'user';
  onRouteChange?: (route: Route, stack: StackEntry[]) => void;
  /** imperatively reset from outside (playground) */
  resetSignal?: { route: Route; params?: Record<string, unknown>; nonce: number };
}

/**
 * Drop-in prototype player. In any React app:
 *
 *   import { NoonPrototype, homeFlow, plpFlow, pdpFlow, cartFlow } from 'noon-kit';
 *   import 'noon-kit/style.css';
 *   <NoonPrototype flows={[homeFlow, plpFlow, pdpFlow, cartFlow]} initialRoute="home/home" />
 */
export function NoonPrototype({ flows, initialRoute, initialParams, frame = true, device = 'auto', scale = 1, rtl, tokens, emptyCart, reducedMotion = 'user', onRouteChange, resetSignal }: NoonPrototypeProps) {
  const win = useWindowSize(device === 'auto');
  const fit = device === 'auto' && !!win;
  const size = fit ? win : DEVICES[device === 'auto' ? 'iphone' : device];
  const dl = useMemo(() => deviceLayout(size.width, size.height), [size.width, size.height]);
  const [railSlots, setRailSlots] = useState<RailSlots>({});
  const onRailSlot = useMemo(() => {
    const setters = {} as Record<RailSlot, (el: HTMLElement | null) => void>;
    return (slot: RailSlot) => (setters[slot] ??= (el) => setRailSlots((s) => (s[slot] === el ? s : { ...s, [slot]: el })));
  }, []);
  const registry = useMemo(() => createRegistry(flows), [flows]);
  const start = initialRoute ?? `${flows[0].id}/${flows[0].initial}`;
  const [screenTone, setScreenTone] = useState<StatusBarTone>('dark');
  const [topRoute, setTopRoute] = useState<Route>();
  // runtime overrides per route (useStatusBar); they only apply while that route is the top screen
  const [overrides, setOverrides] = useState<Record<string, StatusBarTone>>({});
  const setOverride = useCallback(
    (route: string, tone: StatusBarTone | undefined) =>
      setOverrides((o) => {
        if (o[route] === tone) return o;
        const next = { ...o };
        if (tone) next[route] = tone;
        else delete next[route];
        return next;
      }),
    [],
  );
  const statusBar = (topRoute && overrides[topRoute]) || screenTone;

  const onChange = useCallback(
    (stack: StackEntry[]) => {
      const top = [...stack].reverse().find((e) => e.presentation !== 'sheet') ?? stack.at(-1);
      if (top) {
        setScreenTone(registry.resolve(top.route)?.screen.statusBar ?? 'dark');
        setTopRoute(top.route);
        onRouteChange?.(stack.at(-1)!.route, stack);
      }
    },
    [registry, onRouteChange],
  );

  return (
    <NoonThemeProvider overrides={tokens} rtl={rtl}>
      <MotionConfig reducedMotion={reducedMotion}>
        <ReducedMotionScope>
          <DemoStoreProvider emptyCart={emptyCart}>
            <DeviceLayoutCtx.Provider value={dl}>
              <RailSlotsCtx.Provider value={railSlots}>
                <PhoneFrame frameless={!frame} scale={scale} statusBar={statusBar} size={size} fit={fit} onRailSlot={onRailSlot}>
                  <StatusBarCtx.Provider value={setOverride}>
                    <Navigator registry={registry} initialRoute={start} initialParams={initialParams} onChange={onChange} resetSignal={resetSignal} />
                  </StatusBarCtx.Provider>
                </PhoneFrame>
              </RailSlotsCtx.Provider>
            </DeviceLayoutCtx.Provider>
          </DemoStoreProvider>
        </ReducedMotionScope>
      </MotionConfig>
    </NoonThemeProvider>
  );
}

/** a phone, foldable or tablet: no hover, a finger for a pointer */
const TOUCH_SCREEN = '(hover: none) and (pointer: coarse)';

/**
 * The window size while `active` and on a touch screen (undefined otherwise), live across rotation, folding and
 * resizing. The visual viewport is ignored on purpose: it shrinks with the keyboard, which must not change the posture.
 */
function useWindowSize(active: boolean) {
  const read = () => (active && typeof window !== 'undefined' && window.matchMedia(TOUCH_SCREEN).matches ? { width: window.innerWidth, height: window.innerHeight } : undefined);
  const [size, setSize] = useState(read);
  useEffect(() => {
    if (!active) return setSize(undefined);
    const update = () => setSize((prev) => {
      const next = read();
      return prev && next && prev.width === next.width && prev.height === next.height ? prev : next;
    });
    update();
    const mq = window.matchMedia(TOUCH_SCREEN);
    window.addEventListener('resize', update);
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mq.removeEventListener('change', update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return size;
}

/** Marks the tree with `data-nk-motion="reduce"` while motion is reduced (global.css neutralises CSS animations under it). Layout-neutral. */
function ReducedMotionScope({ children }: { children: ReactNode }) {
  const reduce = useReduceMotion();
  return (
    <div {...{ [REDUCED_MOTION_ATTR]: reduce ? 'reduce' : undefined }} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

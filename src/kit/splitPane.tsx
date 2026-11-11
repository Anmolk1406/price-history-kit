import { AnimatePresence, motion } from 'motion/react';
import { createContext, Suspense, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ContextType, type ReactNode } from 'react';
import { TokenScope } from '../foundations/ThemeProvider';
import { duration, easing } from '../motion/presets';
import { useReduceMotion } from '../motion/reducedMotion';
import { getTransition, reducedTransition } from '../motion/transitions';
import { useDeviceLayout, type Posture } from './deviceLayout';
import { createStackStore, EntryCtx, NavCtx, type NavActions, type StackStore } from './Navigator';
import type { NavigateOptions, Route, ScreenDef, StackEntry } from './types';

/**
 * The iPhone Duo split pane (bappzaar useNoonSplitPaneHost + NoonSplitPane + NoonSplitPaneRegistry, commits
 * 9e854f013fe, 0abacf2756a, d4e05c7877a, e01bd72104b). A host screen (the Account tab) keeps a second, local stack
 * beside its list:
 *
 * - `side` (landscape, bappzaar useNoonIsWideWindow): list and pane side by side. When nothing was chosen the pane shows
 *   `defaultRoute`; its root is "embedded" (no back).
 * - `paneOnly` (folded cover, open portrait): a pane screen replaces the list; back on its root closes the pane.
 * - `off` (a phone, or the host disabled): no pane, every push is a normal navigator push.
 *
 * Registered routes (`isPaneRoute`) pushed from the list replace the pane root (fade + x from the end); pushed from a
 * pane screen they stack inside the pane (slide from the end). Anything else (PDP, sheets, modals of other routes) goes
 * to the main navigator, over list + pane. The screens a pane hosts are the flows' own screens, unchanged: they get
 * their own `useNav()` / `useIsTop()` through the navigator's contexts.
 */
export type SplitPaneMode = 'off' | 'side' | 'paneOnly';

export interface SplitPaneOptions {
  /** bappzaar isEnabled (Account: signed in) */
  enabled: boolean;
  /** NoonSplitPaneRegistry: whether a full 'flow/screen' route opens in the pane (`screen` = its definition) */
  isPaneRoute: (route: Route, screen: ScreenDef) => boolean;
  /** the pane when nothing was chosen in `side` mode */
  defaultRoute: Route;
}

type NavValue = NonNullable<ContextType<typeof NavCtx>>;

export interface SplitPaneHost {
  mode: SplitPaneMode;
  /** the pane's stack (empty: no pane on screen) */
  stack: StackEntry[];
  /** route of the pane's root while the pane shows, for the list's highlighted row */
  rootRoute?: Route;
  /** the pane is on screen (side by side or pane-only) */
  isOpen: boolean;
  /** bumps when the user opens a pane root: the pane fades in from the end; a restore or the default shows at once */
  openSeq: number;
  /** navigator context for the list (pushes of pane routes open the pane) */
  hostNav: NavValue;
  /** navigator context for the pane's screens */
  paneNav: NavValue;
}

export function splitPaneMode(posture: Posture, enabled: boolean): SplitPaneMode {
  if (!enabled || posture === 'none') return 'off';
  return posture === 'landscape' ? 'side' : 'paneOnly';
}

let paneSeq = 0;
/**
 * Stand for "the host screen is covered" at the top of the pane stack, so pane screens' useIsTop() turns false; under
 * sheets only, useIsTopScreen() stays true (the rail keeps a screen's buttons under its sheets).
 */
const COVERED_BY_SCREEN: StackEntry = { key: '__split-pane-host-covered', route: '', params: {}, presentation: 'screen', transition: 'none' };
const COVERED_BY_SHEET: StackEntry = { ...COVERED_BY_SCREEN, key: '__split-pane-host-sheet', presentation: 'sheet' };
const isMarker = (e: StackEntry) => e === COVERED_BY_SCREEN || e === COVERED_BY_SHEET;

export function useSplitPaneHost({ enabled, isPaneRoute, defaultRoute }: SplitPaneOptions): SplitPaneHost {
  const main = useContext(NavCtx);
  const hostEntry = useContext(EntryCtx);
  if (!main) throw new Error('useSplitPaneHost must be used inside <NoonPrototype>');
  const { registry } = main;
  const { posture } = useDeviceLayout();
  const mode = splitPaneMode(posture, enabled);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const isPaneRouteRef = useRef(isPaneRoute);
  isPaneRouteRef.current = isPaneRoute;

  const makeEntry = useCallback(
    (route: Route, params: Record<string, unknown> = {}, transition = 'none', currentFlow?: string): StackEntry | null => {
      const r = registry.resolve(route, currentFlow);
      if (!r) return null;
      return { key: `p${++paneSeq}`, route: r.route, params: { ...(r.screen.defaultParams ?? {}), ...params }, presentation: 'screen', transition };
    },
    [registry],
  );

  // the pane's own stack; `isDefault` = it only holds the default screen (nothing was opened by the user)
  const isDefault = useRef(false);
  const [store] = useState<StackStore>(() => {
    const d = mode === 'side' ? makeEntry(defaultRoute) : null;
    isDefault.current = !!d;
    return createStackStore(d ? [d] : []);
  });
  const stack = useSyncExternalStore(store.subscribe, store.get);
  const [openSeq, setOpenSeq] = useState(0);

  // fold / unfold (bappzaar 0abacf2756a, d4e05c7877a): wide shows the default when nothing is open; going narrow keeps
  // a pane the user opened (pane-only) and drops the default one
  useLayoutEffect(() => {
    const s = store.get();
    if (mode === 'side' && !s.length) {
      const d = makeEntry(defaultRoute);
      if (d) {
        isDefault.current = true;
        store.set([d]);
      }
    } else if (mode !== 'side' && isDefault.current) {
      isDefault.current = false;
      store.set([]);
    }
  }, [mode, defaultRoute, makeEntry, store]);

  const paneFlow = useCallback(() => store.get().at(-1)?.route.split('/')[0], [store]);
  /** a route as 'flow/screen', relative to the pane's top screen */
  const qualify = useCallback((route: Route, from?: string) => registry.resolve(route, from)?.route ?? route, [registry]);
  const opensInPane = useCallback(
    (route: Route, opts?: NavigateOptions) => {
      const screen = modeRef.current !== 'off' && opts?.presentation !== 'sheet' && registry.resolve(route)?.screen;
      return !!screen && isPaneRouteRef.current(route, screen);
    },
    [registry],
  );

  const open = useCallback(
    (route: Route, params?: Record<string, unknown>) => {
      const e = makeEntry(route, params);
      if (!e) return;
      isDefault.current = false;
      setOpenSeq((n) => n + 1);
      store.set([e]);
    },
    [makeEntry, store],
  );
  const close = useCallback(() => {
    // bappzaar onRootClose (e01bd72104b): the pane stack resets; wide falls back to the default screen
    const d = modeRef.current === 'side' ? makeEntry(defaultRoute) : null;
    isDefault.current = !!d;
    store.set(d ? [d] : []);
  }, [defaultRoute, makeEntry, store]);

  const { actions } = main;
  const hostPush = useCallback<NavActions['push']>(
    (route, params, opts) => {
      const full = qualify(route, hostEntry?.route.split('/')[0]);
      if (opensInPane(full, opts)) open(full, params);
      else actions.push(route, params, opts);
    },
    [actions, hostEntry, open, opensInPane, qualify],
  );
  const hostNav = useMemo<NavValue>(
    () => (mode === 'off' ? main : { ...main, actions: { ...actions, push: hostPush } }),
    [mode, main, actions, hostPush],
  );

  // ── the pane's navigator ──────────────────────────────────────────────────────────────────────────────────────
  const panePush = useCallback<NavActions['push']>(
    (route, params, opts) => {
      const full = qualify(route, paneFlow());
      if (opensInPane(full, opts)) {
        const e = makeEntry(full, params, 'push');
        if (!e) return;
        isDefault.current = false;
        store.set((s) => [...s, e]);
      } else actions.push(full, params, opts);
    },
    [actions, makeEntry, opensInPane, paneFlow, qualify, store],
  );
  const paneReplace = useCallback<NavActions['replace']>(
    (route, params, opts) => {
      const full = qualify(route, paneFlow());
      if (!opensInPane(full, opts)) return actions.push(full, params, opts);
      const e = makeEntry(full, params, store.get().length > 1 ? 'fade' : 'none');
      if (!e) return;
      isDefault.current = false;
      store.set((s) => [...s.slice(0, -1), e]);
    },
    [actions, makeEntry, opensInPane, paneFlow, qualify, store],
  );
  const paneBack = useCallback(() => {
    const s = store.get();
    if (s.length > 1) store.set(s.slice(0, -1));
    else close();
  }, [close, store]);
  const panePopToRoot = useCallback(() => store.set((s) => s.slice(0, 1)), [store]);
  const paneSheet = useCallback<NavActions['sheet']>((route, params) => actions.sheet(qualify(route, paneFlow()), params), [actions, paneFlow, qualify]);

  // what pane screens read: the pane stack, plus a COVERED marker while something is pushed over the host screen
  const viewStore = useMemo<StackStore>(() => {
    let lastIn: StackEntry[] | undefined;
    let lastCover: StackEntry | null | undefined;
    let lastOut: StackEntry[] = [];
    // what sits over the host screen in the main stack: nothing, only sheets, or a screen / modal
    const cover = (): StackEntry | null => {
      const m = main.store.get();
      const i = hostEntry ? m.findIndex((e) => e.key === hostEntry.key) : -1;
      if (i < 0 || i === m.length - 1) return null;
      return m.slice(i + 1).every((e) => e.presentation === 'sheet') ? COVERED_BY_SHEET : COVERED_BY_SCREEN;
    };
    return {
      get: () => {
        const s = store.get();
        const c = cover();
        if (s !== lastIn || c !== lastCover) {
          lastIn = s;
          lastCover = c;
          lastOut = c ? [...s, c] : s;
        }
        return lastOut;
      },
      set: store.set,
      subscribe: (l) => {
        const a = store.subscribe(l);
        const b = main.store.subscribe(l);
        return () => {
          a();
          b();
        };
      },
    };
  }, [store, main.store, hostEntry]);

  const paneNav = useMemo<NavValue>(
    () => ({
      registry,
      store: viewStore,
      // the root is embedded side by side (no back, bappzaar isEmbedded); pane-only, its back closes the pane
      canGoBack: (s) => s.filter((e) => !isMarker(e)).length > 1 || modeRef.current === 'paneOnly',
      actions: { ...actions, push: panePush, replace: paneReplace, back: paneBack, popToRoot: panePopToRoot, sheet: paneSheet },
    }),
    [registry, viewStore, actions, panePush, paneReplace, paneBack, panePopToRoot, paneSheet],
  );

  const isOpen = mode !== 'off' && stack.length > 0;
  return { mode, stack, rootRoute: isOpen ? stack[0].route : undefined, isOpen, openSeq, hostNav, paneNav };
}

/** Gives the list under it the host navigator: its pushes of pane routes open the pane. */
export function SplitPaneHostScope({ host, children }: { host: SplitPaneHost; children: ReactNode }) {
  return <NavCtx.Provider value={host.hostNav}>{children}</NavCtx.Provider>;
}

export interface SplitPaneInfo {
  /** rendered inside a split pane */
  inPane: boolean;
  mode: SplitPaneMode;
}
const SplitPaneCtx = createContext<SplitPaneInfo>({ inPane: false, mode: 'off' });
/** For a screen that wants to know it is shown in the account split pane (bappzaar NoonSplitPane `isEmbedded`). */
export const useSplitPane = () => useContext(SplitPaneCtx);

/**
 * The pane's screens. The root fades in from the end when the user opens it (bappzaar FadeInRight / FadeInLeft in
 * RTL, keyed by root screen); screens pushed inside the pane slide in from the end and only the top one takes touches.
 */
export function SplitPaneStack({ host, className }: { host: SplitPaneHost; className?: string }) {
  const { stack, paneNav, openSeq, mode } = host;
  const reduce = useReduceMotion();
  const t = reduce ? reducedTransition(getTransition('push')) : getTransition('push');
  const info = useMemo(() => ({ inPane: true, mode }), [mode]);
  // animate only the open the user just made, not a restore after a fold or the default pane
  const animated = useRef(openSeq);
  const animate = openSeq !== animated.current;
  useLayoutEffect(() => {
    animated.current = openSeq;
  }, [openSeq]);
  const root = stack[0];
  if (!root) return null;
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return (
    <NavCtx.Provider value={paneNav}>
      <SplitPaneCtx.Provider value={info}>
        <motion.div
          key={root.key}
          className={className}
          initial={animate ? (reduce ? { opacity: 0 } : { opacity: 0, x: rtl ? -25 : 25 }) : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: duration.medium, ease: easing.out }}
        >
          <AnimatePresence initial={false}>
            {stack.map((entry, i) => {
              const resolved = paneNav.registry.resolve(entry.route);
              if (!resolved) return null;
              const Screen = resolved.screen.component;
              const isTop = i === stack.length - 1;
              return (
                <motion.div
                  // the root remounts when the window folds or unfolds: its back button comes and goes (embedded or not)
                  key={i === 0 ? `${entry.key}:${mode}` : entry.key}
                  data-route={entry.route}
                  data-pane-entry=""
                  initial={i === 0 ? false : t.initial}
                  animate={isTop ? { ...t.animate, x: 0 } : { ...(t.under ?? {}) }}
                  exit={i === 0 ? { opacity: 0, transition: { duration: 0 } } : { ...t.exit, transition: t.transition }}
                  transition={t.transition}
                  style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', zIndex: i, background: 'var(--nk-color-bg-surface)', pointerEvents: isTop ? 'auto' : 'none' }}
                  inert={!isTop}
                >
                  <EntryCtx.Provider value={entry}>
                    <TokenScope overrides={resolved.flow.tokens}>
                      <Suspense fallback={null}>
                        <Screen params={entry.params} />
                      </Suspense>
                    </TokenScope>
                  </EntryCtx.Provider>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </SplitPaneCtx.Provider>
    </NavCtx.Provider>
  );
}

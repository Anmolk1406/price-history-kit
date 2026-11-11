import { Fragment, StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { setWasmUrl } from '@lottiefiles/dotlottie-react';
import { allFlows } from '../flows';
import { NoonPrototype } from '../kit/NoonPrototype';
import { createRegistry } from '../kit/registry';
import { DEVICES, type DeviceId } from '../kit/deviceLayout';
import { parsePageUrl } from '../kit/routes';
import type { Route, StackEntry } from '../kit/types';
import '../motion/custom';
import './preview.css';

/**
 * Dev preview: the phone on its own. Every page is a URL — `/homepage`, `/plp?query=x`, `/orders` (see kit/routes.ts)
 * or the legacy `#/flow/screen`; `/` opens home. Not part of the package.
 */
const registry = createRegistry(allFlows);

// Lottie player from our own server (cached with the app) instead of the jsdelivr CDN on the first animation. A path,
// not a package import: the wasm is not in dotlottie-web's exports map. Same installed version as the player JS.
setWasmUrl(new URL('../../node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm', import.meta.url).href);

// used by scripts/check-routes.mjs
(window as unknown as { __NK_ROUTES__: string[] }).__NK_ROUTES__ = registry.all().map((r) => r.route);

/**
 * `?device=duo-cover | duo-open | duo-landscape | iphone` shows that device on a computer (review the iPhone Duo
 * layouts); without it a touch screen fills the window and a desktop shows the iPhone. Kept across navigation.
 */
const readDevice = (): DeviceId | 'auto' => {
  const d = new URLSearchParams(window.location.search).get('device');
  return d && d in DEVICES ? (d as DeviceId) : 'auto';
};

const readUrl = (): { route?: Route; params: Record<string, string> } => {
  const { route, params } = parsePageUrl(window.location);
  const { device: _device, ...rest } = params;
  return { route: route ? registry.resolve(route)?.route : undefined, params: rest };
};

function Preview() {
  const [page, setPage] = useState(() => ({ ...readUrl(), nonce: 0 }));
  const [device, setDevice] = useState(readDevice);

  useEffect(() => {
    const onUrl = () => {
      setPage((p) => ({ ...readUrl(), nonce: p.nonce + 1 }));
      setDevice(readDevice());
    };
    window.addEventListener('popstate', onUrl);
    window.addEventListener('hashchange', onUrl);
    return () => {
      window.removeEventListener('popstate', onUrl);
      window.removeEventListener('hashchange', onUrl);
    };
  }, []);

  // Keep the address bar on the page's clean URL, e.g. /homepage, /plp, /checkout/cards-select.
  const onRouteChange = useCallback((r: Route, s: StackEntry[]) => {
    const p = s.at(-1)?.params ?? {};
    // used by scripts/journeys.mjs: the current route and stack
    (window as unknown as { __NK_NAV__: unknown }).__NK_NAV__ = { route: r, stack: s.map((e) => e.route), params: p };
    const entries = Object.entries(p).flatMap(([k, v]) => (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? [[k, String(v)]] : []));
    const d = readDevice();
    if (d !== 'auto') entries.push(['device', d]);
    const query = new URLSearchParams(entries).toString();
    window.history.replaceState(null, '', `/${registry.pathFor(r)}${query ? `?${query}` : ''}`);
  }, []);

  return (
    <div className="pg-stage" data-device={device}>
      <NoonPrototype key={page.nonce} flows={allFlows} initialRoute={page.route} initialParams={page.params} device={device} onRouteChange={onRouteChange} />
    </div>
  );
}

// StrictMode renders every screen twice in dev, which doubles the cost of each push. Opt in while debugging effects:
// `VITE_STRICT=1 npm run dev`.
const Root = import.meta.env.VITE_STRICT ? StrictMode : Fragment;
createRoot(document.getElementById('root')!).render(
  <Root>
    <Preview />
  </Root>,
);

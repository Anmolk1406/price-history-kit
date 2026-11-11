// Skill-learning store, shared by the capture hook (capture.mjs), the CLI (learn.mjs) and the design guard.
// Node built-ins only: scripts/release/build-plugin.mjs ships this folder verbatim in the noon-ui plugin.
//
//   signals   raw evidence that a skill got something wrong: a correction prompt, a hand edit to a file Claude wrote,
//             a design-guard block, a failed lint, an explicit `/learn` note. Local only, never committed or sent:
//             <store>/signals/<day>.jsonl
//   lessons   what `/learn` distils from signals: a rule, why, where it applies, how often it was seen.
//             Maintainers (kit repo + `learn maintainer on`): .claude/resources/learnings/lessons.json, committed and
//             bundled into the plugin and the npm package. Everyone else (a clone, the plugin, `npx noon-kit learn
//             setup`): <store>/lessons.json, contributed back as an inbox PR (`learn contribute`).
//
// <store> is $NOON_LEARN_DIR, else <repo>/.cache/learn in the kit repo (gitignored), else ~/.noon-ui/learn/<project>.
// NOON_LEARN=off turns capture off.
//
// Contributing (everyone but a kit maintainer): signals never leave the machine. When a session that corrected noon UI
// ends, the Stop hook asks Claude to distil them into general lessons (/learn), and once the person agrees (consent.json,
// asked once per machine) `learn contribute` opens a PR on the public kit repo, at most once an hour, that adds one
// file to .claude/resources/learnings/inbox/ with those rules only. Maintainers review it (the lessons-inbox workflow
// checks it; the `lessons:approve` label merges it); inbox lessons apply to nobody until merged. NOON_LEARN_SHARE=off
// overrides consent.
//
// Live lessons: every SessionStart fetches the kit's lessons.json from GitHub (ETag, 1.5s timeout, at most hourly) into
// ~/.noon-ui/learn/kit-lessons.json, so a lesson merged today applies to every user's next session without a release.
// Offline, the last copy (or the one bundled with the plugin / package) is used. NOON_LEARN_LIVE=off turns it off.
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = dirname(fileURLToPath(import.meta.url));
export const LESSONS_REL = '.claude/resources/learnings/lessons.json';
export const LESSONS_MD_REL = '.claude/resources/learnings/LESSONS.md';
export const KIT_REPO = process.env.NOON_LEARN_REPO || 'arnabdebnath07/noon-app-skill';
export const INBOX_REL = '.claude/resources/learnings/inbox';
export const CONTRIBUTE_EVERY_MS = 3600e3;
export const CONTRIBUTE_MIN_SIGNALS = 1;
export const LIVE_LESSONS_URL = `https://raw.githubusercontent.com/${KIT_REPO}/main/${LESSONS_REL}`;
const LIVE_EVERY_MS = 3600e3;

/** the kit repo has the canonical copy of these scripts and a src/flows folder */
/** `npm run learn -- maintainer on` (a local git config flag): this clone edits the canonical lessons directly */
export function isMaintainer(dir) {
  const r = spawnSync('git', ['-C', dir, 'config', '--get', 'noon.learnMaintainer'], { encoding: 'utf8' });
  return r.stdout?.trim() === 'true';
}
export const isKitRepo = (dir) => !!dir && existsSync(join(dir, '.claude/skills/learn/scripts/store.mjs')) && existsSync(join(dir, 'src/flows'));
/** running from the plugin install, not from the kit repo's .claude/skills */
export const pluginMode = !here.replace(/\\/g, '/').endsWith('.claude/skills/learn/scripts');

export function projectRoot(cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd()) {
  const r = spawnSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : resolve(cwd);
}

export function gitHead(dir) {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

export function storeDir(project) {
  if (process.env.NOON_LEARN_DIR) return process.env.NOON_LEARN_DIR;
  if (isKitRepo(project)) return join(project, '.cache/learn');
  const slug = `${basename(project).replace(/[^\w.-]+/g, '-')}-${createHash('sha1').update(project).digest('hex').slice(0, 6)}`;
  return join(homedir(), '.noon-ui/learn', slug);
}

export const today = () => new Date().toISOString().slice(0, 10);
export const newId = (prefix = 's') => `${prefix}-${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
export const sha1 = (s) => createHash('sha1').update(s).digest('hex');
export const flowOf = (p) => /(?:^|\/)src\/flows\/([^/]+)\//.exec(p?.replace(/\\/g, '/') ?? '')?.[1] ?? null;
export const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n)}…[${s.length - n} more chars]` : s);

export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
export function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, file);
}

// ── signals

export function appendSignal(store, signal) {
  const s = { id: newId('s'), at: new Date().toISOString(), ...signal };
  mkdirSync(join(store, 'signals'), { recursive: true });
  appendFileSync(join(store, 'signals', `${today()}.jsonl`), `${JSON.stringify(s)}\n`);
  return s;
}

export function readSignals(store) {
  const dir = join(store, 'signals');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort().flatMap((f) =>
    readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean).flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    }),
  );
}

/** processed: { signalId: 'L-007' | 'dismissed: <reason>' } · contributed: { lessonId: PR url } · lastContribute: ms */
export const loadState = (store) => ({ processed: {}, contributed: {}, ...readJson(join(store, 'state.json'), {}) });
export const saveState = (store, state) => writeJson(join(store, 'state.json'), state);
export const pendingSignals = (store) => {
  const { processed } = loadState(store);
  return readSignals(store).filter((s) => !processed[s.id]);
};

// ── sessions: which skills ran, which files Claude wrote this turn, which lessons were already shown

export const loadSession = (store, id) => readJson(join(store, 'sessions', `${id || 'none'}.json`), { skills: [], turnFiles: [], uiEdits: 0, shown: [] });
export const saveSession = (store, id, s) => writeJson(join(store, 'sessions', `${id || 'none'}.json`), s);

// ── lessons

export const emptyLessons = () => ({ version: 1, lessons: [] });

/** lessons are local (and contributed) unless this is a maintainer's clone of the kit */
export const canonical = (project) => isKitRepo(project) && isMaintainer(project);
/** where lessons are written: the canonical file for maintainers, the local store for everyone else */
export const lessonsFile = (project, store) => (canonical(project) ? join(project, LESSONS_REL) : join(store, 'lessons.json'));

// ── live lessons: the kit's lessons.json as it is on GitHub now

export const learnHome = () => join(process.env.NOON_LEARN_HOME || join(homedir(), '.noon-ui'), 'learn');
export const liveLessonsFile = () => join(learnHome(), 'kit-lessons.json');

/**
 * Lessons are injected into every user's Claude, so only well-formed, reviewed ones are taken: canonical ids, the
 * three statuses, short plain strings, and no more than 500 of them.
 */
export function sanitizeLessons(data) {
  if (!Array.isArray(data?.lessons) || data.lessons.length > 500) return null;
  const str = (v, n) => typeof v === 'string' && v.length <= n;
  const strs = (v, n) => v === undefined || (Array.isArray(v) && v.length <= 20 && v.every((x) => str(x, n)));
  const ok = data.lessons.every(
    (l) => /^L-\d{3,}$/.test(l?.id) && str(l.rule, 400) && (l.why === undefined || str(l.why, 400)) && ['active', 'promoted', 'retired'].includes(l.status) && strs(l.skills, 40) && strs(l.flows, 60) && strs(l.tags, 60),
  );
  return ok ? { version: data.version ?? 1, lessons: data.lessons } : null;
}

/** Refresh the live copy when it's an hour old; never throws, never waits more than 1.5s. */
export async function refreshLiveLessons() {
  if (process.env.NOON_LEARN_LIVE === 'off') return;
  const file = liveLessonsFile();
  const cached = readJson(file, null);
  if (cached && Date.now() - (cached.checkedAt ?? 0) < LIVE_EVERY_MS) return;
  try {
    const r = await fetch(LIVE_LESSONS_URL, { headers: cached?.etag ? { 'If-None-Match': cached.etag } : {}, signal: AbortSignal.timeout(1500) });
    if (r.status === 304 && cached) return writeJson(file, { ...cached, checkedAt: Date.now() });
    if (!r.ok) return;
    const clean = sanitizeLessons(await r.json());
    if (clean) writeJson(file, { ...clean, etag: r.headers.get('etag'), checkedAt: Date.now(), from: LIVE_LESSONS_URL });
  } catch {
    // offline or slow: the last copy, or the bundled one, still applies
  }
}

/**
 * Every lesson that applies here, first copy of an id wins: a maintainer's own canonical file (they're editing it),
 * then the live copy from GitHub, the copy bundled next to these scripts (plugin, `learn setup`), a clone's or the
 * installed noon-kit package's, and this project's own.
 */
export function loadAllLessons(project, store) {
  const files = [
    ...(canonical(project) ? [join(project, LESSONS_REL)] : []),
    liveLessonsFile(),
    join(here, '../lessons.json'),
    join(project, LESSONS_REL),
    join(project, 'node_modules/noon-kit', LESSONS_REL),
    join(store, 'lessons.json'),
  ];
  const seen = new Map();
  for (const f of [...new Set(files.map((x) => resolve(x)))]) for (const l of readJson(f, emptyLessons()).lessons ?? []) if (!seen.has(l.id)) seen.set(l.id, l);
  return [...seen.values()];
}

const words = (t) => (t ?? '').toLowerCase();
const hit = (text, tag) => {
  const t = tag.toLowerCase().trim();
  if (!t) return false;
  return t.includes(' ') ? text.includes(t) : new RegExp(`(^|[^a-z0-9-])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?($|[^a-z0-9-])`).test(text);
};

/**
 * Active lessons relevant to a request or a loaded skill, best first.
 * A lesson matches on its tags or flows in the text (2 points each), its skills (2 when the skill is loaded or named),
 * or `*` in tags (applies to every noon UI task). Scope-only matches (skill `noon-ui`) need a text hit too.
 */
export function matchLessons(lessons, { text = '', skills = [], limit = 6 } = {}) {
  const t = words(text);
  const sk = new Set(skills.map((s) => s.replace(/^noon-ui:/, '')));
  const scored = [];
  for (const l of lessons) {
    if (l.status && l.status !== 'active') continue;
    let score = 0;
    if ((l.tags ?? []).includes('*')) score += 1.5;
    for (const tag of l.tags ?? []) if (tag !== '*' && hit(t, tag)) score += 2;
    for (const f of l.flows ?? []) if (hit(t, f)) score += 2;
    for (const s of l.skills ?? []) if (s !== 'noon-ui' && (sk.has(s) || hit(t, s))) score += 2;
    if ((l.skills ?? []).includes('noon-ui') && sk.size) score += 0.5;
    if (score >= 1.5) scored.push([score + Math.min(l.seen ?? 1, 10) / 20, l]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, l]) => l);
}

export const formatLesson = (l) => `- ${l.id}: ${l.rule}${l.why ? ` (why: ${l.why})` : ''}`;

export function lessonContext(list, heading) {
  if (!list.length) return '';
  return `${heading}\n${list.map(formatLesson).join('\n')}\nApply these; they come from earlier corrections by noon designers (/learn, .claude/resources/learnings/LESSONS.md).`;
}

// ── sharing consent: one answer per machine, for every project

const consentFile = () => join(learnHome(), 'consent.json');
/** true / false, or null when the person hasn't been asked yet */
export function shareConsent() {
  if (process.env.NOON_LEARN_SHARE === 'off') return false;
  const c = readJson(consentFile(), null);
  return typeof c?.share === 'boolean' ? c.share : null;
}
export const setShareConsent = (share) => writeJson(consentFile(), { share, at: new Date().toISOString() });

// ── one capture per event: the plugin, a `learn setup` copy and the kit repo's hooks can all be installed at once

/** true for the first hook process that claims this event; the others exit (mkdir is atomic) */
export function claimEvent(store, event) {
  const key = sha1(JSON.stringify([event.session_id, event.hook_event_name, event.tool_use_id ?? '', event.tool_name ?? '', event.tool_input?.file_path ?? '', event.prompt ?? '', event.source ?? '', Math.floor(Date.now() / 10e3)]));
  try {
    mkdirSync(join(store, 'locks'), { recursive: true });
    mkdirSync(join(store, 'locks', key));
    return true;
  } catch {
    return false;
  }
}
export function pruneLocks(store) {
  const dir = join(store, 'locks');
  if (!existsSync(dir)) return;
  for (const f of readdirSync(dir)) {
    try {
      if (Date.now() - statSync(join(dir, f)).mtimeMs > 3600e3) rmSync(join(dir, f), { recursive: true, force: true });
    } catch {
      // another process pruned it
    }
  }
}

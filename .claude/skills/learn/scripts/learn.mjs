#!/usr/bin/env node
// Skill-learning CLI, driven by the /learn skill (.claude/skills/learn/SKILL.md). Kit repo: `npm run learn -- <cmd>`;
// plugin installs: `node <learn skill folder>/scripts/learn.mjs <cmd>`.
//
//   pending [--json] [--limit n]          signals not yet distilled (corrections, hand-edit diffs, guard blocks, notes)
//   note "<rule>" [--skill s] [--flow f]  record an explicit lesson request (what `/learn <text>` does first)
//   add --rule "…" --why "…" [--skills a,b] [--flows a,b] [--tags a,b] [--signals s-1,s-2] [--evidence "…"]
//                                         new lesson from those signals (they're marked processed)
//   link <L-id> <signal ids…> [--evidence "…"]   the same lesson seen again: bump `seen`, mark the signals
//   dismiss <signal ids…|--kind k> --reason "…"  not a skill problem (a new feature request, a taste change …)
//   promotable [--min 3]                  active lessons seen ≥ min times (or explicit notes): ready to promote
//   promote <L-id> --to <path>            the rule now lives in a reference / guard / eval: stop injecting it
//   retire <L-id> --reason "…"            wrong or outdated
//   recall "<request>" [--skill s]        the lessons that apply to a request (what the hooks inject)
//   stats                                 counts by kind, skill and status
//   maintainer on|off|status              kit repo: this clone edits lessons.json directly (git config noon.learnMaintainer)
//   consent yes|no|status                 contributors: contribute lessons to the kit repo (asked once per machine)
//   contribute [--dry-run]                contributors: open a PR on the kit repo with this project's new lessons
//                                         (distilled rules only, never signals) as one new file in learnings/inbox/
//   review <files…> [--md]                maintainers / CI: check contributed inbox files (shape, skills, private paths,
//                                         instructions aimed at Claude) and find the lessons they repeat; exit 1 on a problem
//   merge-inbox                           maintainers: merge the reviewed inbox files into lessons.json and delete them
//   import <file>                         maintainers: merge a lessons JSON file (or a body with a ```json block)
//   build | check                         regenerate / verify .claude/resources/learnings/LESSONS.md (kit repo)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  appendSignal, canonical, clip, emptyLessons, INBOX_REL, isKitRepo, KIT_REPO, LESSONS_MD_REL, LESSONS_REL, lessonsFile,
  loadAllLessons, loadState, matchLessons, newId, pendingSignals, projectRoot, readJson, readSignals, saveState,
  setShareConsent, sha1, shareConsent, storeDir, today, writeJson,
} from './store.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) {
    const k = rest[i].slice(2);
    flags[k] = rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[++i] : true;
  } else pos.push(rest[i]);
}
const list = (v) => (typeof v === 'string' ? v.split(',').map((x) => x.trim()).filter(Boolean) : []);
const project = projectRoot();
const store = storeDir(project);
const kit = isKitRepo(project);
const maintainer = canonical(project);
const file = lessonsFile(project, store);
const load = () => readJson(file, emptyLessons());
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

function save(data) {
  data.lessons.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  writeJson(file, data);
  if (maintainer) writeFileSync(join(project, LESSONS_MD_REL), renderMd(data));
}
function nextId(data) {
  const prefix = maintainer ? 'L' : 'LX';
  const n = Math.max(0, ...data.lessons.map((l) => Number(new RegExp(`^${prefix}-(\\d+)$`).exec(l.id)?.[1] ?? 0)));
  return `${prefix}-${String(n + 1).padStart(3, '0')}`;
}
function mark(ids, value) {
  const state = loadState(store);
  const known = new Set(readSignals(store).map((s) => s.id));
  for (const id of ids) {
    if (!known.has(id)) fail(`no signal ${id} (npm run learn -- pending lists them)`);
    state.processed[id] = value;
  }
  saveState(store, state);
}
const find = (data, id) => data.lessons.find((l) => l.id === id) ?? fail(`no lesson ${id} in ${file}`);

switch (cmd) {
  case 'pending': {
    const sigs = pendingSignals(store).slice(-(Number(flags.limit) || 80));
    if (flags.json) {
      console.log(JSON.stringify(sigs, null, 2));
      break;
    }
    if (!sigs.length) {
      console.log(`No pending signals (store: ${store}).`);
      break;
    }
    console.log(`${sigs.length} pending signal(s) · store ${store}\n`);
    for (const s of sigs) {
      const where = [s.skills?.length && `skills ${s.skills.join(',')}`, s.flows?.length && `flow ${s.flows.join(',')}`, s.files?.length && `files ${s.files.join(', ')}`].filter(Boolean).join(' · ');
      console.log(`## ${s.id} · ${s.kind} · ${s.at.slice(0, 16).replace('T', ' ')}${where ? ` · ${where}` : ''}`);
      if (s.text) console.log(clip(s.text, 1200));
      if (s.diff) console.log('```diff\n' + s.diff.split('\n').slice(0, 60).join('\n') + '\n```');
      console.log('');
    }
    break;
  }
  case 'note': {
    const text = pos.join(' ').trim() || fail('usage: learn note "<rule>" [--skill s] [--flow f]');
    const s = appendSignal(store, { kind: 'note', project: project.split('/').pop(), skills: list(flags.skill), flows: list(flags.flow), text });
    console.log(`recorded ${s.id}: distil it with  add --signals ${s.id} --explicit …`);
    break;
  }
  case 'add': {
    if (typeof flags.rule !== 'string') fail('add needs --rule "<imperative rule>" (and --why)');
    const data = load();
    const signals = list(flags.signals);
    const lesson = {
      id: nextId(data),
      rule: flags.rule.trim(),
      why: typeof flags.why === 'string' ? flags.why.trim() : '',
      skills: list(flags.skills).length ? list(flags.skills) : ['noon-ui'],
      flows: list(flags.flows),
      tags: list(flags.tags),
      seen: Math.max(1, signals.length),
      explicit: !!flags.explicit,
      first: today(),
      last: today(),
      status: 'active',
      evidence: typeof flags.evidence === 'string' ? [flags.evidence] : [],
    };
    data.lessons.push(lesson);
    save(data);
    if (signals.length) mark(signals, lesson.id);
    console.log(`added ${lesson.id} → ${file}`);
    break;
  }
  case 'link': {
    const [id, ...ids] = pos;
    const data = load();
    const l = find(data, id);
    l.seen = (l.seen ?? 1) + ids.length;
    l.last = today();
    if (typeof flags.evidence === 'string') l.evidence = [...(l.evidence ?? []), flags.evidence].slice(-8);
    save(data);
    if (ids.length) mark(ids, id);
    console.log(`${id} seen ${l.seen}×`);
    break;
  }
  case 'dismiss': {
    if (typeof flags.reason !== 'string') fail('dismiss needs --reason "<why it is not a skill problem>"');
    const ids = flags.kind ? pendingSignals(store).filter((s) => s.kind === flags.kind).map((s) => s.id) : pos;
    mark(ids, `dismissed: ${flags.reason}`);
    console.log(`dismissed ${ids.length} signal(s)`);
    break;
  }
  case 'promotable': {
    const min = Number(flags.min) || 3;
    const ready = load().lessons.filter((l) => l.status === 'active' && (l.seen >= min || l.explicit));
    if (!ready.length) console.log(`No active lesson seen ${min}+ times yet.`);
    for (const l of ready) console.log(`${l.id} · seen ${l.seen}×${l.explicit ? ' · explicit' : ''} · ${l.skills.join(',')} · ${l.rule}`);
    break;
  }
  case 'promote': {
    const [id] = pos;
    if (typeof flags.to !== 'string') fail('promote needs --to <the file the rule now lives in>');
    if (maintainer && !existsSync(join(project, flags.to.replace(/[#:].*$/, '')))) fail(`${flags.to} does not exist`);
    const data = load();
    Object.assign(find(data, id), { status: 'promoted', promotedTo: flags.to, last: today() });
    save(data);
    console.log(`${id} promoted → ${flags.to}`);
    break;
  }
  case 'retire': {
    const [id] = pos;
    const data = load();
    Object.assign(find(data, id), { status: 'retired', retiredBecause: typeof flags.reason === 'string' ? flags.reason : '', last: today() });
    save(data);
    console.log(`${id} retired`);
    break;
  }
  case 'recall': {
    const found = matchLessons(loadAllLessons(project, store), { text: pos.join(' '), skills: list(flags.skill), limit: Number(flags.limit) || 10 });
    if (!found.length) console.log('No lessons match.');
    for (const l of found) console.log(`- ${l.id} [${l.skills.join(',')}] ${l.rule}${l.why ? `\n    why: ${l.why}` : ''}`);
    break;
  }
  case 'stats': {
    const sigs = readSignals(store);
    const { processed } = loadState(store);
    const by = (xs, f) => Object.entries(xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(' · ') || '—';
    const ls = loadAllLessons(project, store);
    console.log(`store      ${store}`);
    console.log(`signals    ${sigs.length} (${sigs.filter((s) => !processed[s.id]).length} pending) · ${by(sigs, (s) => s.kind)}`);
    console.log(`by skill   ${by(sigs, (s) => s.skills?.[0] ?? 'none')}`);
    console.log(`lessons    ${ls.length} · ${by(ls, (l) => l.status)}`);
    break;
  }
  case 'maintainer': {
    if (!kit) fail('maintainer mode is for clones of the kit repo');
    const [v] = pos;
    if (v === 'on' || v === 'off') spawnSync('git', ['-C', project, 'config', 'noon.learnMaintainer', v === 'on' ? 'true' : 'false']);
    console.log(canonical(project) ? `maintainer: /learn writes ${LESSONS_REL} directly; merge-inbox and promote are on` : 'contributor: lessons go to the local store and come back as an inbox PR (learn contribute)');
    break;
  }
  case 'consent': {
    const [answer] = pos;
    if (answer === 'yes' || answer === 'no') setShareConsent(answer === 'yes');
    const c = shareConsent();
    console.log(c === null ? 'not asked yet' : c ? `contributing on: after a session that corrected noon UI, new lessons go to ${KIT_REPO} as a pull request (at most hourly)` : 'contributing off: lessons stay on this machine');
    break;
  }
  case 'contribute': {
    if (maintainer) fail('this is a maintainer clone: commit lessons.json directly (learn maintainer off to contribute like everyone else)');
    if (shareConsent() !== true && !flags['dry-run']) fail('contributing is off on this machine (learn consent yes turns it on)');
    const state = loadState(store);
    const fresh = readJson(join(store, 'lessons.json'), emptyLessons()).lessons.filter((l) => l.status === 'active' && !state.contributed[l.id]);
    if (!fresh.length) {
      console.log('nothing new to contribute: distil the pending signals first (/learn)');
      break;
    }
    // only general rules about the kit leave the machine: refuse a lesson that names this project or its paths
    const name = basename(project).toLowerCase();
    const leaks = fresh.filter((l) => {
      const t = JSON.stringify([l.rule, l.why, l.evidence, l.tags]).toLowerCase();
      return t.includes(project.toLowerCase()) || /\/(users|home)\//.test(t) || (name.length > 3 && t.includes(name));
    });
    if (leaks.length) fail(`${leaks.map((l) => l.id).join(', ')} mention this project or its paths. Retire them and add them again as general rules about the kit, then re-run.`);
    const src = sha1(project).slice(0, 8);
    const path = `${INBOX_REL}/${today()}-${src}-${newId('x').slice(-4)}.json`;
    const payload = { version: 1, contributed: today(), source: src, lessons: fresh.map(({ rule, why, skills, flows, tags, seen, explicit, evidence }) => ({ rule, why, skills, flows, tags, seen, explicit, evidence })) };
    const content = `${JSON.stringify(payload, null, 2)}\n`;
    const body = `Lessons distilled by \`/learn\` in a project that uses the noon skills (plugin, noon-kit or a clone of the kit): general rules only, no code, prompts or project names.\n\n${payload.lessons.map((l) => `- (${l.skills.join(', ')}; seen ${l.seen}×) ${l.rule}${l.why ? ` _Why:_ ${l.why}` : ''}`).join('\n')}\n\nMaintainers: the lessons-inbox check comments on this PR. Check each rule against the kit, edit or drop the ones that are wrong, then add the \`lessons:approve\` label: the workflow merges this into lessons.json, and every noon-skill user gets it in their next session. Inbox lessons are not applied by anyone until then.\n`;
    if (flags['dry-run']) {
      console.log(`would add ${path}:\n${content}\nPR body:\n${body}`);
      break;
    }
    state.lastContribute = Date.now(); // one attempt an hour, also when gh is missing or fails
    saveState(store, state);
    const gh = (...a) => {
      const res = spawnSync('gh', a, { encoding: 'utf8' });
      if (res.status !== 0) throw new Error((res.error?.message ?? res.stderr ?? '').trim().split('\n')[0] || `gh ${a[0]} failed`);
      return res.stdout.trim();
    };
    try {
      const repoName = KIT_REPO.split('/')[1];
      const me = gh('api', 'user', '-q', '.login');
      const base = gh('api', `repos/${KIT_REPO}`, '-q', '.default_branch');
      const sha = gh('api', `repos/${KIT_REPO}/git/ref/heads/${base}`, '-q', '.object.sha');
      // people without push access contribute from their fork, like any outside PR
      let head = KIT_REPO;
      if (gh('api', `repos/${KIT_REPO}`, '-q', '.permissions.push') !== 'true') {
        head = `${me}/${repoName}`;
        gh('repo', 'fork', KIT_REPO, '--clone=false', '--remote=false');
        try {
          gh('repo', 'sync', head, '--branch', base);
        } catch {
          // already current, or the fork is still being created: the ref below fails and we retry tomorrow
        }
      }
      const branch = `learn/${today()}-${src}-${newId('b').slice(-4)}`;
      gh('api', '-X', 'POST', `repos/${head}/git/refs`, '-f', `ref=refs/heads/${branch}`, '-f', `sha=${sha}`);
      gh('api', '-X', 'PUT', `repos/${head}/contents/${path}`, '-f', 'message=Skill lessons from a noon-ui plugin user', '-f', `content=${Buffer.from(content).toString('base64')}`, '-f', `branch=${branch}`);
      const url = gh('pr', 'create', '--repo', KIT_REPO, '--base', base, '--head', head === KIT_REPO ? branch : `${me}:${branch}`, '--title', `Skill lessons: ${payload.lessons.length} from a noon-ui user (${today()})`, '--body', body).split('\n').pop();
      const s2 = loadState(store);
      for (const l of fresh) s2.contributed[l.id] = url;
      delete s2.lastContributeError;
      saveState(store, s2);
      console.log(`opened ${url}`);
    } catch (e) {
      const s2 = loadState(store);
      s2.lastContributeError = String(e.message).slice(0, 300);
      saveState(store, s2);
      fail(`could not open the PR (${s2.lastContributeError}); it tries again next session`);
    }
    break;
  }
  case 'review': {
    // reads the files as data only: CI runs this copy from main on a PR's files, never the PR's code
    if (!kit) fail('review runs in the kit repo');
    if (!pos.length) fail('usage: learn review <inbox files…> [--md]');
    const existing = readJson(join(project, LESSONS_REL), emptyLessons()).lessons;
    const wordsOf = (t) => new Set(String(t).toLowerCase().match(/[a-z0-9-]{3,}/g) ?? []);
    const overlap = (a, b) => {
      const [x, y] = [wordsOf(a), wordsOf(b)];
      const both = [...x].filter((w) => y.has(w)).length;
      return both / Math.max(1, Math.min(x.size, y.size));
    };
    // a lesson is an instruction injected into everyone's Claude: refuse anything that talks to Claude rather than about the kit
    const STEER = /\b(ignore|disregard|forget)\b.{0,40}\b(instructions?|rules?|previous|above|system)\b|\b(system prompt|you are now|run (this|the following)|act as an? |curl |wget |rm -rf|exfiltrat|api[_ -]?key|(access|auth|bearer) token|password|secret key)\b/i;
    const PRIVATE = /\/(users|home)\/|[a-z]:\\\\|https?:\/\/(?!github\.com\/arnabdebnath07)|@[a-z0-9-]+\.[a-z]{2,}/i;
    const problems = [];
    const notes = [];
    for (const f of pos) {
      const name = basename(f);
      let j;
      try {
        j = JSON.parse(readFileSync(f, 'utf8'));
      } catch {
        problems.push(`${name}: not JSON`);
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}-[a-z0-9]{4}\.json$/.test(name)) problems.push(`${name}: name must be <date>-<source>-<id>.json (learn contribute writes it)`);
      if (!Array.isArray(j?.lessons) || !j.lessons.length || j.lessons.length > 20) {
        problems.push(`${name}: needs 1 to 20 lessons`);
        continue;
      }
      j.lessons.forEach((l, i) => {
        const at = `${name} #${i + 1}`;
        const text = JSON.stringify([l?.rule, l?.why, l?.tags, l?.evidence]);
        if (typeof l?.rule !== 'string' || l.rule.trim().length < 8 || l.rule.length > 300) problems.push(`${at}: rule must be 8 to 300 characters`);
        if (l?.why !== undefined && (typeof l.why !== 'string' || l.why.length > 300)) problems.push(`${at}: why must be at most 300 characters`);
        for (const sk of l?.skills ?? []) if (!/^[a-z0-9-]+$/.test(sk) || !existsSync(join(project, '.claude/skills', sk, 'SKILL.md'))) problems.push(`${at}: no skill ${sk}`);
        if (STEER.test(text)) problems.push(`${at}: reads like an instruction to Claude, not a rule about the kit`);
        if (PRIVATE.test(text)) problems.push(`${at}: names a private path, address or site`);
        const like = existing.filter((x) => x.status !== 'retired').map((x) => [overlap(x.rule, l?.rule ?? ''), x]).filter(([n]) => n >= 0.6).sort((a, b) => b[0] - a[0])[0];
        notes.push({ at, rule: String(l?.rule ?? ''), skills: (l?.skills ?? []).join(', ') || 'noon-ui', seen: l?.seen ?? 1, like: like && `${like[1].id} (${Math.round(like[0] * 100)}% the same words): ${like[1].rule}` });
      });
    }
    if (flags.md) {
      console.log(
        [
          problems.length ? '### ✗ Lessons check: changes needed' : '### ✓ Lessons check passed',
          '',
          ...(problems.length ? [...problems.map((p) => `- ${p}`), ''] : []),
          '| | Rule | Skills | Seen | Like an existing lesson |',
          '|---|---|---|---|---|',
          ...notes.map((n) => `| ${n.at.replace(/^\d{4}-\d{2}-\d{2}-([0-9a-f]{8})-\w+\.json/, '$1')} | ${n.rule.replace(/[|\n]/g, ' ')} | ${n.skills} | ${n.seen}× | ${n.like ? n.like.replace(/[|\n]/g, ' ') : '—'} |`),
          '',
          problems.length ? 'Fix the file, or edit the rules here, and the check runs again.' : 'A maintainer checks each rule against the kit, then adds the `lessons:approve` label to merge it into lessons.json for everyone.',
        ].join('\n'),
      );
    } else {
      for (const n of notes) console.log(`${n.at}: ${n.rule}${n.like ? `\n    like ${n.like}` : ''}`);
      for (const p of problems) console.error(`✗ ${p}`);
    }
    process.exit(problems.length ? 1 : 0);
  }
  case 'merge-inbox':
  case 'import': {
    if (!maintainer) fail(`${cmd} writes the canonical lessons: run it in the kit repo after \`npm run learn -- maintainer on\``);
    const dir = join(project, INBOX_REL);
    const files = cmd === 'import' ? [pos[0] ?? fail('usage: learn import <file>')] : existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [];
    const data = load();
    const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    let added = 0;
    let bumped = 0;
    for (const f of files) {
      const text = readFileSync(f, 'utf8');
      const parsed = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(text)?.[1] ?? text);
      for (const l of Array.isArray(parsed) ? parsed : parsed.lessons ?? []) {
        if (typeof l?.rule !== 'string' || !l.rule.trim()) continue;
        const same = data.lessons.find((x) => norm(x.rule) === norm(l.rule));
        // sources: the anonymous id of each project that reported it (already public in its PR), so "N people"
        const from = typeof parsed.source === 'string' && /^[0-9a-f]{8}$/.test(parsed.source) ? [parsed.source] : [];
        if (same) {
          same.seen += l.seen ?? 1;
          same.sources = [...new Set([...(same.sources ?? []), ...from])];
          same.last = today();
          if (same.status === 'retired') same.status = 'active'; // it came back: look at it again
          bumped++;
        } else {
          const { id, status, promotedTo, ...rest } = l;
          data.lessons.push({ skills: ['noon-ui'], flows: [], tags: [], seen: 1, ...rest, id: nextId(data), status: 'active', first: today(), last: today(), sources: from, evidence: [...(l.evidence ?? []), `contributed ${parsed.contributed ?? today()}`].slice(-8) });
          added++;
        }
      }
      if (cmd === 'merge-inbox') rmSync(f);
    }
    save(data);
    console.log(`${files.length} file(s): ${added} new lesson(s), ${bumped} merged into existing ones → ${LESSONS_REL}${added + bumped ? '. Run /learn to review and promote, then commit.' : ''}`);
    break;
  }
  case 'build':
  case 'check': {
    if (!kit) fail(`${cmd} runs in the kit repo`);
    const data = readJson(join(project, LESSONS_REL), null) ?? fail(`${LESSONS_REL} is missing or not JSON`);
    const problems = [];
    const ids = new Set();
    for (const l of data.lessons) {
      if (!/^L-\d{3,}$/.test(l.id)) problems.push(`${l.id}: id must be L-NNN`);
      if (ids.has(l.id)) problems.push(`${l.id}: duplicate id`);
      ids.add(l.id);
      if (!l.rule) problems.push(`${l.id}: no rule`);
      if (!['active', 'promoted', 'retired'].includes(l.status)) problems.push(`${l.id}: status ${l.status}`);
      if (l.status === 'promoted' && !existsSync(join(project, String(l.promotedTo).replace(/[#:].*$/, '')))) problems.push(`${l.id}: promotedTo ${l.promotedTo} does not exist`);
      for (const s of l.skills ?? []) if (!existsSync(join(project, '.claude/skills', s, 'SKILL.md'))) problems.push(`${l.id}: no skill ${s}`);
    }
    const inbox = join(project, INBOX_REL);
    for (const f of existsSync(inbox) ? readdirSync(inbox).filter((n) => !n.startsWith('.')) : []) {
      const j = readJson(join(inbox, f), null);
      if (!f.endsWith('.json') || !Array.isArray(j?.lessons) || j.lessons.some((l) => typeof l?.rule !== 'string')) problems.push(`${INBOX_REL}/${f}: not a contributed lessons file ({ lessons: [{ rule, … }] })`);
      else for (const l of j.lessons) for (const sk of l.skills ?? []) if (!existsSync(join(project, '.claude/skills', sk, 'SKILL.md'))) problems.push(`${INBOX_REL}/${f}: no skill ${sk}`);
    }
    const md = renderMd(data);
    const mdPath = join(project, LESSONS_MD_REL);
    if (cmd === 'build') {
      if (problems.length) fail(problems.join('\n  '));
      writeFileSync(mdPath, md);
      console.log(`wrote ${LESSONS_MD_REL} (${data.lessons.length} lessons)`);
    } else {
      if (!existsSync(mdPath) || readFileSync(mdPath, 'utf8') !== md) problems.push(`${LESSONS_MD_REL} is stale: npm run learn -- build`);
      if (problems.length) fail(`lessons:\n  ${problems.join('\n  ')}`);
      console.log(`✓ lessons: ${data.lessons.length} (${data.lessons.filter((l) => l.status === 'active').length} active)`);
    }
    break;
  }
  default:
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
}

function renderMd(data) {
  const active = data.lessons.filter((l) => l.status === 'active');
  const bySkill = new Map();
  for (const l of active) for (const s of l.skills?.length ? l.skills : ['noon-ui']) (bySkill.get(s) ?? bySkill.set(s, []).get(s)).push(l);
  const line = (l) => `- **${l.id}** ${l.rule}${l.why ? ` _Why:_ ${l.why}` : ''} <sub>seen ${l.seen}×${l.explicit ? ', explicit' : ''} · last ${l.last}${l.flows?.length ? ` · flows ${l.flows.join(', ')}` : ''}${l.tags?.length ? ` · tags ${l.tags.join(', ')}` : ''}</sub>`;
  const promoted = data.lessons.filter((l) => l.status === 'promoted');
  const retired = data.lessons.filter((l) => l.status === 'retired');
  return [
    '# Skill lessons',
    '',
    '<!-- Generated by .claude/skills/learn/scripts/learn.mjs from lessons.json. Do not edit; use /learn or `npm run learn -- build`. -->',
    '',
    'What people corrected after the noon skills built UI, distilled by `/learn` from local correction signals (`../../skills/learn/SKILL.md`). **Apply every active lesson for your skill before planning.** In Claude Code the capture hooks also inject the matching ones when a noon skill loads or a prompt matches; elsewhere, read this file. A lesson that has been promoted now lives in the file named and is no longer injected.',
    '',
    '## Active',
    '',
    ...(active.length ? [...bySkill].sort(([a], [b]) => (a === 'noon-ui' ? -1 : b === 'noon-ui' ? 1 : a.localeCompare(b))).flatMap(([s, ls]) => [`### ${s === 'noon-ui' ? 'noon-ui (every screen)' : `/${s}`}`, '', ...ls.map(line), '']) : ['No lessons yet. They appear here after `/learn` distils the first corrections.', '']),
    ...(promoted.length ? ['## Promoted', '', ...promoted.map((l) => `- **${l.id}** → \`${l.promotedTo}\`: ${l.rule}`), ''] : []),
    ...(retired.length ? ['## Retired', '', ...retired.map((l) => `- **${l.id}** ${l.rule}${l.retiredBecause ? ` (${l.retiredBecause})` : ''}`), ''] : []),
  ].join('\n');
}

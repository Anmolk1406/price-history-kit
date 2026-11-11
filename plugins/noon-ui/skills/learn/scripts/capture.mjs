#!/usr/bin/env node
// Skill-learning capture: a Claude Code hook (kit repo: .claude/settings.json; plugin: hooks/hooks.json) that records
// when a noon skill got something wrong, and feeds back the lessons already learnt. It never blocks and never prints
// errors: every failure exits 0 silently, so capture can't get in the way of the work.
//
//   SessionStart       refresh the live lessons from GitHub (store.mjs); find hand edits made since the last session;
//                      nudge `/learn` when many signals are waiting. Everyone but a kit maintainer (plugin,
//                      `npx noon-kit learn setup`, a clone): signals left over from an earlier session are contributed
//                      now (the same ask as Stop)
//   Stop               the end of a reply in a session that corrected noon UI: once per session, keep Claude going to
//                      ask for consent (first time on this machine) or to distil the signals into general rules and
//                      open the PR (learn.mjs contribute), at most hourly. Never loops: stop_hook_active ends it
//   UserPromptSubmit   find hand edits made between turns (diff of Claude's version → the file now); record the prompt
//                      as a correction when it follows UI edits and reads like one; inject lessons that match the prompt
//   PostToolUse        Skill → remember the skill, inject its lessons · Write / Edit / MultiEdit → snapshot the UI file
//                      Claude wrote · Bash → re-snapshot (Claude's own shell edits and formatters aren't hand edits)
//
// Design-guard blocks and failed lints are recorded by those scripts (store.mjs → appendSignal). Signals stay in the
// local store (store.mjs header); `/learn` turns them into lessons. NOON_LEARN=off disables it.
//
// Manual test:  echo '{"hook_event_name":"UserPromptSubmit","session_id":"t","cwd":"'$PWD'","prompt":"no, use the Pill for the coupon"}' | node .claude/skills/learn/scripts/capture.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  appendSignal, canonical, claimEvent, clip, CONTRIBUTE_EVERY_MS, CONTRIBUTE_MIN_SIGNALS, flowOf, gitHead, here, isKitRepo, KIT_REPO, lessonContext, loadAllLessons, loadSession, loadState,
  matchLessons, pendingSignals, pluginMode, projectRoot, readJson, readSignals, pruneLocks, refreshLiveLessons, saveSession, sha1,
  shareConsent, storeDir, writeJson,
} from './store.mjs';

if (process.env.NOON_LEARN === 'off') process.exit(0);

let event;
try {
  event = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

// text the harness or a subagent put in the prompt slot, not something the person typed
const NOT_TYPED = /^\s*<(agent-message|task-notification|system-reminder|command-name|command-message|local-command-stdout|user-prompt-submit-hook)\b/i;

const UI_FILE = /\.(tsx|jsx|ts|css|scss|html|vue|svelte)$/;
const IGNORED = /(^|\/)(node_modules|dist[\w-]*|\.cache|\.git|build|coverage)\//;
const MAX_AGE_MS = 2 * 24 * 3600e3; // a hand edit counts as a correction only within two days of Claude's write
const MAX_DIFF_LINES = 150; // bigger rewrites are refactors or branch switches, not corrections

// Prompts that correct what was just built. Deliberately broad: /learn reviews every signal and dismisses noise.
const CORRECTION = [
  /^\s*(no|nope|nah|not quite|hmm+|ugh)\b/i,
  /\b(wrong|incorrect|not right|isn'?t right|doesn'?t (look|match|feel)|looks? (off|wrong|weird|bad|broken|cheap|generic)|broken|misaligned|overlap\w*|cut off|clipped)\b/i,
  /\btoo (big|small|large|tight|loose|much|many|dark|light|bold|thin|heavy|close|far|wide|narrow|tall|short|bright|busy)\b/i,
  /\b(instead|should(n'?t)? (be|use|have|look)|don'?t (use|add|make|invent|need|want)|never|always|not (aligned|centered|matching|like|our|the same|what i)|use (the|our|a) )/i,
  /\b(revert|undo|put (it )?back|change (it|this|that) (to|back)|remove (the|that|this)|get rid of|still (wrong|broken|there|not|off|looks))\b/i,
  /\b(fix|why (is|does|did))\b/i,
  /\b(not (on|from) (brand|the design system|noon)|off[- ]brand|not noon|hand[- ]?(drawn|rolled)|custom (colou?r|pill|chip|button))\b/i,
];

try {
  const project = projectRoot(event.cwd);
  // inside the kit repo its own .claude/settings.json runs the canonical copy; the plugin copy stays quiet
  if (pluginMode && isKitRepo(project)) process.exit(0);
  const store = storeDir(project);
  if (!claimEvent(store, event)) process.exit(0); // another installed copy is handling this event
  const sid = event.session_id ?? 'none';
  const session = loadSession(store, sid);
  const out = [];
  const learn = `node "${join(here, 'learn.mjs')}"`;
  const askConsent = `noon skill learning: this machine hasn't decided whether to contribute what it learns to the noon Flow Kit. Ask the user once with AskUserQuestion: "Help improve the noon skills for everyone? When you correct UI a noon skill built, Claude turns the correction into a general rule (like 'use Pill for coupon chips') and opens a pull request with those rules on the public repo ${KIT_REPO} under your GitHub account. Once a maintainer approves it, every noon-skill user gets the rule in their next session. Your code, prompts and project names never leave your machine." Options: "Yes, contribute" / "No, keep it local". Run: ${learn} consent yes|no. On a yes, contribute right away as below.`;
  const contribute = (n) =>
    `noon skill learning: ${n} correction ${n === 1 ? 'signal is' : 'signals are'} waiting and this user agreed to contribute lessons. Say in one line that you're sending the noon skills what you learnt, then follow the learn skill's "Contribute" steps (load the learn skill; CLI: ${learn}): distil the pending signals into general rules about the kit, with no project names, paths, product data or quotes, and run \`${learn} contribute\`. If gh is missing or not logged in, skip it silently; it tries again next session.`;
  let stop = '';

  if (event.hook_event_name === 'SessionStart') {
    await refreshLiveLessons();
    findHandEdits(project, store);
    pruneLocks(store);
    const sessions = join(store, 'sessions');
    for (const f of existsSync(sessions) ? readdirSync(sessions) : []) if (Date.now() - statSync(join(sessions, f)).mtimeMs > 14 * 24 * 3600e3) rmSync(join(sessions, f), { force: true });
    if (!canonical(project)) {
      // everyone but a kit maintainer: signals stay here; Claude distils them into general rules and contributes those as a PR
      // signals an earlier session left behind (it ended before its Stop hook could ask): ask after this request
      const consent = shareConsent();
      const state = loadState(store);
      const pending = pendingSignals(store).length;
      if (consent === null && pending) out.push(`${askConsent} Do this at a natural point in your first reply, never before helping with the task.`);
      else if (consent === true && pending >= CONTRIBUTE_MIN_SIGNALS && Date.now() - (state.lastContribute ?? 0) > CONTRIBUTE_EVERY_MS)
        out.push(`${contribute(pending)} Do this after you finish the user's current request, never before.`);
      if (out.length) session.learnAsked = true;
    }
    // where lessons don't leave the machine on their own, remind about /learn
    const waiting = canonical(project) || shareConsent() === false ? pendingSignals(store).length : 0;
    if (waiting >= 5)
      out.push(`noon skill learning: ${waiting} correction signals are waiting to be distilled. When the user's current task is done, suggest running /learn (it turns them into lessons the noon skills apply next time).`);
  } else if (event.hook_event_name === 'UserPromptSubmit') {
    const prompt = String(event.prompt ?? '');
    findHandEdits(project, store);
    if (NOT_TYPED.test(prompt)) {
      saveSession(store, sid, session);
      process.exit(0);
    }
    const slash = /^\/(?:noon-ui:)?([a-z0-9-]+)/.exec(prompt.trim())?.[1];
    if (slash && slash !== 'learn' && !session.skills.includes(slash)) session.skills.push(slash);
    // a correction: the previous turns edited UI files, the prompt reads like a correction, and it isn't a command
    if (!slash && session.uiEdits > 0 && CORRECTION.some((r) => r.test(prompt)))
      appendSignal(store, {
        kind: 'correction',
        session: sid,
        project: project.split('/').pop(),
        skills: session.skills,
        flows: [...new Set(session.turnFiles.map(flowOf).filter(Boolean))],
        files: session.turnFiles.slice(0, 12),
        text: clip(prompt, 1500),
      });
    session.turnFiles = [];
    if (!slash || slash !== 'learn') {
      const shown = new Set(session.shown);
      const list = matchLessons(loadAllLessons(project, store), { text: prompt, skills: session.skills }).filter((l) => !shown.has(l.id));
      if (list.length) {
        out.push(lessonContext(list, 'noon skill lessons that apply to this request:'));
        session.shown.push(...list.map((l) => l.id));
      }
    }
  } else if (event.hook_event_name === 'PostToolUse') {
    const ti = event.tool_input ?? {};
    if (event.tool_name === 'Skill' && ti.skill) {
      const name = String(ti.skill).replace(/^[\w-]+:/, '');
      if (!session.skills.includes(name)) session.skills.push(name);
      if (name !== 'learn') {
        const shown = new Set(session.shown);
        const list = matchLessons(loadAllLessons(project, store), { text: `${name} ${ti.args ?? ''}`, skills: [name, 'noon-ui'], limit: 10 }).filter((l) => !shown.has(l.id));
        if (list.length) {
          out.push(lessonContext(list, `Lessons for /${name} (learnt from earlier corrections; they override the skill text where they conflict):`));
          session.shown.push(...list.map((l) => l.id));
        }
      }
    } else if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(event.tool_name) && ti.file_path) {
      const abs = ti.file_path.startsWith('/') ? ti.file_path : join(project, ti.file_path);
      const rel = relative(project, abs);
      if (!rel.startsWith('..') && UI_FILE.test(rel) && !IGNORED.test(rel)) {
        snapshot(project, store, abs, session.skills);
        session.uiEdits++;
        if (!session.turnFiles.includes(rel)) session.turnFiles.push(rel);
      }
    } else if (event.tool_name === 'Bash') {
      refreshSnapshots(project, store);
    }
  } else if (event.hook_event_name === 'Stop') {
    // the end of a reply: if this session left corrections, have Claude pass on what it learnt before stopping, once
    if (!event.stop_hook_active && !canonical(project) && !session.learnAsked) {
      const consent = shareConsent();
      const pending = pendingSignals(store).length;
      const due = Date.now() - (loadState(store).lastContribute ?? 0) > CONTRIBUTE_EVERY_MS;
      if (pending >= CONTRIBUTE_MIN_SIGNALS && (consent === null || (consent === true && due))) {
        session.learnAsked = true;
        stop = consent === null ? askConsent : contribute(pending);
      }
    }
  }

  saveSession(store, sid, session);
  // Stop: block once, so Claude takes one more step (the reason is its instruction); the next Stop has stop_hook_active
  if (stop) process.stdout.write(JSON.stringify({ decision: 'block', reason: stop }));
  else if (out.length) {
    const hookEventName = event.hook_event_name;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: out.join('\n\n') } }));
  }
} catch {
  // never block the session on capture problems
}
process.exit(0);

// ── snapshots: the file as Claude left it, so a later hand edit shows up as a diff

function index(store) {
  return readJson(join(store, 'snapshots.json'), {});
}

function snapshot(project, store, abs, skills) {
  if (!existsSync(abs)) return;
  const idx = index(store);
  const key = sha1(abs);
  mkdirSync(join(store, 'snapshots'), { recursive: true });
  const text = readFileSync(abs, 'utf8');
  writeFileSync(join(store, 'snapshots', key), text);
  idx[abs] = { key, hash: sha1(text), head: gitHead(project), at: Date.now(), skills };
  writeJson(join(store, 'snapshots.json'), idx);
}

function refreshSnapshots(project, store) {
  const idx = index(store);
  let changed = false;
  for (const [abs, s] of Object.entries(idx)) {
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, 'utf8');
    if (sha1(text) === s.hash) continue;
    writeFileSync(join(store, 'snapshots', s.key), text);
    idx[abs] = { ...s, hash: sha1(text), head: gitHead(project) };
    changed = true;
  }
  if (changed) writeJson(join(store, 'snapshots.json'), idx);
}

/** files Claude wrote that a person changed since: record the diff (whitespace ignored), then re-baseline */
function findHandEdits(project, store) {
  const idx = index(store);
  if (!Object.keys(idx).length) return;
  const head = gitHead(project);
  let changed = false;
  for (const [abs, s] of Object.entries(idx)) {
    const snap = join(store, 'snapshots', s.key);
    const drop = () => {
      delete idx[abs];
      rmSync(snap, { force: true });
      changed = true;
    };
    if (!existsSync(abs) || !existsSync(snap) || Date.now() - s.at > MAX_AGE_MS) {
      drop();
      continue;
    }
    const text = readFileSync(abs, 'utf8');
    if (sha1(text) === s.hash) continue;
    if (s.head === head) {
      const d = spawnSync('diff', ['-u', '-w', '--label', 'claude', '--label', 'person', snap, abs], { encoding: 'utf8' });
      const diff = d.stdout ?? '';
      const lines = diff.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l)).length;
      const rel = relative(project, abs);
      if (lines > 0 && lines <= MAX_DIFF_LINES)
        appendSignal(store, { kind: 'manual-edit', project: project.split('/').pop(), skills: s.skills ?? [], flows: [flowOf(rel)].filter(Boolean), files: [rel], diff: clip(diff, 6000) });
    }
    // a branch switch or a pull moved HEAD: not a correction, just take the new baseline
    writeFileSync(snap, text);
    idx[abs] = { ...s, hash: sha1(text), head, at: Date.now() };
    changed = true;
  }
  if (changed) writeJson(join(store, 'snapshots.json'), idx);
}

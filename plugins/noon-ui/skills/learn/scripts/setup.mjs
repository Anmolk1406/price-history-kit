#!/usr/bin/env node
// Installs the noon skills' learning layer into a project that uses noon-kit from npm:  npx noon-kit learn setup [--local]
//
//   .claude/skills/learn/        the learn skill (SKILL.md, these scripts, the kit's lessons.json), so Claude can /learn
//   .claude/settings.json        the capture hooks (--local: .claude/settings.local.json, just for you)
//
// Re-run it after upgrading noon-kit to refresh the skill (the hooks also read the installed package's lessons).
// Same consent rule as everywhere: nothing leaves the machine until the person says yes (learn.mjs consent).
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { here, isKitRepo, LESSONS_REL, projectRoot, readJson, writeJson } from './store.mjs';

const local = process.argv.includes('--local');
const project = projectRoot(process.cwd());
if (isKitRepo(project)) {
  console.log('This is the noon Flow Kit repo: the learning layer is already wired (.claude/settings.json).');
  process.exit(0);
}

const skillSrc = join(here, '..');
const dest = join(project, '.claude/skills/learn');
mkdirSync(join(dest, 'scripts'), { recursive: true });
copyFileSync(join(skillSrc, 'SKILL.md'), join(dest, 'SKILL.md'));
for (const f of readdirSync(here).filter((n) => n.endsWith('.mjs'))) copyFileSync(join(here, f), join(dest, 'scripts', f));
const lessons = [join(skillSrc, 'lessons.json'), join(skillSrc, '../../..', LESSONS_REL)].find(existsSync);
if (lessons) copyFileSync(lessons, join(dest, 'lessons.json'));

const settingsFile = join(project, '.claude', local ? 'settings.local.json' : 'settings.json');
const settings = readJson(settingsFile, {});
settings.hooks ??= {};
const capture = { type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/learn/scripts/capture.mjs"', timeout: 10 };
const wanted = {
  SessionStart: { hooks: [capture] },
  UserPromptSubmit: { hooks: [capture] },
  PostToolUse: { matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash|Skill', hooks: [capture] },
  Stop: { hooks: [{ ...capture, timeout: 15 }] },
};
let added = 0;
for (const [ev, entry] of Object.entries(wanted)) {
  const list = (settings.hooks[ev] ??= []);
  if (list.some((e) => e.hooks?.some((h) => String(h.command).includes('learn/scripts/capture.mjs')))) continue;
  list.push(entry);
  added++;
}
writeJson(settingsFile, settings);

console.log(`noon skill learning installed in ${project}
  skill   ${relative(project, dest)}/ (SKILL.md, scripts, lessons)
  hooks   ${relative(project, settingsFile)} (${added ? `${added} added` : 'already there'})

Start a new Claude Code session. When you correct UI Claude built with noon-kit, the hooks note it on this machine; at
the end of that session Claude asks (once) whether to contribute what it learns to the noon Flow Kit as a pull request
(general rules only; your code, prompts and project names never leave this machine). Approved lessons from everyone
reach every session automatically. ${local ? '' : 'Commit .claude/ so your team gets it too.'}`);

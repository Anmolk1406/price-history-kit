#!/usr/bin/env node
// noon-kit command line, for projects that install the kit from npm:
//
//   npx noon-kit learn setup [--local]   install the learning layer (the learn skill + capture hooks) in this project
//   npx noon-kit learn <cmd> …           the learn CLI (.claude/skills/learn/scripts/learn.mjs header lists the commands)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [group, cmd, ...rest] = process.argv.slice(2);
const script = (name) => fileURLToPath(new URL(`../.claude/skills/learn/scripts/${name}`, import.meta.url));
if (group !== 'learn') {
  console.log('Usage: npx noon-kit learn setup [--local]  ·  npx noon-kit learn <pending|add|contribute|stats|…>');
  process.exit(group ? 1 : 0);
}
const r = spawnSync(process.execPath, [script(cmd === 'setup' ? 'setup.mjs' : 'learn.mjs'), ...(cmd === 'setup' ? rest : [cmd, ...rest].filter(Boolean))], { stdio: 'inherit' });
process.exit(r.status ?? 1);

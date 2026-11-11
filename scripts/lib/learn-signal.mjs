// Records a design-guard block or a failed lint as a skill-learning signal (.claude/skills/learn/SKILL.md), so /learn can
// see which rules the skills keep failing to teach. Lints record only inside a Claude Code session (CLAUDECODE=1): a
// person running them by hand isn't a skill miss. Never throws: a broken store must not change a check's result.
import { appendSignal, clip, flowOf, loadSession, projectRoot, storeDir } from '../../.claude/skills/learn/scripts/store.mjs';

export function recordBlock(kind, { session, files = [], text }) {
  try {
    if (process.env.NOON_LEARN === 'off' || (kind === 'lint' && !process.env.CLAUDECODE)) return;
    const project = projectRoot();
    const store = storeDir(project);
    appendSignal(store, {
      kind,
      session,
      project: project.split('/').pop(),
      skills: session ? loadSession(store, session).skills : [],
      flows: [...new Set(files.map(flowOf).filter(Boolean))],
      files,
      text: clip(text, 2000),
    });
  } catch {
    // ignore
  }
}

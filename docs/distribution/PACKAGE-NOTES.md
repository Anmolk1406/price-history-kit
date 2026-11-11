# Distribution notes: what is portable, what needs Claude Code or the repo

This package is the noon Flow Kit's design knowledge in the standard Agent Skills format: one folder per skill, each with a `SKILL.md` (YAML frontmatter `name` + `description`, then instructions), plus the files it links to. It is generated from the kit repo (`.claude/skills/`, `.claude/resources/`); the repo stays the single source of truth.

## Layout

| Folder | What it is |
|---|---|
| **noon-ui** | the hub skill: workflow, house rules, design-system references (`references/`: tokens, components, icons, assets, motion, screen recipes, flows), `templates/`, and `resources/` (brain map in `resources/brain/`, flow briefs in `resources/flows/`, screen index, inventory, patterns, tooling) |
| **learn** | the memory layer: `SKILL.md`, `scripts/` (capture hook + CLI, Node built-ins only) and `lessons.json` (the kit's lessons, also readable as `noon-ui/resources/learnings/LESSONS.md`) |
| **home-page**, **search**, **pdp**, **cart**, **checkout**, **orders**, **returns**, **reviews**, **account**, **noon-one** | screen skills: `SKILL.md` + `spec.md` (+ `references/` with Figma analyses); each links into `../noon-ui/` |

Install the folders **together**: the screen skills read `../noon-ui/…`. A screen skill installed alone loses its design-system references and brain card.

## Works in any agent that supports Agent Skills

- Activation by description, and the instructions, specs, references and brain map cards (all plain markdown).
- Retrieval by reading: `resources/brain/INDEX.md` → `resources/brain/flows/<flow>.md` → the spec line ranges it names.
- The design rules (tokens only, compose from kit components, Origin defaults, provenance), which are text.

## Needs a checkout of the noon Flow Kit repo

The skills build screens **in** the kit (`src/flows/<flow>/`). Without the repo they are reference material: an agent can plan and review, but cannot edit or run anything.

| Feature | Needs |
|---|---|
| Editing flows, components, tokens (`src/…`) | the repo |
| `npm run brain -- context / impact / deps / path` (live queries; the cards are bundled, the query CLI is not) | the repo + Node 20 + `npm install` |
| `npm run check:routes`, `npm run test:journeys`, `npm run visual:ref`, `node scripts/shot.mjs`, `node .claude/skills/noon-ui/scripts/snap.mjs` | the repo + `npm install` + Playwright Chromium + `npm run dev` |
| `npm run skill:check`, `npm run lint:tokens`, `npm run new-flow` | the repo |
| bappzaar sources (`git -C ~/bappzaar show origin/master:…`), Figma files, Mobbin | access the agent may not have; see `../references/portability.md` |

## Claude Code only

| Feature | Notes |
|---|---|
| Slash commands | Claude Code runs a skill by name: inside the kit repo `/noon-ui`, `/home-page` …; from the plugin `/noon-ui:noon-ui`, `/noon-ui:home-page` …. Other agents activate skills by their description, or however their docs say. |
| Learning hooks (`learn`) | The plugin's `hooks/hooks.json` runs `skills/learn/scripts/capture.mjs` (Node 20) on SessionStart, UserPromptSubmit and PostToolUse. It records corrections to noon UI in `~/.noon-ui/learn/<project>/` (local; `NOON_LEARN=off` disables it) and injects matching lessons. Signals never leave the machine. After a one-time yes, Claude distils them into general rules, and `learn.mjs contribute` opens a PR (via `gh`) that adds them to the kit's `learnings/inbox/` for review. Without Claude Code hooks, read `resources/learnings/LESSONS.md` yourself and record lessons with `node skills/learn/scripts/learn.mjs note …`. |
| Design-guard hook | `.claude/settings.json` in the kit repo runs `scripts/hooks/design-guard.mjs` before edits in `src/`. It is a **repo** setting, not part of this package or the plugin; other agents don't run it, so run `npm run lint:tokens` yourself. |
| Figma / Mobbin MCP tools | referenced by the workflow when connected; not bundled or configured by this package. |
| Subagents, Skill tool, TodoWrite-style tools named in the text | Claude Code tool names; other agents use their own equivalents. |

Tool APIs differ between agents, so the same request will not produce identical behaviour everywhere; the knowledge is the same.

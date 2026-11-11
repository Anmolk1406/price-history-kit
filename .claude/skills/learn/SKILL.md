---
name: learn
description: The noon skills' memory layer. Turns what people corrected after a noon skill built UI (correction prompts, hand edits to files Claude wrote, design-guard blocks, failed lints, explicit notes) into lessons that every noon skill applies next time, and promotes lessons that keep recurring into the skills' references, guard rules and evals. Use when someone types /learn, says "remember this for next time", "the skill keeps getting X wrong", "always / never do X in noon screens", asks what the skills have learnt, or when a session start notice says correction signals are waiting. Also contributes a project's lessons back to the noon Flow Kit repo as a pull request, and merges contributed lessons in the kit repo.
---

# learn: the noon skills' memory layer

Every time someone uses a noon skill to build UI and then fixes what it produced, that fix is a lesson the skill should already have known. This skill closes the loop: **capture → distil → recall → promote**.

```
 build with a noon skill ──► person corrects it ──► capture hook records a signal (local, never sent)
        ▲                                                       │
        │                                              /learn distils signals
        │                                                       ▼
   skill text + guard + evals ◄── promote (reviewed) ◄── lesson in lessons.json (rule · why · scope · seen ×N)
        ▲                                                       │
        └──────── hooks inject matching lessons when a skill loads or a prompt matches ◄──┘
```

| Part | Where |
|---|---|
| Capture hook (signals) | `scripts/capture.mjs`, wired in `.claude/settings.json` (kit repo) or the plugin's `hooks/hooks.json` |
| Guard / lint signals | `scripts/hooks/design-guard.mjs`, `scripts/token-lint.mjs`, `scripts/check-structure.mjs` call `appendSignal` |
| Signal store | local only: `.cache/learn/` in the kit repo, `~/.noon-ui/learn/<project>/` elsewhere (`scripts/store.mjs` header) |
| Lessons (committed, bundled) | `.claude/resources/learnings/lessons.json` → generated `.claude/resources/learnings/LESSONS.md` |
| CLI | kit repo `npm run learn -- <cmd>`; npm `npx noon-kit learn <cmd>`; plugin `node <this skill's folder>/scripts/learn.mjs <cmd>` (`scripts/learn.mjs` header lists the commands) |

**Who writes where.** Only kit maintainers write the canonical lessons. They opt in once per clone with `npm run learn -- maintainer on` (a local git config flag). Everyone else is a contributor: their lessons go to their local store and come back as an inbox PR. That covers all three ways people use the kit:

| Using the kit through | Gets the skill and hooks from | Lessons go |
|---|---|---|
| the noon-ui plugin, in their own project | the plugin | local → `contribute` PR |
| `noon-kit` from npm, in their own project | `npx noon-kit learn setup` (copies this skill into `.claude/skills/learn/` and adds the hooks to `.claude/settings.json`) | local → `contribute` PR |
| a clone or fork of the kit repo | `.claude/settings.json` in the repo | local → `contribute` PR (maintainers: `lessons.json`) |

If two copies are installed (plugin + npm setup), each event is still captured once.

The signals are what a person typed or changed. In the kit repo they stay on the machine. In projects that use the plugin they also stay on the machine: only distilled general rules are contributed, after the person agrees (see "Contribute"). Lessons are written in your own words, with no names, prompts or customer content.

## `/learn <text>`: record a rule on purpose

1. `npm run learn -- note "<text>" [--skill <skill>] [--flow <flow>]` records it as a `note` signal.
2. Distil it straight away, as in the next section, with `--explicit` on `add`. An explicit note is promotable at once.
3. Tell the user the lesson id and that matching sessions now get it injected.

## `/learn`: distil the pending signals

1. **Read.** `npm run learn -- pending` lists each signal: its kind, the skill and flow it came from, the files, the prompt or the diff. Also read `.claude/resources/learnings/LESSONS.md` so you extend existing lessons instead of duplicating them.
2. **Judge each signal.** Ask one question: *would a better skill have avoided this?*
   - **Yes, a skill gap.** The skill picked a wrong component, token, spacing, sheet layout, icon or copy style, broke a house rule, misread the design language, or the person hand-fixed the same thing the guard caught. Group the signals that share one root cause.
   - **No: dismiss it.** A new feature request, a change of mind about content, a bug in the person's own code, an unrelated prompt that happened to match ("fix the typo in the README"), or noise from a formatter. `npm run learn -- dismiss <ids…> --reason "<why>"`.
   - **Unclear.** Open the files and the diff. If it's still unclear, ask the user in one question rather than guessing.
3. **Write or extend lessons.**
   - The same root cause as an existing lesson: `npm run learn -- link <L-id> <signal ids…> --evidence "<one line>"`.
   - A new root cause: `npm run learn -- add --rule "<imperative rule>" --why "<what went wrong, one line>" --skills <skills> --flows <flows> --tags <words a request would contain> --signals <ids> --evidence "<one line>"`.
   - A good rule is one imperative sentence that names the kit piece. For example: "Use `Pill` `variant='filter'` for PLP filter chips; never a new chip style." Or: "Sheets with a grabber have no close button."
   - Tags are the words a future request would use (`coupon`, `filter chip`, `empty state`). Use `*` only for rules that apply to every noon screen.
   - Scope a rule to the screen skill it belongs to (`cart`, `pdp`, …), or to `noon-ui` when it holds everywhere.
   - Check the rule against the code before you write it. It must name components, tokens and paths that exist, because `npm run skill:check` validates every path and `--nk-*` var in `LESSONS.md`.
   - Evidence is your own one-line summary ("person replaced a hand-rolled chip with `Pill` in cart/coupon"), never a quote of the prompt.
4. **Promote what keeps coming back.** `npm run learn -- promotable` lists lessons seen 3+ times, plus explicit notes. For each one, propose a change in the right home and show it to the user as a diff before you apply it:

   | The lesson is… | Promote into |
   |---|---|
   | a rule for every screen (component per job, colour per role, spacing) | `../noon-ui/references/design-rules.md` or `../noon-ui/references/component-checklist.md` |
   | specific to one page | that skill's `spec.md` / `SKILL.md` → "Rules specific to …" |
   | a house rule | `../noon-ui/SKILL.md` → House rules (and `CLAUDE.md` if it is repo-wide) |
   | mechanically checkable (a literal, an import, a file location) | a new check in `scripts/hooks/design-guard.mjs` (and `scripts/token-lint.mjs`), with a manual-test line |
   | a behaviour to prove | a case in `../noon-ui/evals/evals.json` |
   | motion | `../noon-motion/SKILL.md` |

   Once the user approves: apply the change, run `npm run learn -- promote <L-id> --to <file>`, then `npm run resources:build` and `npm run skill:check`. Add a line under Unreleased in `CHANGELOG.md`, for example "Skills learnt: …". Promoted lessons stop being injected, because the skill now says it itself.
5. **Clean up.** Retire a lesson the code has made wrong: `npm run learn -- retire <L-id> --reason "…"`.
6. **Report.** Give one short table: signals read, dismissed, the lessons added, linked and promoted (id and rule), and what's waiting for review. Close with `npm run learn -- stats`.

## Contribute (everyone but maintainers)

People build in their own repos (with the plugin or `noon-kit` from npm) or in a clone of the kit, and push their code there. The kit repo is public, so **signals never leave their machine**. Their own Claude distils the signals into general rules, and those rules come to the kit as a pull request:

1. **Consent, once per machine.** Outside a maintainer's clone, the first session with signals asks the user at the end of its work (the Stop hook keeps you going for this one step); the hook gives you the exact question. Record the answer with `node <this skill's folder>/scripts/learn.mjs consent yes|no`. `NOON_LEARN_SHARE=off` overrides it.
2. **When the hook asks** (consent given, a correction pending, at most once a session and once an hour), do it *after* the user's current request: the Stop hook asks when you finish a reply, the SessionStart hook for signals an earlier session left behind. Say so in one line, then:
   - Distil the pending signals as in "`/learn`" above (`pending`, `add`, `link`, `dismiss`). The lessons go to this project's local store.
   - **Write every rule as a general rule about the noon kit**: kit components, tokens, skills and kit flows only. Never the project's name, its file paths, product or customer data, or a quote of what the user typed. `contribute` refuses a lesson that mentions the project or a home-directory path; retire it and add it again in general terms.
   - Run `learn.mjs contribute --dry-run`, read what would be sent, then `learn.mjs contribute`. It uses the user's `gh` login: from their fork when they can't push to the kit, the same as any outside PR. The PR adds one new file, `.claude/resources/learnings/inbox/<date>-<source>-<id>.json`, so contributions never conflict. If `gh` is missing or not logged in, skip it silently; it tries again next session.
3. **Kit maintainers** review on GitHub. The `lessons-inbox` workflow (`.github/workflows/lessons-inbox.yml`) runs `learn review` on every inbox PR and comments: shape, skills that exist, no private paths or addresses, nothing that reads like an instruction to Claude, and which existing lesson each rule repeats. Check each rule against the code and edit or delete the wrong ones in the PR, then add the **`lessons:approve`** label: the workflow merges exactly the checked commit, runs `merge-inbox` (same rule → `seen` goes up and its `sources` count, the number of projects that reported it, grows; a retired rule that came back is reactivated), rebuilds the plugin copy and commits to main. Run `/learn` later to promote what keeps coming back. Without the workflow, the same works by hand in a maintainer clone: merge, `npm run learn -- merge-inbox`, commit. `npm run skill:check` fails on a malformed inbox file.
4. **Inbox lessons apply to nobody until they're merged into `lessons.json`.** A PR from a stranger on a public repo can't steer anyone's Claude without a maintainer's approval.
5. **Everyone gets merged lessons at their next session, no release needed.** The SessionStart hook fetches `lessons.json` from the kit's main branch (at most hourly, 1.5 s timeout, ETag) into `~/.noon-ui/learn/kit-lessons.json`, and only takes well-formed lessons (`sanitizeLessons` in `scripts/store.mjs`). Offline, the last copy or the bundled one applies. `NOON_LEARN_LIVE=off` turns it off.

Nobody needs an API key: distilling runs in the user's own Claude Code session, and merging in yours.

## What gets captured

| Signal | Recorded when |
|---|---|
| `correction` | A prompt after Claude edited UI files this session reads like a correction ("no, use the noon pill", "too much padding", "that's not our sheet") |
| `manual-edit` | A file Claude wrote was changed by hand within two days, in under 150 changed lines, with no branch switch in between (whitespace ignored) |
| `guard` | The design guard blocked an edit: raw colour, foreign UI library, raw font, "AED", wrong folder |
| `lint` | `npm run lint:tokens` or `npm run check:structure` failed in a Claude session |
| `note` | `/learn <text>` |

Turn it off for a session or a machine with `NOON_LEARN=off`. The capture is deliberately broad, so expect noise: you are the filter, and dismissing a signal is a normal outcome.

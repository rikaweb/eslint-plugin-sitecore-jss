# Claude Code plugin for Sitecore field components (Track C)

Status: built and tested locally, 2026-11-18. Not submitted to any public marketplace.

The linter catches a field value rendered by hand. It cannot decide whether a field should be
`Text` or `RichText`, whether `Link` should be Sitecore's or Next's, or whether a guard hides an
empty field from the author. This plugin gives Claude Code that judgment, plus two commands that
wrap the linter.

## What is in it

| Piece | Kind | Invoked by | Purpose |
|---|---|---|---|
| `sitecore-fields` | skill | Claude, from its description | Conventions for rendering Sitecore fields: field type to component, `Link` / `Image` next to `next/link` / `next/image`, typing `fields`, empty-field and datasource guards, placeholders per router, working with the linter. |
| `/jss:review [files] [--fix]` | skill, user-invoked only | the user | Detects the setup, offers the README install and config when the linter is missing (flat or legacy), lints changed or given files, explains each finding including the ones without a fix, then checks what the linter cannot see. |
| `/jss:component <Name> [Field:type ...]` | skill, user-invoked only | the user | Scaffolds a typed component for the detected family and router, then lints and type-checks it. |
| `scripts/detect-project.mjs` | Node script, no dependencies | both commands | Prints the project facts as JSON: family, import source, router, package manager, ESLint config format, linter status, changed `.tsx` files. |
| `scripts/lint-fields.mjs` | Node script, no dependencies | `/jss:review` | Runs the project's own ESLint (never `--fix`) and prints the plugin's findings compactly: source line, message id, fixable or not, counts. |

### What goes where

- **Skill body** (about 130 lines, loaded whenever the skill triggers): how to detect family and router,
  the field type table, and the judgment calls the linter cannot make. Nothing else.
- **Reference files** (loaded on demand): `field-components.md` (props and behaviour per
  component), `package-families.md` (imports, editing check, datasource check, placeholders and
  registration per family and router), `linter.md` (setup, message ids, manual rewrites for
  findings without a fix, limits), `scaffolding.md` (type mapping and templates).
- **Commands**: only the workflow. Both read the skill's reference files, so a convention is
  written once.
- **Scripts**: the facts that must be the same on every run and are cheap to compute outside the
  model.

Every Sitecore statement in the reference files is marked `[src]` (read in the published package's
code or types, or in Sitecore's starter apps), `[docs]` (Sitecore documentation or GitHub) or
`[unverified]`.

## Layout

```
.claude-plugin/marketplace.json          marketplace "sitecore-jss", one plugin, source ./claude-plugin
claude-plugin/
  .claude-plugin/plugin.json             plugin "jss", version 0.1.0
  scripts/detect-project.mjs
  scripts/lint-fields.mjs
  skills/sitecore-fields/SKILL.md
  skills/sitecore-fields/references/{field-components,package-families,linter,scaffolding}.md
  skills/review/SKILL.md                 /jss:review
  skills/component/SKILL.md              /jss:component
  evals/<case>/                          9 trigger cases for `claude plugin eval`
```

The plugin sits in a subdirectory so that an install copies only that folder, and so that nothing
changes in the npm package (`files` in `package.json` does not include it; `npm pack --dry-run`
lists no file from `claude-plugin/`). The two scripts are linted by the repository's own
`npm run lint`.

## Decisions

1. **Commands are skills, and their names are `/jss:review` and `/jss:component`.** Claude Code
   namespaces everything a plugin ships as `/<plugin>:<name>`; a plugin cannot register a bare
   `/jss-review`. The plugin is therefore named `jss`, which gives the closest spelling. The docs
   call `commands/*.md` the older format and recommend skills for new work, so both commands are
   `skills/<name>/SKILL.md` with `disable-model-invocation: true`: only the user starts them, and
   they do not compete with the main skill for triggering.
2. **This repository is the marketplace.** `marketplace.json` at the root points at
   `./claude-plugin`. One repository, one PR flow, and the plugin is versioned next to the rule docs
   it explains. A separate marketplace repository only becomes worth it when there is a second
   plugin.
3. **Staying in sync with the linter.**
   - The plugin has its own `version` in `plugin.json` (0.1.0), independent of the npm version.
     Claude Code keeps users on a version until it changes, so **bump it in every PR that changes
     `claude-plugin/`**; without the bump, `claude plugin update` finds nothing.
   - `linter.md` and the skill say which linter version they were written against (2.0.0).
   - `/jss:review` gets findings from the project's installed linter, and falls back to the rule
     docs shipped inside that npm package (`node_modules/eslint-plugin-sitecore-jss/docs/rules`),
     so a newer or older linter still gets a correct explanation.
   - A PR that adds a rule or a message id should update the two tables in `linter.md`. This is a
     manual step; see the follow-ups for a check.
4. **Setup is offered, never done silently.** Installing a dev dependency and editing the ESLint
   config change how the whole project lints, so `/jss:review` shows both and waits for a yes. The
   plugin sets no `allowed-tools`; permissions stay with the user's own settings.
5. **Project style wins, field handling does not.** `/jss:component` copies export shape, props
   typing, quotes and styling from neighbouring components, but not field handling that breaks the
   conventions (the starter's own stubs wrap `<Text>` in headings and guard on `.value`).

## Not built, and why

| Not built | Why |
|---|---|
| MCP server | Nothing here needs a running service: the facts come from `package.json`, the ESLint config and one ESLint run. Agreed earlier as "later, if ever". |
| Hooks that lint on every edit | Intrusive and slow (type-aware linting), and the skill already says to lint touched files. |
| A subagent for review | The review is one linear workflow; a subagent would hide the findings from the main conversation. |
| Plain `commands/*.md` files | Superseded by skills; same slash names either way. |
| Auto-running `--fix` | The explanation needs the original findings, and the user should see them first. `--fix` in the arguments opts in. |
| Creating Sitecore items (rendering, template) | Out of reach for a front-end plugin; the scaffold says what still has to exist in Sitecore. |
| Reference-field (droplink, multilist) scaffolding | The JSON shape depends on the rendering's GraphQL query; the command asks instead of guessing. |

## Install

```sh
claude plugin marketplace add rikaweb/eslint-plugin-sitecore-jss
claude plugin install jss@sitecore-jss
```

In a session: `/plugin marketplace add rikaweb/eslint-plugin-sitecore-jss`, then
`/plugin install jss@sitecore-jss`. `--scope project` writes it to `.claude/settings.json` for the
team. To try a checkout without installing: `claude --plugin-dir ./claude-plugin`.

Until this branch is merged, the GitHub form installs nothing (the default branch has no
`marketplace.json`); use the local path or `owner/repo@branch`.

## Research record

- **Claude Code formats**: plugin, marketplace, skill and command formats from the current docs
  (`code.claude.com/docs`: plugins-reference, plugins/marketplace-reference, plugins/components,
  skills, headless, plugin-evals) and from the local CLI (`claude` 2.1.283: `plugin validate`,
  `plugin details`, `plugin eval`, `--plugin-dir`).
- **Sitecore, from package source**: `@sitecore-content-sdk/nextjs`, `/react`, `/core` 1.4.1 in the
  two starter apps and 2.3.0 in the cache-components app; `@sitecore-jss/sitecore-jss-nextjs` and
  `-react` 23.0.0 downloaded from npm.
- **Sitecore, from documentation**: `AppPlaceholder`, component maps, `NextImage`, the 1.x to 2.x
  upgrade guide, JSS metadata and chromes editing modes, and the Content SDK repository
  (issue 361 and PR 673 on `withDatasourceCheck` in server components).
- **Not found in the documentation**: an explicit statement that rendering `field.value` breaks
  inline editing. It follows from the code (the editing markers are emitted by the field
  components only) and is the premise of the linter.

## Test record (2026-11-18)

Environment: Windows 11, Node 24.14.1, Claude Code 2.1.283. Test apps in the worktree
`C:\projects\contentSDK-eslint-plugin-test` (nothing committed, pushed or deployed there; no `.env`
read): `nextjs-app-router` and `nextjs-page-router` (Content SDK 1.4.1, ESLint 9), and
`nextjs-cache-components` (Content SDK 2.3.0, linter not configured). Both main apps were switched
from the pre-release tarball to **`eslint-plugin-sitecore-jss@2.0.0` from npm**. A scratch JSS
project (`@sitecore-jss/sitecore-jss-nextjs` 23.0.0, Next 16, ESLint 9, `flat/strict`) covered JSS.

### Limitation: headless runs were not possible

The standalone `claude` CLI on this machine is logged out
(`Failed to authenticate: OAuth session expired`), so `claude -p` and `claude plugin eval` could not
call a model. What that changes:

- The **behaviour tests below were run by subagents** of the authoring session. Each was given only
  the command or skill file path and the user's prompt, and followed the files as written. That
  exercises the instructions, scripts and templates against the real apps, but it is not the same
  as Claude Code loading the plugin and expanding a slash command.
- **Trigger accuracy was not measured.** The nine eval cases in `claude-plugin/evals/` are written
  and load in `claude plugin eval` (the run stops at authentication), but have never produced a
  score. The skill description is unoptimised.

To close both gaps after `claude /login`:

```sh
claude plugin eval ./claude-plugin --runs 3
claude -p "/jss:component Promo Title:text Body:richtext Image:image Cta:link" --plugin-dir ./claude-plugin
claude -p "/jss:review src/components" --plugin-dir ./claude-plugin
```

### Plugin loading and install

| Check | Result |
|---|---|
| `claude plugin validate . --strict` (marketplace) and `./claude-plugin --strict` | passed |
| `claude -p ... --plugin-dir ./claude-plugin`, `system/init` event | plugin `jss` 0.1.0 loaded, no `plugin_errors`; skills `jss:component`, `jss:review`, `jss:sitecore-fields` registered |
| `claude plugin marketplace add <local checkout>` then `claude plugin install jss@sitecore-jss --scope local` in the App Router app | installed and enabled, version 0.1.0 (removed again after the test) |
| `claude plugin details jss@sitecore-jss` | 3 skills; about 320 tokens always in context; on invoke about 2k (skill), 1.3k (review), 0.8k (component) before the revisions below |
| `claude plugin eval ./claude-plugin --case trigger-image-choice` | case and grader load; run stops at "Not logged in" |
| Install from GitHub (`rikaweb/eslint-plugin-sitecore-jss`) | not tested: needs the merge to `main` |

### Scripts and templates (deterministic)

| Check | Result |
|---|---|
| `detect-project.mjs` in the App Router app | `content-sdk`, `@sitecore-content-sdk/nextjs` 1.4.1, router `app`, flat config, linter `configured` |
| ... in the Pages Router app | same, router `pages` |
| ... in the cache-components app | linter in `node_modules` but in neither `package.json` nor the ESLint config: reported as `installed-not-declared` |
| ... in the JSS scratch project | `jss`, `@sitecore-jss/sitecore-jss-nextjs` |
| `lint-fields.mjs` on `src/components/eslint-plugin-test` (App Router) | 19 element findings, 15 fixable, 4 manual, 7 import fixes, 3 from other rules: the same 26 / 22 / 4 as the 2.0.0 real-project report |
| ... on a clean file, the JSS project (ESLint 9) and this repository (ESLint 10) | runs, correct counts |
| Content SDK template from `scaffolding.md`, App Router app | 0 linter findings; `tsc --noEmit` clean |
| Same template, Pages Router app | 0 linter findings; `tsc` reports only the app's existing `HeaderST.tsx` TS6133 |
| JSS template, JSS 23 scratch project, `flat/strict` | 0 findings; `tsc` exit 0 (a control file with `<h2>{fields.Title.value}</h2>` is reported there) |

### Commands, followed by subagents

| Run | Result |
|---|---|
| `/jss:component TeaserCard Title:text Summary:richtext Photo:image Cta:link PublishedOn:date`, App Router | `src/components/TeaserCard.tsx` written in the neighbours' style; re-checked independently: 0 linter findings, no `tsc` line for the file |
| `/jss:component DownloadCard Heading:text Details:richtext Thumbnail:image MoreInfo:link Brochure:file ShowBadge:checkbox`, Pages Router | `src/components/DownloadCard.tsx`; 0 linter findings, no `tsc` line for the file |
| `/jss:review src/components/eslint-plugin-test`, App Router (read-only) | 26 messages, 22 with a fix, 4 without, each of the 4 explained with the right reason (mixed children, component wrapper, `next/image`, `next/link`); 5 groups of extra findings from reading (hardcoded `alt` kept by the fix, `Read more` child replacing the author's link text, `fields` dereferenced without a datasource, ...) |
| `/jss:review` with no arguments in the cache-components app (linter not configured, read-only) | detected the missing setup, produced the install command and a diff for that app's `defineConfig` flat config; after the simulated "no" it reviewed by reading and found `.value`-guarded field components in 12 files and a value routed through a variable in `TextSlider.tsx` |
| Legacy (`.eslintrc`) setup offer | the offer itself was not exercised. Both scripts were run on a scratch ESLint 8.57.1 project (`.eslintrc.cjs` with the README's legacy block, `@typescript-eslint/parser` 7, JSS 22): detected as `legacy` / `configured`, and `lint-fields.mjs` reports the expected fixable and manual findings. |

The testers were asked to criticise the instructions. Their findings led to these changes before
the second round: a `lint-fields.mjs` script instead of raw ESLint JSON; the
`installed-not-declared` status; package manager and Node version in the detect output; an explicit
"style from the project, field handling from the skill" rule; worked examples for date and
checkbox fields; `tsc --incremental false` (plain `--noEmit` wrote `tsconfig.tsbuildinfo` into the
apps); a Prettier check after scaffolding (one file was written with LF in a CRLF project); a
defined path when the user declines the setup; a per-message-id consequence table.

Second round, after those changes:

| Run | Result |
|---|---|
| `/jss:review BadFields.tsx BadNextConflicts.tsx TeaserCard.tsx`, App Router (read-only) | used `lint-fields.mjs`: 16 findings, 12 fixable, 4 by hand, clean file listed; one extra finding from reading (no missing-datasource handling) |
| `/jss:component EventCard Title:text StartDate:date Featured:checkbox Agenda:file Seats:number`, Pages Router | `src/components/EventCard.tsx` in the neighbours' style, date formatter with fixed locale and time zone, checkbox as a modifier class; 0 linter findings, Prettier passes after `--write` (line endings), no `tsc` line for the file |

Remaining remarks from the second round were wording gaps (which children the fixer drops, how to
spot generated stubs, inline-style projects) and are applied; they were not re-tested a third time.

All files the tests created in the starter worktree were removed afterwards. What stays changed
there: both apps' `package.json` / `package-lock.json` now reference `eslint-plugin-sitecore-jss`
`^2.0.0` from npm instead of the local tarball.

Repository checks on this branch: `npm run lint`, `npm run typecheck`, `npm test` (148 passed, 2
skipped) and `npm pack --dry-run` pass.

### Skill with and without (skill-creator's comparison, 2 prompts)

Two realistic prompts, each run by one subagent with the skill and one without:

1. Pages Router: "authors can't edit half of this component, clean it up" on a component with eight
   planted problems, of which the linter reports two.
2. App Router: a new `EventTeaser` with an eyebrow pill, a clickable image, a formatted date, a
   file download and a static `next/image` icon.

| | With skill | Without skill |
|---|---|---|
| Linter findings in the result | 0 and 0 | 0 and 0 |
| `tsc` errors in the result | none | none |
| Field components used for every field, `RichTextField` typing, `DateField` with a fixed locale and time zone, `<title>` left on `.value`, `next/link` / `next/image` aliased | yes | yes |
| Empty-field handling | kept the eyebrow wrapper with the editing check; `Link` / `DateField` guarded on the field object | prompt 1: moved the class onto `<Text tag="div">` (also correct); prompt 2: same editing check |
| Alias for `next/image` | `StaticImage` | `NextImage`, the name of Sitecore's own component |

**Reading this honestly:** on the model used here the baseline already knows these conventions, and
the skill produced no measurable quality gain on these two prompts. The baseline was also not
clean: in prompt 2 it copied the `TeaserCard.tsx` that the scaffold command had just written, and
the starter apps ship a `CLAUDE.md` that tells Claude to use field components. One run per cell is
not a benchmark. What the plugin adds with evidence is the linter workflow (`/jss:review` setup
detection and explanations) and a scaffold that passes the linter by construction; whether the
skill improves weaker models or sparser projects is untested.

## Follow-ups

1. Log the CLI in and run `claude plugin eval ./claude-plugin --runs 3`; tune the skill description
   from the result (skill-creator's description optimisation loop).
2. Run both commands for real through `claude -p ... --plugin-dir`, and once in an interactive
   session inside the Pages editor workflow.
3. Try `/jss:review` on an ESLint 8 project that lacks the linter, to exercise the legacy config offer.
4. Done after the first merge: `docs/AGENTS.sitecore-fields.md` is generated from the skill body and
   three sections of `linter.md` by `scripts/build-agents-md.mjs`, and `tests/agents-md.test.ts` fails
   when it is out of date. Text that only works in Claude Code (the scripts, the two commands) is
   left out.
5. Done after the first merge: `tests/claude-plugin.test.ts` fails when a rule or message id of the
   built plugin is missing from `linter.md`. `claude plugin validate --strict` is still not in CI (it
   needs the Claude CLI there).
6. Mention the plugin in the 2.0.1 CHANGELOG (left alone here: another session owns the release
   sections).
7. Unverified Sitecore items to confirm in a running site: `DateField` `render` passed from an App
   Router server component; JSS component registration (`componentBuilder`); dynamic placeholder
   naming; whether the installed Content SDK version has the server-safe `withDatasourceCheck`.

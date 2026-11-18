# eslint-plugin-sitecore-jss v2.0 — Track A plan (core compatibility, tests, auto-fix bugs)

Status: proposed, 2026-10-15. Scope is Track A only: make the plugin installable and correct on today's
toolchain. New rules (Track B) and the Claude skill (Track C) are out of scope here.

## Why

- v1.1.6 only declares `eslint ^8` and `@typescript-eslint/parser ^5 || ^6`. ESLint 8 and 9 are both end-of-life;
  ESLint 10 removed `context.getSourceCode()`, which every rule calls, so the plugin crashes there.
- Sitecore's Content SDK starter defaults to ESLint 9 flat config + typescript-eslint 8 since Content SDK 1.1.
  A plain `npm install` of this plugin fails peer resolution on those projects.
- Downloads fell from ~760/month (Jun 2025) to ~40/month (Sep 2026).
- Running the built plugin on a 16-case sample component showed the auto-fixer loses code in several cases.

## Support matrix (verified 2026-10-15 against npm metadata)

| Dependency | v1.1.6 | v2.0 |
|---|---|---|
| eslint (peer) | ^8.0.0 | ^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0 |
| @typescript-eslint/parser (peer) | ^5 \|\| ^6 | ^7.0.0 \|\| ^8.0.0 |
| typescript (peer) | >=4.9 | >=4.8.4 <6.1.0 (the range typescript-eslint 8 supports; TS 7 waits on typescript-eslint) |
| @typescript-eslint/utils | devDependency only (bug: required at runtime) | runtime dependency ^8 |
| Node (engines) | >=14 | ^18.18.0 \|\| ^20.9.0 \|\| >=21.1.0 (ESLint 10 itself needs 20.19+) |
| Config formats | legacy only | flat (`flat/recommended`, `flat/strict`) + legacy (`recommended`, `all`) |

Dropping typescript-eslint 5/6 and Node 14/16 is the breaking change that justifies 2.0.0.

## Design decisions

1. **Rule factory.** Rewrite rules with `ESLintUtils.RuleCreator` (docs URL per rule), `context.sourceCode`,
   `meta.docs.requiresTypeChecking: true`. Import `ts-eslint` types from `@typescript-eslint/utils/ts-eslint`,
   never from `dist/`.
2. **No type info = clear error.** Replace the silent `if (!parserServices.program) return {}` with the standard
   typescript-eslint error so users learn they need `parserOptions.project` / `projectService`.
3. **Shared helpers** in `lib/utils/`:
   - `fields.ts`: `unwrap(expr)` strips `ChainExpression`, `TSNonNullExpression`, `TSAsExpression`,
     `TSSatisfiesExpression`; `getFieldRoot(expr)` walks past `.value`, `.src`, `.href`, `.text` through those
     wrappers and returns the field expression (`props.fields.title`, `fields?.title`, `heading`).
   - `jsx.ts`: attribute serialisation (keep spreads, drop a named attribute), `isIntrinsicTag(name)`
     (lowercase JSX identifier), `meaningfulChildren(element)` (ignores whitespace-only text and comments).
   - `imports.ts`: see decision 6.
   - `type-checking.ts`: keep, plus `getFieldPackage(type)` that reads the declaring file of the field type
     (`node_modules/@sitecore-content-sdk/...` vs `node_modules/@sitecore-jss/...`).
   - `logging.ts`: keep; all `console.warn` calls removed from rules.
4. **Fix only when safe.** A rule reports whenever it detects misuse, but attaches a fix only when:
   - the field expression is the element's sole meaningful child (text/richtext), and
   - the wrapper is an intrinsic HTML tag (otherwise report with a "no automatic fix" message), and
   - the generated component name can be imported without a binding conflict (decision 6).
   Otherwise: report, no fix. Never produce a fix that drops user content.
5. **Per-rule behaviour changes.**
   - `enforce-text-component`: detect through optional chaining; keep attributes; no fix for mixed children or
     custom components; message shows `field={...}` with braces.
   - `enforce-richtext-component`: same detection fixes; keep nested-`<p>` logic; add detection of
     `dangerouslySetInnerHTML={{ __html: <RichTextField>.value }}` with a fix to `<RichText field tag=.. />`
     when the element has no children (stretch item, cheap once helpers exist).
   - `enforce-image-component`: detect `value?.src` and `value!.src`; field root is the `ImageField`, never
     `value!`; drop `src`, keep the rest (`alt` stays; JSS `Image` accepts it as an override).
   - `enforce-link-component`: detect optional chaining; if the children are exactly `{link.value.text}` (or
     empty) emit self-closing `<Link field={...} />`, otherwise keep the children inside `<Link>...</Link>`.
   - `enforce-file-component`: same as link; children other than `{file.value.title}` are kept.
   - `enforce-all-components`: keep for backward compatibility, mark `deprecated` with `replacedBy` pointing at
     the individual rules; `configs.all` / `flat/strict` enable the individual rules instead.
6. **Import auto-fixer** (`lib/utils/imports.ts`). When a fix introduces `Text`/`RichText`/`Image`/`Link`/`File`:
   - already imported from a Sitecore package: no change;
   - a Sitecore import exists but lacks the specifier: insert it into that import;
   - no Sitecore import: add `import { X } from "<pkg>"` where `<pkg>` comes from the field type's declaring
     package (Content SDK vs JSS, nextjs flavour), with a rule option `importSource` to override;
   - the name is already bound to something else (e.g. `Image` from `next/image`, `Link` from `next/link`):
     **report without fix** (default). An `importAlias` option (`{ Image: "JssImage" }`) can be added later if
     users ask; skipping is the predictable choice for a linter that runs with `--fix` in CI.
7. **Configs.** `plugin.meta = { name, version }`; `configs["flat/recommended"]` (all rules `warn`),
   `configs["flat/strict"]` (all rules `error`), legacy `recommended` and `all` kept with the same contents.
   README leads with flat config, legacy block kept below it.
8. **Tests.** vitest 5 + `@typescript-eslint/rule-tester` 8. Fixtures in `tests/fixtures/` with a `tsconfig.json`
   and `declare module` stubs for both `@sitecore-jss/sitecore-jss-nextjs` and `@sitecore-content-sdk/nextjs`
   (same type names, different declaring paths, so `getFieldPackage` is testable). Every case from the review
   sample becomes a test. One integration test runs the real ESLint CLI with a flat config against a fixture
   project to prove plugin loading, not just rule logic.
9. **CI.** `ci.yml` on push/PR: Node 20 and 22 × ESLint 9 and 10 for the integration test; rule-tester suite
   on the default install; `npm ci`, lint, typecheck, build, test. `publish.yml`: run the same checks, then
   `npm publish --provenance --access public` on release. `package-lock.json` is committed.
10. **Build/package.** Keep `tsc` CJS output (ESLint loads CJS plugins fine on 8/9/10). Add
    `exports: { ".": { types, default } }`, `sideEffects: false`, `files: ["dist", "docs/rules", "README.md",
    "CHANGELOG.md", "LICENSE"]`.

## Phases

| # | Phase | Done when |
|---|---|---|
| 0 | Repo hygiene on branch `v2` | `-p` dir gone; generated release/blog markdown moved to `docs/archive/`; `LICENSE` (MIT) added; `package-lock.json` tracked; `.gitignore` updated |
| 1 | Toolchain | deps upgraded (typescript-eslint 8, eslint 10 dev, TS 5.x, vitest); `package.json` peers/engines/exports per matrix; `tsconfig` updated; `index.ts` exports flat + legacy configs with `meta`; `npm run build` and `npm run lint` pass; plugin loads under ESLint 9 and 10 in a scratch project |
| 2 | Test harness | vitest + rule-tester wired; fixtures + stubs for both Sitecore packages; existing behaviour captured as passing tests; every known bug captured as a failing test |
| 3 | Helpers + rule fixes | `lib/utils/{fields,jsx}.ts`; five rules rewritten on `RuleCreator`; all phase-2 tests green; `console.warn` gone; `enforce-all-components` deprecated |
| 4 | Import auto-fixer | `lib/utils/imports.ts`; fixes compile after `--fix`; conflict cases report without fix; `importSource` option documented |
| 5 | Integration + CI | ESLint CLI integration test (flat config) green on Node 20/22 × ESLint 9/10; `ci.yml` added; `publish.yml` runs checks and publishes with provenance |
| 6 | Docs + release | README rewritten (flat first); `docs/rules/<rule>.md` per rule; CHANGELOG `2.0.0` with migration notes; version bumped; tag + GitHub release triggers publish |

Rough size: phases 0–2 one session, phases 3–4 one to two sessions, phases 5–6 one session.

## Breaking changes to document in CHANGELOG 2.0.0

- Node < 18.18, ESLint < 8.57, typescript-eslint parser < 7 no longer supported.
- Rules throw a clear error when type information is unavailable (previously they silently did nothing).
- `enforce-all-components` is deprecated; `configs.all` now enables the individual rules.
- Auto-fix no longer rewrites elements with mixed children or non-HTML wrappers (reported only).
- Auto-fix now inserts the missing Sitecore import.

## Explicitly out of scope (later tracks)

- New rules: `enforce-date-field`, `prefer-next-image`, attribute reads like `alt={image.value.alt}` (Track B).
- Claude Code skill / slash commands, `AGENTS.md` generator, MCP (Track C).
- ESM build output (not needed by ESLint; revisit if a consumer asks).

## Progress log

- 2026-10-15 — Phase 0 done (`de61417`): archive, LICENSE, lockfile tracked.
- 2026-10-15 — Phase 1 done: deps upgraded (eslint 10.12, typescript-eslint 8.71, TS 5.9, vitest 5), `package.json` matrix, `lib/index.ts` flat + legacy configs with `meta`, `eslint.config.mjs` for the repo. Verified by packing the tarball and installing it into throwaway projects on ESLint 8.57.1 (legacy `extends`), 9.39.5 and 10.12.0 (flat config): each reports the same 10 warnings on the 16-case sample; `strict` variants report 10 errors.
- 2026-10-15 — Phase 2 done: vitest 5 + rule-tester 8 (`tests/setup.ts` wires the statics, `tests/helpers/fixtures.ts` builds a typed `props` preamble for either package). Fixture packages live in `tests/fixtures/node_modules/` (un-ignored in `.gitignore`); the JSX fixture is `react.tsx` because TypeScript drops a `.tsx` that shares a basename with `file.ts`. 57 current-behaviour cases pass; 24 known-bug cases in `tests/known-bugs/` run under `it.fails` and were verified to fail for the intended reason (detection gap, lossy fix, or wrong output). New finding: under `strict`, `ImageField.value` is optional, so `.value.src` reads from a union type and the image rule misses it entirely; Phase 3 must look through `undefined` in unions.
- 2026-10-15 — Phase 3 done: `lib/utils/{create-rule,fields,jsx,field-children,anchor,type-checking,logging}.ts`; five rules rewritten on `RuleCreator` with the fix-only-when-safe policy; `dangerouslySetInnerHTML` detection landed (was a stretch item); `enforce-all-components` deprecated. 91 cases pass; the 4 remaining expected failures are the Phase 4 import-fixer cases. Re-verified the packed tarball on ESLint 8.57.1 / 9 / 10 against the 16-case sample.
- 2026-10-16 — Caveat for the Phase 6 README: with `parserOptions.project` (classic mode), ESLint's multi-pass `--fix` re-lints the fixed text against stale type information, so the run reports zero remaining findings even when unfixable ones exist (a second plain `eslint` run shows them). With `parserOptions.projectService: true` the remaining findings are reported correctly. Same behaviour in v1; recommend `projectService` in the docs.
- 2026-10-20 — Phase 4 done: `lib/utils/imports.ts` (binding check via scope analysis, import planning, per-file tracker). Design change from decision 6: the import lives in its own `missingImport` report rather than inside the element fix, so element fixes never overlap and a file converges in one or two `--fix` passes; the tracker also catches an unbound `<Component>` syntactically, which is what completes imports on later passes even under classic `parserOptions.project`. Conflicts (`next/link`, `next/image`, locals, type-only imports) report without a fix. `importSource` option added. Verified with a real `eslint --fix` on ESLint 10 in both parser modes: all five imports added, only the two unfixable findings remain. No expected-failure tests remain; `tests/known-bugs/` removed.
- 2026-10-20 — Phase 5 done: `tests/integration/cli.test.ts` + fixture project under `tests/fixtures/integration/` (flat configs for 9/10 via the CLI, `.eslintrc.cjs` via the ESLint 8 class API because the repo has no `node_modules/eslint-plugin-sitecore-jss` to resolve; the legacy config must be `.cjs` so `tsconfigRootDir` is absolute). `ci.yml`: checks on ubuntu + windows, compat matrix Node 20/22 × ESLint 8.57/9/10 (installs `eslint@X --no-save --legacy-peer-deps`; `vite` added as a dev dependency so that install does not prune it). `publish.yml`: release published → tag/version guard → `npm publish --provenance`. Verified locally under ESLint 10, 9 and 8.57 (temporary installs, then `npm ci`).
- 2026-10-28 — Phase 6 done: README rewritten (flat config first, `projectService` recommended, options, fix policy, migration), `docs/rules/<rule>.md` for all six rules (the `meta.docs.url` targets), CHANGELOG consolidated into `2.0.0` with migration notes, version bumped to 2.0.0 (`npm version --no-git-tag-version`). Track A is complete on branch `v2`; nothing pushed or published. Release steps left to Sohrab: push `v2`, open the PR to `main`, merge, create the GitHub release `v2.0.0` (triggers `publish.yml`, which needs the `NPM_TOKEN` secret).

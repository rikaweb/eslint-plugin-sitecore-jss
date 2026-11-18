# Real-project test report: eslint-plugin-sitecore-jss 2.0.0

Date: 2026-11-13. Plugin: branch `v2` at `e1c0446` (PR 3 plus the two fixes below, not pushed, not
published). Tested against the Content SDK starter kit in `C:\projects\contentSDK`, on an App Router app
and a Pages Router app, with the packed tarball (not the npm version).

## Verdict

**Go for publishing 2.0.0, once the two new commits on `v2` are reviewed and pushed.**

- False positives in the real starter components: **0** (93 files in the two main apps, plus the
  Content SDK 2.x app).
- All deliberately bad patterns are found (26 findings per app), 22 are fixed, the 4 unsafe ones are
  reported without a fix, and the fixed code passes `tsc` and `next build` in both apps.
- Two real bugs were found and fixed on `v2` (see [Bugs found and fixed](#bugs-found-and-fixed)). Do not
  publish the PR 3 head `103be4e` without them.
- `scripts/final-test.ps1` passes: plugin 5/5, App Router 18/18, Pages Router 18/18.

## Environment

| | App Router | Pages Router | Bonus: cache-components |
|---|---|---|---|
| Folder | `nextjs-app-router` | `nextjs-page-router` | `nextjs-cache-components` |
| `@sitecore-content-sdk/nextjs` | 1.4.1 | 1.4.1 | 2.3.0 |
| Next.js | 15.5.9 | 15.5.12 | 16.3.1 |
| React | 19 | 19 | 19.2.8 |
| ESLint | 9.39.1 | 9.39.3 | 9.39.5 |
| `@typescript-eslint/parser` | 8.48.1 | 8.39.0 | 8.67.0 |
| TypeScript | 5.8.3 | 5.8.3 | 5.8.3 |
| ESLint config | flat, `FlatCompat` + `next/core-web-vitals`, `next/typescript` | flat, hand-written `defineConfig` | flat, `eslint-config-next` 16 |
| Parser setting used | `projectService: true` | `projectService: true` | `projectService: true` |

Node 24.14.1, npm 11.11.0, Windows 11. The starter kit already has a Pages Router app, so none had to be
created. All three apps use ESLint 9, so the **legacy `.eslintrc` configs were not exercised here**; they
are covered only by the plugin's own ESLint 8.57 integration test in CI.

### Where the test lives

`C:\projects\contentSDK` had uncommitted work on `main` (4 app files and several documents), so it was
not touched. The test runs in a git worktree:

- Folder `C:\projects\contentSDK-eslint-plugin-test`, local branch `test/eslint-plugin-sitecore-jss-v2`
  (one commit, `06293e6`, on top of `f4f712e`). Nothing was pushed, deployed or changed in Sitecore.
- The worktree is the committed state of `main`. Your uncommitted edits (for example the one-line change
  in `nextjs-app-router/src/components/MultiPromo.tsx`) are not part of the baseline.
- `.env` files were not copied. Two generated, secret-free files (`.sitecore/sites.json`,
  `.sitecore/metadata.json`) were copied from the main checkout so `tsc` can resolve them; they are
  git-ignored. For `next build` the environment was loaded from the original `.env` with
  `node --env-file`, without copying or printing it.

### What was upgraded

Nothing. ESLint, typescript-eslint and TypeScript in both apps already satisfy the plugin's peer range.

Changes made in the worktree (commit `06293e6`):

| App | Change |
|---|---|
| both | `eslint-plugin-sitecore-jss` added as a dev dependency from the tarball (`file:` path) |
| App Router | `@typescript-eslint/parser` `^8.48.1` added to `devDependencies`. The same version was already installed through `eslint-config-next`, so nothing changed in `node_modules`; it is listed because `eslint.config.mjs` now imports it. |
| both | `eslint.config.mjs`: the README flat config block (parser + `projectService`) and `flat/recommended`; `SITECORE_JSS_CONFIG=strict` switches to `flat/strict` for the test script |
| both | `src/components/eslint-plugin-test/` with the bad components |

## Baseline: the starter's own components

Command: `eslint "src/**/*.ts" "src/**/*.tsx"` with `flat/recommended`, bad components excluded.

| App | Files linted | Plugin findings | True positives | False positives | stderr |
|---|---|---|---|---|---|
| App Router | 48 | 0 | 0 | **0** | empty |
| Pages Router | 45 | 0 | 0 | **0** | empty |
| cache-components (Content SDK 2.3) | all `src` | 0 | 0 | **0** | empty |

There is no findings table because there are no findings: the starters already render every field through
`<Text>`, `<RichText>`, `<Image>` and `<Link>`. The only messages in the baseline come from the apps' own
rules (`@typescript-eslint/no-unused-vars`: 6 in App Router, 1 in Pages Router).

Patterns in the starters that look close to a violation and are correctly **not** reported:

| File and line | Code | Why it is correct to stay silent |
|---|---|---|
| `nextjs-app-router/src/components/HeroST.tsx:61`, `:72` (and `nextjs-page-router/.../HeroST.tsx:81`, `:88`) | `<Button>{fields.Link1?.value?.text \|\| "Learn more"}</Button>` inside `<SitecoreLink field={...}>` | link text with a fallback, already inside the Sitecore `Link` |
| `nextjs-page-router/src/Layout.tsx:31` | `<title>{fields?.Title?.value?.toString() \|\| 'Page'}</title>` | a derived value; `<Text>` must not be used in `<title>` |
| `nextjs-page-router/src/components/Video.tsx:259` | `<img src={v.imageSrc} />` | a plain string from a GraphQL result, not an `ImageField` |
| `nextjs-page-router/src/components/HeaderST.tsx:85-87` | `<a href="http://localhost:3001/...">` | literal `href` |
| every component | `{fields.Title?.value && <Text field={fields.Title} />}` | `.value` used as a condition, not rendered |

One false negative, a known limit of the rules and not a regression:

| File and line | Code | Note |
|---|---|---|
| `nextjs-page-router/src/components/Video.tsx:111`, `:130` | `const videoUrl = fields?.video?.value?.href ?? null;` then `<a href={videoUrl ?? "#"}>` | a `LinkField` href that reaches `<a>` through a local variable is not traced |

## Bad test components

Five files per app in `src/components/eslint-plugin-test/`, using the real field types from
`@sitecore-content-sdk/nextjs` 1.4.1:

| File | Covers |
|---|---|
| `BadFields.tsx` | `Field<string>` and `TextField` in plain tags, optional chaining, non-null assertion, `RichTextField` in `<div>` and in `<p>`, `dangerouslySetInnerHTML`, `<RichText tag="p">`, raw `<img>` and `<a>` for image, link and file fields, mixed children, a custom wrapper |
| `BadNextConflicts.tsx` | `Link` from `next/link` and `Image` from `next/image` next to a raw `<img>` / `<a>` of Sitecore fields |
| `BadNoSitecoreImport.tsx` | no import from a Sitecore package (types come from `./support`) |
| `BadNoImports.tsx` | `"use client"` and no import statements at all |
| `support.tsx` | field types and the `Typography` wrapper |

Results are identical in both apps (and in the cache-components app):

| Rule | Findings | With fix |
|---|---|---|
| `enforce-text-component` | 11 (7 elements, 1 wrapper, 3 `missingImport`) | 9 |
| `enforce-richtext-component` | 4 | 4 |
| `enforce-image-component` | 5 (3 elements, 2 `missingImport`) | 4 |
| `enforce-link-component` | 4 (3 elements, 1 `missingImport`) | 3 |
| `enforce-file-component` | 2 (1 element, 1 `missingImport`) | 2 |
| **Total** | **26** | **22** |

| Check | App Router | Pages Router |
|---|---|---|
| Expected findings appear | yes, 26 | yes, 26 |
| stderr | empty | empty |
| `eslint --fix` rewrites and adds imports | yes | yes |
| Second plain lint | only the 4 unfixable findings | only the 4 unfixable findings |
| `tsc --noEmit` on the fixed files | no errors | no errors |
| `next build` with the fixed files in the component map | passes | passes, after working around an app error (below) |
| `importSource` option | fix writes `import { Text, Image } from "@sitecore-content-sdk/react"` | same |
| `flat/strict` | 26 errors, exit code 1 | 26 errors, exit code 1 |

The 4 findings that stay after the fix, by design:

- `BadFields.tsx:48` `<h3>Hello {fields.Title.value}</h3>` (mixed children)
- `BadFields.tsx:49` `<Typography>{fields.Title.value}</Typography>` (custom wrapper)
- `BadNextConflicts.tsx:15` raw `<img>` while `Image` is `next/image`
- `BadNextConflicts.tsx:16` raw `<a>` while `Link` is `next/link`

`BadFields.tsx` after `eslint --fix`:

```tsx
import {
  Field,
  TextField,
  RichTextField,
  ImageField,
  LinkField,
  FileField,
  RichText, Text, Image, Link, File,
} from "@sitecore-content-sdk/nextjs";
...
    <Text field={fields.Title} tag="h1" className="title" />
    <Text field={fields.Eyebrow} tag="span" />
    <Text field={fields.Subtitle} tag="h2" />
    <Text field={fields.Subtitle} tag="h4" id="sub" />

    <RichText field={fields.Body} tag="div" className="rte" />
    <RichText field={fields.Body} />
    <RichText field={fields.Body} tag="div" className="html" />
    <RichText field={fields.Body} />

    <Image field={fields.Image} alt="Hero" className="hero" />
    <Link field={fields.Link} />
    <Link field={fields.Link} className="cta">
      Read more
    </Link>
    <File field={fields.File} />

    <h3>Hello {fields.Title.value}</h3>
    <Typography>{fields.Title.value}</Typography>
```

### tsc and build details

- `tsc --noEmit`: no error in any fixed file. The Pages Router app has one error of its own at the
  committed `HEAD`, unrelated to the plugin: `src/components/HeaderST.tsx(35,19): error TS6133: 'props' is
  declared but its value is never read.`
- `next build` was run with only the fixed copy registered in the component map
  (`sitecore-tools project component generate-map`), so the rewritten components were really compiled.
  - Without the `.env`, the App Router build compiles, lints and type-checks, then stops at "Collecting
    page data" with `Configuration error: provide either Edge contextId ...`. That is Sitecore
    connectivity only.
  - With the environment loaded from the original `.env`, the App Router build passes.
  - The Pages Router build fails at `HEAD` on the `HeaderST.tsx` error above, before it reaches the test
    components. With `props` temporarily renamed to `_props` (reverted afterwards) and the environment
    loaded, it passes.
  - In both builds the plugin's 4 remaining warnings show up in Next's own lint step, so the plugin also
    works inside `next build`.
- Temporary build changes (`.next`, the generated component map, the `HeaderST` rename) were all reverted.

## Bugs found and fixed

Both are committed on `v2`, with tests; `npm test` (126 passed, 2 skipped for ESLint 8), `npm run lint`
and `npm run typecheck` pass. Not pushed.

### 1. `3d96472` The added import was placed above `"use client"`

In a file with no import statements, the import fixer inserted `import { Text } from "..."` before the
first statement. When that statement is a directive, the directive stops being one:

```tsx
import { Text } from "@sitecore-content-sdk/nextjs";
"use client";   // now a plain string expression: the component silently becomes a server component
```

Found with `BadNoImports.tsx` in the App Router app. The import now goes after the last directive.
Files: `lib/utils/imports.ts`, two new cases in `tests/rules/enforce-text-component.test.ts`.

### 2. `e1c0446` The flat configs crashed ESLint on plain JS files

`flat/recommended`, `flat/strict` and `flat/all` had no `files`, so the type-aware rules were also enabled
for `eslint.config.mjs`, `next.config.js`, `postcss.config.mjs` and so on. With the README config, linting
any of them stopped ESLint in both starters:

```
Error: Error while loading rule 'sitecore-jss/enforce-text-component': You have used a rule which
requires type information, but don't have parserOptions set to generate type information for this file.
Occurred while linting ...\nextjs-app-router\eslint.config.mjs
```

The starters' own `npm run lint` only passes `src/**/*.ts(x)`, so it did not hit this, but `eslint .`,
lint-staged or an editor would. The flat configs are now scoped to `**/*.ts`, `**/*.tsx`, `**/*.mts` and
`**/*.cts`. Files: `lib/index.ts`, `tests/plugin.test.ts`, `tests/integration/cli.test.ts`, `README.md`,
`CHANGELOG.md`. The legacy configs are unchanged.

This one changes the public shape of the flat configs, so please review it as a decision, not only as a
fix. The alternative is to leave the configs as they were and document that users must scope them.

## Open issues (none blocks 2.0.0)

1. **Import formatting.** When a multi-line import is extended, the new names are appended to the last
   line (`RichText, Text, Image, Link, File,`). Valid code; Prettier reformats it.
2. **Legacy configs on JS files.** `plugin:sitecore-jss/recommended` in an `.eslintrc` has the same
   "requires type information" failure for JS files as bug 2. It is the usual typescript-eslint setup
   (`overrides` for `*.ts, *.tsx`), but the README's legacy example does not show it.
3. **Field values through a local variable** are not traced (`Video.tsx:111`). Candidate for a later rule.
4. **Duplicate report on `<img>`.** Next's `@next/next/no-img-element` also fires on the same element in
   the App Router app. Harmless; after the fix both disappear.
5. **`@typescript-eslint/parser` in apps that use `eslint-config-next`.** Such apps (the App Router
   starter) do not list the parser themselves. The README's install line covers it; the flat config example
   could say that the import needs the package as a direct dev dependency.
6. **The known `parserOptions.project` caveat** (a `--fix` run can report 0 remaining problems) was not
   re-tested, because all apps use `projectService`.

## Final-test script

```powershell
powershell -ExecutionPolicy Bypass -File scripts\final-test.ps1
```

Run it from the plugin repo. It rebuilds the plugin, runs `npm test` / `lint` / `typecheck`, packs the
tarball into `%TEMP%\eslint-plugin-sitecore-jss-final-test`, installs it into both apps and checks that
the installed copy equals the build. Per app it then runs the baseline lint, a plain JS file, the bad
components with `flat/recommended` and `flat/strict`, the `importSource` option, `eslint --fix` on a
scratch copy (`src/components/eslint-plugin-fixed`, removed afterwards), a second lint and `tsc`. It exits
with 1 when any check fails.

Options: `-SkipPluginChecks` (build and pack only), `-Build` (also `next build`; needs each app's `.env`
in the worktree, which is not there by default), `-StarterRoot`, `-Apps`. There is no bash twin; the
script is not trivial to port and this is a Windows machine.

Each run rewrites the tarball entry in the apps' `package.json` / `package-lock.json` in the worktree.

Output of the run on 2026-11-13 (exit code 0):

```
eslint-plugin-sitecore-jss final test  (2026-11-13 16:36)
plugin repo : C:\projects\eslint-plugin-sitecore-jss
starter root: C:\projects\contentSDK-eslint-plugin-test
work files  : %USERPROFILE%\AppData\Local\Temp\eslint-plugin-sitecore-jss-final-test

== Plugin: build, checks, pack ==
  [PASS] npm run build
  [PASS] npm test
  [PASS] npm run lint
  [PASS] npm run typecheck
  [PASS] npm pack - eslint-plugin-sitecore-jss-2.0.0.tgz

== nextjs-app-router ==
  [PASS] app is prepared (node_modules, bad components) - C:\projects\contentSDK-eslint-plugin-test\nextjs-app-router
  [PASS] install tarball (installed copy equals this build)
  [PASS] baseline lint runs clean (no stderr, no fatal)
  [PASS] baseline: no plugin findings in the starter components - 0 finding(s) in 48 files
  [PASS] plain JS file (eslint.config.mjs) lints without a type-information error
  [PASS] bad components lint runs clean (no stderr, no fatal)
  [PASS] bad components: 26 findings, expected count per rule - text=11 richtext=4 image=5 link=4 file=2
  [PASS] bad components: 22 findings carry a fix - 22 fixable
  [PASS] flat/recommended reports warnings
  [PASS] flat/strict reports the same findings as errors (exit code 1) - 26 errors, exit 1
  [PASS] importSource option: the fix imports from @sitecore-content-sdk/react
  [PASS] eslint --fix runs clean (no stderr, no fatal)
  [PASS] fix adds Text, Image, Link and File to the existing Sitecore import
  [PASS] fix rewrites text, rich text, image, link and file elements
  [PASS] fix keeps "use client" first in a file without imports
  [PASS] next/link + next/image file is reported but left untouched
  [PASS] second lint shows only the 4 unfixable findings - useImageComponent, useLinkComponent, useTextComponent, useTextComponentInWrapper
  [PASS] tsc --noEmit accepts the fixed components - no type errors in the fixed components

== nextjs-page-router ==
  [PASS] app is prepared (node_modules, bad components) - C:\projects\contentSDK-eslint-plugin-test\nextjs-page-router
  [PASS] install tarball (installed copy equals this build)
  [PASS] baseline lint runs clean (no stderr, no fatal)
  [PASS] baseline: no plugin findings in the starter components - 0 finding(s) in 45 files
  [PASS] plain JS file (eslint.config.mjs) lints without a type-information error
  [PASS] bad components lint runs clean (no stderr, no fatal)
  [PASS] bad components: 26 findings, expected count per rule - text=11 richtext=4 image=5 link=4 file=2
  [PASS] bad components: 22 findings carry a fix - 22 fixable
  [PASS] flat/recommended reports warnings
  [PASS] flat/strict reports the same findings as errors (exit code 1) - 26 errors, exit 1
  [PASS] importSource option: the fix imports from @sitecore-content-sdk/react
  [PASS] eslint --fix runs clean (no stderr, no fatal)
  [PASS] fix adds Text, Image, Link and File to the existing Sitecore import
  [PASS] fix rewrites text, rich text, image, link and file elements
  [PASS] fix keeps "use client" first in a file without imports
  [PASS] next/link + next/image file is reported but left untouched
  [PASS] second lint shows only the 4 unfixable findings - useImageComponent, useLinkComponent, useTextComponent, useTextComponentInWrapper
  [PASS] tsc --noEmit accepts the fixed components - no type errors in the fixed components; 1 error(s) elsewhere in the app, not caused by the plugin
      (app) src/components/HeaderST.tsx(35,19): error TS6133: 'props' is declared but its value is never read.

== Summary ==
  plugin               PASS  (5/5 checks)
  nextjs-app-router    PASS  (18/18 checks)
  nextjs-page-router   PASS  (18/18 checks)
  OVERALL              PASS
```

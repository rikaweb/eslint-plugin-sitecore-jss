# Code review: `v2` against `main` (2.0.0 release gate)

Reviewed 2026-11-13 at `e1c0446` (`git diff main...v2`, 10 commits). Review only; nothing in the repo was changed
apart from this file.

## Verdict: fix first

One blocker: an auto-fix that turns a link or file anchor into `<Text tag="a">` and makes the link finding
disappear. It is a small change in one rule. Eight should-fix items follow; the first two (S1, S2) are the ones
most likely to hit a real project in the first week.

| Severity | Count |
|---|---|
| Blocker | 1 |
| Should-fix | 8 |
| Nice-to-have | 9 |

## Status after the review (2026-11-13)

B1 and S1 to S8 are fixed in the working tree on `v2` (not committed), each with tests: 148 passed, 2
skipped; lint and typecheck clean. The findings below describe the code as reviewed at `e1c0446`.

- B1: an `<a href>` with a text or rich text field child is reported with the wrapper message and never
  fixed by the text rules; the link / file rule rewrites the anchor.
- S1: the flat configs are scoped to `**/*.tsx` only.
- S2: `title`, `option`, `textarea`, `script` and `style` are not reported.
- S3: a non-empty `||` / `??` fallback is reported without a fix.
- S4: `importSource` is accepted as a Sitecore component package for bindings and for extending imports.
- S5: a DOM global of the same name that the file references (value or type) is a conflict.
- S6: only source whitespace is ignored next to the field; entities block the fix.
- S7: the publish workflow refuses to run unless it is on a tag that matches `package.json`.
- S8: the README and CHANGELOG legacy examples use `overrides` for `*.tsx`.

The nice-to-have items (N1 to N9) are unchanged.

## Status after 2.0.1 (2026-11-18)

- N1: fixed. A field type must be declared by `@sitecore-jss/*` or `@sitecore-content-sdk/*`.
- N2: fixed. No fix when it would delete a comment.
- N3: documented, not changed. Skipping the fix would take it away from every optional link / file
  field, which is the common way to type them; the result is a visible type error, not lost code.
- N4: fixed. An `<a>` without children is reported without a fix.
- N5: fixed. An aliased Sitecore import is used under its alias.
- N6: fixed. No source maps or declaration maps are emitted.
- N7: the rule-level gaps were closed with the fixes; added a `.js` file under the legacy config and a CI
  job for ESLint 8.57 / parser 7.18 / TypeScript 5.4. TypeScript 4.8.4 is not covered: `lib/` itself
  needs 4.9+ to build.
- N8: fixed. The publish workflow pins its actions to commit SHAs.
- N9: the cast on the field is documented under "not reported"; the 2.0.0 date was already corrected.

## What was checked

- `npm test`: 126 passed, 2 skipped (the legacy suite, skipped on ESLint 10). `npm run lint` and
  `npm run typecheck` are clean. `npm pack --dry-run`: 70 files, 34.9 kB.
- About 40 inputs run through the built `dist/` with the real ESLint 10 class API and the test fixture types,
  once without and once with `fix: true`. Every "confirmed" below comes from those runs.
- The packed tarball installed into a clean project with ESLint 8.57.1, `@typescript-eslint/parser` 7.18.0 and
  TypeScript 5.4.5: the rules load, report and resolve `@typescript-eslint/utils` 8.72.2 as a nested dependency.
  `require()` and ESM default import both work; `meta`, the six configs and six rules are present.
- The README flat config run against a scratch project with ESLint 10.
- Fixture types compared with the real `@sitecore-content-sdk/react` 1.4.1 typings: the field types are
  interfaces with the same names in both, so the fixtures do not diverge in a way that matters to the rules.

Things that held up and need no change: optional chaining, non-null and parenthesised field paths; unions
(`Field<string> | TextField` matches, `Field<string> | Field<number>` does not); `key`, `ref` and spreads are
kept; nested fixes (`<a href={link…}><span>{title.value}</span></a>`) converge to
`<Link …><Text … tag="span" /></Link>`; two rules extending the same import in one run converge; multi-line
imports with a trailing comma stay valid; `"use client"` stays first; member and namespace tags
(`<motion.h1>`, `<svg:text>`) are reported without a fix; `&&`, `||` and ternary children are not touched.

---

## Blocker

### B1. The text fix rewrites a link or file anchor into `<Text tag="a">` and the link finding vanishes

- Where: `lib/rules/enforce-text-component.ts:63-76` (also reachable through `enforce-all-components`).
- Defect: when an `<a>` whose `href` reads a link or file field has a text field as its only child, the text
  rule and the link rule both offer a fix for the same element, the text fix wins, and the result no longer
  matches the link rule.
- Input (recommended config):

  ```tsx
  <a href={props.fields.link.value.href} className="cta">{props.fields.title.value}</a>
  ```

- Actual after `--fix`, with zero remaining problems:

  ```tsx
  <Text field={props.fields.title} tag="a" href={props.fields.link.value.href} className="cta" />
  ```

- Expected: the link is handled by `<Link>`, for example
  `<Link field={props.fields.link} className="cta"><Text field={props.fields.title} /></Link>`, or at least the
  anchor becomes `<Link>` and the text finding stays reported.
- Confirmed: yes, for `LinkField` and `FileField`, with the components imported or not, and under
  `enforce-all-components`. No test covers this shape.
- Why it blocks: a CTA with a link field and a separate label field is one of the most common Sitecore
  component shapes. The fix leaves the hand-written `href` in place, so the link is not editable and loses its
  target, query string and anchor, and the lint run is green afterwards.
- Suggested fix: in the text (and rich text) rule, do not offer a fix when the element is an `<a>` with an
  `href` expression (simplest: when it has any `href`). The link fix then runs first and the text finding is
  reported as `useTextComponentInWrapper` on `<Link>`. A nicer follow-up is to let the wrapper case fix itself
  when the wrapper is a Sitecore `Link` or `File`, by replacing only the `{…value}` child with `<Text field={…} />`.

---

## Should-fix

### S1. The README flat config crashes ESLint as soon as the project has a `.mts` or `.cts` file

- Where: `lib/index.ts:64` together with `README.md:56` and the same snippet in `CHANGELOG.md`.
- Defect: the flat configs enable the rules for `**/*.mts` and `**/*.cts`, but the documented parser block only
  covers `**/*.{ts,tsx}`, so those files are parsed without type information and the first rule throws.
- Input: the README config, plus a `plain.config.mts` (or `vitest.config.mts`, `next.config.mts`) in the project.
- Actual: `eslint .` stops with "Error while loading rule 'sitecore-jss/enforce-text-component': You have used
  a rule which requires type information…". Without the plugin entry the same run exits 0, because ESLint does
  not lint `.mts` files unless a config names them.
- Expected: `eslint .` keeps working, which is exactly what `e1c0446` set out to guarantee.
- Confirmed: yes, ESLint 10.12.0.
- Suggested fix: scope the flat configs to `**/*.tsx` (optionally `**/*.ts`). The rules only act on JSX, and
  JSX cannot appear in `.ts`, `.mts` or `.cts` files, so nothing is lost. Otherwise change the README and
  CHANGELOG snippets to `**/*.{ts,tsx,mts,cts}` and say that those files must be in the tsconfig. Add a `.mts`
  file to the integration fixture either way. The unit test in `tests/plugin.test.ts` pins the four globs and
  needs updating.

### S2. `<title>`, `<option>` and `<textarea>` are rewritten to `<Text tag="…">`

- Where: `lib/rules/enforce-text-component.ts:51-78`.
- Defect: elements that may only contain text are reported and auto-fixed like any other element.
- Input: `<Head><title>{props.fields.title.value}</title></Head>` and
  `<option value="a">{props.fields.title.value}</option>`.
- Actual: `<Head><Text field={props.fields.title} tag="title" /></Head>` and
  `<Text field={props.fields.title} tag="option" value="a" />`.
- Expected: no report, or a report without a fix. Reading `.value` is the right thing in these elements.
- Confirmed: the fix output, yes. The runtime effect is not run here and is from knowledge of the frameworks:
  `next/head` only picks up `title` and `meta` elements that are its direct children, so the page title is
  dropped in the Pages Router, and in editing mode `<Text>` emits editing markup that is not valid inside
  `<title>` or `<option>`.
- Suggested fix: skip `title`, `option`, `textarea`, `script` and `style` in the text and rich text rules.

### S3. The `dangerouslySetInnerHTML` fix throws away a non-empty fallback

- Where: `lib/rules/enforce-richtext-component.ts:49-51`.
- Defect: the helper walks to the leftmost operand of any `||` / `??` chain without checking what is on the right.
- Input: `<div dangerouslySetInnerHTML={{ __html: props.fields.body.value || "<p>Default copy</p>" }} />`
  (same with `?? other.value ?? ""`).
- Actual: `<RichText field={props.fields.body} tag="div" />`; the default copy or second field is gone.
- Expected: the fix is only offered when the right-hand side is an empty string (what the docs describe:
  "also with `?? ""` / `|| ""`"); otherwise report without a fix.
- Confirmed: yes.
- Suggested fix: accept a `LogicalExpression` only when its right operand is `""`, an empty template literal,
  `null` or `undefined`; in the other cases still report, with `fix: null`.

### S4. A component imported from the `importSource` package counts as a name conflict

- Where: `lib/utils/imports.ts:65-87` (`getComponentBinding`) and `:113-122` (`planImport`).
- Defect: only the four hard-coded Sitecore packages are accepted as a valid binding, so the package the user
  configured through `importSource` is treated as "something else".
- Input: option `{ importSource: "@acme/sitecore-ui" }`, file:

  ```tsx
  import { Text } from "@acme/sitecore-ui";
  …
  <h2>{props.fields.title.value}</h2>
  ```

- Actual: `useTextComponent` with no fix. The first `--fix` in a file adds the import and fixes that pass; every
  later finding in the file can never be fixed.
- Expected: `<Text field={props.fields.title} tag="h2" />`.
- Confirmed: yes.
- Suggested fix: pass the options into `getComponentBinding` and `planImport` and treat `options.importSource`
  as a Sitecore component package in both (binding check and "extendable import").

### S5. The added import shadows a DOM global the file uses (`Image`, `File`, `Text`)

- Where: `lib/utils/imports.ts:70-71`.
- Defect: a name with no definition is always "missing", even when the file uses the global of that name as a value.
- Input:

  ```tsx
  const preload = new Image();
  const f = new File([], "x");
  … <img src={props.fields.image.value?.src} /> … <a href={props.fields.file.value.src}>dl</a>
  ```

- Actual: `import { …, Image, File } from "@sitecore-jss/sitecore-jss-nextjs"` is added, so `new Image()` and
  `new File()` now call the React components.
- Expected: reported without a fix, like any other name conflict.
- Confirmed: the fix output, yes. An upload component that also renders a file field is the realistic case.
- Suggested fix: when the name is unbound, look for references to it outside JSX element names (the global
  scope's `through` references, or the implicit global variable's `references`); if there are any, return
  `"conflict"`.

### S6. `&nbsp;` next to the field is dropped by the fix

- Where: `lib/utils/jsx.ts:89`.
- Defect: `child.value.trim()` works on the decoded text and `trim()` removes U+00A0, so an entity-only text
  node is treated as insignificant whitespace.
- Input: `<span>{props.fields.title.value}&nbsp;</span>` (also `&#160;`).
- Actual: `<Text field={props.fields.title} tag="span" />`.
- Expected: no fix, as for `<h3>Hello {title.value}</h3>`.
- Confirmed: yes.
- Suggested fix: test the raw text against ASCII whitespace only: `/^[ \t\r\n]*$/.test(child.raw)`.

### S7. `workflow_dispatch` publishes with no version or ref check

- Where: `.github/workflows/publish.yml:6` and `:23-28`.
- Defect: the tag guard only runs for `release` events, so a manual run publishes whatever ref is selected in
  the UI, as `latest`.
- Scenario: "Run workflow" on `main` or `v2` before the release commit, or on a feature branch, publishes that
  tree under its current `package.json` version.
- Confirmed: no, by reading the workflow only.
- Suggested fix: drop `workflow_dispatch`, or keep it with a guard (`github.ref_type == 'tag'` and the same
  tag-versus-version check using `github.ref_name`), or make the manual path `npm publish --dry-run`.
- The rest of the workflow is sound: `contents: read` plus `id-token: write`, the token is only in the publish
  step's environment, `--provenance --access public`, and `prepublishOnly` runs lint, typecheck, tests and build.

### S8. The README legacy example breaks `eslint .` on JavaScript files

- Where: `README.md:86-95` and the migration notes in `CHANGELOG.md`.
- Defect: the example sets the TypeScript parser, `project` and the plugin rules at the top level, so they
  apply to every linted file.
- Input: that `.eslintrc.cjs` plus a `next.config.js`, ESLint 8.57.1 and parser 7.18.0.
- Actual: `next.config.js  0:0  error  Parsing error: ESLint was configured to run on … using
  parserOptions.project … that TSConfig does not include this file`. In a project where JS files keep another
  parser, the rules throw the "requires type information" error instead.
- Expected: a copy-paste config that lints a typical Next.js project.
- Confirmed: yes (already noted as open in the real-project hand-over).
- Suggested fix: move parser, `parserOptions` and `extends` into `overrides: [{ files: ["*.ts", "*.tsx"], … }]`
  in both documents.

---

## Nice-to-have

### N1. Field types are matched by name only

- Where: `lib/utils/type-checking.ts:21-34`, `:54-75`.
- Input: a local `interface Field<T> { value: T; touched: boolean }` and `interface ImageField { value: { src: string } }`
  used in `<label>{form.name.value}</label>` and `<img src={form.pic.value.src} />`.
- Actual: both are reported and fixed, and `import { Text, Image } from "@sitecore-jss/sitecore-jss-nextjs"` is added.
- Confirmed: yes. The README says the rules "only fire on real Sitecore fields".
- Suggested fix: also require `getFieldPackage(type) !== undefined`, or soften the README sentence.

### N2. A JSX comment next to the field is deleted by the fix

- Where: `lib/utils/jsx.ts:87-95`, used for `soleChild`.
- Input: `<h1>{/* keep me */}{props.fields.title.value}</h1>` gives `<Text field={props.fields.title} tag="h1" />`.
- Confirmed: yes. Suggested fix: count comment containers when deciding whether a fix is safe.

### N3. An optional link or file field is passed to a required `field` prop

- Where: `lib/utils/anchor.ts:43-46`.
- Input: `link?: LinkField`, `<a href={props.fields.link?.value.href}>Go</a>` gives
  `<Link field={props.fields.link}>Go</Link>`.
- Confirmed: the output, yes. The type error is reasoned from the real typings
  (`field: (LinkField | LinkFieldValue) & FieldMetadata`, not optional); `tsc` was not run on it.
- Suggested fix: document it, or skip the fix when the field type includes `undefined`.

### N4. An empty anchor starts rendering the link text

- Where: `lib/utils/anchor.ts:43-44`.
- Input: `<a href={props.fields.link.value.href} aria-label="Home" className="logo" />` gives
  `<Link field={props.fields.link} aria-label="Home" className="logo" />`.
- Confirmed: the output, yes. `<Link>` without children renders `value.text`, the original rendered nothing
  (from knowledge of the component, not run).
- Suggested fix: mention it in `docs/rules/enforce-link-component.md`.

### N5. An aliased import gets a second specifier

- Input: `import { Text as JssText } from "…"` becomes `import { Text as JssText, Text } from "…"`.
- Confirmed: yes. Valid code, only untidy; the fix could use the existing alias.

### N6. Source maps are shipped without their sources

- Where: `tsconfig.json` (`sourceMap`, `declarationMap`) and `package.json` `files`.
- 36 of the 70 packed files are `.map` files that point at `../lib/*.ts`, which is not in the tarball.
- Confirmed: from the `npm pack --dry-run` file list. Suggested fix: turn the two map options off, or ship `lib/`.

### N7. Test gaps that let the findings above through

- No rule test for an `<a>` with a field `href` and a text field child (B1), for `importSource` with an existing
  import from that package (S4), for text-only elements (S2), for entity or comment siblings (S6, N2), or for a
  DOM global used as a value (S5).
- The integration fixture has no `.mts` / `.cts` file and no JavaScript file under the legacy config (S1, S8).
- The CI matrix covers ESLint 8.57, 9 and 10 but always with parser 8.71 and TypeScript 5.9, although the
  peer ranges promise parser 7 and TypeScript 4.8.4 to 6.0. Parser 7.18.0 with ESLint 8.57.1 and TypeScript
  5.4.5 worked in the manual run for this review; one matrix entry for the lower bounds would keep it that way.

### N8. Third-party actions in the publish workflow are pinned by tag

- Where: `.github/workflows/publish.yml:17-18`. `actions/checkout@v4` and `actions/setup-node@v4` run in the job
  that holds `id-token: write` and the npm token. Pinning to commit SHAs is the usual hardening. Not verified
  beyond reading.

### N9. Documentation details

- README "What the auto-fix does" says type assertions are looked through. That holds for `value as string`,
  but a cast on the field itself, `(item.fields.title as Field<string>).value`, is not detected (confirmed: no
  report), because the cast is stripped before the type is read. This is the usual shape for
  `Record<string, Field | Item[]>` children, so it is worth a line under "Not reported".
- `CHANGELOG.md` dates 2.0.0 as 2026-10-28; set the real release date.
- Messages, message ids, option name, config names and the two latest fixes (`"use client"` placement, flat
  `files` scoping) match the behaviour observed, apart from S1 and S8 above.

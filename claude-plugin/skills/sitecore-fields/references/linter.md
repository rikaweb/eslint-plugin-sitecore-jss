# Working with eslint-plugin-sitecore-jss

Written against eslint-plugin-sitecore-jss 2.0.1 (2.0.0 differs where noted). The installed package ships its own rule
documentation in `node_modules/eslint-plugin-sitecore-jss/docs/rules/<rule>.md` and its `README.md`;
when they disagree with this file, the installed copy is right for that project.

## Contents

- [Is it installed and configured?](#is-it-installed-and-configured)
- [Setup](#setup)
- [Running it](#running-it)
- [Rules and message ids](#rules-and-message-ids)
- [Findings without a fix, and what to do](#findings-without-a-fix-and-what-to-do)
- [What it never reports](#what-it-never-reports)
- [Known limits](#known-limits)

## Is it installed and configured?

`node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-project.mjs"` reports `linter.status`:

| Status | Meaning | Next step |
|---|---|---|
| `configured` | a declared dependency, installed, and the ESLint config mentions `sitecore-jss` | run it |
| `installed-not-configured` | declared and installed, config does not mention it | offer the config block below |
| `installed-not-declared` | in `node_modules` only (a leftover); a clean install removes it | offer the install command, and the config block if the config lacks it |
| `declared-not-installed` | in `package.json`, not in `node_modules` | ask the user to install dependencies |
| `not-installed` | absent | offer the install command and config block |

The same output gives `packageManager`, `eslint.parser.declared` and `typescript.declared` (what the
install command must include) and `eslint.config.mentionsTypeInfo` (whether the parser block may
already exist). The `mentions*` values are text matches on the config file: a config that gets its
parser options from a shared preset shows `false`, so read the file before deciding.

`configured` is a text match on the config file. The real proof is a run: if ESLint prints
`You have used a rule which requires type information`, the parser block is missing or does not
cover the file.

## Setup

Requirements: ESLint 8.57, 9 or 10; `@typescript-eslint/parser` 7 or 8; TypeScript 4.8.4 to 6.0;
Node 18.18 or newer. Installing changes `package.json` and the lockfile, and the config edit changes
how the whole project lints, so show the user both and get a yes before doing either.

```sh
npm install --save-dev eslint-plugin-sitecore-jss @typescript-eslint/parser typescript
```

Use the project's package manager (`pnpm add -D`, `yarn add -D`) when it is not npm, and leave out
packages that are already declared dev dependencies.

**Flat config** (`eslint.config.*`, ESLint 9 and 10). Add the two entries to the exported array,
after the project's existing entries:

```js
import tsParser from "@typescript-eslint/parser";
import sitecoreJss from "eslint-plugin-sitecore-jss";

export default [
  // ...existing config
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...sitecoreJss.configs["flat/recommended"],
];
```

- The array may be wrapped (`defineConfig([...])`, `tseslint.config(...)`) or built up in a
  variable; keep that structure and append the two entries. Order matters only in that they come
  after any entry that sets a different parser for the same files.
- `flat/recommended` reports warnings; `flat/strict` reports errors. Both apply to `**/*.tsx` only.
- `import.meta.dirname` needs Node 20.11. When the config already computes `__dirname` (the
  `FlatCompat` pattern from `create-next-app`), use that variable instead.
- A project that already sets `parserOptions.projectService` or `project` for its TypeScript files
  only needs the spread line.
- `@typescript-eslint/parser` must be a direct dev dependency because the config imports it; apps
  that only get it through `eslint-config-next` need it added.

**Legacy config** (`.eslintrc.cjs`, ESLint 8):

```js
module.exports = {
  // ...existing config
  overrides: [
    {
      files: ["*.tsx"],
      parser: "@typescript-eslint/parser",
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: __dirname },
      extends: ["plugin:sitecore-jss/recommended"],
    },
  ],
};
```

Keep it inside `overrides`: at the top level the type-aware rules would also run on `.js` files and
fail. `plugin:sitecore-jss/strict` reports errors. A JSON or YAML `.eslintrc` cannot express an
absolute `tsconfigRootDir`; say so and propose converting to `.eslintrc.cjs` rather than adding a
relative path that breaks when ESLint runs from another folder.

## Running it

```sh
npx eslint --format json src/components/Promo.tsx src/components/Hero.tsx
```

- Run from the project root (`root` in the detect output), on `.tsx` files. Quote globs.
- In the JSON, keep messages whose `ruleId` starts with `sitecore-jss/`. Each has `line`, `column`,
  `messageId`, `message`, and a `fix` object **only when an automatic fix exists**. That is how to
  tell fixable from report-only.
- A message with `fatal: true` or `ruleId: null` is a parse or configuration problem, not a finding.
- `npx eslint --fix <files>` applies the fixes and adds the imports. Lint once more afterwards
  without `--fix`: with the classic `parserOptions.project` setting, a `--fix` run can print zero
  remaining problems although report-only findings are still there.
- After fixing, run the project's type check: its `typecheck` script, or
  `npx tsc --noEmit --incremental false` (without the last flag, a tsconfig with `incremental`
  makes `tsc` write a `tsconfig.tsbuildinfo` file into the project). The fixer only rewrites when
  it is safe, but `<Link>` and `<File>` require a defined `field`, which a raw
  `<a href={f?.value?.href}>` did not.
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/lint-fields.mjs" <files or folders>` does the first three
  points in one step and prints a compact summary with the source line of each finding.

## Rules and message ids

| Rule | Message id | Meaning | Fix |
|---|---|---|---|
| `enforce-text-component` | `useTextComponent` | a `Field<string>` / `TextField` is rendered by hand in an HTML element | yes, unless mixed children or `Text` is taken |
| | `useTextComponentInWrapper` | same, inside a component (`<Typography>`) or an `<a href>` | no |
| `enforce-richtext-component` | `useRichTextComponent` | a `RichTextField` value is rendered as text | yes, same conditions |
| | `useRichTextComponentInWrapper` | same, inside a component or an `<a href>` | no |
| | `avoidDangerouslySetInnerHTML` | the field's HTML is injected by hand | yes, unless it has a non-empty fallback |
| | `avoidNestedPTags` | the field is rendered inside `<p>` | yes: `<RichText>` with the default `<div>` |
| | `avoidRichTextPTag` | `<RichText tag="p">` | yes: removes `tag` |
| `enforce-image-component` | `useImageComponent` | `<img src>` reads an `ImageField` | yes, unless `Image` is taken |
| `enforce-link-component` | `useLinkComponent` | `<a href>` reads a `LinkField` | yes, unless `Link` is taken |
| `enforce-file-component` | `useFileComponent` | `<a href>` reads a `FileField` | yes, unless `File` is taken |
| all five | `missingImport` | the component is used but not imported from a Sitecore package | yes: extends an existing Sitecore import or adds one |

`enforce-all-components` is the deprecated 1.x rule that bundles the five; its findings mean the
same. The option `importSource` (per rule) names the package to import from when the file has no
Sitecore import to extend.

What each one costs, in the author's or visitor's terms:

| Message id | Consequence of leaving it |
|---|---|
| `useTextComponent`, `useTextComponentInWrapper` | The text shows on the site, but the author cannot click it in Pages / Experience Editor to edit it. |
| `useRichTextComponent`, `useRichTextComponentInWrapper` | The visitor sees escaped HTML tags instead of formatted content, and the field is not editable. |
| `avoidDangerouslySetInnerHTML` | The content looks right on the site, but it is not editable inline and internal links inside it bypass the router. |
| `avoidNestedPTags`, `avoidRichTextPTag` | Paragraphs inside a paragraph are invalid HTML: the browser re-parents them, spacing breaks and React logs hydration errors. |
| `useImageComponent` | The image loses the alt text, size and media parameters from the media item, and the author cannot swap it inline. |
| `useLinkComponent` | The link keeps only its URL: target, title, query string, anchor, client-side navigation and inline editing are gone. |
| `useFileComponent` | The link works, but its text no longer follows the file's title when the author replaces the file. |
| `missingImport` | The component is used without its import: the file does not compile until the import is added. |

The fix keeps every attribute, and it keeps the children of an `<a>` unless they only repeat the
field's own text (`{link.value.text}`, or a file's `title` / `displayName`); then the result is
self-closing. Check two leftovers that change behaviour once the element is a field component: a hardcoded `alt` on what becomes `<Image>` overrides the alt
text from the media item, and children of what becomes `<Link>` or `<File>` replace the text the
author entered. Both may be intended; say so in a review rather than assuming.

## Findings without a fix, and what to do

The fixer refuses whenever a rewrite could drop code or shadow a name. Resolve these by hand, then
lint again.

| Situation | Example | Manual rewrite |
|---|---|---|
| Field next to other children | `<h3>Hello {f.value}</h3>` | `<h3>Hello <Text field={f} /></h3>` |
| Field with `&nbsp;` or an icon beside it | `<span>{f.value}&nbsp;</span>` | `<span><Text field={f} />&nbsp;</span>` |
| Wrapper is a component | `<Typography>{f.value}</Typography>` | `<Typography><Text field={f} /></Typography>`, or give the wrapper a `field` prop |
| Text field inside an anchor of a link field | `<a href={l.value.href}>{f.value}</a>` | `<Link field={l}><Text field={f} /></Link>` (the link rule's fix makes the `<Link>`; add the `<Text>`) |
| `Link` is `next/link` | `import Link from "next/link"` plus `<a href={l.value.href}>` | rename the Next import (`import NextLink from "next/link"`, update its usages), then run `--fix`. From 2.0.1 the other direction works too: import the Sitecore one under an alias (`Link as SitecoreLink`) and the fix writes `<SitecoreLink>` |
| `Image` is `next/image` | `import Image from "next/image"` plus `<img src={i.value.src}>` | rename the Next import (`NextImage` clashes with Sitecore's; use e.g. `StaticImage`), import the Sitecore one under an alias (`Image as SitecoreImage`, 2.0.1+), or render the field with Sitecore's `<NextImage field={i} />` |
| Name bound to a local, a type-only import, or a DOM global used as a value (`new Image()`, `x instanceof Text`, `file: File`) | | rename the local, or import the Sitecore component under an alias (`Image as SitecoreImage`); 2.0.1 then fixes with the alias, 2.0.0 needs the element written by hand |
| An `<a>` with no children, or whose only child can be empty (2.0.1+) | `<a href={l.value.href} aria-label="Home" />`, `<a href={l.value.href}>{showIcon && <Icon />}</a>` | `<Link>` / `<File>` without children print the field's text, so decide what should show: keep the icon as a child that always renders, or accept the link text and write `<Link field={l} />` |
| A comment the rewrite would delete (2.0.1+) | `<h1>{/* note */}{f.value}</h1>` | move the comment above the element, then run `--fix` |
| `dangerouslySetInnerHTML` with a real fallback | `__html: body.value \|\| "<p>Default</p>"` | `{body?.value \|\| isEditing ? <RichText field={body} /> : <div dangerouslySetInnerHTML={{ __html: fallback }} />}` so the field stays editable when empty |

When the rewritten element is `<Link>` or `<File>` and the field is optional, add a presence guard
on the field object (not on its value): `{fields.Cta && <Link field={fields.Cta} />}`.

## What it never reports

- `.value` inside `<title>`, `<option>`, `<textarea>`, `<script>`, `<style>`: correct as written.
- `.value` in attributes (`alt={img.value?.alt}`), conditions, keys and derived expressions
  (`f.value.length`, template strings).
- A field passed on as a prop (`<Card title={fields.Title} />`).
- Plain strings and non-Sitecore objects, whatever they are called.

## Known limits

Check these yourself when reviewing; a clean lint run does not cover them.

- A value that reaches JSX through a variable or helper (`const href = l.value.href`).
- Fields typed loosely (`any`, untyped `Field`, index signatures): no type, no finding.
- From 2.0.1, field types that are not declared by a Sitecore package: a project's own `Field<T>` /
  `ImageField`, or a local mock of the Sitecore package (`declare module`, tsconfig `paths`).
- A cast on the field itself: `(x as Field<string>).value`.
- `Field<number>`, date fields and checkbox fields.
- Field components guarded by `.value` so that empty fields vanish from the editor.
- `<Text>` used for a Rich Text template field that is typed `Field<string>`.
- `.jsx` files and `.tsx` files outside the type-checked project.

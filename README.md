# eslint-plugin-sitecore-jss

[![npm version](https://img.shields.io/npm/v/eslint-plugin-sitecore-jss.svg)](https://www.npmjs.com/package/eslint-plugin-sitecore-jss)
[![CI](https://github.com/rikaweb/eslint-plugin-sitecore-jss/actions/workflows/ci.yml/badge.svg)](https://github.com/rikaweb/eslint-plugin-sitecore-jss/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

ESLint rules that keep Sitecore fields editable. The plugin finds places where a component reads a
field's value by hand and renders it with a plain HTML element, and rewrites it to the matching
Sitecore component with an auto-fix:

```tsx
// before
<h1 className="title">{props.fields.title.value}</h1>
<img src={props.fields.image.value?.src} alt="Hero" />
<a href={props.fields.link.value.href}>{props.fields.link.value.text}</a>

// after `eslint --fix` (the import is added too)
<Text field={props.fields.title} tag="h1" className="title" />
<Image field={props.fields.image} alt="Hero" />
<Link field={props.fields.link} />
```

It works with **Sitecore JSS** (`@sitecore-jss/sitecore-jss-nextjs`, `@sitecore-jss/sitecore-jss-react`)
and the **Sitecore Content SDK** (`@sitecore-content-sdk/nextjs`, `@sitecore-content-sdk/react`): the rules
recognise the field types through the TypeScript type checker, so they only fire on real Sitecore fields,
whatever the variable is called.

## Requirements

| | |
|---|---|
| ESLint | 8.57, 9 or 10 |
| `@typescript-eslint/parser` | 7 or 8 |
| TypeScript | 4.8.4 up to 6.0 |
| Node.js | 18.18 or newer (ESLint 10 itself needs 20.19) |

The rules need **type information**: configure `parserOptions.projectService` (recommended) or
`parserOptions.project`. Without it ESLint reports a clear configuration error instead of linting.

## Installation

```sh
npm install --save-dev eslint-plugin-sitecore-jss @typescript-eslint/parser typescript
```

## Configuration

### Flat config (ESLint 9 and 10, `eslint.config.mjs`)

```js
import tsParser from "@typescript-eslint/parser";
import sitecoreJss from "eslint-plugin-sitecore-jss";

export default [
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

If you already use the `typescript-eslint` package, its `tseslint.config(...)` / `defineConfig(...)`
setups work the same way: spread `sitecoreJss.configs["flat/recommended"]` into the array.

Available flat configs:

| Config | Rules | Severity |
|---|---|---|
| `flat/recommended` | the five component rules | `warn` |
| `flat/strict` | the five component rules | `error` |
| `flat/all` | alias of `flat/recommended` | `warn` |

### Legacy config (ESLint 8, `.eslintrc.cjs`)

```js
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  extends: ["plugin:sitecore-jss/recommended"],
};
```

`plugin:sitecore-jss/all` (same as `recommended`) and `plugin:sitecore-jss/strict` (errors) exist too.
Use a `.cjs` file rather than JSON so `tsconfigRootDir` can be absolute.

### Enabling rules individually

```js
rules: {
  "sitecore-jss/enforce-text-component": "error",
  "sitecore-jss/enforce-richtext-component": "error",
  "sitecore-jss/enforce-image-component": "warn",
  "sitecore-jss/enforce-link-component": ["warn", { importSource: "@sitecore-jss/sitecore-jss-react" }],
  "sitecore-jss/enforce-file-component": "warn",
}
```

## Rules

Every rule is auto-fixable and needs type information.

| Rule | Finds | Rewrites to |
|---|---|---|
| [enforce-text-component](docs/rules/enforce-text-component.md) | `{field.value}` of a `Field<string>` / `TextField` inside a JSX element | `<Text field={…} tag="…" />` |
| [enforce-richtext-component](docs/rules/enforce-richtext-component.md) | `{field.value}` or `dangerouslySetInnerHTML` of a `RichTextField`; `<RichText tag="p">`; rich text inside `<p>` | `<RichText field={…} tag="…" />` |
| [enforce-image-component](docs/rules/enforce-image-component.md) | `<img src={image.value.src}>` of an `ImageField` | `<Image field={…} />` |
| [enforce-link-component](docs/rules/enforce-link-component.md) | `<a href={link.value.href}>` of a `LinkField` | `<Link field={…}>…</Link>` |
| [enforce-file-component](docs/rules/enforce-file-component.md) | `<a href={file.value.src}>` of a `FileField` | `<File field={…}>…</File>` |
| [enforce-all-components](docs/rules/enforce-all-components.md) | *deprecated* — all of the above under one rule id | |

### What the auto-fix does

- Keeps every attribute (`className`, `id`, `data-*`, spreads, …) and drops only the one the component
  derives from the field (`src`, `href`, `dangerouslySetInnerHTML`).
- Keeps the children of `<a>` unless they only re-render the field's own text.
- Looks through optional chaining, non-null assertions and type assertions
  (`fields.title?.value`, `image.value!.src`, `value as string`).
- Adds the missing import, extending an existing import from a Sitecore package or adding a new one
  after the last import. The package is chosen from the `importSource` option, then an existing Sitecore
  import in the file, then the package that declares the field's type (Content SDK or JSS).

### When a problem is reported without a fix

A fix is only offered when it cannot lose code or shadow another binding:

- the field is the element's only meaningful child (`<h3>Hello {title.value}</h3>` is reported only);
- the wrapper is a plain HTML element (`<Typography>{title.value}</Typography>` gets a dedicated
  message suggesting to pass the field to `<Text>`);
- the component name is free to import (`Link` from `next/link`, `Image` from `next/image` or a local
  `Text` means the field misuse is reported but nothing is rewritten).

### Options

All component rules accept one option object:

| Option | Type | Default | Description |
|---|---|---|---|
| `importSource` | `string` | the field's package family, falling back to `@sitecore-jss/sitecore-jss-nextjs` | Package to import a component from when the file has no Sitecore import that can be extended. |

### A note on `--fix` and `parserOptions.project`

Prefer `parserOptions.projectService` (typescript-eslint's recommended setting). With the classic
`parserOptions.project`, ESLint's later fix passes lint the rewritten text against stale type
information, so a `--fix` run can report zero remaining problems even when unfixable ones exist; a
second plain `eslint` run shows them. The fixes themselves are applied correctly in both modes.

## Migrating from 1.x

1. Update ESLint to 8.57 or newer and `@typescript-eslint/parser` to 7 or 8. ESLint 9/10 projects
   use the flat config above; `.eslintrc` keeps working on ESLint 8.
2. `plugin:sitecore-jss/all` and the individual rule names are unchanged. `enforce-all-components`
   still works but is deprecated: prefer the configs or the individual rules.
3. The rules now fail loudly when type information is missing; v1 silently did nothing.
4. Expect fewer lossy rewrites and more findings: optional chaining is detected, the import is added,
   and elements with mixed children or component wrappers are reported without a fix.

See the [changelog](CHANGELOG.md) for the full list.

## Background

The plugin was introduced in
[Improving Sitecore JSS development with ESLint](https://www.getfishtank.com/insights/improving-sitecore-jss-development-with-eslint-introducing-eslint-plugin-sitecore-jss).
Rendering a field value by hand breaks inline editing in Pages / Experience Editor and skips the
media handling, link resolution and HTML rendering that the Sitecore components provide; the rules
catch that before review.

## Contributing

```sh
npm ci
npm test        # builds, then runs the rule, plugin and ESLint CLI integration specs
npm run lint
npm run typecheck
```

Rule specs live in `tests/rules`, the end-to-end test in `tests/integration`, and the type-only
fixture packages for JSS and the Content SDK in `tests/fixtures/node_modules`. Issues and pull
requests are welcome at [rikaweb/eslint-plugin-sitecore-jss](https://github.com/rikaweb/eslint-plugin-sitecore-jss).

## License

[MIT](LICENSE)

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-10-28

A rewrite for today's toolchain: ESLint 9/10 flat config, typescript-eslint 8 and the Sitecore Content
SDK, with the auto-fixer made safe and complete. The rule names and the `recommended` / `all` configs are
unchanged, so most 1.x setups only need the dependency update.

### Breaking changes

- **Supported toolchain:** ESLint `^8.57.0 || ^9.0.0 || ^10.0.0`, `@typescript-eslint/parser` `^7 || ^8`,
  TypeScript `>=4.8.4 <6.1.0`, Node `^18.18.0 || ^20.9.0 || >=21.1.0`. ESLint 8.0–8.56, typescript-eslint 5/6
  and Node 14/16 are no longer supported.
- **Type information is required.** The rules throw the standard typescript-eslint configuration error when
  `parserOptions.projectService` / `parserOptions.project` is missing; 1.x silently did nothing.
- **`enforce-all-components` is deprecated** (`meta.deprecated` with `replacedBy`). It keeps working, but the
  `all` config now enables the five individual rules (same severity as before) instead of the meta-rule.
- **Auto-fix is conservative.** Elements with other children next to the field, component wrappers
  (`<Typography>{title.value}</Typography>`) and component names that are already bound to something else
  (`Link` from `next/link`, `Image` from `next/image`, locals, type-only imports) are reported without a fix.
  New message ids: `useTextComponentInWrapper`, `useRichTextComponentInWrapper`.
- **The fix adds the import.** A second problem, `missingImport`, is reported next to the first element that
  needs a component, with a fix that extends an existing Sitecore import or adds a new one.
- Message texts were rewritten; `fieldName` placeholders now render with braces (`field={props.fields.title}`).

### Added

- Flat configs for ESLint 9+: `flat/recommended` (warn), `flat/strict` (error), `flat/all` (alias of
  recommended); legacy `strict` next to `recommended` and `all`. `plugin.meta` carries name and version.
- Content SDK support: field types from `@sitecore-content-sdk/nextjs` / `@sitecore-content-sdk/react` are
  recognised, and the import fixer targets the Content SDK package when the field's type comes from it.
- Rule option `importSource` (string) on every component rule: the package to import a component from when
  the file has no Sitecore import that can be extended.
- `enforce-richtext-component` detects `dangerouslySetInnerHTML={{ __html: richText.value }}` (also with
  `?? ""` / `|| ""`) and fixes it to `<RichText>` (`avoidDangerouslySetInnerHTML`); `tag={"p"}` is handled
  like `tag="p"`.
- A field rendered without `.value` (`<p>{props.fields.title}</p>`) is reported and fixed.
- Per-rule documentation in `docs/rules/` (linked from each rule's `meta.docs.url`).
- Test suite (vitest + `@typescript-eslint/rule-tester`) with type-only fixture packages for JSS and the
  Content SDK, an end-to-end test through the real ESLint CLI, and a CI matrix on Node 20/22 × ESLint
  8.57/9/10. Releases are published with npm provenance.

### Changed

- Rules are built with `ESLintUtils.RuleCreator` and declare `docs.requiresTypeChecking`; they use
  `context.sourceCode` (required by ESLint 10) and the public `@typescript-eslint/utils/ts-eslint` entry.
- `@typescript-eslint/utils` is a runtime dependency (it was only a devDependency, so consumers relied on
  hoisting).
- `package.json` gains `exports`, `sideEffects: false`, `homepage` and `bugs`; `package-lock.json` is tracked.
- `<Link>` / `<File>` fixes keep the anchor's children unless they only re-render the field's own text
  (`{link.value.text}`, `{file.value.title}` / `displayName`).

### Fixed

- Fields read through optional chaining (`fields.title?.value`, `image.value?.src`, `link?.value.href`),
  non-null assertions (`value!.src`) and type assertions are detected; the fix targets the field itself
  (`field={props.fields.image}`, never `value!`).
- Under `strictNullChecks`, `ImageField.value` is optional, so `.value.src` reads from a union type; the
  rules look through `undefined` and detect it.
- The fix no longer drops text next to the field or rewrites component wrappers into `<Text tag="Typography">`.
- No more `console.warn` output on stderr for ordinary `<a>` and `<img>` elements.

### Migrating from 1.x

1. Update ESLint (8.57+) and `@typescript-eslint/parser` (7+). On ESLint 9/10 use the flat config:

   ```js
   import tsParser from "@typescript-eslint/parser";
   import sitecoreJss from "eslint-plugin-sitecore-jss";

   export default [
     {
       files: ["**/*.{ts,tsx}"],
       languageOptions: {
         parser: tsParser,
         parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
       },
     },
     ...sitecoreJss.configs["flat/recommended"],
   ];
   ```

   On ESLint 8, `.eslintrc.cjs` with `extends: ["plugin:sitecore-jss/recommended"]` keeps working.
2. If you used `enforce-all-components` directly, switch to the config or the individual rules.
3. Prefer `parserOptions.projectService` over `parserOptions.project`: with the classic option, ESLint's
   later `--fix` passes see stale type information and may report zero remaining problems when unfixable
   ones exist (a second plain run shows them). Fixes are applied correctly either way.
4. Expect more findings and safer rewrites: optional chaining is detected, the import is added, and elements
   with mixed children or component wrappers are reported without a fix. If `Link` or `Image` is already
   imported from Next.js in a file, alias one of the two imports and run `--fix` again.

## [1.1.6] - 2025-11-12

### Added

- **Attribute Preservation in Auto-Fix**: All rules now preserve HTML/JSX attributes when auto-fixing code
  - `enforce-richtext-component`: Preserves `className`, `id`, `style`, and all other attributes when converting to `<RichText>`
  - `enforce-text-component`: Preserves all attributes when converting to `<Text>`
  - `enforce-image-component`: Preserves all attributes except `src` when converting to `<Image>`
  - `enforce-link-component`: Preserves all attributes except `href` when converting to `<Link>`
  - `enforce-file-component`: Preserves all attributes except `href` when converting to `<File>`
  - Supports JSX spread attributes (`{...props}`)

### Changed

- Auto-fix behavior now intelligently preserves existing attributes instead of removing them
- Attributes that conflict with the `field` prop (like `src`, `href`) are automatically filtered out

## [1.1.5] - 2025-07-22

### Added

- Enhanced `enforce-richtext-component` rule to detect and prevent nested `<p>` tags when using `RichTextField`
- New error message `avoidNestedPTags` warns when `RichTextField` is used inside `<p>` tags, which creates invalid HTML due to Sitecore automatically adding `<p>` tags
- New error message `avoidRichTextPTag` warns when `<RichText>` component uses `tag="p"` attribute, which also creates nested `<p>` elements
- Auto-fix for nested `<p>` scenarios uses `<RichText>` component without specifying tag to default to `<div>` wrapper
- Auto-fix for `<RichText tag="p">` removes the problematic `tag="p"` attribute

### Fixed

- Prevents invalid HTML structure from nested `<p>` elements when using `RichTextField` in `<p>` tags
- Prevents invalid HTML structure from `<RichText>` components using `tag="p"` attribute

## [1.1.4] - 2025-07-22

### Fixed

- Enhanced type checking for `Field<String>` to better handle various string type variations
- Improved string literal type detection in type checking utilities
- Added support for union and intersection types containing string in field type checks

## [1.1.3] - 2025-04-16

### Fixed

- Resolved npm publish errors due to version conflicts
- Fixed TypeScript compilation issues in build process
- Improved error handling in type checking utilities

## [1.1.2] - 2025-04-14

### Fixed

- Resolved npm publish errors due to version conflicts
- Fixed TypeScript compilation issues in build process
- Improved error handling in type checking utilities

## [1.1.0] - 2025-04-14

### Added

- Full TypeScript support for all rule implementations
- Type-safe rule configurations
- Better type checking utilities for Sitecore field types
- TypeScript declarations for public APIs

### Changed

- Migrated all rule implementations to TypeScript
- Improved type checking in `enforce-file-component`
- Enhanced type safety in `enforce-all-components`
- Updated build process to handle TypeScript compilation

### Fixed

- Type-related issues in utility functions
- Improved type inference for Sitecore field types

## [1.0.0-beta.1] - 2025-02-18

### Added

- Initial release of eslint-plugin-sitecore-jss
- Rule: `enforce-text-component` for proper Text component usage
- Rule: `enforce-richtext-component` for proper RichText component usage
- Rule: `enforce-image-component` for proper Image component usage
- Rule: `enforce-link-component` for proper Link component usage
- Rule: `enforce-file-component` for proper File component usage
- Rule: `enforce-all-components` to enable all component rules
- Auto-fix support for all rules
- TypeScript support
- Documentation for all rules and configuration options

[Unreleased]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.6...v2.0.0
[1.1.6]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.2...v1.1.3
[1.1.0]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.0.0-beta.1...v1.1.0
[1.0.0-beta.1]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/releases/tag/v1.0.0-beta.1

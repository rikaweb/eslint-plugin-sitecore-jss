# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (v2 work in progress on the `v2` branch) — integration test and CI

- End-to-end test (`tests/integration/cli.test.ts`): the built `dist/` loaded by the real ESLint against a fixture project (`tests/fixtures/integration`), through the CLI with the flat `flat/recommended` and `flat/strict` configs on ESLint 9/10 and through the ESLint 8 class API with a legacy `.eslintrc.cjs`; checks every finding, that nothing is printed on stderr, and that `--fix` converges with every import added.
- GitHub Actions `ci.yml`: lint, typecheck, test and `npm pack --dry-run` on Ubuntu and Windows (Node 22), plus a Node 20/22 × ESLint 8.57/9/10 matrix that runs the whole suite against each ESLint major.
- `publish.yml` now runs on `release: published`, checks that the release tag matches `package.json`, installs with `npm ci` and publishes with `--provenance` (`prepublishOnly` runs lint, typecheck, test and build).
- `vite` is an explicit dev dependency (vitest's peer), so installs with `--legacy-peer-deps` keep it.

### Added (v2 work in progress on the `v2` branch) — import auto-fixer

- Every component rule now makes sure the component it introduces is imported. When a fix introduces `Text`, `RichText`, `Image`, `Link` or `File`, the rule also reports `missingImport` (anchored at the first element that needs it) with a fix that either extends an existing value import from a Sitecore component package (`@sitecore-jss/sitecore-jss-nextjs`, `@sitecore-jss/sitecore-jss-react`, `@sitecore-content-sdk/nextjs`, `@sitecore-content-sdk/react`) or adds `import { X } from "<pkg>"` after the last import. `<pkg>` comes from the new `importSource` rule option, else any Sitecore import already in the file (including a type-only one), else the package family that declares the field's type (Content SDK vs JSS), else `@sitecore-jss/sitecore-jss-nextjs`. The file's quote style is kept.
- The same report also fires for a `<Text>`/`<Link>`/… that is already in the file but unbound, in files that import from a Sitecore package; this is how the second `--fix` pass completes the imports without type information.
- When the component name is already bound to something else — `Link` from `next/link`, `Image` from `next/image`, a local declaration, a type-only import — the rule still reports the field misuse but offers no fix, so nothing gets shadowed.
- Rule option `importSource` (string) on all five component rules.

### Fixed (v2 work in progress on the `v2` branch)

- Fields read through optional chaining (`fields.title?.value`, `image.value?.src`, `link?.value.href`), non-null assertions (`value!.src`) and type assertions are now detected; the fix always targets the field itself (`field={props.fields.image}`, never `value!`).
- Under `strictNullChecks`, `ImageField.value` is optional, so `.value.src` reads from a union type; the rules now look through `undefined` and detect it.
- Auto-fix no longer drops content: elements with mixed children (`<h3>Hello {title.value}</h3>`) and custom component wrappers (`<Typography>{title.value}</Typography>`) are reported without a fix (new message ids `useTextComponentInWrapper` / `useRichTextComponentInWrapper`).
- `<Link>` / `<File>` fixes keep the anchor's children unless they only re-render the field's own text (`{link.value.text}`, `{file.value.title}`).
- The rules no longer print `console.warn` noise to stderr for ordinary `<a>` and `<img>` elements.
- A field rendered without `.value` (`<p>{props.fields.title}</p>`) is reported and fixed too.
- `enforce-richtext-component` detects `dangerouslySetInnerHTML={{ __html: richText.value }}` (also with `?? ""` / `|| ""`) and fixes it to `<RichText>` (new message id `avoidDangerouslySetInnerHTML`); `tag={"p"}` is handled like `tag="p"`.
- Rules are built with `ESLintUtils.RuleCreator`, carry `docs.url`, `docs.requiresTypeChecking` and throw the standard typescript-eslint error when type information is missing (previously they silently did nothing).
- `enforce-all-components` is deprecated (`meta.deprecated` with `replacedBy`); it keeps working.

### Added (v2 work in progress on the `v2` branch)

- Test suite: vitest 5 + `@typescript-eslint/rule-tester` 8 with type-aware fixtures (`tests/fixtures/node_modules` holds type-only stand-ins for `@sitecore-jss/sitecore-jss-nextjs` and `@sitecore-content-sdk/nextjs`). Current behaviour is covered per rule and for the plugin entry; every known bug is captured in `tests/known-bugs/` as an `it.fails` case that asserts the desired behaviour.

### Changed (v2 work in progress on the `v2` branch)

- **Breaking:** supported toolchain is now ESLint `^8.57.0 || ^9.0.0 || ^10.0.0`, `@typescript-eslint/parser` `^7 || ^8`, TypeScript `>=4.8.4 <6.1.0`, Node `^18.18 || ^20.9 || >=21.1`.
- `@typescript-eslint/utils` is a runtime dependency (it was only a devDependency, so consumers relied on hoisting).
- Rules use `context.sourceCode` instead of the removed `context.getSourceCode()` (required by ESLint 10) and import `ts-eslint` types from the public `@typescript-eslint/utils/ts-eslint` entry point.
- New flat configs `flat/recommended`, `flat/strict` and `flat/all` for ESLint 9+; legacy `recommended` and `all` kept, plus a legacy `strict`.
- `package.json` gains `exports`, `sideEffects: false`, `homepage`/`bugs`; repository lint moved to `eslint.config.mjs`.
- Repo hygiene: generated release/blog markdown moved to `docs/archive/`, MIT `LICENSE` added, `package-lock.json` tracked.

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

### Changed

- N/A (Initial Release)

### Deprecated

- N/A (Initial Release)

### Removed

- N/A (Initial Release)

### Fixed

- N/A (Initial Release)

### Security

- N/A (Initial Release)

[1.1.6]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.5...v1.1.6
[1.1.5]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.2...v1.1.3
[1.1.0]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.0.0-beta.1...v1.1.0
[1.0.0-beta.1]: https://github.com/rikaweb/eslint-plugin-sitecore-jss/releases/tag/v1.0.0-beta.1

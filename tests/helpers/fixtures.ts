import path from "node:path";
import { fileURLToPath } from "node:url";
import { RuleTester } from "@typescript-eslint/rule-tester";
import type { TSESLint } from "@typescript-eslint/utils";

export const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures"
);

/** The two packages whose field types the plugin recognises (same type names, different origin). */
export const JSS = "@sitecore-jss/sitecore-jss-nextjs";
export const SDK = "@sitecore-content-sdk/nextjs";

export const FIELD_TYPES =
  "Field, TextField, RichTextField, ImageField, ImageFieldValue, LinkField, LinkFieldValue, FileField, FileFieldValue";
export const COMPONENTS = "Text, RichText, Image, Link, File";

export interface FixtureOptions {
  /** Package to import from; defaults to the JSS package. */
  pkg?: string;
  /** Import specifier list; defaults to every field type plus every component. */
  imports?: string;
}

/**
 * Wraps a JSX snippet with an import and a typed `props` constant so the rules see real
 * Sitecore field types through the type checker. The snippet is linted as `tests/fixtures/react.tsx` (a `.tsx` twin of `file.ts` would be dropped by TypeScript, which keeps only the higher-priority extension for a shared basename).
 */
export function withProps(
  body: string,
  { pkg = JSS, imports = `${FIELD_TYPES}, ${COMPONENTS}` }: FixtureOptions = {}
): string {
  return [
    `import { ${imports} } from "${pkg}";`,
    "type Props = { fields: { title: Field<string>; heading: TextField; body: RichTextField; image: ImageField; link: LinkField; file: FileField } };",
    "declare const props: Props;",
    body,
    "",
  ].join("\n");
}

export function createRuleTester(): RuleTester {
  return new RuleTester({
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: fixturesDir,
        ecmaFeatures: { jsx: true },
      },
    },
    defaultFilenames: { ts: "file.ts", tsx: "react.tsx" },
  });
}

/**
 * The rules are still plain object literals (Phase 3 moves them to ESLintUtils.RuleCreator);
 * this cast keeps RuleTester's generics meaningful until then.
 */
export function asRuleModule<MessageIds extends string>(
  rule: unknown
): TSESLint.RuleModule<MessageIds, []> {
  return rule as TSESLint.RuleModule<MessageIds, []>;
}

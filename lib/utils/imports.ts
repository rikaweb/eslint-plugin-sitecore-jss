import { AST_NODE_TYPES, ASTUtils, type TSESLint, type TSESTree } from "@typescript-eslint/utils";
import type { JSONSchema4 } from "@typescript-eslint/utils/json-schema";
import { isElementNamed } from "./jsx";
import type { FieldPackage } from "./type-checking";

/** Packages that export the field components (`Text`, `RichText`, `Image`, `Link`, `File`, …). */
export const SITECORE_COMPONENT_PACKAGES: readonly string[] = [
  "@sitecore-jss/sitecore-jss-nextjs",
  "@sitecore-jss/sitecore-jss-react",
  "@sitecore-content-sdk/nextjs",
  "@sitecore-content-sdk/react",
];

export const DEFAULT_IMPORT_SOURCE = "@sitecore-jss/sitecore-jss-nextjs";

export type ComponentName = "Text" | "RichText" | "Image" | "NextImage" | "Link" | "File";

export interface ImportOptions {
  /**
   * Package to import a component from when the file has no Sitecore import that can be extended.
   * Defaults to the package family of the field's type (`@sitecore-content-sdk/nextjs` or
   * `@sitecore-jss/sitecore-jss-nextjs`).
   */
  importSource?: string;
}

export const importOptionsSchema: JSONSchema4 = {
  type: "object",
  properties: {
    importSource: {
      type: "string",
      description:
        "Package to import a component from when no existing Sitecore import can be extended.",
    },
  },
  additionalProperties: false,
};

export const MISSING_IMPORT_MESSAGE =
  '`{{name}}` is needed here but is not imported from a Sitecore package. Add `import { {{name}} } from "{{source}}"` (the fix does this).';

export function isSitecoreComponentPackage(source: string): boolean {
  return SITECORE_COMPONENT_PACKAGES.includes(source);
}

function packageFamily(source: string): "jss" | "content-sdk" | undefined {
  if (source.startsWith("@sitecore-content-sdk/")) return "content-sdk";
  if (source.startsWith("@sitecore-jss/")) return "jss";
  return undefined;
}

function sourceOf(declaration: TSESTree.ImportDeclaration): string {
  return String(declaration.source.value);
}

export type ComponentBinding = "sitecore-import" | "conflict" | "missing";

/**
 * How `name` resolves at `node`:
 * - `sitecore-import`: a value import from a Sitecore component package — usable as is;
 * - `conflict`: bound to something else (local declaration, other package, type-only import), so a
 *   fix that introduces `<name>` must not be offered;
 * - `missing`: unbound. Configured globals (no definition) count as missing; an added import shadows them.
 */
export function getComponentBinding(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  name: string
): ComponentBinding {
  const variable = ASTUtils.findVariable(sourceCode.getScope(node), name);
  if (!variable || variable.defs.length === 0) return "missing";

  for (const definition of variable.defs) {
    const declaration = definition.parent;
    const specifier = definition.node;
    if (
      declaration?.type === AST_NODE_TYPES.ImportDeclaration &&
      specifier.type === AST_NODE_TYPES.ImportSpecifier &&
      declaration.importKind !== "type" &&
      specifier.importKind !== "type" &&
      isSitecoreComponentPackage(sourceOf(declaration))
    ) {
      return "sitecore-import";
    }
  }
  return "conflict";
}

export interface ImportPlan {
  /** Package the component ends up imported from. */
  source: string;
  fix: TSESLint.ReportFixFunction;
}

/**
 * Plans how to make `name` importable in `program`:
 * 1. extend an existing value import with named specifiers from a Sitecore component package
 *    (preferring the field's package family);
 * 2. otherwise add `import { name } from <source>` after the last import, where `<source>` is the
 *    `importSource` option, else the source of any Sitecore import already in the file (for example a
 *    type-only one), else the field's package, else the JSS Next.js package.
 */
export function planImport(
  program: TSESTree.Program,
  name: ComponentName,
  fieldPackage: FieldPackage | undefined,
  options: ImportOptions
): ImportPlan {
  const imports = program.body.filter(
    (statement): statement is TSESTree.ImportDeclaration =>
      statement.type === AST_NODE_TYPES.ImportDeclaration
  );
  const sitecoreImports = imports.filter((declaration) =>
    isSitecoreComponentPackage(sourceOf(declaration))
  );
  const extendable = sitecoreImports.filter(
    (declaration) =>
      declaration.importKind !== "type" &&
      declaration.specifiers.some(
        (specifier) => specifier.type === AST_NODE_TYPES.ImportSpecifier
      )
  );

  const family = fieldPackage ? packageFamily(fieldPackage) : undefined;
  const target =
    extendable.find(
      (declaration) => family !== undefined && packageFamily(sourceOf(declaration)) === family
    ) ?? extendable[0];

  if (target) {
    const named = target.specifiers.filter(
      (specifier) => specifier.type === AST_NODE_TYPES.ImportSpecifier
    );
    const last = named[named.length - 1];
    return {
      source: sourceOf(target),
      fix: (fixer) => fixer.insertTextAfter(last, `, ${name}`),
    };
  }

  const source =
    options.importSource ??
    (sitecoreImports[0] ? sourceOf(sitecoreImports[0]) : undefined) ??
    fieldPackage ??
    DEFAULT_IMPORT_SOURCE;
  const last = imports[imports.length - 1];
  const quote = last?.source.raw.startsWith("'") ? "'" : '"';
  const statement = `import { ${name} } from ${quote}${source}${quote};`;

  if (last) {
    return { source, fix: (fixer) => fixer.insertTextAfter(last, `\n${statement}`) };
  }
  const first = program.body[0];
  return {
    source,
    fix: (fixer) =>
      first
        ? fixer.insertTextBefore(first, `${statement}\n`)
        : fixer.insertTextAfterRange([0, 0], `${statement}\n`),
  };
}

export interface MissingImportReport {
  node: TSESTree.Node;
  data: { name: string; source: string };
  fix: TSESLint.ReportFixFunction;
}

export interface ImportTracker {
  /** How the component is bound at `node`; call before offering a fix that introduces it. */
  binding(node: TSESTree.Node): ComponentBinding;
  /** Records that a fix in this pass introduces the component at `opening`. */
  require(opening: TSESTree.JSXOpeningElement, fieldPackage: FieldPackage | undefined): void;
  /** Listeners to spread into the rule's listener object. */
  listeners: TSESLint.RuleListener;
}

/**
 * Per-file tracking of one component's import. The element fixes never include the import; instead
 * the tracker emits a single `missingImport` report (with the import fix) per file, anchored at the
 * first element that needs it. Keeping the import in its own report means element fixes never overlap,
 * so ESLint applies all of them in one pass. It also notices a `<Component>` that is already in the
 * file but unbound (hand-written, or left by an earlier partial fix) and adds the import then, without
 * needing type information.
 */
export function createImportTracker(
  sourceCode: TSESLint.SourceCode,
  name: ComponentName,
  options: ImportOptions,
  report: (descriptor: MissingImportReport) => void
): ImportTracker {
  let needed: { opening: TSESTree.JSXOpeningElement; fieldPackage?: FieldPackage } | undefined;
  let hasSitecoreImport = false;

  return {
    binding: (node) => getComponentBinding(sourceCode, node, name),
    require(opening, fieldPackage) {
      needed ??= { opening, fieldPackage };
    },
    listeners: {
      ImportDeclaration(node) {
        if (packageFamily(sourceOf(node)) !== undefined) hasSitecoreImport = true;
      },
      JSXOpeningElement(node) {
        // Only in files that already use a Sitecore package: an unbound <Text> elsewhere is not ours.
        if (needed || !hasSitecoreImport || !isElementNamed(node, name)) return;
        if (getComponentBinding(sourceCode, node, name) === "missing") {
          needed = { opening: node };
        }
      },
      "Program:exit"(program) {
        if (!needed) return;
        const plan = planImport(program, name, needed.fieldPackage, options);
        report({
          node: needed.opening.name,
          data: { name, source: plan.source },
          fix: plan.fix,
        });
      },
    },
  };
}

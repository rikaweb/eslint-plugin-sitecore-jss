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
   * `@sitecore-jss/sitecore-jss-nextjs`). A component that is already imported from this package
   * counts as the Sitecore component, exactly like one imported from the built-in packages.
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

export function isSitecoreComponentPackage(source: string, options: ImportOptions = {}): boolean {
  return SITECORE_COMPONENT_PACKAGES.includes(source) || source === options.importSource;
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

const globalReferenceCache = new WeakMap<TSESLint.SourceCode, Map<string, boolean>>();

/**
 * Whether the file uses the *global* `name` as a value or a type (`new Image()`, `file: File`,
 * `node instanceof Text`). JSX element names do not count: `<Text>` is what the fix introduces.
 * `Image`, `File` and `Text` are DOM globals, so an added import of the same name would silently
 * re-point those references at the React component.
 */
function referencesGlobal(sourceCode: TSESLint.SourceCode, name: string): boolean {
  let cache = globalReferenceCache.get(sourceCode);
  if (!cache) {
    cache = new Map();
    globalReferenceCache.set(sourceCode, cache);
  }
  let result = cache.get(name);
  if (result === undefined) {
    result = (sourceCode.scopeManager?.scopes ?? []).some((scope) =>
      scope.references.some(
        (reference) =>
          reference.identifier.type === AST_NODE_TYPES.Identifier &&
          reference.identifier.name === name &&
          (reference.resolved == null || reference.resolved.defs.length === 0)
      )
    );
    cache.set(name, result);
  }
  return result;
}

/**
 * How `name` resolves at `node`:
 * - `sitecore-import`: a value import from a Sitecore component package (or the `importSource`
 *   package) — usable as is;
 * - `conflict`: bound to something else (local declaration, other package, type-only import), or
 *   unbound but used as a global elsewhere in the file (`new Image()`), so a fix that introduces
 *   `<name>` must not be offered;
 * - `missing`: unbound and unused. A global nobody references counts as missing; the added import
 *   shadows it harmlessly.
 */
export function getComponentBinding(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  name: string,
  options: ImportOptions = {}
): ComponentBinding {
  const variable = ASTUtils.findVariable(sourceCode.getScope(node), name);
  if (!variable || variable.defs.length === 0) {
    return referencesGlobal(sourceCode, name) ? "conflict" : "missing";
  }

  for (const definition of variable.defs) {
    const declaration = definition.parent;
    const specifier = definition.node;
    if (
      declaration?.type === AST_NODE_TYPES.ImportDeclaration &&
      specifier.type === AST_NODE_TYPES.ImportSpecifier &&
      declaration.importKind !== "type" &&
      specifier.importKind !== "type" &&
      isSitecoreComponentPackage(sourceOf(declaration), options)
    ) {
      return "sitecore-import";
    }
  }
  return "conflict";
}

export interface ResolvedComponent {
  binding: ComponentBinding;
  /** The JSX name a fix should render: the component's own name, or the alias it is imported under. */
  name: string;
}

/**
 * The local name of `import { name as Alias } from <Sitecore package>` when that alias can be used
 * as a JSX component at `node`: a value import, capitalised (a lower-case JSX name is an HTML
 * element), and not shadowed between the import and `node`.
 */
function findUsableAlias(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  name: string,
  options: ImportOptions
): string | undefined {
  for (const statement of sourceCode.ast.body) {
    if (
      statement.type !== AST_NODE_TYPES.ImportDeclaration ||
      statement.importKind === "type" ||
      !isSitecoreComponentPackage(sourceOf(statement), options)
    ) {
      continue;
    }
    for (const specifier of statement.specifiers) {
      if (specifier.type !== AST_NODE_TYPES.ImportSpecifier || specifier.importKind === "type") {
        continue;
      }
      const imported =
        specifier.imported.type === AST_NODE_TYPES.Identifier
          ? specifier.imported.name
          : String(specifier.imported.value);
      const local = specifier.local.name;
      if (imported !== name || local === name || !/^[A-Z]/.test(local)) continue;
      const variable = ASTUtils.findVariable(sourceCode.getScope(node), local);
      if (variable?.defs.some((definition) => definition.node === specifier)) return local;
    }
  }
  return undefined;
}

/**
 * Like `getComponentBinding`, but also finds the component under an alias:
 * with `import { Text as JssText } from "@sitecore-jss/sitecore-jss-nextjs"` the fix renders
 * `<JssText …>` instead of adding a second `Text` specifier (or giving up because `Text` is bound to
 * something else).
 */
export function resolveComponent(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  name: string,
  options: ImportOptions = {}
): ResolvedComponent {
  const binding = getComponentBinding(sourceCode, node, name, options);
  if (binding !== "sitecore-import") {
    const alias = findUsableAlias(sourceCode, node, name, options);
    if (alias !== undefined) return { binding: "sitecore-import", name: alias };
  }
  return { binding, name };
}

export interface ImportPlan {
  /** Package the component ends up imported from. */
  source: string;
  fix: TSESLint.ReportFixFunction;
}

/**
 * Plans how to make `name` importable in `program`:
 * 1. extend an existing value import with named specifiers from a Sitecore component package
 *    (preferring the `importSource` package, then the field's package family);
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
    isSitecoreComponentPackage(sourceOf(declaration), options)
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
    extendable.find((declaration) => sourceOf(declaration) === options.importSource) ??
    extendable.find(
      (declaration) => family !== undefined && packageFamily(sourceOf(declaration)) === family
    ) ??
    extendable[0];

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
  // No imports yet. A directive prologue ("use client", "use strict") must stay the first thing in
  // the file, so the import goes after the last directive rather than above it.
  const directives = program.body.filter(
    (node) => node.type === AST_NODE_TYPES.ExpressionStatement && node.directive !== undefined
  );
  const lastDirective = directives[directives.length - 1];
  if (lastDirective) {
    return { source, fix: (fixer) => fixer.insertTextAfter(lastDirective, `\n${statement}`) };
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
  /**
   * How the component is bound at `node` and under which JSX name a fix should render it;
   * call before offering a fix that introduces it.
   */
  resolve(node: TSESTree.Node): ResolvedComponent;
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
    resolve: (node) => resolveComponent(sourceCode, node, name, options),
    require(opening, fieldPackage) {
      needed ??= { opening, fieldPackage };
    },
    listeners: {
      ImportDeclaration(node) {
        if (packageFamily(sourceOf(node)) !== undefined || sourceOf(node) === options.importSource) {
          hasSitecoreImport = true;
        }
      },
      JSXOpeningElement(node) {
        // Only in files that already use a Sitecore package: an unbound <Text> elsewhere is not ours.
        if (needed || !hasSitecoreImport || !isElementNamed(node, name)) return;
        if (getComponentBinding(sourceCode, node, name, options) === "missing") {
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

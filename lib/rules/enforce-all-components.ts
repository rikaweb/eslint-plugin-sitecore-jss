import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { createRule } from "../utils/create-rule";
import enforceFileComponent from "./enforce-file-component";
import enforceImageComponent from "./enforce-image-component";
import enforceLinkComponent from "./enforce-link-component";
import enforceRichTextComponent from "./enforce-richtext-component";
import enforceTextComponent from "./enforce-text-component";

const componentRules = [
  enforceTextComponent,
  enforceRichTextComponent,
  enforceImageComponent,
  enforceLinkComponent,
  enforceFileComponent,
] as const;

const messages = {
  ...enforceTextComponent.meta.messages,
  ...enforceRichTextComponent.meta.messages,
  ...enforceImageComponent.meta.messages,
  ...enforceLinkComponent.meta.messages,
  ...enforceFileComponent.meta.messages,
};

type MessageIds = keyof typeof messages;

/**
 * @deprecated since 2.0.0. This meta-rule runs every component rule under one rule id, which hides
 * which rule fired and cannot be configured per rule. Use the plugin configs
 * (`flat/recommended`, `recommended`, …) or enable the individual rules instead.
 */
export default createRule<[], MessageIds>({
  name: "enforce-all-components",
  meta: {
    type: "problem",
    deprecated: {
      message:
        "Enable the individual sitecore-jss/enforce-*-component rules instead, for example through the plugin's `flat/recommended` or `recommended` config.",
      deprecatedSince: "2.0.0",
      replacedBy: [
        { rule: { name: "sitecore-jss/enforce-text-component" } },
        { rule: { name: "sitecore-jss/enforce-richtext-component" } },
        { rule: { name: "sitecore-jss/enforce-image-component" } },
        { rule: { name: "sitecore-jss/enforce-link-component" } },
        { rule: { name: "sitecore-jss/enforce-file-component" } },
      ],
    },
    docs: {
      description:
        "Deprecated: runs every component rule under one rule id. Use the plugin configs or the individual rules instead",
      recommended: false,
      requiresTypeChecking: true,
    },
    fixable: "code",
    messages,
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Each component rule reports only its own message ids, which are a subset of this rule's,
    // so they can share this rule's context.
    const listeners = componentRules.map((rule) =>
      (rule as unknown as TSESLint.RuleModule<MessageIds, []>).create(context)
    );

    const merged: Record<string, Array<(node: TSESTree.Node) => void>> = {};
    for (const listener of listeners) {
      for (const [event, handler] of Object.entries(listener)) {
        if (typeof handler !== "function") continue;
        (merged[event] ??= []).push(handler as (node: TSESTree.Node) => void);
      }
    }

    return Object.fromEntries(
      Object.entries(merged).map(([event, handlers]) => [
        event,
        (node: TSESTree.Node) => {
          for (const handler of handlers) handler(node);
        },
      ])
    ) as TSESLint.RuleListener;
  },
});

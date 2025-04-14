import { TSESTree } from "@typescript-eslint/utils";
import {
  RuleContext,
  RuleListener,
  RuleFunction,
} from "@typescript-eslint/utils/dist/ts-eslint";
import enforceTextComponent from "./enforce-text-component";
import enforceRichTextComponent from "./enforce-richtext-component";
import enforceImageComponent from "./enforce-image-component";
import enforceLinkComponent from "./enforce-link-component";
import enforceFileComponent from "./enforce-file-component";

type MessageIds =
  | "useTextComponent"
  | "useRichTextComponent"
  | "useImageComponent"
  | "useLinkComponent"
  | "useFileComponent";

type NodeTypes = TSESTree.Node | TSESTree.JSXOpeningElement;

export default {
  defaultOptions: [] as never[],
  meta: {
    type: "problem",
    docs: {
      description: "Ensures correct usage of all Sitecore JSS components.",
      recommended: "recommended",
    },
    fixable: "code",
    schema: [],
    messages: {
      ...enforceTextComponent.meta.messages,
      ...enforceRichTextComponent.meta.messages,
      ...enforceImageComponent.meta.messages,
      ...enforceLinkComponent.meta.messages,
      ...enforceFileComponent.meta.messages,
    },
  },
  create(context: RuleContext<MessageIds, never[]>) {
    // Collect all rule listeners
    const listeners = [
      enforceTextComponent.create(context),
      enforceRichTextComponent.create(context),
      enforceImageComponent.create(context),
      enforceLinkComponent.create(context),
      enforceFileComponent.create(context),
    ] as RuleListener[];

    // Merge all event listeners into one object
    const mergedListeners: Record<string, RuleFunction<NodeTypes>[]> = {};

    listeners.forEach((listener) => {
      Object.keys(listener).forEach((event) => {
        if (!mergedListeners[event]) {
          mergedListeners[event] = [];
        }
        const handler = listener[event as keyof RuleListener];
        if (typeof handler === "function") {
          mergedListeners[event].push(handler as RuleFunction<NodeTypes>);
        }
      });
    });

    // Wrap each event handler so all handlers execute
    return Object.fromEntries(
      Object.entries(mergedListeners).map(([event, handlers]) => [
        event,
        function (node: NodeTypes) {
          handlers.forEach((handler) => handler(node));
        },
      ])
    ) as RuleListener;
  },
};

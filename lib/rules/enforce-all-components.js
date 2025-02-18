const enforceTextComponent = require("./enforce-text-component");
const enforceRichTextComponent = require("./enforce-richtext-component");
const enforceImageComponent = require("./enforce-image-component");
const enforceLinkComponent = require("./enforce-link-component");
const enforceFileComponent = require("./enforce-file-component");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Ensures correct usage of all Sitecore JSS components.",
      recommended: true,
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
  create(context) {
    // Collect all rule listeners
    const listeners = [
      enforceTextComponent.create(context),
      enforceRichTextComponent.create(context),
      enforceImageComponent.create(context),
      enforceLinkComponent.create(context),
      enforceFileComponent.create(context),
    ];

    // Merge all event listeners into one object
    const mergedListeners = {};

    listeners.forEach((listener) => {
      Object.keys(listener).forEach((event) => {
        if (!mergedListeners[event]) {
          mergedListeners[event] = [];
        }
        mergedListeners[event].push(listener[event]);
      });
    });

    // Wrap each event handler so all handlers execute
    return Object.fromEntries(
      Object.entries(mergedListeners).map(([event, handlers]) => [
        event,
        function (...args) {
          handlers.forEach((handler) => handler(...args));
        },
      ])
    );
  },
};

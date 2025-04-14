import enforceAllComponents from "./rules/enforce-all-components";
import enforceTextComponent from "./rules/enforce-text-component";
import enforceRichTextComponent from "./rules/enforce-richtext-component";
import enforceImageComponent from "./rules/enforce-image-component";
import enforceLinkComponent from "./rules/enforce-link-component";
import enforceFileComponent from "./rules/enforce-file-component";

type Plugin = {
  rules: Record<string, unknown>;
  configs: {
    recommended: {
      plugins: string[];
      rules: Record<string, string>;
    };
    all: {
      plugins: string[];
      rules: Record<string, string>;
    };
  };
};

const plugin: Plugin = {
  rules: {
    "enforce-text-component": enforceTextComponent,
    "enforce-richtext-component": enforceRichTextComponent,
    "enforce-image-component": enforceImageComponent,
    "enforce-link-component": enforceLinkComponent,
    "enforce-file-component": enforceFileComponent,
    "enforce-all-components": enforceAllComponents,
  },
  configs: {
    recommended: {
      plugins: ["sitecore-jss"],
      rules: {
        "sitecore-jss/enforce-text-component": "warn",
        "sitecore-jss/enforce-richtext-component": "warn",
        "sitecore-jss/enforce-image-component": "warn",
        "sitecore-jss/enforce-link-component": "warn",
        "sitecore-jss/enforce-file-component": "warn",
      },
    },
    all: {
      plugins: ["sitecore-jss"],
      rules: {
        "sitecore-jss/enforce-all-components": "warn",
      },
    },
  },
};

export = plugin;

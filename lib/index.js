const enforceTextComponent = require("./rules/enforce-text-component");
const enforceRichTextComponent = require("./rules/enforce-richtext-component");
const enforceImageComponent = require("./rules/enforce-image-component");
const enforceLinkComponent = require("./rules/enforce-link-component");
const enforceFileComponent = require("./rules/enforce-file-component");
const enforceAllComponents = require("./rules/enforce-all-components");

module.exports = {
  rules: {
    "enforce-text-jss-component": enforceTextComponent,
    "enforce-richtext-jss-component": enforceRichTextComponent,
    "enforce-image-jss-component": enforceImageComponent,
    "enforce-link-jss-component": enforceLinkComponent,
    "enforce-file-jss-component": enforceFileComponent,
    "enforce-all-jss-components": enforceAllComponents,
  },
  configs: {
    recommended: {
      plugins: ["sitecore-jss"],
      rules: {
        "sitecore-jss/enforce-text-jss-component": "warn",
        "sitecore-jss/enforce-richtext-jss-component": "warn",
        "sitecore-jss/enforce-image-jss-component": "warn",
        "sitecore-jss/enforce-link-jss-component": "warn",
        "sitecore-jss/enforce-file-jss-component": "warn",
      },
    },
    all: {
      plugins: ["sitecore-jss"],
      rules: {
        "sitecore-jss/enforce-all-jss-components": "warn",
      },
    },
  },
};

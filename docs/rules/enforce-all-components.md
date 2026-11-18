# sitecore-jss/enforce-all-components

**Deprecated since 2.0.0.** Runs every component rule under one rule id. Use a plugin config or the
individual rules instead:

```js
// flat config
...sitecoreJss.configs["flat/recommended"]

// legacy config
extends: ["plugin:sitecore-jss/recommended"]
```

The rule keeps working for 1.x configurations, with the same findings and fixes as the five rules:

- [enforce-text-component](enforce-text-component.md)
- [enforce-richtext-component](enforce-richtext-component.md)
- [enforce-image-component](enforce-image-component.md)
- [enforce-link-component](enforce-link-component.md)
- [enforce-file-component](enforce-file-component.md)

Why it is deprecated: every finding carries the same rule id, so it cannot be configured per rule, the
`importSource` option cannot be passed, and ESLint's rule-level disable comments have to switch off
all five checks at once.

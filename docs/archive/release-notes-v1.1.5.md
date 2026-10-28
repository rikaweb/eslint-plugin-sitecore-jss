# Release v1.1.5: Enhanced RichText Component Protection

**Release Date:** July 22, 2025

## 🎯 What's New

This release significantly enhances the `enforce-richtext-component` rule to prevent invalid HTML structure caused by nested `<p>` elements when working with Sitecore's RichTextField.

## 🚀 Key Features

### 1. Nested `<p>` Tag Detection

The plugin now detects when `RichTextField` is used inside `<p>` tags, which creates invalid HTML since Sitecore automatically wraps RichTextField content in `<p>` elements.

**❌ Problematic Code (now detected):**

```tsx
<p>{props.fields.title.value}</p>
```

**✅ Auto-Fixed Code:**

```tsx
<RichText field={props.fields.title} />
```

### 2. RichText Component Tag Validation

Detects when `<RichText>` components use `tag="p"` attribute, which also creates nested `<p>` elements.

**❌ Problematic Code (now detected):**

```tsx
<RichText field={props.fields.body} tag="p" />
```

**✅ Auto-Fixed Code:**

```tsx
<RichText field={props.fields.body} />
```

## 📋 New Error Messages

- **`avoidNestedPTags`**: Warns when RichTextField is used inside `<p>` tags

  - _Message_: "RichTextField in `<p>` tags creates nested `<p>` elements which is invalid HTML. Use `<RichText field={fieldName} />` or change the wrapper to `<div>`."

- **`avoidRichTextPTag`**: Warns when `<RichText>` component uses `tag="p"` attribute
  - _Message_: "Using `<RichText>` with `tag="p"` creates nested `<p>` elements since Sitecore automatically adds `<p>` tags. Remove the `tag` attribute or use `tag="div"`."

## 🔧 Auto-Fix Behavior

- **For `<p>{field.value}</p>`**: Converts to `<RichText field={field} />` (defaults to `<div>` wrapper)
- **For `<RichText tag="p">`**: Removes the `tag="p"` attribute entirely

## 🎁 Benefits

1. **Valid HTML Structure**: Eliminates invalid nested `<p>` elements
2. **Better SEO**: Search engines prefer valid HTML structure
3. **Improved Accessibility**: Screen readers work better with proper HTML
4. **Automatic Fixes**: ESLint `--fix` resolves issues automatically

## 📦 Installation & Update

### Install

```bash
npm install --save-dev eslint-plugin-sitecore-jss@^1.1.5
```

### Update from Previous Version

```bash
npm update eslint-plugin-sitecore-jss
```

## ⚙️ Configuration

Add to your `.eslintrc.json`:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["sitecore-jss"],
  "rules": {
    "sitecore-jss/enforce-richtext-component": "warn"
  }
}
```

Or enable all rules:

```json
{
  "extends": ["plugin:sitecore-jss/all"]
}
```

## 🧪 Testing the New Features

Create a test file to see the new detection in action:

```tsx
interface Props {
  fields: {
    title: RichTextField;
    content: RichTextField;
  };
}

const TestComponent: React.FC<Props> = (props) => {
  return (
    <div>
      {/* Will trigger avoidNestedPTags */}
      <p>{props.fields.title.value}</p>

      {/* Will trigger avoidRichTextPTag */}
      <RichText field={props.fields.content} tag="p" />
    </div>
  );
};
```

Run ESLint:

```bash
npx eslint your-file.tsx --fix
```

## 🔗 Links

- **NPM Package**: [eslint-plugin-sitecore-jss](https://www.npmjs.com/package/eslint-plugin-sitecore-jss)
- **GitHub Repository**: [eslint-plugin-sitecore-jss](https://github.com/rikaweb/eslint-plugin-sitecore-jss)
- **Documentation**: [README.md](https://github.com/rikaweb/eslint-plugin-sitecore-jss#readme)

## 📈 What's Changed

- Enhanced `enforce-richtext-component` rule with nested `<p>` tag detection
- Added two new error message types: `avoidNestedPTags` and `avoidRichTextPTag`
- Improved auto-fix logic for better HTML structure
- Updated TypeScript definitions for new message types

**Full Changelog**: [v1.1.4...v1.1.5](https://github.com/rikaweb/eslint-plugin-sitecore-jss/compare/v1.1.4...v1.1.5)

---

**Happy linting!** 🎉 This release makes your Sitecore JSS development more robust by preventing common HTML validation issues.

# ESLint Plugin for Sitecore JSS

[![npm version](https://badge.fury.io/js/eslint-plugin-sitecore-jss.svg)](https://www.npmjs.com/package/eslint-plugin-sitecore-jss)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A custom ESLint plugin to enforce best practices when using Sitecore JSS components in a Next.js project. This plugin helps ensure correct usage of components like `Text`, `RichText`, `Image`, `Link`, and `File` from `@sitecore-jss/sitecore-jss-nextjs`.

---

## 🚀 Features

- **Prevents raw JSX usage for Sitecore fields**
- **Suggests correct Sitecore JSS components automatically**
- **Supports auto-fixing with `--fix`**
- **Preserves HTML/JSX attributes during auto-fix** (v1.1.6+)
- **Prevents invalid nested `<p>` tags** (v1.1.5+)
- **Includes multiple individual rules**
- **Ability to enable all rules at once**

---

## 📦 Installation

```sh
npm install --save-dev eslint-plugin-sitecore-jss
```

or with Yarn:

```sh
yarn add -D eslint-plugin-sitecore-jss
```

---

## 🛠 Usage

Update your `.eslintrc.json` or `.eslintrc.js`:

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["sitecore-jss"],
  "rules": {
    "sitecore-jss/enforce-text-component": "warn",
    "sitecore-jss/enforce-richtext-component": "warn",
    "sitecore-jss/enforce-image-component": "warn",
    "sitecore-jss/enforce-link-component": "warn",
    "sitecore-jss/enforce-file-component": "warn"
  }
}
```

Alternatively, you can enable all rules with:

```json
{
  "extends": ["plugin:sitecore-jss/all"]
}
```

---

## 📜 Rules

### Enforce Correct Usage of Sitecore JSS Components

This plugin includes the following rules:

#### `enforce-text-component`

Ensures that `Field<string>` and `TextField` are wrapped with `<Text>`.

**Incorrect:**

```jsx
<p>{props.fields.title.value}</p>
```

**Correct:**

```jsx
<Text field={props.fields.title} tag="p" />
```

#### `enforce-richtext-component`

Ensures that `RichTextField` is wrapped with `<RichText>`.

**Incorrect:**

```jsx
<div className="rich-text" id="content">
  {props.fields.body.value}
</div>
```

**Correct (auto-fixed):**

```jsx
<RichText
  field={props.fields.body}
  tag="div"
  className="rich-text"
  id="content"
/>
```

**Note:** As of v1.1.6, all HTML/JSX attributes (className, id, style, data-\*, etc.) are automatically preserved during auto-fix!

#### `enforce-image-component`

Ensures that `ImageField` is used with `<Image>` instead of `<img>`.

**Incorrect:**

```jsx
<img
  src={props.fields.image.value.src}
  className="hero-image"
  alt="Hero"
  loading="lazy"
/>
```

**Correct (auto-fixed):**

```jsx
<Image
  field={props.fields.image}
  className="hero-image"
  alt="Hero"
  loading="lazy"
/>
```

**Note:** The `src` attribute is automatically removed (replaced by `field`), but all other attributes are preserved!

#### `enforce-link-component`

Ensures that `LinkField` is used with `<Link>` instead of `<a>`.

**Incorrect:**

```jsx
<a
  href={props.fields.externalLink.value.href}
  className="btn btn-primary"
  target="_blank"
>
  Click Here
</a>
```

**Correct (auto-fixed):**

```jsx
<Link
  field={props.fields.externalLink}
  className="btn btn-primary"
  target="_blank"
>
  Click Here
</Link>
```

**Note:** The `href` attribute is automatically removed (replaced by `field`), but all other attributes are preserved!

#### `enforce-file-component`

Ensures that `FileField` is used with `<File>` instead of `<a>`.

**Incorrect:**

```jsx
<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>
```

**Correct:**

```jsx
<File field={props.fields.file} />
```

---

## 🤝 Contributing

Feel free to submit issues or PRs to improve this plugin.

---

## 📜 License

MIT

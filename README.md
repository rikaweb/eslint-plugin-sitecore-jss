# ESLint Plugin for Sitecore JSS

[![npm version](https://badge.fury.io/js/eslint-plugin-sitecore-jss.svg)](https://www.npmjs.com/package/eslint-plugin-sitecore-jss)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A custom ESLint plugin to enforce best practices when using Sitecore JSS components in a Next.js project. This plugin helps ensure correct usage of components like `Text`, `RichText`, `Image`, `Link`, and `File` from `@sitecore-jss/sitecore-jss-nextjs`.

---

## 🚀 Features

- **Prevents raw JSX usage for Sitecore fields**
- **Suggests correct Sitecore JSS components automatically**
- **Supports auto-fixing with `--fix`**
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
<div>{props.fields.body.value}</div>
```

**Correct:**

```jsx
<RichText field={props.fields.body} tag="div" />
```

#### `enforce-image-component`

Ensures that `ImageField` is used with `<Image>` instead of `<img>`.

**Incorrect:**

```jsx
<img src={props.fields.image.value.src} alt={props.fields.image.value.alt} />
```

**Correct:**

```jsx
<Image field={props.fields.image} />
```

#### `enforce-link-component`

Ensures that `LinkField` is used with `<Link>` instead of `<a>`.

**Incorrect:**

```jsx
<a href={props.fields.externalLink.value.href}>
  {props.fields.externalLink.value.text}
</a>
```

**Correct:**

```jsx
<Link field={props.fields.externalLink} />
```

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

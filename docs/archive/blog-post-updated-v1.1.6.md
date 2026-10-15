# Improving Sitecore JSS Development with ESLint: Introducing eslint-plugin-sitecore-jss

Date Created: February 20, 2025
status: Update
Author: Sohrab Saboori
Last edited time: November 12, 2025
Subheading: Boost your Sitecore JSS development with eslint-plugin-sitecore-jss, an ESLint plugin that enforces best practices and automates component usage checks in Sitecore projects.
Tier: Tier 2
Published URL: https://www.getfishtank.com/insights/improving-sitecore-jss-development-with-eslint-introducing-eslint-plugin-sitecore-jss
Whose Time?: 🕺 Personal
Blog Topic(s): Headless, NextJs, XM Cloud, sitecore
Preview Link: https://xmc-fishtankconc21d-getfishtanknext-prod.sitecorecloud.io/?sc_itemid=%7BB348512F-9BCB-4EDB-B724-81136C2A5D01%7D&sc_mode=preview&sc_lang=en&sc_site=getfishtank
Scheduled Date: March 13, 2025

`Title:` Enhance Sitecore JSS Development with the ESLint Plugin for Better Code Quality

`Description:` Discover how an ESLint plugin for Sitecore JSS helps you follow best practices and ensure proper use of Sitecore JSS components in Next.js projects.

OG Image

![Improving Sitecore JSS Development with ESLint - Sohrab.png](Improving_Sitecore_JSS_Development_with_ESLint_-_Sohrab.png)

---

## Why Using Sitecore JSS Components is Best Practice

When working with Sitecore JSS and XM Cloud, following best practices ensures maintainability, scalability, and proper integration with Sitecore's editing capabilities. Sitecore provides a set of JSS components specifically designed for rendering fields such as text, rich text, images, links, and files.

Using these predefined components is recommended because:

- They ensure compatibility with Sitecore Experience Editor.
- They handle field-specific rendering correctly.
- They improve consistency across your Next.js project.

More details can be found in Sitecore's official documentation

- [Sitecore JSS Components Documentation](https://doc.sitecore.com/xp/en/developers/hd/latest/sitecore-headless-development/jss-components-for-rendering-sitecore-fields-in-react-applications.html).
- For a deeper dive into how different Sitecore JSS field types work and how to use them correctly, check out [All Sitecore JSS Types and How to Use Them](https://www.getfishtank.com/insights/all-sitecore-jss-types-and-how-to-use-them).

## The Role of ESLint in JavaScript Code Quality

ESLint is a widely used tool for enforcing coding standards and identifying potential issues in JavaScript and TypeScript projects. It helps developers catch errors early and maintain clean, readable, and efficient code.

In the context of Sitecore JSS, manually reviewing all components for correct usage is time-consuming and error-prone. That's where ESLint comes in! By integrating TypeScript type-checking, we can automate the process of identifying incorrect usage of Sitecore JSS components and suggest proper fixes.

## Introducing ESLint Plugin for Sitecore JSS

To make it easier for developers to follow best practices, I've developed `eslint-plugin-sitecore-jss`, an ESLint plugin that enforces the correct usage of Sitecore JSS components in Next.js projects.

### Features

✅ Detects incorrect usage of Sitecore JSS components

✅ Recommends proper Sitecore JSS components for fields

✅ Supports auto-fixing with `--fix`

✅ Integrates seamlessly with TypeScript and ESLint

✅ Includes multiple individual rules, or a single rule for all components

### Installation

To install the plugin, run:

```tsx
npm install --save-dev eslint-plugin-sitecore-jss
```

Or using Yarn:

```tsx
yarn add -D eslint-plugin-sitecore-jss
```

### Usage

Update your ESLint configuration (`.eslintrc.json` or `.eslintrc.js`):

```tsx
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["sitecore-jss"],
}
```

Alternatively, you can enable all rules at once with:

```tsx
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["sitecore-jss"],
  "extends": ["plugin:sitecore-jss/all"],
}
```

## Rules and Examples

### enforce-text-component

Ensures that `Field<string>` and `TextField` are wrapped with `<Text>`.

**Incorrect:**

```tsx
<p>{props.fields.title.value}</p>
```

**Correct:**

```tsx
<Text field={props.fields.title} tag="p" />
```

### enforce-richtext-component

Ensures that `RichTextField` is wrapped with `<RichText>`.

**Incorrect:**

```tsx
<div>{props.fields.body.value}</div>
```

**Correct:**

```tsx
<RichText field={props.fields.body} tag="div" />
```

### enforce-image-component

Ensures that `ImageField` is used with `<Image>` instead of `<img>`.

**Incorrect:**

```tsx
<img src={props.fields.image.value.src} alt={props.fields.image.value.alt} />
```

**Correct:**

```tsx
<Image field={props.fields.image} />
```

### enforce-link-component

Ensures that `LinkField` is used with `<Link>` instead of `<a>`.

**Incorrect:**

```tsx
<a href={props.fields.externalLink.value.href}>
  {props.fields.externalLink.value.text}
</a>
```

**Correct:**

```tsx
<Link field={props.fields.externalLink} />
```

### enforce-file-component

Ensures that `FileField` is used with `<File>` instead of `<a>`.

**Incorrect:**

```tsx
<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>
```

**Correct:**

```tsx
<File field={props.fields.file} />
```

## Update: Major Enhancements Since Beta Release

Since the initial release of `eslint-plugin-sitecore-jss` in beta, we've made significant improvements based on community feedback and real-world usage. Here are the key updates that make this plugin even more powerful for Sitecore JSS development:

### Enhanced TypeScript Support (v1.1.0)

**What's New:**

- Full TypeScript migration for all rule implementations
- Improved type checking utilities for better field type detection
- Enhanced support for complex type scenarios including union and intersection types

**Why It Matters:**
The plugin now provides more accurate detection of Sitecore field types, reducing false positives and ensuring your TypeScript projects get the most precise linting possible.

### Advanced RichText Component Protection (v1.1.5)

**What's New:**
We've significantly enhanced the `enforce-richtext-component` rule to prevent a common HTML validation issue:

### **Problem Solved: Nested `<p>` Tag Prevention**

**The Issue:**
Sitecore automatically wraps RichTextField content in `<p>` tags. When developers inadvertently use RichTextField in their own `<p>` tags, it creates invalid nested `<p>` elements:

```tsx
// ❌ Creates invalid nested <p> tags
<p>{props.fields.richContent.value}</p>

// ❌ Also problematic - RichText with p tag
<RichText field={props.fields.content} tag="p" />

```

**The Solution:**
The plugin now detects both scenarios and provides intelligent auto-fixes:

```tsx
// ✅ Auto-fixed to valid HTML
<RichText field={props.fields.richContent} />

// ✅ Removes problematic tag attribute
<RichText field={props.fields.content} />

```

### New Error Messages

1. **`avoidNestedPTags`**: Warns when RichTextField is used inside `<p>` tags
2. **`avoidRichTextPTag`**: Warns when `<RichText>` component uses `tag="p"` attribute

Both errors include smart auto-fixes that default to using `<div>` wrappers, ensuring valid HTML structure.

### Improved Developer Experience

**Enhanced Error Messages:**
All error messages now provide clearer explanations of why certain patterns are problematic and suggest specific solutions.

**Better Auto-Fixes:**
The auto-fix functionality has been refined to:

- Choose appropriate wrapper elements based on context
- Preserve existing field references accurately
- Maintain code formatting and structure

### Production-Ready Stability

Through multiple patch releases (v1.1.2 - v1.1.4), we've resolved:

- Build process improvements
- TypeScript compilation edge cases
- Enhanced error handling in type checking utilities

### Getting the Latest Version

Update to the latest version to get all these improvements:

```bash
npm update eslint-plugin-sitecore-jss

```

Or install fresh:

```bash
npm install --save-dev eslint-plugin-sitecore-jss@latest

```

### Impact on Your Development Workflow

These enhancements mean:

1. **Cleaner HTML Output**: No more invalid nested `<p>` elements in your rendered pages
2. **Enhanced Accessibility**: Screen readers and assistive technologies work better with proper HTML structure
3. **Faster Development**: Auto-fixes handle common mistakes automatically

### Game-Changing Update: Attribute Preservation (v1.1.6)

**What's New:**

The most requested feature is finally here! Version 1.1.6 introduces **automatic attribute preservation** during auto-fix, eliminating one of the biggest pain points in the development workflow.

**The Problem We Solved:**

Previously, when the plugin auto-fixed your code, it would lose all your HTML/JSX attributes:

```tsx
// Before fix
<div className="rich-text" id="content" style={{ padding: '20px' }}>
  {props.fields.body.value}
</div>

// After fix - attributes were lost! 😞
<RichText field={props.fields.body} tag="div" />
```

Developers had to manually copy and paste `className`, `id`, `style`, and other attributes after every auto-fix. This was tedious and error-prone.

**The Solution:**

Now, all attributes are **automatically preserved**:

```tsx
// Before fix
<div className="rich-text" id="content" style={{ padding: '20px' }}>
  {props.fields.body.value}
</div>

// After fix - attributes preserved! 🎉
<RichText
  field={props.fields.body}
  tag="div"
  className="rich-text"
  id="content"
  style={{ padding: '20px' }}
/>
```

**What Gets Preserved:**

- ✅ `className` - All your CSS classes
- ✅ `id` - Element identifiers
- ✅ `style` - Inline styles
- ✅ `data-*` attributes - Custom data attributes
- ✅ `aria-*` attributes - Accessibility attributes
- ✅ `{...props}` - Spread attributes
- ✅ All other valid JSX attributes

**Smart Filtering:**

The plugin intelligently removes attributes that conflict with the `field` prop:

- `src` is removed for Image components (replaced by `field`)
- `href` is removed for Link/File components (replaced by `field`)
- All other attributes are preserved as-is

**Real-World Examples:**

**Image Component:**

```tsx
// Before
<img
  src={props.fields.image.value.src}
  className="hero-image"
  alt="Hero"
  loading="lazy"
/>

// After - className, alt, and loading preserved!
<Image
  field={props.fields.image}
  className="hero-image"
  alt="Hero"
  loading="lazy"
/>
```

**Link Component:**

```tsx
// Before
<a
  href={props.fields.link.value.href}
  className="btn btn-primary"
  target="_blank"
>
  Click Here
</a>

// After - className and target preserved!
<Link
  field={props.fields.link}
  className="btn btn-primary"
  target="_blank"
>
  Click Here
</Link>
```

**Why This Matters:**

1. **Zero Manual Work** - No more copying attributes after auto-fix
2. **Preserves Your Styling** - All CSS classes and inline styles stay intact
3. **Maintains Accessibility** - ARIA attributes are preserved
4. **Production Ready** - Safe to use `--fix` in CI/CD pipelines
5. **Developer Happiness** - Reduces friction and frustration

This update makes the plugin truly production-ready and removes the last major barrier to adoption!

### Complete Version History

For a detailed look at all changes across versions, check out the [CHANGELOG.md](https://github.com/rikaweb/eslint-plugin-sitecore-jss/blob/main/CHANGELOG.md) on GitHub.

**Key Milestones:**

- **v1.0.0-beta.1** - Initial release with core rules
- **v1.1.0** - Full TypeScript migration
- **v1.1.5** - Nested `<p>` tag prevention
- **v1.1.6** - Attribute preservation (latest)

## 🙌 Contribute and Provide Feedback!

This is an open-source project, and contributions are always welcome! If you find any issues or have suggestions for improvements, feel free to open an issue or submit a pull request on GitHub.

🔗 **GitHub Repository:** [eslint-plugin-sitecore-jss](https://github.com/rikaweb/eslint-plugin-sitecore-jss)

It would be really helpful if you try it out in your projects and share your feedback. Let's improve this together and make Sitecore JSS development even better! 🚀

🔗**NPM:** [eslint-plugin-sitecore-jss](https://www.npmjs.com/package/eslint-plugin-sitecore-jss)

🔗**GitHub:** [github.com/rikaweb/eslint-plugin-sitecore-jss](https://github.com/rikaweb/eslint-plugin-sitecore-jss)

## References:

- [Sitecore Headless Development: Sitecore JavaScript Rendering SDKs (JSS)](https://doc.sitecore.com/xp/en/developers/hd/19/sitecore-headless-development/sitecore-javascript-rendering-sdks--jss-.html)
- [Sitecore Headless Development: Model-Bound Views](https://doc.sitecore.com/xp/en/developers/hd/22/sitecore-headless-development/model-bound-views.html#accessing-sitecore-content-from-model-bound-view-component-razor-views)
- [Sitecore Headless Development: JSS Components for Rendering Sitecore Fields in React Applications](https://doc.sitecore.com/xp/en/developers/hd/latest/sitecore-headless-development/jss-components-for-rendering-sitecore-fields-in-react-applications.html#file)
- [All Sitecore JSS Types and How to Use Them (getfishtank.com)](https://www.getfishtank.com/insights/all-sitecore-jss-types-and-how-to-use-them)
- [Typed Linting with TypeScript ESLint](https://typescript-eslint.io/getting-started/typed-linting/)

# Attribute Preservation Feature Summary

## Overview

All ESLint auto-fix rules in `eslint-plugin-sitecore-jss` now preserve HTML/JSX attributes when converting raw JSX elements to Sitecore JSS components.

## What Changed?

### Before This Update ❌

When auto-fixing, attributes like `className`, `id`, `style`, etc. were **lost**:

```jsx
// Original code
<div className="rich-text" id="content">{props.fields.body.value}</div>

// After auto-fix (attributes lost!)
<RichText field={props.fields.body} tag="div" />
```

### After This Update ✅

All attributes are now **preserved**:

```jsx
// Original code
<div className="rich-text" id="content">{props.fields.body.value}</div>

// After auto-fix (attributes preserved!)
<RichText field={props.fields.body} tag="div" className="rich-text" id="content" />
```

## Affected Rules

All five component enforcement rules now preserve attributes:

1. ✅ `enforce-richtext-component`
2. ✅ `enforce-text-component`
3. ✅ `enforce-image-component` (excludes `src`)
4. ✅ `enforce-link-component` (excludes `href`)
5. ✅ `enforce-file-component` (excludes `href`)

## Smart Attribute Filtering

The auto-fix intelligently removes attributes that would conflict with the `field` prop:

- **Image components**: `src` is removed (replaced by `field`)
- **Link components**: `href` is removed (replaced by `field`)
- **File components**: `href` is removed (replaced by `field`)
- **All other attributes**: Preserved as-is

## Examples by Component Type

### RichText Component

```jsx
// Before
<div className="content" style={{ padding: '20px' }} data-testid="rich">
  {props.fields.body.value}
</div>

// After
<RichText field={props.fields.body} tag="div" className="content" style={{ padding: '20px' }} data-testid="rich" />
```

### Text Component

```jsx
// Before
<h1 className="title" id="main-heading">{props.fields.title.value}</h1>

// After
<Text field={props.fields.title} tag="h1" className="title" id="main-heading" />
```

### Image Component

```jsx
// Before
<img src={props.fields.image.value.src} className="hero-image" alt="Hero" loading="lazy" />

// After
<Image field={props.fields.image} className="hero-image" alt="Hero" loading="lazy" />
```

### Link Component

```jsx
// Before
<a href={props.fields.link.value.href} className="btn" target="_blank">Click</a>

// After
<Link field={props.fields.link} className="btn" target="_blank">Click</Link>
```

### File Component

```jsx
// Before
<a href={props.fields.doc.value.src} className="download" download>Download</a>

// After
<File field={props.fields.doc} className="download" download>Download</File>
```

## Spread Attributes Support

JSX spread attributes are also preserved:

```jsx
// Before
<div className="content" {...otherProps}>{props.fields.body.value}</div>

// After
<RichText field={props.fields.body} tag="div" className="content" {...otherProps} />
```

## Benefits

1. **No Manual Work**: No need to manually copy attributes after auto-fixing
2. **Preserves Styling**: All CSS classes and inline styles are maintained
3. **Maintains Accessibility**: ARIA attributes and data attributes are preserved
4. **Production Ready**: Safe to use with `--fix` flag in CI/CD pipelines
5. **Developer Friendly**: Reduces friction when adopting Sitecore JSS best practices

## Usage

Simply run ESLint with the `--fix` flag:

```bash
npx eslint --fix src/**/*.tsx
```

Or enable auto-fix on save in your editor (VS Code, WebStorm, etc.).


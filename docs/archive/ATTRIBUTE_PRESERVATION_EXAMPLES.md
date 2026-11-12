# Attribute Preservation in Auto-Fix

As of the latest version, all ESLint rules in `eslint-plugin-sitecore-jss` now preserve HTML/JSX attributes when auto-fixing code. This means that when you use the `--fix` flag, your `className`, `id`, `style`, and other attributes will be preserved in the converted Sitecore JSS components.

## 📋 Examples

### `enforce-richtext-component`

**Before (Incorrect):**
```jsx
<div className="rich-text" id="content">{props.fields.body.value}</div>
```

**After Auto-Fix:**
```jsx
<RichText field={props.fields.body} tag="div" className="rich-text" id="content" />
```

**With Multiple Attributes:**
```jsx
<div className="content" style={{ padding: '20px' }} data-testid="rich-content">
  {props.fields.body.value}
</div>
```

**After Auto-Fix:**
```jsx
<RichText field={props.fields.body} tag="div" className="content" style={{ padding: '20px' }} data-testid="rich-content" />
```

---

### `enforce-text-component`

**Before (Incorrect):**
```jsx
<h1 className="title" id="main-heading">{props.fields.title.value}</h1>
```

**After Auto-Fix:**
```jsx
<Text field={props.fields.title} tag="h1" className="title" id="main-heading" />
```

**With Spread Attributes:**
```jsx
<p className="description" {...otherProps}>{props.fields.description.value}</p>
```

**After Auto-Fix:**
```jsx
<Text field={props.fields.description} tag="p" className="description" {...otherProps} />
```

---

### `enforce-image-component`

**Before (Incorrect):**
```jsx
<img src={props.fields.image.value.src} className="hero-image" alt="Hero" loading="lazy" />
```

**After Auto-Fix:**
```jsx
<Image field={props.fields.image} className="hero-image" alt="Hero" loading="lazy" />
```

**Note:** The `src` attribute is automatically removed since it's replaced by the `field` prop.

---

### `enforce-link-component`

**Before (Incorrect):**
```jsx
<a href={props.fields.link.value.href} className="btn btn-primary" target="_blank" rel="noopener">
  Click Here
</a>
```

**After Auto-Fix:**
```jsx
<Link field={props.fields.link} className="btn btn-primary" target="_blank" rel="noopener">
  Click Here
</Link>
```

**Note:** The `href` attribute is automatically removed since it's replaced by the `field` prop.

---

### `enforce-file-component`

**Before (Incorrect):**
```jsx
<a href={props.fields.document.value.src} className="download-link" download>
  Download PDF
</a>
```

**After Auto-Fix:**
```jsx
<File field={props.fields.document} className="download-link" download>
  Download PDF
</File>
```

**Note:** The `href` attribute is automatically removed since it's replaced by the `field` prop.

---

## 🎯 Key Benefits

1. **No Manual Attribute Transfer**: You no longer need to manually copy attributes after auto-fixing
2. **Preserves Styling**: All CSS classes and inline styles are maintained
3. **Maintains Accessibility**: ARIA attributes and data attributes are preserved
4. **Supports Spread Operators**: JSX spread attributes (`{...props}`) are also preserved
5. **Smart Filtering**: Attributes that are replaced by the `field` prop (like `src`, `href`) are automatically removed to avoid conflicts

## 🔧 Usage

Simply run ESLint with the `--fix` flag:

```bash
npx eslint --fix src/components/**/*.tsx
```

Or use your editor's auto-fix on save feature to automatically apply these fixes as you code.

## ⚠️ Important Notes

- **Attribute Order**: Attributes are preserved in their original order after the `field` and `tag` props
- **Conflicting Attributes**: Attributes that conflict with the component's field prop (like `src` for images, `href` for links) are automatically removed
- **Spread Attributes**: Spread attributes are preserved and will be passed through to the underlying component


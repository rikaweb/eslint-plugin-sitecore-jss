# Release Summary: v1.1.6

## ✨ Feature: Attribute Preservation in Auto-Fix

**Status:** ✅ Implemented and Tested

### What Changed

All ESLint auto-fix rules now preserve HTML/JSX attributes when converting raw JSX elements to Sitecore JSS components.

### Files Modified

1. **lib/rules/enforce-richtext-component.ts** - Added attribute extraction and preservation
2. **lib/rules/enforce-text-component.ts** - Added attribute extraction and preservation
3. **lib/rules/enforce-image-component.ts** - Added attribute extraction and preservation (excludes `src`)
4. **lib/rules/enforce-link-component.ts** - Added attribute extraction and preservation (excludes `href`)
5. **lib/rules/enforce-file-component.ts** - Added attribute extraction and preservation (excludes `href`)
6. **package.json** - Updated version to 1.1.6
7. **CHANGELOG.md** - Documented the new feature
8. **README.md** - Updated examples to show attribute preservation

### How It Works

The fixer now:

1. Extracts all JSX attributes from the original element
2. Filters out conflicting attributes (src, href) that are replaced by the `field` prop
3. Appends preserved attributes to the new Sitecore JSS component
4. Supports both regular attributes and spread attributes (`{...props}`)

### Example Transformation

**Before:**

```tsx
<div className="rich-text" id="content" style={{ padding: "20px" }}>
  {props.fields.body.value}
</div>
```

**After (auto-fixed):**

```tsx
<RichText
  field={props.fields.body}
  tag="div"
  className="rich-text"
  id="content"
  style={{ padding: "20px" }}
/>
```

### Testing

✅ Tested in real Sitecore JSS project
✅ Attributes successfully preserved
✅ Build successful
✅ No linter errors

### Benefits

1. **No Manual Work** - Developers no longer need to manually copy attributes after auto-fixing
2. **Preserves Styling** - All CSS classes and inline styles are maintained
3. **Maintains Accessibility** - ARIA attributes and data attributes are preserved
4. **Production Ready** - Safe to use with `--fix` flag in CI/CD pipelines
5. **Developer Friendly** - Reduces friction when adopting Sitecore JSS best practices

### Supported Attributes

- ✅ `className`
- ✅ `id`
- ✅ `style`
- ✅ `data-*` attributes
- ✅ `aria-*` attributes
- ✅ `target`, `rel`, `download`, etc.
- ✅ Spread attributes `{...props}`

### Smart Filtering

- `src` is automatically removed for Image components (replaced by `field` prop)
- `href` is automatically removed for Link/File components (replaced by `field` prop)
- All other attributes are preserved as-is

### Version Info

- **Version:** 1.1.6
- **Release Date:** November 12, 2025
- **Previous Version:** 1.1.5
- **Breaking Changes:** None

### Next Steps

1. ✅ Feature implemented
2. ✅ Tested and working
3. ⏭️ Ready to publish to npm (when ready)

### Usage

Users can now safely run:

```bash
npx eslint --fix src/**/*.tsx
```

And all their attributes will be preserved automatically!

---

**Developed by:** Sohrab Saboori  
**Repository:** https://github.com/rikaweb/eslint-plugin-sitecore-jss

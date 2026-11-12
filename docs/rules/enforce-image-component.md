# sitecore-jss/enforce-image-component

Render Sitecore image fields (`ImageField`) with `<Image>` instead of a raw `<img src={…}>`.

- Included in `recommended` / `flat/recommended` (`warn`) and `strict` (`error`).
- Auto-fixable. Requires type information.

## Why

`<Image>` reads `src`, `alt`, `width` and `height` from the field, applies Sitecore media URL handling
(`imageParams`, `srcSet`) and keeps the image editable in Pages / Experience Editor. A hand-written
`<img>` loses all of that.

## Examples

Incorrect:

```tsx
<img src={props.fields.image.value.src} alt="Hero" loading="lazy" />
<img src={props.fields.image.value?.src} />
<img src={props.fields.image.value!.src} />
<img src={image.src} />                 // `image: ImageFieldValue`
```

Correct:

```tsx
<Image field={props.fields.image} alt="Hero" loading="lazy" />
<Image field={props.fields.image} />
<Image field={props.fields.image} />
<Image field={image} />
```

Not reported:

```tsx
<img src={logo} alt="logo" />           // plain string
<img src="/static/hero.png" alt="" />   // literal
<img src={meta.src} />                  // `meta` is not an image field
```

## What the fix does

The `<img>` is replaced by `<Image field={…} …attributes />`. `src` is dropped because the component
derives it from the field; every other attribute is kept verbatim, including ones that read the field
value such as `alt={props.fields.image.value?.alt}` (the component accepts them as overrides). A
`missingImport` problem with its own fix adds `Image` to the imports when needed.

No fix is offered when `Image` is already bound to something else — typically `import Image from
"next/image"`. The problem is still reported; rename one of the two imports and run `--fix` again.

Both `ImageField` and a bare `ImageFieldValue` are recognised. Under `strictNullChecks`,
`ImageField.value` is optional; the rule looks through the `undefined` member of the union.

## Options

| Option | Type | Description |
|---|---|---|
| `importSource` | `string` | Package to import `Image` from when the file has no Sitecore import that can be extended. Defaults to the package family that declares the field's type. |

## Messages

- `useImageComponent` — an `<img>` reads an image field by hand.
- `missingImport` — `Image` is needed but not imported from a Sitecore package.

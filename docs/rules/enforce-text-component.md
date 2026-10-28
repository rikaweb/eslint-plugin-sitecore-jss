# sitecore-jss/enforce-text-component

Render Sitecore text fields (`Field<string>`, `TextField`) with `<Text>` instead of reading `.value`
inside a JSX element.

- Included in `recommended` / `flat/recommended` (`warn`) and `strict` (`error`).
- Auto-fixable. Requires type information.

## Why

`<Text>` renders the value *and* keeps the field editable in Pages / Experience Editor. Writing
`{props.fields.title.value}` into an `<h1>` renders the same text on the live site but silently removes
the inline editing experience, and it ignores the `editable` markup Sitecore sends in editing mode.

## Examples

Incorrect:

```tsx
<h1 className="title">{props.fields.title.value}</h1>
<p>{props.fields.subtitle?.value}</p>
<li>{title}</li>                     // `title: Field<string>` rendered without `.value`
```

Correct:

```tsx
<Text field={props.fields.title} tag="h1" className="title" />
<Text field={props.fields.subtitle} tag="p" />
<Text field={title} tag="li" />
```

Not reported:

```tsx
<p>{label}</p>                           // plain string, not a field
<p>{props.fields.title.value.length}</p> // a value derived from the field
<Card title={props.fields.title} />      // the field is passed on, not rendered
<span>{count.value}</span>               // `Field<number>` (not covered in 2.0)
```

## What the fix does

The element is replaced by `<Text field={…} tag="<element>" …attributes />`, keeping every attribute and
spread. If `Text` is not imported, a second problem (`missingImport`) is reported with a fix that extends
an existing import from a Sitecore package or adds one after the last import.

The fix is **not** offered when it could lose code or shadow a binding; the problem is still reported:

| Situation | Message |
|---|---|
| other children next to the field (`<h3>Hello {title.value}</h3>`) | `useTextComponent`, no fix |
| the wrapper is a component (`<Typography>{title.value}</Typography>`) | `useTextComponentInWrapper` (pass the field to `<Text>`, or let the component accept the field) |
| `Text` is already bound to something else (a local, an import from another package, a type-only import) | `useTextComponent`, no fix |

## Options

```js
"sitecore-jss/enforce-text-component": ["warn", { importSource: "@sitecore-jss/sitecore-jss-react" }]
```

| Option | Type | Description |
|---|---|---|
| `importSource` | `string` | Package to import `Text` from when the file has no Sitecore import that can be extended. Defaults to the package family that declares the field's type (`@sitecore-content-sdk/nextjs` or `@sitecore-jss/sitecore-jss-nextjs`). |

## Messages

- `useTextComponent` — the field is rendered by hand inside an HTML element.
- `useTextComponentInWrapper` — the field is rendered by hand inside a component.
- `missingImport` — `Text` is needed but not imported from a Sitecore package.

## Related

- [enforce-richtext-component](enforce-richtext-component.md) for `RichTextField`.

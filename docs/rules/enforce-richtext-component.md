# sitecore-jss/enforce-richtext-component

Render Sitecore rich text fields (`RichTextField`) with `<RichText>` instead of reading `.value` or using
`dangerouslySetInnerHTML`, and avoid nested `<p>` elements.

- Included in `recommended` / `flat/recommended` (`warn`) and `strict` (`error`).
- Auto-fixable. Requires type information.

## Why

A rich text value is HTML. `{props.fields.body.value}` renders it as escaped text,
`dangerouslySetInnerHTML` renders it but loses inline editing, and both skip Sitecore's internal link
handling. `<RichText>` does all of that. Sitecore also wraps rich text content in `<p>` elements, so
rendering it inside another `<p>` (or with `tag="p"`) produces invalid nested paragraphs.

## Examples

Incorrect:

```tsx
<div className="rte">{props.fields.body.value}</div>
<div dangerouslySetInnerHTML={{ __html: props.fields.body.value ?? "" }} />
<p>{props.fields.body.value}</p>
<RichText field={props.fields.body} tag="p" />
```

Correct:

```tsx
<RichText field={props.fields.body} tag="div" className="rte" />
<RichText field={props.fields.body} tag="div" />
<RichText field={props.fields.body} />          {/* defaults to a <div> wrapper */}
<RichText field={props.fields.body} />
```

Not reported:

```tsx
<div dangerouslySetInnerHTML={{ __html: html }} />   // plain string, not a field
<div>{props.fields.title.value}</div>                 // Field<string>: enforce-text-component's job
```

## What the fix does

| Problem | Fix |
|---|---|
| `{body.value}` inside an HTML element | `<RichText field={…} tag="<element>" …attributes />` |
| `{body.value}` inside `<p>` | `<RichText field={…} …attributes />` (no tag, so the wrapper becomes a `<div>`) |
| `dangerouslySetInnerHTML={{ __html: body.value }}` (also with `?? ""` / `\|\| ""`) | `<RichText field={…} tag="<element>" …other attributes />` |
| `<RichText tag="p">` (also `tag={"p"}`) | the `tag` attribute is removed |

Attributes and spreads are kept. A `missingImport` problem with its own fix adds `RichText` to the
imports when needed.

No fix is offered (the problem is still reported) when other children sit next to the field, when the
wrapper is a component (`useRichTextComponentInWrapper`), or when `RichText` is already bound to
something else in the file.

## Options

| Option | Type | Description |
|---|---|---|
| `importSource` | `string` | Package to import `RichText` from when the file has no Sitecore import that can be extended. Defaults to the package family that declares the field's type. |

## Messages

- `useRichTextComponent` — the field is rendered by hand inside an HTML element.
- `useRichTextComponentInWrapper` — the field is rendered by hand inside a component.
- `avoidNestedPTags` — the field is rendered inside `<p>`.
- `avoidRichTextPTag` — `<RichText tag="p">`.
- `avoidDangerouslySetInnerHTML` — the field's HTML is injected with `dangerouslySetInnerHTML`.
- `missingImport` — `RichText` is needed but not imported from a Sitecore package.

## Related

- [enforce-text-component](enforce-text-component.md) for `Field<string>` / `TextField`.

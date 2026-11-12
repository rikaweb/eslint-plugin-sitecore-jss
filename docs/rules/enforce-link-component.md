# sitecore-jss/enforce-link-component

Render Sitecore link fields (`LinkField`) with `<Link>` instead of a raw `<a href={…}>`.

- Included in `recommended` / `flat/recommended` (`warn`) and `strict` (`error`).
- Auto-fixable. Requires type information.

## Why

A general link field carries more than an `href`: the link text, target, title, anchor, query string
and link type (internal, external, media, mailto…). `<Link>` renders all of it, resolves internal links
through the router in the Next.js packages, and keeps the link editable. A hand-written `<a>` keeps only
what the developer remembered to copy.

## Examples

Incorrect:

```tsx
<a href={props.fields.link.value.href} className="btn">{props.fields.link.value.text}</a>
<a href={props.fields.link.value?.href}><span>Read more</span></a>
<a href={link.href}>{link.text}</a>     // `link: LinkFieldValue`
```

Correct:

```tsx
<Link field={props.fields.link} className="btn" />
<Link field={props.fields.link}><span>Read more</span></Link>
<Link field={link} />
```

Not reported:

```tsx
<a href="/about">About</a>
<a href={url}>Go</a>                                   // plain string
<a href={props.fields.file.value.src}>…</a>            // FileField: enforce-file-component's job
```

## What the fix does

The `<a>` becomes `<Link field={…} …attributes>children</Link>`. `href` is dropped; every other
attribute is kept. The children are kept too, unless they only re-render the field's own text
(`{link.value.text}`), which `<Link>` renders by itself; then the result is self-closing. A
`missingImport` problem with its own fix adds `Link` to the imports when needed.

No fix is offered when `Link` is already bound to something else — typically `import Link from
"next/link"`. The problem is still reported; alias one of the imports (for example
`import NextLink from "next/link"`) and run `--fix` again.

## Options

| Option | Type | Description |
|---|---|---|
| `importSource` | `string` | Package to import `Link` from when the file has no Sitecore import that can be extended. Defaults to the package family that declares the field's type. |

## Messages

- `useLinkComponent` — an `<a>` reads a link field by hand.
- `missingImport` — `Link` is needed but not imported from a Sitecore package.

## Related

- [enforce-file-component](enforce-file-component.md) for `FileField`.

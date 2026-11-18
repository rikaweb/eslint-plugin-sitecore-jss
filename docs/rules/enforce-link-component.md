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
<a href={nav.home.value.href}>Home</a>                 // your own `LinkField` type, not Sitecore's
```

## What the fix does

The `<a>` becomes `<Link field={…} …attributes>children</Link>`. `href` is dropped; every other
attribute is kept. The children are kept too, unless they only re-render the field's own text
(`{link.value.text}`), which `<Link>` renders by itself; then the result is self-closing. A
`missingImport` problem with its own fix adds `Link` to the imports when needed.

An `<a>` whose only child is a text field (`<a href={link.value.href}>{title.value}</a>`) becomes
`<Link field={…}>{title.value}</Link>`; `enforce-text-component` then reports the text inside `<Link>` so
you can wrap it in `<Text field={title} />`.

No fix is offered when `Link` is already bound to something else — typically `import Link from
"next/link"`. The problem is still reported; alias one of the imports (for example
`import NextLink from "next/link"`, or `import { Link as SitecoreLink }` from the Sitecore package, which
the fix then uses) and run `--fix` again.

No fix is offered either, and the problem is still reported, when:

- the `<a>` has no children (`<a href={link.value.href} aria-label="Home" className="logo" />`). The
  anchor renders nothing, but `<Link>` without children renders the link text, or the URL when the text
  is empty, so an icon link would start showing text. Decide what the link should contain and convert
  it by hand.
- the fix would delete a comment (`<a href={…}>{/* label */}{link.value.text}</a>`). Comments among
  children that are kept are carried over.

### Optional fields

The fix passes the field on exactly as it was read: `<a href={card.link?.value.href}>` becomes
`<Link field={card.link}>`. `<Link>` declares `field` as required, so with an optional field
(`link?: LinkField`) under `strictNullChecks` TypeScript reports the new line. `<Link>` renders nothing
for an empty field at run time; add the guard that fits the component, for example
`{card.link && <Link field={card.link} />}`.

## Options

| Option | Type | Description |
|---|---|---|
| `importSource` | `string` | Package to import `Link` from when the file has no Sitecore import that can be extended. Defaults to the package family that declares the field's type. A `Link` already imported from this package is recognised as the Sitecore component. |

## Messages

- `useLinkComponent` — an `<a>` reads a link field by hand.
- `missingImport` — `Link` is needed but not imported from a Sitecore package.

## Related

- [enforce-file-component](enforce-file-component.md) for `FileField`.

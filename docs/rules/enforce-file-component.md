# sitecore-jss/enforce-file-component

Render Sitecore file fields (`FileField`) with `<File>` instead of a raw `<a href={…}>`.

- Included in `recommended` / `flat/recommended` (`warn`) and `strict` (`error`).
- Auto-fixable. Requires type information.

## Why

`<File>` renders the media URL and falls back to the file's display name or title for the link text,
so a content author can swap the file without a code change and the link text follows. A
hand-written `<a href={file.value.src}>` has to repeat that logic.

## Examples

Incorrect:

```tsx
<a href={props.fields.file.value.src}>{props.fields.file.value.title}</a>
<a href={props.fields.file.value?.src} className="dl">Download</a>
<a href={file.src}>{file.displayName}</a>   // `file: FileFieldValue`
```

Correct:

```tsx
<File field={props.fields.file} />
<File field={props.fields.file} className="dl">Download</File>
<File field={file} />
```

Not reported:

```tsx
<a href="/docs/guide.pdf">Guide</a>
<a href={url}>Download</a>                             // plain string
<a href={props.fields.link.value.href}>…</a>           // LinkField: enforce-link-component's job
```

## What the fix does

The `<a>` becomes `<File field={…} …attributes>children</File>`. `href` is dropped; every other
attribute is kept. The children are kept too, unless they only re-render the field's own
`title` or `displayName`, which `<File>` renders by itself; then the result is self-closing. A
`missingImport` problem with its own fix adds `File` to the imports when needed.

No fix is offered when `File` is already bound to something else in the file (the DOM `File` global
is not a binding and does not block the fix).

## Options

| Option | Type | Description |
|---|---|---|
| `importSource` | `string` | Package to import `File` from when the file has no Sitecore import that can be extended. Defaults to the package family that declares the field's type. |

## Messages

- `useFileComponent` — an `<a>` reads a file field by hand.
- `missingImport` — `File` is needed but not imported from a Sitecore package.

## Related

- [enforce-link-component](enforce-link-component.md) for `LinkField`.

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

No fix is offered when `File` is already bound to something else in the file, or when the file uses
the DOM global `File` (`new File(…)`, `file: File`). A `File` imported from a Sitecore package under an
alias (`import { File as SitecoreFile }`) is used under that alias.

No fix is offered either, and the problem is still reported, when:

- the `<a>` has no children (`<a href={file.value.src} className="icon-pdf" />`). The anchor renders
  nothing, but `<File>` without children renders the file's title, so an icon link would start showing
  text.
- the fix would delete a comment (`<a href={…}>{file.value.title}{/* pdf */}</a>`). Comments among
  children that are kept are carried over.

### Optional fields

The fix passes the field on exactly as it was read: `<a href={doc.file?.value.src}>` becomes
`<File field={doc.file}>`. `<File>` declares `field` as required, so with an optional field
(`file?: FileField`) under `strictNullChecks` TypeScript reports the new line. Add the guard that fits
the component, for example `{doc.file && <File field={doc.file} />}`.

## Options

| Option | Type | Description |
|---|---|---|
| `importSource` | `string` | Package to import `File` from when the file has no Sitecore import that can be extended. Defaults to the package family that declares the field's type. A `File` already imported from this package is recognised as the Sitecore component. |

## Messages

- `useFileComponent` — an `<a>` reads a file field by hand.
- `missingImport` — `File` is needed but not imported from a Sitecore package.

## Related

- [enforce-link-component](enforce-link-component.md) for `LinkField`.

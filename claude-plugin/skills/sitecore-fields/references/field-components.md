# Field components in detail

Source of each statement: **[src]** read in the published package's code or type declarations
(`@sitecore-content-sdk/react` and `/nextjs` 1.4.1; `@sitecore-jss/sitecore-jss-react` and
`-nextjs` 23.0.0); **[docs]** stated in Sitecore's documentation; **[unverified]** general
knowledge that was not checked. The two families share almost all of this; differences are called
out.

## Contents

- [How editing reaches the component](#how-editing-reaches-the-component)
- [Text](#text)
- [RichText](#richtext)
- [Image and NextImage](#image-and-nextimage)
- [Link](#link)
- [File](#file)
- [DateField](#datefield)
- [Fields with no component](#fields-with-no-component)

## How editing reaches the component

- **Content SDK**: in editing mode each field carries `metadata`. A field component then wraps its
  output between two `<code type="text/sitecore" chrometype="field" class="scpm">` marker elements
  that the Pages editor reads. **[src]** This is why a field component must not sit inside
  `<title>`, `<option>` or `<textarea>`, and why two components for the same field are both
  editable.
- **JSS**: Experience Editor and chromes mode send `field.editable`, a string of editing HTML that
  the component renders instead of the value. **[src]** From JSS 22.1, XM Cloud Pages uses metadata
  mode by default, like the Content SDK. **[docs]**
- **Empty field while editing** (Content SDK): the component renders a default placeholder (text or
  image) so the author has something to click. Override it with `emptyFieldEditingComponent`.
  **[src]**
- **Empty field on the live site**: every component returns `null`. **[src]** No guard is needed
  around the component itself.
- `editable={false}` opts one usage out of editing (for example a second rendering of the same field
  in a meta tag helper). **[src]**

## Text

```tsx
<Text field={fields.Title} tag="h1" className="hero-title" />
```

- `field` is `{ value?: string | number }`, so `Field<string>`, `Field<number>` and `TextField` all
  fit. **[src]**
- Without `tag` it renders bare text on the live site and a `<span>` while editing. Pass `tag` when
  the markup matters for styling or semantics, rather than wrapping `<Text>` in an element. **[src]**
- Line breaks in the value become `<br />`. **[src]**
- `encode={false}` injects the value as HTML and disables editing for that usage. It is not a
  substitute for `<RichText>`. **[src]**
- Other props are passed to the element (`className`, `id`, `data-*`). **[src]**

## RichText

```tsx
<RichText field={fields.Body} className="rte" />
```

- Wrapper is `tag`, default `<div>`. The value is injected as HTML. **[src]**
- The content already has block elements, so `tag="p"` or a surrounding `<p>` produces invalid
  nested paragraphs (browsers re-parent them and hydration warns). The linter reports both.
- The Next.js packages' `RichText` also wires internal links (`a[href^="/"]`) to the Next router and
  prefetches them; `prefetchLinks={false}` or `"hover"` tunes that for link-heavy content, and
  `internalLinksSelector` changes which links count. **[src]** Import it from the `nextjs` package,
  not from `react`, in a Next.js app.
- Style rich text from the wrapper class down (`.rte p`, `.rte a`); authors control the inner tags.

## Image and NextImage

```tsx
<Image field={fields.Image} className="card-img" />
<NextImage field={fields.Image} sizes="(min-width: 1024px) 50vw, 100vw" />
```

`Image`:

- Renders `<img>`. Every property of the field value (`src`, `alt`, `width`, `height`) is spread
  onto it, then your props override them. **[src]** So `alt` comes from the media item; pass `alt`
  only to override on purpose.
- `imageParams={{ mw: 800 }}` adds Sitecore media resize parameters; `srcSet={[{ mw: 400 }, { mw: 800 }]}`
  builds a `srcset`. **[src]** They work on Sitecore media URLs.
- Accepts an `ImageField` or a bare `ImageFieldValue`. **[src]**

`NextImage` (Next.js packages):

- Wraps `next/image` with a Sitecore loader. Takes the `next/image` props except `src`; passing
  `src` throws `Detected src prop`. **[src] [docs]**
- Uses `width` / `height` from the field value; with `fill` it drops them (the parent then needs
  `position: relative` and a size, as with any `next/image`). **[src]**
- Defaults `alt` to `""`, and is `unoptimized` in editing and preview. **[src]**
- The media host must be allowed in `next.config` `images.remotePatterns`. The starter ships
  wildcard patterns that Sitecore says not to keep in production. **[docs]**

Choose `Image` when you need the plain element, Sitecore's own `srcSet`, or the project does not use
`next/image`; choose `NextImage` when the project already relies on Next.js image optimisation.
Follow what neighbouring components do. The linter's fix always writes `<Image>`; moving to
`NextImage` is a manual step, and the linter accepts both.

## Link

```tsx
<Link field={fields.Cta} className="btn" />
<Link field={fields.Cta} className="card-link"><Text field={fields.Title} /></Link>
```

- Renders `<a>` with `href` (plus `querystring` and `anchor`), `title`, `target` and the field's
  `class`. `target="_blank"` gets `rel="noopener noreferrer"`. **[src]**
- Link text: with no children it renders the field's `text`, falling back to the `href`. Children
  replace the text; `showLinkTextWithChildrenPresent` renders both. **[src]**
- The Next.js packages' `Link` renders `next/link` when the `href` matches `internalLinkMatcher`
  (default: starts with `/`), is not a file URL, and the page is not being edited; it accepts the
  `next/link` props `prefetch`, `replace`, `scroll`, `shallow`, `as`, `passHref`. **[src]**
- Your props override the field's attributes (`className` replaces the field's `class`). **[src]**
- A link field with an empty `href` renders nothing on the live site, including its children. Keep
  content that must always show outside the `<Link>`.

## File

```tsx
<File field={fields.Brochure} className="download" />
```

- Renders `<a href={src}>` with the file's `title`, falling back to `displayName`, as text. Children
  replace the text. **[src]**
- Not inline-editable in either family: it emits no editing markup. **[src]** Authors change the
  file in the field editor panel.

## DateField

```tsx
<DateField
  field={fields.PublishDate}
  tag="time"
  render={(date) => date?.toLocaleDateString("en-CA", { dateStyle: "long" })}
/>
```

- Without `render` it prints the raw stored value (an ISO-like string), which is rarely wanted.
  `render` receives a `Date` or `null`. **[src]**
- Without `tag` it renders bare text. **[src]**
- Format with an explicit locale and time zone. A server render and a browser hydration in
  different zones otherwise disagree. **[unverified]** for Sitecore specifically; standard React
  hydration behaviour.
- The linter has no date rule yet: `{fields.PublishDate.value}` typed `Field<string>` is reported by
  `enforce-text-component` and its fix writes `<Text>`. Change that to `<DateField>` by hand.

## Fields with no component

| Field | Shape in `fields` | Use |
|---|---|---|
| Checkbox | `Field<boolean>` | `fields.ShowCta?.value` in a condition |
| Droplink, Droptree | an `Item` (`{ id, url, name, displayName, fields }`) or `null` | render the referenced item's own fields with field components |
| Multilist, Treelist | `Item[]` | `map` over it; use `item.id` as `key` |
| Droplist | `Field<string>` | usually logic (a variant name), not content |
| Number, Integer | `Field<number>` | `<Text>` |

The referenced-item shapes are the layout service's defaults **[unverified]**: confirm against the
component's real JSON (the `rendering` prop, or the layout response) before typing them, because an
integrated GraphQL query on the rendering replaces `fields` with the query result
(`fields.data.datasource...`), where each field is `{ jsonValue }` and the field component takes
`field={x.jsonValue}`.

---
name: sitecore-fields
description: Conventions for rendering Sitecore fields in React / Next.js components built with Sitecore JSS (@sitecore-jss/sitecore-jss-nextjs, sitecore-jss-react) or the Sitecore Content SDK (@sitecore-content-sdk/nextjs, react) on XM Cloud / SitecoreAI. Use this whenever you create, edit, review or debug a component that receives Sitecore `fields` props or imports from those packages - choosing Text vs RichText, Image vs NextImage vs next/image, Sitecore Link vs next/link, File, DateField; typing `fields`; keeping fields editable in the Pages editor / Experience Editor; empty-field and datasource guards; Placeholder vs AppPlaceholder; and fixing eslint-plugin-sitecore-jss findings. Use it even when the request only says "Sitecore component", "XM Cloud component", "rendering", "datasource" or shows `fields.x.value` in JSX.
---

# Sitecore field components (JSS and Content SDK)

A Sitecore field is not a string. It is an object (`{ value, ... }`) that also carries what the
editor needs to make the field clickable in Pages / Experience Editor. The field components
(`<Text>`, `<RichText>`, `<Image>`, `<Link>`, `<File>`, `<DateField>`) render the value *and* that
editing data. Reading `field.value` into plain JSX renders the same HTML on the live site and
silently removes inline editing, media URL handling and link resolution. Nothing fails, so it is
usually found by a content author after release. That is the mistake this skill exists to prevent.

`eslint-plugin-sitecore-jss` catches the mechanical cases. This skill covers the judgment the linter
cannot make, and tells you how to work with the linter when it is installed.

## 1. Find out what the project uses

The same component is written differently per package family and router, so check before writing:

- **Family**: look at `package.json` dependencies, or at the imports of a neighbouring component.
  `@sitecore-content-sdk/*` is the Content SDK; `@sitecore-jss/*` is JSS. Import field components and
  field types from the package the project already uses (the Next.js flavour when present). Never mix
  families in one file, and never guess the import path.
- **Router**: an `app/` (or `src/app/`) directory with `page.tsx` / `layout.tsx` means App Router;
  `pages/` means Pages Router. It changes placeholders, datasource checks and client/server rules.
- **Conventions**: open one or two existing components and copy their shape (named `Default` export
  vs default export, props type, how `params.styles` is used). The project's own pattern wins over
  any template here.

`node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-project.mjs"` prints all of this as JSON (family, import
source, router, ESLint and linter status).

Details per family and router: [references/package-families.md](references/package-families.md).

## 2. Pick the component from the field type

| Sitecore field | TypeScript type | Render with |
|---|---|---|
| Single-Line / Multi-Line Text | `Field<string>` (or `TextField`) | `<Text field={f} tag="h2" />` |
| Rich Text | `RichTextField` | `<RichText field={f} />` |
| Image | `ImageField` | `<Image field={f} />`, or `<NextImage field={f} />` |
| General Link | `LinkField` | `<Link field={f} />` |
| File | `FileField` | `<File field={f} />` |
| Date / Datetime | `Field<string>` | `<DateField field={f} render={(d) => ...} />` |
| Number / Integer | `Field<number>` | `<Text field={f} />` |
| Checkbox | `Field<boolean>` | not rendered: read `f.value` in logic |

Type every field with its real type. The linter is type-aware: it finds a hand-rendered rich text
field only if the field is typed `RichTextField`, and it cannot see anything typed `any`,
`Field` without a type argument used as a catch-all, or `Record<string, unknown>`.

Props, defaults and edge cases of each component:
[references/field-components.md](references/field-components.md).

## 3. What the linter cannot decide for you

- **Text or RichText.** The choice follows the field type in the Sitecore template, not the look of
  the content. A Rich Text field rendered with `<Text>` shows escaped HTML tags; `<Text encode={false}>`
  renders the HTML but switches editing off. If the template field is Rich Text, use `<RichText>`.
- **No block wrapper inside a paragraph.** Rich text is HTML that already contains `<p>`, lists and
  headings. Do not put `<RichText>` inside a `<p>` or give it `tag="p"`; leave the default `<div>`
  or use another block tag. Likewise do not nest `<Text tag="div">` inside a `<p>` or a heading.
- **Sitecore `Link` vs `next/link`.** A `LinkField` goes to the Sitecore `<Link>`; in the Next.js
  packages it already renders `next/link` for internal URLs, so nothing is lost. Use `next/link`
  only for routes written in code. When a file needs both, alias one of them
  (`import NextLink from "next/link"`, or `Link as SitecoreLink`): the linter will not rewrite an
  element while `Link` names something else, and linter 2.0.0 only writes the unaliased `<Link>`.
- **`Image` vs `NextImage` vs `next/image`.** An `ImageField` goes to `<Image>` (plain `<img>` with
  Sitecore media parameters) or `<NextImage>` (Next.js optimisation; needs the media host in
  `images.remotePatterns`, never accepts `src`). `next/image` directly is for static assets only.
  Same aliasing rule: `import NextImage from "next/image"` would collide, so name it differently.
- **Children of `<Link>`.** Children replace the link text the author typed. Pass no children when
  the author's text should show, or put a `<Text>` of another field inside. Do not write
  `{link.value.text}` as the child: that is what the component renders by itself.
- **Do not hide an empty field from the editor.** `{f?.value && <Text field={f} />}` (or
  `{img?.value?.src && <Image field={img} />}`) removes the field from the page when it is empty,
  so an author can never click into it to fill it. The field components already return nothing for
  an empty field on the live site, and render a placeholder in editing mode. Render them unguarded.
  `Link`, `File` and `DateField` require a defined `field`: guard those on the field object
  (`{f && <Link field={f} />}`), not on its value. Guard only *wrapper markup* on the value, and
  keep it when editing: `{(f?.value || isEditing) && <div className="eyebrow"><Text field={f} /></div>}`.
  How to get `isEditing` per family and router is in the package-families reference.
- **Props that override the field.** `<Image>` takes `alt`, `width` and `height` from the media
  item; a hardcoded `alt="..."` replaces what the author entered, so pass it only on purpose.
- **Text-only elements keep `.value`.** `<title>`, `<option>`, `<textarea>`, `<script>`, `<style>`
  and attributes such as `alt`, `aria-label`, `content` can only hold plain text, and editing markup
  inside them is invalid. `field.value` is correct there, and the linter never reports it.
- **Derived values are fine.** `.value` in a condition, a `key`, a class name, a `.length`, a
  formatted string or an analytics call is logic, not rendering.
- **Values passed through a variable are invisible to the linter.**
  `const href = fields.cta.value.href; <a href={href}>` is the same mistake, undetected. Pass the
  field object down to the place where it is rendered, and render it there with the component.
- **Wrapper components.** `<Heading>{f.value}</Heading>` loses editing too. Put the field component
  inside (`<Heading><Text field={f} /></Heading>`) or let the wrapper accept the field.
- **A missing datasource is normal.** `fields` is undefined or empty when the author has not picked
  a datasource item. Type `fields` so the compiler makes you handle that, and follow the family's
  datasource-check pattern (package-families reference).
- **Placeholders.** Nested components come from `<Placeholder>` (Pages Router, JSS) or
  `<AppPlaceholder>` (Content SDK App Router), never from importing child components directly.

## 4. Working with the linter

If `eslint-plugin-sitecore-jss` is installed, lint the component files you touched before you say
you are done (`npx eslint <files>`, or
`node "${CLAUDE_PLUGIN_ROOT}/scripts/lint-fields.mjs" <files>` for a compact summary), and fix what
it reports. Its five rules, the cases it reports without a fix and how to
resolve each by hand are in [references/linter.md](references/linter.md). If it is not installed in a
JSS / Content SDK project, mention once that it exists; do not install it unasked.

Two commands in this plugin wrap the common workflows; suggest them, or follow the same steps
yourself when the user asks in plain words:

- `/jss:review [files]` lints changed or given files and explains every finding.
- `/jss:component <Name> [field:type ...]` scaffolds a typed component. The templates live in
  [references/scaffolding.md](references/scaffolding.md); read that file whenever you create a new
  Sitecore component, with or without the command.

## Verified against

Content SDK 1.4.1 and 2.3.0, JSS 23.0.0, eslint-plugin-sitecore-jss 2.0.1. The reference files mark
what was checked in package source and what was not. When the project's installed version behaves
differently, trust the installed package's type declarations over this text.

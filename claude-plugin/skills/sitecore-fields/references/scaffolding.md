# Scaffolding a typed Sitecore component

Read "Field spec to code" and "What to copy from the project", then only the template section for
the detected family and router, then "After writing the file".

## Field spec to code

| Spec word | Sitecore field | Type | Markup |
|---|---|---|---|
| `text` | Single-Line / Multi-Line Text | `Field<string>` | `<Text field={fields.X} tag="..." />` |
| `richtext` | Rich Text | `RichTextField` | `<RichText field={fields.X} />` |
| `image` | Image | `ImageField` | `<Image field={fields.X} />` (`NextImage` when neighbours use it) |
| `link` | General Link | `LinkField` | `{fields.X && <Link field={fields.X} />}` |
| `file` | File | `FileField` | `{fields.X && <File field={fields.X} />}` |
| `date` | Date / Datetime | `Field<string>` | `{fields.X && <DateField field={fields.X} tag="time" render={formatDate} />}` |
| `number` | Number / Integer | `Field<number>` | `<Text field={fields.X} tag="span" />` (bare value; a label is the user's call) |
| `checkbox` | Checkbox | `Field<boolean>` | no element: `fields.X?.value` switches something |

An unknown spec word (`datetime`, `multiline`, `html`) maps to the closest row when the meaning is
obvious; otherwise ask. Reference fields (droplink, multilist) have no spec word: ask what should be
rendered from the referenced items.

Rules the templates follow, and why:

- **Field names** are used exactly as given: they must equal the Sitecore template field names. A
  field named like a component (`Image`, `Link`) is fine; it is a property, not a binding.
- **Every field is optional** (`Title?: Field<string>`). A datasource can lack a field, and optional
  types make the compiler point at every unguarded use.
- **`Text`, `RichText`, `Image` accept an undefined `field`** and render nothing, so they need no
  guard. **`Link`, `File`, `DateField` require `field`**: guard on the field *object*
  (`fields.Cta && ...`), never on `.value`, so an empty field is still rendered, and editable, in
  the editor.
- **A checkbox is the one field read through `.value`**, because it is never rendered. Use it for a
  variant, not for content: `const className = fields.Highlight?.value ? "promo promo--highlight" : "promo";`.
- **Semantic tag through `tag`** (`<Text tag="h2">`), not a wrapper element around `<Text>`. Use
  `h2` for a component title unless told otherwise.
- **Dates get an explicit format.** `DateField` without `render` prints the raw stored string.
  Define the formatter once, outside the component, with a fixed locale and time zone so the server
  render and the browser agree:

  ```tsx
  const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
  const formatDate = (date: Date | null) => (date ? dateFormat.format(date) : null);
  ```

  Ask for the locale and format when they are not given; `en-US` long is a placeholder.
- **Fields are rendered in the order given**, unless the user describes a layout.
- **Wrapper markup that should disappear with an empty field** is guarded with the editing check,
  `(fields.Eyebrow?.value || isEditing) && <div>...</div>`. Add it only when a design asks for it.

## What to copy from the project

Read one or two real components first. Skip generated stubs (often marked by a comment or a
`StubProps` type), test fixtures and deliberately bad examples (folders such as `__tests__`,
`*-test`, `stories`), and prefer a component that renders several field types. When the real
components disagree with each other, follow the majority.

Copy the project's **style**:

- export shape (`export const Default` plus default export, default export only, variants);
- how props are typed: `interface` or `type`, a shared `ComponentProps` import or a local `params`
  type. Import `ComponentProps` only when neighbours do; `sharedPropsType` in the detect output says
  whether the file exists, not whether the project uses it;
- wrapper conventions: `params.styles` and `RenderingIdentifier` on the root element only when
  neighbours do that;
- the missing-datasource branch: the neighbours' empty state (including its wording, with this
  component's name) or `withDatasourceCheck`. Use the template's hint only when the project has no
  pattern;
- the `JSX` type: `import type { JSX } from 'react'`, `React.JSX.Element`, or the global `JSX`;
- quotes, semicolons, line endings and line width (`.prettierrc`, `.editorconfig`), path aliases;
- styling: Tailwind classes, CSS modules, BEM, or none. The class names in the templates are
  placeholders. With no clear convention, or when neighbours only use inline styles, write a root
  class named after the component and nothing else; do not invent a visual design.

Do **not** copy field handling that breaks the rules above, even when every neighbour does it:
`<h2><Text field={f} /></h2>`, `{f?.value && <Text field={f} />}`, `{f?.value?.src && <Image ... />}`,
raw `.value` rendering. The style comes from the project; the field handling comes from this file.
Mention the difference in one line so the user knows it is deliberate.

## Content SDK, App Router

Server component by default. Add `"use client"` as the first line only when the component needs
hooks or event handlers.

```tsx
import type { JSX } from 'react';
import {
  Text,
  RichText,
  Image,
  Link,
  Field,
  ImageField,
  LinkField,
  RichTextField,
} from '@sitecore-content-sdk/nextjs';
import { ComponentProps } from 'lib/component-props';

type PromoFields = {
  Title?: Field<string>;
  Body?: RichTextField;
  Image?: ImageField;
  Cta?: LinkField;
};

type PromoProps = ComponentProps & {
  fields?: PromoFields;
};

export const Default = ({ fields, params }: PromoProps): JSX.Element => {
  const id = params?.RenderingIdentifier;
  const className = `component promo ${params?.styles ?? ''}`.trimEnd();

  if (!fields) {
    return (
      <div className={className} id={id}>
        <span className="is-empty-hint">Promo: select a datasource item</span>
      </div>
    );
  }

  return (
    <div className={className} id={id}>
      <Image field={fields.Image} className="promo__image" />
      <Text field={fields.Title} tag="h2" className="promo__title" />
      <RichText field={fields.Body} className="promo__body" />
      {fields.Cta && <Link field={fields.Cta} className="promo__cta" />}
    </div>
  );
};

export default Default;
```

- `ComponentProps` (`rendering`, `params`) is the starter's type in `src/lib/component-props`;
  check the path alias in `tsconfig.json` (`lib/*`, `@/lib/*`, `src/lib/*`). Without it, declare
  `params?: { [key: string]: string | undefined }` locally.
- For the editing check add `page?: Page` to the props (`Page` comes from the same package) and read
  `page?.mode.isEditing`; `AppPlaceholder` passes `page` to server components.
- A child placeholder is
  `<AppPlaceholder name="promo-content" rendering={rendering} page={page} componentMap={componentMap} />`
  with `page: Page` and `componentMap: ComponentMap` in the props.
- `DateField` and `File` are imported from the same package. A `render` function passed from a
  server component to `DateField` compiled and linted in the Content SDK 1.4 starter; it was not
  exercised in a running App Router page, so check it once in the browser.

## Content SDK, Pages Router

The App Router template works unchanged; differences:

- No server components: hooks are allowed without a directive.
- The editing check is `const { page } = useSitecore();` then `page.mode.isEditing`.
- A child placeholder is `<Placeholder name="promo-content" rendering={rendering} />`.
- `withDatasourceCheck()<PromoProps>(Promo)` is available as an alternative to the `if (!fields)`
  branch, when neighbours use it.

## JSS (Next.js, Pages Router)

```tsx
import type { JSX } from 'react';
import {
  Text,
  RichText,
  Image,
  Link,
  Field,
  ImageField,
  LinkField,
  RichTextField,
  withDatasourceCheck,
} from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

type PromoFields = {
  Title?: Field<string>;
  Body?: RichTextField;
  Image?: ImageField;
  Cta?: LinkField;
};

type PromoProps = ComponentProps & {
  fields: PromoFields;
};

const Promo = ({ fields, params }: PromoProps): JSX.Element => (
  <div className={`component promo ${params?.styles ?? ''}`.trimEnd()} id={params?.RenderingIdentifier}>
    <Image field={fields.Image} className="promo__image" />
    <Text field={fields.Title} tag="h2" className="promo__title" />
    <RichText field={fields.Body} className="promo__body" />
    {fields.Cta && <Link field={fields.Cta} className="promo__cta" />}
  </div>
);

export default withDatasourceCheck()<PromoProps>(Promo);
```

- `withDatasourceCheck` covers the missing datasource, so `fields` is required in the props.
- SXA-style JSS projects export `Default` (and variants) as named exports and check `fields` inside,
  like the Content SDK template.
- The editing check is `const { sitecoreContext } = useSitecoreContext();` then
  `sitecoreContext.pageEditing`.
- Projects on `@types/react` older than 18.2 have no `JSX` export from `react`; they use the global
  `JSX` namespace and drop that import.

## After writing the file

1. **Lint it** when eslint-plugin-sitecore-jss is configured: `npx eslint <file>`. A fresh scaffold
   must come back with no `sitecore-jss/*` finding. If the project has Prettier, run
   `npx prettier --write <file>` on the new file: it also sets the project's line endings, which a
   freshly written file may not have.
2. **Type-check it**: the project's type-check script, or `npx tsc --noEmit --incremental false`
   (the flag stops `tsc` from writing `tsconfig.tsbuildinfo` into the project). Read only the lines
   for the new file; projects often carry unrelated errors.
3. **Registration.** Content SDK: the map script (`npm run sitecore-tools:generate-map`, also run by
   `dev` and `build`) rewrites `.sitecore/component-map*.ts`. JSS: the `bootstrap` / `dev` script
   regenerates the component builder. Name the script that applies and offer to run it; never edit
   the generated files.
4. **Tell the user what Sitecore still needs**: a rendering item whose component name equals the
   file name, a datasource template with exactly these field names, and the rendering added to a
   placeholder's allowed controls. The front-end file alone renders nothing.

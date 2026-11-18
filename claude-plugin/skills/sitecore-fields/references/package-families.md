# Package families and routers

Source markers: **[src]** read in package code or types (Content SDK 1.4.1 / 2.3.0, JSS 23.0.0) or
in Sitecore's Content SDK starter apps; **[docs]** Sitecore documentation or the Sitecore GitHub
repositories; **[unverified]** not checked, confirm in the project.

## Which family, which import

| | Content SDK | JSS |
|---|---|---|
| Next.js app | `@sitecore-content-sdk/nextjs` | `@sitecore-jss/sitecore-jss-nextjs` |
| React without Next.js | `@sitecore-content-sdk/react` | `@sitecore-jss/sitecore-jss-react` |
| Routers | Pages Router and App Router | Pages Router (see note) |

Both Next.js packages re-export everything a component needs, so one import line is enough **[src]**:

- components: `Text`, `RichText`, `Image`, `NextImage`, `Link`, `File`, `DateField`, `Placeholder`
- types: `Field`, `TextField`, `RichTextField`, `ImageField`, `LinkField`, `FileField`,
  `ComponentRendering`, `ComponentParams`
- `withDatasourceCheck`

In a Next.js app import `Link` and `RichText` from the `nextjs` package: those versions add router
integration that the `react` versions do not have. **[src]**

Only in the Content SDK: `AppPlaceholder`, `useSitecore`, `Page`. Only in JSS: `useSitecoreContext`,
`withSitecoreContext`, `EditFrame`, `ComponentBuilder`. **[src]**

Note on JSS and the App Router: the JSS Next.js package's component-level data types are
`GetStaticComponentProps` / `GetServerSideComponentProps` **[src]**, which are Pages Router
concepts. Treat a JSS app as Pages Router unless the project clearly does otherwise.
**[unverified]**

A project with both families installed is in the middle of a migration. Use the family the file
(or its folder) already imports, and ask if a new file's home is unclear.

Content SDK 1.x to 2.x keeps the field component names and import path. Changes that touch
components: `ref` is a regular prop on `RichText` / `Link`, and `withSitecore` is deprecated in
favour of `useSitecore` / props. **[docs]**

## Props a component receives

A component rendered by a placeholder gets `rendering` (with `componentName`, `dataSource`, `uid`,
`placeholders`), `params` (rendering parameters, plus `styles` and `RenderingIdentifier` on SXA
headless renderings) and `fields` (the datasource item's fields). **[src]** The starters define the
shared part once, usually as `ComponentProps` in `src/lib/component-props`; extend it instead of
re-declaring `rendering` and `params`:

```tsx
type PromoProps = ComponentProps & { fields?: PromoFields };
```

Content SDK App Router server components also receive `page` and `componentMap` from
`AppPlaceholder`. Components that the map marks as client components do not. **[src]**

Field names in `fields` are the template field names exactly as created in Sitecore (case-sensitive,
often PascalCase). Do not invent or re-case them; ask for the template or look at the layout JSON.

## Is the page being edited?

| Where | How |
|---|---|
| Content SDK, App Router server component | `props.page.mode.isEditing` **[src]** |
| Content SDK, client component or Pages Router | `const { page } = useSitecore();` then `page.mode.isEditing` **[src]** |
| JSS | `const { sitecoreContext } = useSitecoreContext();` then `sitecoreContext.pageEditing` **[src]** |

`page.mode` also has `isNormal`, `isPreview` and `isDesignLibrary`. **[src]**

## Missing datasource

| Family and router | Pattern |
|---|---|
| JSS | `export default withDatasourceCheck()<PromoProps>(Promo);` renders nothing on the live site and an editing hint in the editor. **[src] [docs]** |
| Content SDK, Pages Router | `withDatasourceCheck()` works the same way (it skips the check in Design Library). **[src]** |
| Content SDK, App Router | In 1.x `withDatasourceCheck` reads React context, so it cannot wrap a server component. Check in the component: `if (!fields) return <PromoEmpty />;` or `if (!rendering.dataSource) ...`. **[src] [docs]** A server-safe version was merged upstream in November 2026; whether the installed version has it is **[unverified]**, so read `withDatasourceCheck`'s declaration before relying on it. |

The starters' own components use the explicit form in both routers: an early
`if (!fields) return <EmptyState />`, where the empty state is a small hint that names the
component. **[src]** Follow the project.

## Placeholders

```tsx
// Pages Router (both families): the component map / factory comes from context
<Placeholder name="promo-content" rendering={props.rendering} />

// Content SDK App Router: page and componentMap are passed explicitly
<AppPlaceholder
  name="promo-content"
  rendering={props.rendering}
  page={props.page}
  componentMap={props.componentMap}
/>
```

`AppPlaceholder` requires `page` and `componentMap`; `Placeholder` gets both from the provider.
**[src] [docs]** The placeholder name must match a placeholder key allowed on the rendering in
Sitecore. Dynamic placeholder naming (`name-{*}` with `params.DynamicPlaceholderId`) follows the
SXA convention **[unverified]**: copy it from an existing container component in the project.

## Registering the component

- **Content SDK**: components are found through a generated map, `.sitecore/component-map.ts`,
  written by `sitecore-tools project component generate-map` (the starters expose it as the npm
  script `sitecore-tools:generate-map` and run it in `dev` and `build`). **[src] [docs]** In the App
  Router a file that starts with `"use client"` is registered with `componentType: "client"` and
  also lands in `component-map.client.ts`. **[src] [docs]** Regenerate; do not edit the map by hand.
- **JSS**: the starter generates a component builder / factory at build time
  (`src/temp/componentBuilder.ts`, from the `bootstrap` script). **[unverified]** Run the project's
  `bootstrap` or `dev` script after adding a file.
- **Variants**: named exports of the component file (`Default`, `Right`, ...) are selected by the
  rendering variant, which arrives as `params.FieldNames`. Export `Default` at minimum when the
  project uses this pattern. **[src]**

The component name in the map is the file name, and it must equal the *component name* of the
rendering item in Sitecore. Creating the rendering item, its datasource template and the
placeholder settings happens in Sitecore (or in serialized items), not in the front-end code.

## Server and client components (App Router)

The field components are client components inside the package and can be used from a server
component as they are. **[src]** Add `"use client"` to your own component only when it uses hooks,
state or event handlers; that also moves it to the client map. Keep data fetching in server
components, or in `getComponentServerProps` exported from the component file. **[src]**

---
name: component
description: Scaffold a typed Sitecore component for the project's package family (JSS or Content SDK) and Next.js router, rendering every field through the right field component so it passes eslint-plugin-sitecore-jss.
argument-hint: "<ComponentName> [FieldName:type ...]  (types: text richtext image link file date number checkbox)"
disable-model-invocation: true
---

# /jss:component

Create one new component file that follows this project's style, with typed `fields` and every
field rendered through its Sitecore field component.

Arguments: `$ARGUMENTS`

- First word: the component name in PascalCase. It becomes the file name and must equal the
  component name of the rendering item in Sitecore.
- Then zero or more `FieldName:type` pairs, e.g. `Title:text Body:richtext Image:image Cta:link`.
  Field names are used exactly as written, because they must equal the Sitecore template field
  names. Types: `text`, `richtext`, `image`, `link`, `file`, `date`, `number`, `checkbox`.
- Anything that is not a `Name:type` pair is a free-text instruction (variant names, "client
  component", a target folder, a layout).

If the name is missing, ask for it. If no fields are given, ask which fields the datasource template
has instead of inventing a set; a component without a datasource is fine when the user says so.

The rules and templates are in
`${CLAUDE_PLUGIN_ROOT}/skills/sitecore-fields/references/scaffolding.md`. Read its first two
sections, the template for the detected family and router, and its last section.

## Steps

1. **Detect the project.**

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-project.mjs" [dir]
   ```

   Without `dir` it uses the current directory; in a monorepo pass the app folder. Use `root`,
   `family`, `importSource`, `router`, `componentsDir`, `sharedPropsType`, `linter.status` and
   `scripts`. Stop and ask when `family` is `none` (wrong folder?) or `both` (which family should
   the new file use?).

2. **Learn the project's style** as described under "What to copy from the project" in
   `scaffolding.md`: one or two real components, not stubs or fixtures. Style comes from the
   project; field handling comes from `scaffolding.md`, even where the neighbours do it differently.

3. **Write the file** at `<componentsDir>/<Name>.tsx`, or in the folder the user named. If existing
   components live in `Name/Name.tsx` or `Name/index.tsx` folders, follow that layout. If a file or
   a component-map entry with this name already exists, show it and ask instead of overwriting.
   Import from `importSource`, and import only what the file uses. Keep the markup minimal and
   semantic: no invented copy, no placeholder content.

4. **Verify and report**, following "After writing the file" in `scaffolding.md`.
   - If `linter.status` is not `configured`, say in one line that the linter could not check the
     file and that `/jss:review` can set it up. Do not install it here.
   - Report the file path, each field with its type and component, the verification results as they
     actually came out, anything you did differently from the neighbouring components and why, the
     registration script, and what still has to exist in Sitecore.

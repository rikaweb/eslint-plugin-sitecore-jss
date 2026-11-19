---
name: review
description: Run eslint-plugin-sitecore-jss on changed or given Sitecore JSS / Content SDK component files and explain every finding, including the ones reported without an automatic fix. Offers the linter setup when it is missing.
argument-hint: "[files or folders] [--fix]"
disable-model-invocation: true
---

# /jss:review

Review Sitecore field usage in component files: run the linter, explain each finding in terms of
what the content author loses, then check what the linter cannot see.

Arguments: `$ARGUMENTS` (files, folders or globs; optional `--fix`). Nothing is rewritten unless
`--fix` was passed or the user says yes later.

Reference files, read when a step calls for them:

- `${CLAUDE_PLUGIN_ROOT}/skills/sitecore-fields/references/linter.md`: setup blocks, what each
  message id means and costs the author, manual rewrites for findings without a fix, known limits.
- `${CLAUDE_PLUGIN_ROOT}/skills/sitecore-fields/SKILL.md`, section "What the linter cannot decide
  for you": the checklist for step 5.
- `${CLAUDE_PLUGIN_ROOT}/skills/sitecore-fields/references/package-families.md`: the
  missing-datasource pattern and the editing check per family and router, needed to judge and to
  fix step 5 items.

## 1. Detect the project

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-project.mjs" [dir]
```

Without `dir` it uses the current directory, which is right when the session runs in the app
folder. In a monorepo pass the folder of the files being reviewed; the script walks up to the
nearest `package.json`, and every later command runs from that `root`.

Fields this command uses: `root`, `family`, `router`, `packageManager`, `node`, `eslint.config`
(`format`, `file`, `mentionsTypeInfo`), `eslint.parser.declared`, `typescript.declared`,
`linter.status`, `linter.declared`, `componentsDir`, `changedTsx`.

If `family` is `none`, say that no JSS or Content SDK package was found and ask whether this is the
right folder.

## 2. Make sure the linter can run

`linter.status` is `configured`: go to step 3.

Otherwise the linter cannot run yet. Read the project's ESLint config file (`eslint.config.file`),
then tell the user what is missing and show the exact setup from `linter.md`, adapted to that file:

- `not-installed`, `declared-not-installed`, `installed-not-declared`: the install command for
  `packageManager`. Leave out a package that is already a declared dev dependency
  (`eslint.parser.declared`, `typescript.declared`). `installed-not-declared` means the package is
  only a leftover in `node_modules`, so it still has to be installed properly.
- any status except `configured`: the config change, as a diff against the real file, for the
  format in `eslint.config.format`. Keep the project's own structure (`defineConfig([...])`,
  `FlatCompat`, an existing `__dirname`), and put the new entries after the existing ones. Skip the
  parser block only when the file already sets `projectService` or `project` for TypeScript files.
- Say that the config is untested until ESLint has run with it, and that type-aware linting makes
  the project's lint run slower.

Ask once, in the same message: install and configure, or review by reading only. Do not install or
edit before a yes.

- On yes: apply, then continue with step 3.
- On no: do steps 3 and 5 (skip step 4), say clearly at the top of the report that the review was
  done by reading, without the linter, and in step 6 offer only the manual edits.

## 3. Choose the files

1. Paths in the arguments, if any. A folder means the `.tsx` files below it.
2. Otherwise `changedTsx`: `.tsx` files changed against `HEAD` plus untracked ones, in this project
   only.
3. If that is empty, say so and ask whether to review the whole `componentsDir` instead of silently
   linting everything. When step 2 already asks a question, put this one in the same message.

## 4. Run the linter and explain

From `root`:

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/lint-fields.mjs" <files or folders>
```

The script runs the project's own ESLint without `--fix` and prints a summary: `counts`, and per
finding `file`, `line`, `column`, `rule`, `messageId`, `severity`, `fixable`, the `source` line and
ESLint's `message`. `missingImport` messages are already folded away and counted in
`counts.importFixes`; `counts.findings` / `fixable` / `manual` are the numbers to report. (The same
data comes from `npx eslint --format json <files>` if the script cannot be used: keep `ruleId`s
starting with `sitecore-jss/`; a `fix` property means fixable.)

Do not pass `--fix` to anything in this step, even when it was requested: the explanation needs the
original findings.

- `kind: "no-type-information"` in the output means the parser block is missing or does not cover
  the file: return to step 2 with that diagnosis. `fatal` entries are syntax or configuration
  problems; report them as such.
- `counts.otherRules` are findings from other ESLint rules. Mention the number in one line; they
  are out of scope.
- Read the files that have findings once now. Step 5 needs them too.
- `linter.md` covers every message id. Open
  `node_modules/eslint-plugin-sitecore-jss/docs/rules/<rule>.md` only when the installed version
  reports a message id or declines a fix in a way `linter.md` does not explain.

Report grouped by file, in line order, in this shape:

```
src/components/Promo.tsx
  12:7  enforce-text-component / useTextComponent    warn    fix available
        <h2>{fields.Title.value}</h2>
        Why: the title renders, but authors cannot click it in Pages to edit it.
        Fix: <Text field={fields.Title} tag="h2" /> (eslint --fix does this and adds the import)

  31:9  enforce-link-component / useLinkComponent    warn    no automatic fix
        <a href={fields.Cta.value.href}> while `Link` is imported from next/link
        Why: the anchor drops the link's target, title, query string and anchor.
        Why no fix: `Link` already names next/link in this file.
        By hand: import NextLink from "next/link" (rename its usages), then run --fix.
```

For every finding give the position, rule and message id, severity, whether a fix exists, the
offending code, what the author or visitor loses, and the concrete rewrite. For a finding without a
fix, work out from the source line which row of the "Findings without a fix" table in `linter.md`
applies (when two could apply, name both) and give that manual rewrite. Also say when the fix keeps
something that changes behaviour, such as a hardcoded `alt` or link children that will override
what the author entered.

List files with no findings in one line. End with one summary line from `counts`: findings, fixable,
by hand.

## 5. Check what the linter cannot see

Go through the reviewed files against "What the linter cannot decide for you" in the skill and
"Known limits" in `linter.md`. Only files that import from a Sitecore package or receive `fields`
need this pass.

List what you find under the heading **Not from the linter**, with file and line and a one-line
reason. Keep it to real problems in these files:

- group identical findings across files into one entry with the list of locations;
- when a judgment depends on something not in the code, most often the field type in the Sitecore
  template, say so and mark the item as to be confirmed;
- no generic advice, and nothing already said in step 4: a hardcoded `alt` or link children on an
  element that has a linter finding belong to that finding's note, not here.

If nothing was found, say which checks were made in one line.

## 6. Offer the fixes

If there is anything to fix, offer the following (with `--fix` in the arguments, do it), in order:

1. Manual renames that unblock the fixer (a `next/link` or `next/image` import that takes the
   component's name).
2. `npx eslint --fix <files>` for the fixable findings. Skip when the linter is not set up.
3. The remaining manual rewrites: findings without a fix, and the step 5 items.
4. Verify: run `lint-fields.mjs` again, then the type check, reading only the lines for the
   touched files. Use a type-check script if `scripts` in the detect output has one (that list is
   filtered to lint, type-check, format, build and map scripts); otherwise
   `npx tsc --noEmit --incremental false`.

Report what changed and what is still open. If the lint run was clean and step 5 found nothing, say
exactly that in one or two lines.

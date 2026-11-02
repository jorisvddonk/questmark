# How to validate documents in CI

A broken link or a misspelled opcode can sit in a document for months and only
surface when a player follows the wrong option. This guide makes the build
fail first.

## A structural checker

This repository ships [`scripts/check-documents.mjs`](https://github.com/jorisvddonk/questmark/blob/master/scripts/check-documents.mjs).
It compiles every document it finds and checks:

- compilation succeeds;
- state names are unique;
- `initial-state` names a real state;
- every `#link` on an option points at a real state;
- the compiled program can be loaded by a `QuestVM` (which catches unknown
  opcodes).

```bash
node scripts/check-documents.mjs content
```

It accepts directories or individual files and skips `node_modules`, `dist`,
`.vitepress`, and similar folders. It exits non-zero if anything fails.

Inside this repository:

```bash
npm run build
npm run check:examples
```

## Use it in a content repository

Copy the script into your repository, install Questmark, and add a workflow:

```yaml
name: Check documents

on:
  push:
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 24

      - name: Install Questmark
        run: npm install --no-save questmark

      - name: Check documents
        run: node scripts/check-documents.mjs content
```

The script imports `parseMarkdown` and `QuestVM` from `questmark`, so it works
in any project that has the package installed. There is no build step for the
documents themselves: they are compiled in memory.

## What the checker misses

The checker is static. It does not execute the documents, so it cannot catch:

- `getContext` on an uninitialised key (a runtime error);
- a precondition that is never true, or an unreachable state;
- a document that loops forever;
- text quality, missing endings, or a route with no way out.

For those, add a smoke test. A bounded run that chooses each option once is a
good compromise. The [untrusted-document guide](run-untrusted-documents.md)
shows an instruction-budget VM; use the same wrapper in CI and treat a thrown
budget error as a failure. The reference repository's
[`stack-hygiene`](https://github.com/jorisvddonk/questmark/blob/master/test/stack-hygiene.test.cjs)
and [`docs-routes`](https://github.com/jorisvddonk/questmark/blob/master/test/docs-routes.test.cjs)
tests are examples of automated route walking.

## A larger content pipeline

Once documents are validated, you can also generate a manifest of states and
links for your game. The [document tree reference](../reference/document-tree.md#recipes)
has recipes for extracting states, options, and link targets. The same data can
feed an editor, a localization workflow, or a dead-state report.

## Checklist

- [ ] Every `.md` in the content directory is checked.
- [ ] Missing link targets fail CI.
- [ ] Unknown opcodes fail CI.
- [ ] At least one bounded playthrough runs per document.
- [ ] The check is fast enough to run on every pull request.

## See also

- [How to debug a document](debug-a-document.md)
- [How to organize a larger document](organize-a-document.md)
- [Document tree and VMState](../reference/document-tree.md)
- [Run untrusted documents safely](run-untrusted-documents.md)

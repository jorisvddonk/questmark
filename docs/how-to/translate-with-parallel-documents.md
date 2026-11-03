# How to translate with parallel documents

This approach keeps one **full Questmark document per locale**. Translators copy
the source, translate the prose, and leave the structure and code alone. A
parity checker verifies that both documents still describe the same graph.

It requires no new syntax, catalog format, or runtime support. The price is that
logic is duplicated and must be kept in sync.

## 1. Copy the source document

```bash
cp story.en.md story.fr.md
```

Keep the states, options, links, backticked code, directives, and numeric
context values identical. Translate prose, option labels, and post-option text.

Source:

```markdown
# start

Welcome, Ada.
* Buy something `1 "coins" getContext - "coins" setContext`

  You buy one.

* [Leave](#end)

# end

Goodbye.
`exit`
```

French:

```markdown
# start

Bienvenue, Adèle.
* Acheter quelque chose `1 "coins" getContext - "coins" setContext`

  Vous en achetez un.

* [Partir](#end)

# end

Au revoir.
`exit`
```

Try the French build:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "name": "Adèle", "coins": 3 }
    }

# start

Bienvenue, Adèle.
* [Partir](#end)

# end

Au revoir.
`exit`
```

## 2. Check the structure

```bash
npx questmark --input story.en.md --compare story.fr.md
```

On success it prints `Translation structure matches`. On failure it lists the
first differences with paths:

```
state[0].option[1].link: "#start" vs "#end"
state[0].option[0].effects: ["inline:1 \"coins\" getContext ..."] vs ["inline:1 \"coins\" hasContext ..."]

2 structural difference(s)
```

Exit code is `1` when there are differences, so it drops straight into CI.

## 3. Compile each locale

```bash
npx questmark --input story.en.md --output dist/story.en.vmstate.json --no-run
npx questmark --input story.fr.md --output dist/story.fr.vmstate.json --no-run
```

Load the build that matches the player's language. There is no runtime catalog;
each file is a complete localized program.

## 4. Add parity to CI

```yaml
- name: Check translations
  run: |
    for locale in fr de ja; do
      node bin/questmark.mjs --input story.en.md --compare story.$locale.md
    done
```

The checker is structural. It does not prove that the translation is good, only
that it cannot change the story graph or the code.

## What must stay identical

| Part | Why |
| --- | --- |
| State names and order | The graph and links depend on them. |
| Option count and order | Menus and choice ids follow source order. |
| Option links | Navigation. |
| Directives (`@once`) | Behaviour. |
| Precondition and effect code | Game state and gating. |
| Code in state text | Side effects and emitted values. |
| `initial-state` | The starting point. |
| Header behaviour flags | `no_link_behaviour`, `emit_on`, etc. |
| `initial-context` keys | Every state reads the same keys. |
| Numeric context values | Counters and flags must match. |

## What may differ

- State prose, headings' body text, and paragraph layout.
- Option labels.
- Post-option text.
- `comment` code blocks.
- String context values (names, titles) — a checker allows them to differ.
- Links in prose (their URL is dropped by the compiler anyway).

## Common failures

| Message | Meaning | Fix |
| --- | --- | --- |
| `state count differs` | A whole state was removed or added. | Restore it or remove it from both. |
| `state[i].name` | A state was renamed. | Rename it back or update every link in both docs. |
| `option count differs` | An option is missing. | Restore it in the translation. |
| `option[i].link` | A choice points somewhere else. | Match the source link. |
| `option[i].effects` | Code differs. | Copy the exact code span from the source. |
| `header.initial-context.key` | A key exists in only one document. | Keep the same keys. |
| `header.initial-context.key: number differs` | A counter/flag changed. | Use the source number. |
| `header.options.*` | Behaviour flags differ. | Copy the source flags. |

## When this is the right choice

- Translators are comfortable editing whole Markdown documents.
- The team is small enough to keep logic in sync, or the parity checker is
  enough safety.
- You want to ship static locale builds and do not need live language switching.
- You prefer no new catalog format, opcode, or compiler surface.

If logic duplication is unacceptable, use a catalog design instead; the
[compile-time catalog alternative](https://github.com/jorisvddonk/questmark/pull/9) and
[runtime catalog alternative](https://github.com/jorisvddonk/questmark/pull/10) describe the
alternatives.

## See also

- [Translation parity reference](../reference/translation-parity.md)
- [Parallel-documents design](../explanation/localization-parallel-design.md)
- [How to organize a larger document](organize-a-document.md)
- [How to validate documents in CI](validate-in-ci.md)

# Localization design: compile-time catalogs

Localization is hard for a Markdown language because prose and logic are
deliberately close together. Questmark's first design is **compile-time
catalogs**: the document stays in one source language, translators work on a
catalog, and each locale is compiled to its own bytecode. The runtime, the
bytecode format, and every existing port remain unchanged.

This page explains the reasoning, the alternatives that were considered, and
the trade-offs.

## The constraints

A localization design for Questmark has to respect four things:

1. **Prose is the primary artifact.** Translators should not have to edit Tzo
   code or understand the state graph.
2. **The VM is portable.** A design that requires a new opcode is a design that
   every Rust, C, and Godot runtime must reimplement.
3. **Text is the contract.** Translations must fit the emitted-text model; the
   host owns presentation.
4. **Dynamic values exist.** Prose can contain counters, names, and computed
   values, and word order differs between languages.

The design also has to work for the common case: a game ships one build per
locale, and the player picks a language before starting.

## The design

### 1. Interpolation is explicit

Authors write `{{key}}` where a context value belongs:

```markdown
Hello {{name}}, you have {{coins}} coins.
```

The compiler turns the placeholder into a context read:

```
Hello, <name> — you have <coins> coins.
```

A translation can reorder the placeholders:

```markdown
Vous avez {{coins}} pièces, {{name}}.
```

This is the key move. Automatic extraction from arbitrary inline code cannot
know whether a value is reorderable: inline code may have side effects, emit
nothing, or emit several values. An explicit placeholder says “this is a value,
and it can move”.

### 2. Messages are text units with path IDs

The compiler assigns IDs by location:

- `start.text.0` — the first translatable text node in state `start`,
- `start.option.2.label` — an option label,
- `start.option.0.text.1` — post-option text.

The ID is human-readable, and the catalog also carries the source text. That
lets the compiler detect a stale translation when the prose changes. IDs are
stable while the structure is stable; reordering paragraphs or options changes
them, and re-extraction is the recovery path.

Trailing newlines are treated as separators, not prose. They are stripped from
the message and re-applied after translation, so translators do not have to
manage paragraph spacing.

### 3. Catalog files are the translator interface

```json
{
  "version": 1,
  "locale": "fr",
  "messages": {
    "start.text.0": {
      "source": "Hello {{name}}, you have {{coins}} coins.",
      "translation": "Vous avez {{coins}} pièces, {{name}}."
    }
  }
}
```

The `source` field makes the file reviewable and detects drift. Empty
translations fall back to the source, so a partially translated locale can be
played.

### 4. Compilation builds one VMState per locale

```bash
npx questmark --input story.md --catalog locales/fr.json \
  --output story.fr.vmstate.json --no-run
```

The compiler substitutes translated text into the normal bytecode. Nothing at
runtime knows a translation happened. The host chooses a build when the player
chooses a language.

## Why compile-time instead of runtime?

Runtime catalogs are attractive: switch language without rebuilding, one asset
for all locales, and translation fixes ship without recompiling. But they cost:

- a new message/catalog representation in the VMState,
- new opcodes (or a special `emit` path) in **every** runtime,
- a runtime formatting step that must be tested across ports,
- new failure modes when a catalog is incomplete or malformed at runtime.

Compile-time catalogs move all of that to the build. The price is one VMState
per locale and no in-game language switch without reloading. For games, that is
often a fair trade: locale builds are normal assets, and the runtime stays the
small, portable thing it already was.

## Alternatives considered

### Runtime catalogs

The VM carries message IDs and formats them through a catalog at runtime.
Pros: switch locale live, one bytecode build, translation fixes without
recompiling. Cons: new opcodes/VMState fields, every port must implement them,
runtime validation and fallback, and conformance must cover catalogs. This is a
good design for a game that lets players change language in a settings menu; it
is a larger change to the ecosystem.

### Parallel translated documents

Translators edit a full document per locale; a structural checker verifies that
states, links, options, and code match the source. Pros: translators see full
context, can write natural prose, no catalog format, no compiler change. Cons:
logic is duplicated, every code change must be mirrored, and the two files can
drift in subtle ways. Good for small projects or for writers who prefer editable
documents; the parity checker is the safety net.

### Host-side string mapping

The host translates emitted text chunks and option titles by exact string
lookup. Pros: no language or compiler change at all; works with existing
bytecode. Cons: messages are fragments, dynamic values break exact matching, and
reordering is impossible. It is a stopgap, not a localization design.

### In-document translation blocks

Translations live next to the source in the same file. Pros: one file, no
catalog tooling, context is obvious. Cons: Markdown has no natural syntax for
per-language paragraphs or option labels; the source becomes noisy, merge
conflicts increase, and runtime switching still needs a catalog-shaped
representation. Better as a future authoring convenience than as the primary
mechanism.

## Trade-offs of compile-time catalogs

| Benefit | Cost |
| --- | --- |
| No runtime or bytecode change | One build per locale |
| Every existing port works | No live language switch |
| Simple, reviewable catalogs | Path IDs move when structure moves |
| Explicit placeholders reorder correctly | Authors must use `{{key}}` for reorderable values |
| Stale sources and placeholder mismatches fail at build time | Catalogs must be kept in sync |
| Translators never edit code | Text-node granularity limits sentence merging |

## What this design deliberately leaves out

- **ICU MessageFormat.** Plurals, gender, select, and number/date formatting are
  not implemented. `{{count}}` is a direct substitution.
- **Runtime switching.** There is no catalog at runtime.
- **Automatic extraction of inline code.** Only explicit placeholders are
  reorderable.
- **A literal `{{` escape.** The sequence is reserved.
- **Paragraph joining across inline code.** A translation can reorder within a
  text node, not merge two nodes.

These are honest limits. The next design step would be an ICU-style message
format with select/plural support, either compiled per locale or resolved at
runtime.

## Why this is a good first design

It is the smallest design that actually solves the problem:

- translators get a clean, reviewable file;
- the compiler enforces completeness and placeholder correctness;
- every existing runtime can play a localized build;
- the bytecode contract does not change;
- the design can grow into runtime catalogs later, because the missing piece is
  a runtime formatter, not a different message model.

## See also

- [How to localize a document](../how-to/localize-a-document.md)
- [Localization reference](../reference/localization.md)
- [Open design problems](open-design-problems.md) — the remaining localization
  gaps.
- [The text contract](text-contract.md) — why translations are text, not markup.

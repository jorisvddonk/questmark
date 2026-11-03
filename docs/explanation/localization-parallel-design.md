# Localization design: parallel documents

Questmark is Markdown-first, so the most translator-friendly localization is
also the least magical: keep one complete document per locale, let translators
edit prose, and use a structural checker to keep the story graph and code from
drifting.

This design adds no syntax, catalog format, opcode, or runtime feature. Its
cost is duplicated logic.

## The design

### One document per locale

```
story.en.md
story.fr.md
story.de.md
```

Translators copy the source and translate the prose. The states, options,
links, directives, code, and numeric context values stay the same. Each locale
is compiled independently:

```bash
npx questmark --input story.en.md --output dist/story.en.vmstate.json --no-run
npx questmark --input story.fr.md --output dist/story.fr.vmstate.json --no-run
```

The host ships the matching build. There is no runtime catalog.

### The parity checker

`compareDocumentStructure(source, translated)` compares the parts that carry
behaviour:

- state names/order and count,
- option count/order, links, directives,
- precondition and effect code,
- code in state text,
- `initial-state` and header flags,
- context keys, types, and numeric values.

It allows prose, labels, post-option text, comments, and string context values
to differ. The CLI exposes it as:

```bash
npx questmark --input story.en.md --compare story.fr.md
```

A failure is a path plus a message, for example:

```
state[0].option[1].link: "#start" vs "#end"
```

That is enough for a CI check that logic was not accidentally translated.

## Why this is attractive

- **Translators work in the medium they already understand.** A full document
  gives context, tone, and room to rewrite naturally.
- **No new concepts.** No message IDs, catalogs, interpolation, or opcodes.
- **No compiler/runtime change.** Any existing build pipeline works.
- **Full word order and sentence merging.** Translators are not constrained by
  text-node boundaries.
- **Easy review.** A translated document is a normal diff.

For a small project, this is often the cheapest path to a good translation.

## The cost

The logic is duplicated. Every state, link, option, code span, and counter
exists in every locale. A gameplay change must be mirrored, and a translator
can accidentally change behaviour.

The parity checker removes the accidental part:

- a changed link,
- a missing option,
- a dropped precondition,
- a `@once` that became something else,
- a counter value that changed,
- a state rename.

It cannot remove the maintenance part: a real gameplay change still has to be
applied to every locale, and the checker will flag the other files until it is.

This is the classic trade-off between a **single source of truth** and
**translator freedom**. Catalogs centralize logic; parallel documents
centralize prose in a full document.

## Alternatives

### Compile-time catalogs

One source document plus a catalog per locale; translation is substituted at
build time. Pros: logic written once, internals validated, existing runtimes
work. Cons: path-based message IDs, text-node granularity, one build per locale.

### Runtime catalogs

One message-based build plus catalogs loaded at runtime. Pros: live language
switching and independent translation updates. Cons: a new `message` opcode and
work in every port.

### Host-side string mapping

Translate emitted chunks in the host. Cheap, but fragments and dynamic values
make it unreliable. A stopgap.

## Trade-offs

| Benefit | Cost |
| --- | --- |
| Full documents, natural prose | Logic duplicated per locale |
| No compiler/runtime/message changes | Gameplay changes must be mirrored |
| No new syntax or catalog format | Parity is structural, not semantic |
| Full word order and sentence merging | No live language switch |
| Easy review in Markdown | More files to keep in sync |

## What it deliberately leaves out

- **A single source of truth.** Each document owns its own code.
- **Runtime switching.** Load a different VMState instead.
- **Translation memory or catalog tooling.** The parity checker is the safety
  net, not a translation system.
- **Semantic validation.** It cannot tell whether the French is accurate.
- **Prose-layout parity.** Translators may merge/split paragraphs and move
  prose around code; the code sequence is checked, not its neighbourhood.

## When to choose this

Choose parallel documents when:

- translators want to edit complete prose with full context,
- the project is small enough to mirror logic changes,
- you ship a static build per locale anyway,
- you want no new language or runtime surface.

Choose a catalog design when logic duplication is unacceptable, when you need
many locales, or when you need runtime switching.

## See also

- [How to translate with parallel documents](../how-to/translate-with-parallel-documents.md)
- [Translation parity reference](../reference/translation-parity.md)
- [Compile-time catalog alternative](https://github.com/jorisvddonk/questmark/pull/9)
- [Runtime catalog alternative](https://github.com/jorisvddonk/questmark/pull/10)
- [Open design problems](open-design-problems.md)

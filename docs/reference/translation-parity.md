# Translation parity reference

Parallel translated documents are checked with `compareDocumentStructure`. It
parses both documents and compares everything that must not change between
locales. It does **not** check the quality of the translation.

## `compareDocumentStructure(sourceMarkdown, translatedMarkdown)`

```ts
import { compareDocumentStructure } from "questmark";

const differences = compareDocumentStructure(english, french);
// [] means parity
```

**Returns** `StructuralDifference[]`:

```ts
interface StructuralDifference {
  path: string;    // e.g. "state[0].option[1].link"
  message: string; // human-readable explanation
}
```

Parsing errors are thrown; compile the documents first if you want a separate
error check.

## What is compared

### Header

- `questmark-spec`
- `initial-state`
- `options.no_link_behaviour`
- `options.whitespace`
- `options.emit_on`
- `options.strip_leading_newlines`
- `initial-context` keys
- `initial-context` types
- numeric `initial-context` values

String context values are allowed to differ (names, titles). Numbers are not:
counters and flags must match.

### States

- count and order
- names
- code sequence in state text (inline code and non-`comment` blocks, in order)

Prose and layout are not compared.

### Options

- count and order
- presence or absence of a label
- link (exact, including `#`)
- directives (`@once`), order-insensitive
- precondition code sequence
- effect code sequence, including code blocks

Labels and post-option text may differ.

### Ignored

- state prose, paragraph layout, emphasis
- option labels and post-option text
- `comment` code blocks
- links in prose (the compiler drops their URL)
- unknown header fields

## CLI

```bash
npx questmark --input story.en.md --compare story.fr.md
```

- Prints `Translation structure matches` and exits `0` on success.
- Prints differences and exits `1` on failure.
- Requires a `.md`/`.qmd` source as `--input`; `--compare` is a local path.

## Limits

- **Structure, not prose layout.** A code span may move between paragraphs and
  still appear in the same sequence. That can change when text is emitted
  relative to code. Review prose changes like you would any translation.
- **String values are free.** A translated string in `initial-context` may be
  used by game logic; the checker cannot know. Keep behavioral strings stable.
- **Post-option text can be removed.** It is prose; removing it changes what
  the player sees, but not the graph or code.
- **State order is required.** Reordering states changes option ids only if
  options reorder; the checker still asks for the same order to keep reviews
  simple.
- **No semantic checks.** It cannot prove the translation is accurate, complete,
  or idiomatic.
- **No runtime change.** Each locale is a separate VMState; there is no live
  language switching.

## See also

- [How to translate with parallel documents](../how-to/translate-with-parallel-documents.md)
- [Parallel-documents design](../explanation/localization-parallel-design.md)
- [Document tree and VMState](document-tree.md)
- [How to implement a runtime](../how-to/implement-a-runtime.md)

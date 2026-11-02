# Limitations and compatibility

Questmark is a proof of concept with an informal spec. This page collects the
constraints that are easy to trip over, so you can decide whether they matter
for your project. Everything here is current behaviour, not an accident of the
documentation.

## Status

- The language spec is **1.0**, informal, and still evolving. Behaviour may
  change between releases.
- The reference implementation is TypeScript. Other runtimes exist — see the
  [ecosystem](../explanation/ecosystem.md) — and are tested against the
  [conformance corpus](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md).
- There is no formal grammar, versioned migration tool, or compatibility
  guarantee beyond the conformance cases.
- Unknown fields in the options header are ignored. An invalid
  `no_link_behaviour` is a compile error; other unrecognised flag values are
  ignored. Unknown opcodes are an error, except underscore-prefixed host
  hooks, which are no-ops when unregistered.

## Document structure

- Only **top-level `#` headings** define states. A `##` or deeper heading ends
  the current state early and can silently strand its options.
- The **first unordered list** in a state is its menu. Ordered lists, quotes,
  and rules are emitted as text, not treated as structure.
- Text after the first unordered list belongs to the options; a paragraph after
  an option is that option's post-option text.
- There are **no includes, modules, or imports**. One document is one
  compilation unit with one options header. Multiple headers are read in
  order; the last one wins.
- State names must be unique. A duplicate silently overwrites the earlier
  label.
- Links do not have compile-time validation: a `#missing` link compiles and
  fails only when a player follows it. Use the
  [document checker](../how-to/validate-in-ci.md) in CI.

## Options and labels

- Option labels are **plain text**. Strong/emphasis inside a label truncates
  the label or makes compilation fail; inline code in a label produces a
  warning and is not part of the label.
- Mixing prose and a link in one label (`* Pick the [red door](#red)`) is not
  supported: the text before the link becomes the label and the rest becomes
  effect text.
- Do not nest lists under an option. Post-option paragraphs are fine; nested
  list items are not.
- Preconditions and effects share the backtick syntax. Code **before** the
  label is a precondition; code **after** it is an effect. A misplaced span
  changes the meaning without an error.
- Multiple precondition spans are not combined. Each runs, but the menu only
  checks the top of the stack; combine tests inside one span with `and`/`or`.
- The only directive is `@once`.

## Tzo code

- Outer quotes inside Tzo strings are not supported. Use curly quotes or single
  quotes for dialogue inside `emit` strings.
- Number literals are integers. Decimals such as `1.5` are not parsed as
  intended; use integer math.
- There is **no division or modulo** opcode.
- `#` starts a label in Tzo code; it is not a comment. Use a fenced `comment`
  block in the Markdown for author notes.
- The stack is shared by the whole program. Snippets must balance; a stray
  value can change a later `jgz`.
- `getContext` throws when a key is missing. Use `hasContext` for optional keys.
- Context is global and holds strings and numbers only. There is no scoping and
  no automatic reset.
- Keys beginning with `__` are reserved for the runtime (`@once` uses
  `__once__N`).

## Text and presentation

- Questmark emits text, not HTML. A host decides how to present it.
- `**bold**` and `*italic*` both emit as `*text*`.
- Link text in prose is emitted; the URL is dropped.
- Inline HTML tags are dropped, but their inner text survives. HTML is not a
  supported rendering feature.
- Images are dropped, including their alt text.
- There is no styling, CSS, audio, or layout in the language. Use host hooks
  (`_name`) to trigger engine-side effects.
- Paragraph separators are part of the emitted text. Post-option text is
  emitted without an extra trailing newline; hosts usually add presentation
  spacing.

## Persistence

- A pending menu is **not** part of the serialized VMState. There is no
  built-in exact mid-menu resume; save at a state boundary and rebuild the
  menu. See [save and load progress](../how-to/save-and-load.md).
- Re-entering a saved state re-emits its entry text and re-runs its entry code.
  Keep entry effects idempotent.
- `parseMarkdown` removes source positions from the Markdown state text given
  to tooling. Compiler-built option children keep their positions. Error
  messages include the VM stack, program counter, and context, but not
  Markdown line numbers.

## Execution and safety

- The VM has **no built-in instruction, time, stack, or context limits**. A
  document can loop forever. Hosts must add budgets; see
  [run untrusted documents safely](../how-to/run-untrusted-documents.md).
- `run()` is synchronous. A host cannot interrupt it without a budget or a
  worker.
- `stdout` writes to the host's standard output, not to the player.
- Host hooks are only as safe as the functions you register.

## CLI and tooling

- `--clear` is declared but not implemented.
- There is no watch mode, batch compiler, linter, or formatter in the core
  package. The [document checker](../how-to/validate-in-ci.md) is a starting point.
- Input must use `.md`, `.qmd`, `.md.html`, `.qmd.html`, or `.json`; other
  extensions are rejected.
- Runtime errors in the CLI are unhandled promise rejections: you get a stack
  trace and a non-zero exit, not a polished diagnostic.
- The browser bundle touches `document` at import time and cannot run during
  server-side rendering. Minifying it requires keeping function names because
  Tzo inspects `Function.prototype.name` for brace handling.

## Open design questions

These are known gaps rather than incidental bugs. They are explained, with the
trade-offs and possible directions, in
[open design problems](../explanation/open-design-problems.md):

- inline HTML,
- custom directives and macros,
- localization,
- includes and modules,
- exact save/restore,
- versioning and compatibility.

## See also

- [Language reference](language.md) — the exact rules.
- [Document tree and VMState](document-tree.md) — what tooling can inspect.
- [How to implement a runtime](../how-to/implement-a-runtime.md) — the runtime
  contract.
- [FAQ and comparisons](../explanation/faq.md) — how this compares to other
  tools.

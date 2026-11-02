# Questmark

Questmark is a [hypertext fiction](https://en.wikipedia.org/wiki/Hypertext_fiction)
and [conversation tree](https://en.wikipedia.org/wiki/Dialogue_tree) language,
compiler, interpreter, and TypeScript library. It supports both conversation
trees (like in games such as Star Control 2) and quests, hypertext fiction,
text adventures, and visual novels (like in games such as Space Rangers 2).

Questmark is based heavily on Markdown, and compiles to
[Tzo](https://github.com/jorisvddonk/tzo) bytecode. If you can write Markdown,
you can write Questmark: every properly-structured Markdown document with
headers and in-document links is already a Questmark document. Behaviour and
side-effects are added with small, backticked code snippets where needed.

## Documentation

The docs follow the [Diátaxis](https://diataxis.fr/) framework and are also
rendered as a [hosted website](https://jorisvddonk.github.io/questmark/):

- **[Tutorials](docs/tutorials/)** — start here if you're new. Write and play
  your first conversation in about ten minutes, then continue through context,
  choices, randomness, text output, a branching dialogue, and a full text
  adventure. Every complete document has **Code** and **Play** tabs when the
  docs are served as a website.
- **[How-to guides](docs/how-to/)** — play a document, compile it to bytecode,
  debug it, organize a larger work, and embed Questmark in your own
  application.
- **[Reference](docs/reference/)** — the language, the CLI, and the API,
  described precisely and completely.
- **[Explanation](docs/explanation/)** — why Questmark exists, how it works
  under the hood, the wider questmark/Tzo ecosystem, and an
  [FAQ/comparison](docs/explanation/faq.md).
- **[Integrator guides](docs/how-to/implement-a-runtime.md)** — porting and
  conformance, save/load, sandboxing untrusted documents, and CI validation.
- **[Playground](https://jorisvddonk.github.io/questmark/playground)** — edit
  and play a document in your browser, no installation required.

## Quick start

```bash
npm install

# Play an example conversation
npm start -- --input examples/space_alien.md

# Compile a document to Tzo bytecode without running it
npm start -- --input examples/space_alien.md --output vmstate.json --no-run

# Run the test suite
npm test
```

You can also use the published CLI with `npx questmark` (see the
[how-to guide](docs/how-to/play-a-document.md)).

## Testing

```bash
# Build, then run the full suite
npm test

# Same suite with a coverage report and 80% line/branch/function thresholds
npm run test:coverage

# Only the portable conformance cases
npm run conformance
```

The suite covers the compiler, the VM, the CLI, the browser bundle, every
playable documentation example, and a [portable conformance corpus](test/conformance/)
that other Questmark runtimes can reuse. See
[`test/conformance/README.md`](test/conformance/README.md) for the case format.

## Examples

The [examples](examples) folder contains playable documents. Notably,
[`self-describing.md`](examples/self-describing.md) is a text adventure written
in Questmark that explains how the language works, and
[`space_alien.md`](examples/space_alien.md) demonstrates preconditions,
`@once` options, and context-driven branching.

## Current status

Questmark is a working proof of concept implemented in TypeScript, with a
compiler, an interpreter, a CLI, and a [test suite](test). The spec is still
informal and the supported feature set is still evolving.

Open questions being worked on:

- How should inline HTML be treated?
- How can the compiler be modified to add custom directives and macros?
- How can a document be translated to another language, whilst keeping the
  scripting logic intact and easy to modify?

## Other tools / libraries

Questmark is part of a small ecosystem. Tagged repositories are listed on
GitHub under the [questmark](https://github.com/topics/questmark) and
[tzo](https://github.com/topics/tzo) topics.

- [Tzo](https://github.com/jorisvddonk/tzo) — the bytecode and VM Questmark
  compiles to.
- [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer) —
  write and play Questmark documents in your web browser.
- [questmark-rust](https://github.com/jorisvddonk/questmark-rust) — a Questmark
  runtime VM written in Rust.
- [tzo-rust](https://github.com/jorisvddonk/tzo-rust) — a Rust implementation
  of Tzo.
- [tzo-c](https://github.com/jorisvddonk/tzo-c) — a C implementation of the Tzo
  VM and a QuestMark runtime interpreter.
- [tzo-godot](https://github.com/jorisvddonk/tzo-godot) — an experimental Godot
  extension for Tzo and QuestVM.
- [tzo-wat](https://github.com/jorisvddonk/tzo-wat) — compiles Tzo's standard
  representation to WebAssembly Text Format.
- [tzo-analyze](https://github.com/jorisvddonk/tzo-analyze) — a Tzo code
  analyzer.
- [questmark-yarn](https://github.com/jorisvddonk/questmark-yarn) — an
  experimental Yarn Spinner 2.0 to QuestMark compiler.
- [questmark-ide](https://github.com/jorisvddonk/questmark-ide) — a
  work-in-progress IDE for Questmark and Questmark-Yarn.
- [tzo-concisetext-language-support](https://github.com/jorisvddonk/tzo-concisetext-language-support) —
  VS Code language support for Tzo ConciseText.
- [tzo-powered-uqm-comm-test](https://github.com/jorisvddonk/tzo-powered-uqm-comm-test) —
  a Tzo-powered rendering test for Star Control 2-style comm graphics.

## License

MIT
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

The docs follow the [Diátaxis](https://diataxis.fr/) framework:

- **[Tutorials](docs/tutorials/)** — start here if you're new. Write and play
  your first conversation in about ten minutes.
- **[How-to guides](docs/how-to/)** — play a document, compile it to bytecode,
  and embed Questmark in your own application.
- **[Reference](docs/reference/)** — the language, the CLI, and the API,
  described precisely.
- **[Explanation](docs/explanation/)** — why Questmark exists and how it works
  under the hood.

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

- [Tzo](https://github.com/jorisvddonk/tzo) — the bytecode and VM Questmark
  compiles to.
- [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer) —
  write and play Questmark documents in your web browser.

## License

MIT
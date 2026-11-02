# The Questmark and Tzo ecosystem

Questmark is not a single program; it is a language with a compiler, a bytecode
format, and several independent implementations. This page maps the projects
that make up the ecosystem, so you can find the runtime or tool that fits your
engine.

The canonical, always-up-to-date lists are the GitHub topics:

- [github.com/topics/questmark](https://github.com/topics/questmark)
- [github.com/topics/tzo](https://github.com/topics/tzo)

## The two core projects

| Project | What it is |
| --- | --- |
| [questmark](https://github.com/jorisvddonk/questmark) | This project. The language, the Markdown compiler, the reference TypeScript interpreter, the CLI, and the library. |
| [tzo](https://github.com/jorisvddonk/tzo) | The stack-based virtual machine and bytecode that Questmark compiles to. Tzo defines the standard opcodes and the `VMState` JSON format. |

The relationship is one-directional: Questmark knows about Tzo, but Tzo does
not know about Questmark. Any host that can run Tzo bytecode with the QuestVM
opcodes can play a compiled Questmark document.

## Runtimes and ports

| Project | Language | What it is |
| --- | --- | --- |
| [questmark-rust](https://github.com/jorisvddonk/questmark-rust) | Rust | A Questmark runtime VM. |
| [tzo-rust](https://github.com/jorisvddonk/tzo-rust) | Rust | A Rust implementation of the Tzo VM. |
| [tzo-c](https://github.com/jorisvddonk/tzo-c) | C | A C implementation of the Tzo VM, plus a Questmark runtime interpreter. |
| [tzo-godot](https://github.com/jorisvddonk/tzo-godot) | GDScript | An experimental Godot extension for Tzo and QuestVM. |
| [tzo-wat](https://github.com/jorisvddonk/tzo-wat) | TypeScript | An experimental compiler from Tzo's standard representation to WebAssembly Text Format. |

If you are shipping a game, the usual pattern is to compile a document to a
`VMState` JSON once, ship that file, and load it with the runtime that matches
your engine.

## Authoring and rendering tools

| Project | What it is |
| --- | --- |
| [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer) | A simple inline parser and renderer for Questmark, for making documents playable in a web page. |
| [questmark-ide](https://github.com/jorisvddonk/questmark-ide) | A work-in-progress IDE for Questmark and Questmark-Yarn. |
| [tzo-analyze](https://github.com/jorisvddonk/tzo-analyze) | A static analyzer for Tzo code. |
| [tzo-concisetext-language-support](https://github.com/jorisvddonk/tzo-concisetext-language-support) | VS Code language support for Tzo's concise text format. |
| [questmark-yarn](https://github.com/jorisvddonk/questmark-yarn) | An experimental compiler from Yarn Spinner 2.0 to Questmark's QuestVM format. |

The playground on this site is built from the same browser bundle as this
project; it is an easy way to try documents without installing anything.

## Demos and experiments

| Project | What it is |
| --- | --- |
| [tzo-powered-uqm-comm-test](https://github.com/jorisvddonk/tzo-powered-uqm-comm-test) | A test of a system that renders Star Control 2-style comm graphics animations, driven by the Tzo VM. |

## How the pieces fit together

```
Questmark document (.md)
        │  questmark compiler (parseMarkdown)
        ▼
Tzo VMState (JSON: programList + labelMap + context)
        │  any Tzo VM with the QuestVM opcodes
        ▼
A running conversation
```

The compiler lives in one place (this repository and its ports). The bytecode
is a stable, inspectable JSON format. The runtime is replaceable: use the
TypeScript one in a browser or Node, a Rust one in a game server, a C one in an
embedded engine, or the Godot extension in Godot.

## If you build something

Tag the repository with the `questmark` and/or `tzo` topics so it shows up in
the lists above. The ecosystem is intentionally small and composable; a new
runtime, editor, or analyzer is a welcome addition.

## See also

- [Why Questmark?](why-questmark.md) — the design problem.
- [How Questmark works](how-questmark-works.md) — the compilation pipeline.
- [How Questmark is tested](how-questmark-is-tested.md) — the conformance
  corpus ports are measured against.
- [How to implement a runtime](../how-to/implement-a-runtime.md) — the VMState
  contract.
- [Compile to bytecode](../how-to/compile-to-bytecode.md) — produce a
  `VMState` for another runtime.

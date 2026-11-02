# Design principles

[Why Questmark?](why-questmark.md) explains the problem. This page describes the
choices that shaped the solution — the principles you can infer from the
language, the compiler, and the runtime. They are not rules in a specification;
they are the trade-offs the project keeps choosing.

## 1. Prose is the primary artifact

A Questmark document should be worth reading as a document. The story, the
speaker, the stage directions, and the choices are all prose first. Behaviour is
added where prose is not enough.

This is why states are headings and options are list items. It is also why
option labels are plain text: a menu item is a thing a character says, not a
place to smuggle a UI widget. If the prose is unreadable without the
interpreter, the format has failed at its main job.

## 2. Markdown is the surface, not the model

Markdown gives the project a shared vocabulary and a large toolchain, but it is
not the execution model. The compiler parses Markdown into a tree, then builds
its own model — states, options, context, effects — and throws most of Markdown
away.

That separation is deliberate:

- Writers get headings, lists, links, emphasis, and comments.
- The runtime gets a small graph and a flat bytecode program.
- Markdown features that do not fit (tables, images, raw HTML) are not given
  special meaning.

The surface can evolve without changing the VM, and the VM can be ported
without reimplementing a Markdown renderer.

## 3. Code is an escape hatch, not the main language

Most documents need no code at all: headings, links, and lists already describe
a conversation. When a document needs memory or a side effect, a backticked
snippet appears exactly where the author needs it — inline in prose, after an
option, or before a label as a gate.

The goal is not to make programming invisible. It is to keep the programming
**local**: a reader can see the effect next to the choice that triggers it. This
is also why the snippets are terse. A tiny stack language is enough for flags,
counters, comparisons, and jumps; a general-purpose language would invite logic
to colonize the document.

## 4. One small VM, many hosts

Questmark compiles to Tzo, a stack-based virtual machine, and the compiled state
is plain JSON. The language does not know whether it is running in a terminal, a
browser, a Godot scene, or a Rust server.

The VM boundary buys three things:

- **Portability.** The compiler and the runtime are separate; a game can ship
  bytecode without shipping a Markdown parser.
- **Inspectability.** A VMState is data. It can be stored, diffed, versioned,
  and loaded by another implementation.
- **A testable contract.** The [conformance corpus](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md)
  can be run by every runtime, not just the reference one.

The boundary also has a cost: snippets run in a foreign execution model
(reverse-Polish, shared stack), and host state has to be bridged explicitly
through the context or host hooks.

## 5. Text is the interface

Questmark emits text, not HTML. The host owns layout, styling, input, audio, and
accessibility. The reference implementations are small because they do not need
to be renderers.

This keeps the language usable in engines that have no DOM and keeps the
conformance contract observable: the emitted text is the same everywhere, even
if one host renders it in a terminal and another in a game engine. See
[the text contract](text-contract.md).

## 6. State is explicit

The context is a bag of named strings and numbers. There is no hidden
relationship tracking, no implicit flags, no automatic memory. If an option
should disappear after use, the document says `@once` or maintains a flag. If a
door should stay open, the document records it.

Explicit state is easier to save, test, debug, and explain. It is also easier to
get wrong: a flag that is never initialized is a runtime error, not a silent
default. The [stack/context inspector](../playground.md) exists because the
project would rather show you the state than guess.

## 7. Plain text all the way down

Documents are Markdown. Compiled state is JSON. The runtime is a small
instruction set. Saves can be JSON. The conformance cases are Markdown and JSON.
Nothing important requires a binary editor or a proprietary database.

That choice is what makes the documents reviewable in a pull request, the
compiled state shippable as an asset, and the ecosystem portable across
languages.

## 8. Boring, inspectable data

The project prefers a small, boring representation over a clever one:

- A flat `programList`, not a graph of closures.
- A `labelMap` of names to indices, not a symbol table service.
- A context object, not an entity-component system.
- A `VMState` you can print.

Boring data is easy to log, diff, test, and port. It is also why the runtime can
be implemented in an afternoon and then proven against the same cases as the
reference.

## The trade-offs we accept

| Principle | The cost |
| --- | --- |
| Prose first | Complex logic is awkward to express in prose-shaped documents. |
| Markdown surface | Only a subset of Markdown is meaningful; tables, images, and HTML are lost. |
| Small escape hatch | No functions, loop constructs, division, or rich expressions without host opcodes. |
| Portable VM | The compiler/runtime boundary means host callbacks are explicit and asynchronous in places. |
| Text interface | The host must handle presentation, input, accessibility, and media. |
| Explicit state | Authors must initialize keys and maintain flags; there is no magic. |
| Plain text | Performance is modest and large documents compile to large JSON. |
| Boring data | Verbose VMState and bytecode compared with a compact binary format. |

## When Questmark is the wrong tool

These principles make Questmark a poor fit when:

- you need a mature scripting language for complex simulation, not dialogue;
- you want a full authoring environment with a visual graph editor;
- you need rich rendering, animation, and audio in the language itself;
- you need a formal, versioned spec today;
- you need proven tooling and a large community more than a small embeddable
  format.

The [FAQ](faq.md) compares it to Ink, Yarn Spinner, Twine, Ren'Py, and
ChoiceScript.

## See also

- [Why Questmark?](why-questmark.md) — the problem.
- [The Questmark mental model](mental-model.md) — the concepts.
- [Why a stack machine?](why-a-stack-machine.md) — the execution model.
- [The text contract](text-contract.md) — what hosts receive.
- [How Questmark is tested](how-questmark-is-tested.md) — how the principles
  are kept honest.

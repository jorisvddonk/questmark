---
layout: home

hero:
  name: Questmark
  text: Dialogue trees and hypertext fiction in Markdown
  tagline: A language, compiler, interpreter, and TypeScript library for conversation trees and interactive fiction — built on the Markdown everyone already knows.
  actions:
    - theme: brand
      text: Start the tutorial
      link: /tutorials/first-conversation
    - theme: alt
      text: Why Questmark?
      link: /explanation/why-questmark
    - theme: alt
      text: Playground
      link: /playground

features:
  - icon: 📝
    title: Markdown-native
    details: Every properly-structured Markdown document with headers and links is already a Questmark document. Prose stays readable; behaviour is added with small backticked code snippets.
  - icon: 🧭
    title: Conversation trees
    details: States and options model dialogue graphs — like Star Control 2 — and quests, hypertext fiction, text adventures, and visual novels — like Space Rangers 2.
  - icon: 🧠
    title: Context and side-effects
    details: A context bag tracks what the player has done, gating options with preconditions and driving branching narrative and in-world side effects.
  - icon: ⚙️
    title: Compiles to Tzo bytecode
    details: Documents compile to a portable Tzo VMState that can be stored, shipped, and interpreted in a game, a CLI, or a browser.
  - icon: 🎮
    title: Playable in the browser
    details: Every complete document in the tutorials has Code and Play tabs. Play it inline, or open the standalone playground to edit and run your own.
---

## Documentation

Questmark's docs follow the [Diátaxis](https://diataxis.fr/) framework, which
splits documentation into four complementary modes of use:

| Mode | Audience | Purpose | Start here |
| --- | --- | --- | --- |
| [Tutorials](tutorials/first-conversation) | Learners | Learning-oriented lessons that take you by the hand | [Your first conversation](tutorials/first-conversation) |
| [How-to guides](how-to/play-a-document) | Doers | Goal-oriented steps for solving real problems | [Play a document](how-to/play-a-document) |
| [Reference](reference/language) | Everyone | Information-oriented descriptions of the machinery | [Language reference](reference/language) |
| [Explanation](explanation/why-questmark) | Everyone | Understanding-oriented background and context | [Why Questmark?](explanation/why-questmark) |

## Quick orientation

- **New to Questmark?** Start with the [first tutorial](tutorials/first-conversation).
  It takes about ten minutes and gets you writing and playing your first
  conversation.
- **Want the full tour?** The tutorial series continues with
  [context and state](tutorials/context-and-state),
  [choices with consequences](tutorials/choices-with-consequences),
  [numbers and randomness](tutorials/numbers-strings-and-randomness),
  [text output](tutorials/control-text-output), a
  [branching dialogue](tutorials/branching-dialogue), and a
  [text adventure](tutorials/text-adventure).
- **Trying to get something done?** The [how-to guides](how-to/play-a-document)
  show you how to play, compile, translate, debug, organize, and embed
  documents.
- **Want to see it running?** Open the [playground](playground) and write or
  play a document right in your browser.
- **Need a fact?** The [reference](reference/language) pages describe the
  language, the CLI, and the library API precisely and completely. Start with
  the [cheat sheet](reference/cheatsheet) if you want a one-page summary.
- **Looking for a pattern?** The [cookbook](how-to/recipes) collects
  copy-paste solutions for counters, inventories, random tables, and other
  common situations, and [design patterns](how-to/quest-patterns) covers
  larger quest and dialogue structures.
- **Integrating Questmark?** The [runtime guide](how-to/implement-a-runtime),
  [save/load guide](how-to/save-and-load), and
  [untrusted-document guide](how-to/run-untrusted-documents) cover the host
  side, and [document tree and VMState](reference/document-tree) describes the
  data formats.
- **Want to understand the design?** The [explanation](explanation/why-questmark)
  pages cover why Questmark exists, its [design principles](explanation/design-principles),
  the [mental model](explanation/mental-model), the
  [stack machine](explanation/why-a-stack-machine), the
  [text contract](explanation/text-contract), the
  [trust model](explanation/trust-model), and
  [open design problems](explanation/open-design-problems).

## Related projects

Questmark is part of a small ecosystem of runtimes and tools. The full list is
on the [ecosystem page](explanation/ecosystem); highlights:

- [Tzo](https://github.com/jorisvddonk/tzo) — the stack-machine bytecode and VM
  that Questmark compiles to.
- [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer) —
  render and play Questmark documents in the browser.
- [tzo-c](https://github.com/jorisvddonk/tzo-c) and
  [tzo-rust](https://github.com/jorisvddonk/tzo-rust) — C and Rust
  implementations of the Tzo VM.
- [tzo-godot](https://github.com/jorisvddonk/tzo-godot) — a Godot extension
  for Tzo and QuestVM.
- [questmark-ide](https://github.com/jorisvddonk/questmark-ide) — a
  work-in-progress IDE for Questmark and Questmark-Yarn.
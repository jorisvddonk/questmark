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

- **New to Questmark?** Start with the [tutorial](tutorials/first-conversation).
  It takes about ten minutes and gets you writing and playing your first
  conversation.
- **Trying to get something done?** The [how-to guides](how-to/play-a-document)
  show you how to play a document, compile one to bytecode, and embed Questmark
  in your own app.
- **Need a fact?** The [reference](reference/language) pages describe the
  language, the CLI, and the library API precisely and completely.
- **Want to understand the design?** The [explanation](explanation/why-questmark)
  pages cover why Questmark exists and how it works under the hood.

## Related projects

- [Tzo](https://github.com/jorisvddonk/tzo) — the stack-machine bytecode and VM
  that Questmark compiles to.
- [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer) —
  render and play Questmark documents in the browser.
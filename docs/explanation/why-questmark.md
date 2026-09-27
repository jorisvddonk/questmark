# Why Questmark?

Questmark exists to solve a specific problem in game dialogue and interactive
fiction production.

## The problem

Dialogue systems in modern games need to do two very different things at once:

- represent a **conversation graph** — the branching structure of what can be
  said, and
- trigger **side effects** in the game world — flags, items, faction changes —
  when the player chooses something.

That means the people writing dialogue prose need to know how to *write prose*,
and the people implementing side effects need to know how to *program*. These
are rarely the same people, and the tools tend to favour one or the other:

- A scripting language with an associated editor attracts programmers. Prose
  authors either learn to program, or keep writing in Word documents.
- Proprietary, editor-bound dialogue tools make dialogue hard or impossible to
  merge, diff, and version in source control.

## The shared language: Markdown

Almost every writer and every programmer already knows Markdown, or one of its
modern dialects. Questmark leans on that shared knowledge: **every
properly-structured Markdown document with headers and in-document links is
already a Questmark document.**

- Dialogue trees and quests are expressed with ordinary Markdown — headings,
  lists, and links.
- Questmark-specific behaviour is added with small, backticked snippets of code
  where authors and programmers agree it's needed.
- Comments and annotations from writers and reviewers are simply Markdown that
  the Questmark compiler ignores.

## The workflow Questmark enables

1. **Authors** write dialogue trees in Markdown, which can be demoed
   interactively — by interpreting it as HTML, by running it in a simple
   Questmark runner, or by running it inside a game engine.
2. **Reviewers** add comments and feedback in the same document, without
   affecting what the interpreter produces.
3. **Gameplay programmers** add interactivity where it's needed — no more than
   where it's needed.
4. **Authors** can edit prose freely without disturbing the dialogue's
   interactivity, and programmers can adjust logic without touching the prose.
5. The game ships.

Because Questmark documents are plain text, they sit happily under revision
control, where they can be reviewed, merged, and diffed like any other code.

## Where Questmark stands today

Questmark is a proof of concept implemented in TypeScript. The spec is still
informal and the feature set is still settling. The repository includes
compiler, interpreter, CLI, and a test suite; the companion
[questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer)
renders and plays documents in the browser.

Open questions the project is still working through:

- How should inline HTML be treated?
- How can the compiler be extended with custom directives and macros?
- How can a document be translated to another language while keeping its
  scripting logic intact and easy to modify?

## See also

- [How Questmark works](how-questmark-works.md) — the pipeline from Markdown to
  bytecode to a running conversation.
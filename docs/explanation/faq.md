# FAQ and comparisons

Short answers to the questions that come up when evaluating Questmark. For the
long version, follow the links.

## Is Questmark production-ready?

No. It is a working proof of concept: compiler, interpreter, CLI, browser
bundle, tests, and a conformance corpus. The spec is informal `1.0` and still
evolving. Use it for prototypes, game jams, and projects where you can pin a
version; do not assume long-term compatibility beyond the
[conformance cases](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md).

## Why Markdown?

Because writers and programmers already know it, it diffs and merges cleanly,
and prose stays readable outside the tool. Behaviour is added with small
backticked snippets rather than a separate scripting file. See
[Why Questmark?](why-questmark.md).

## How is it different from Ink?

[Ink](https://www.inklestudios.com/ink/) is a mature narrative scripting
language with a compiler and runtimes. It is stronger for complex narrative
state, weaving, tunnels, and threads, and its tooling ecosystem is much larger.
Questmark is Markdown-native and smaller: states are headings, options are list
items, and the whole document stays readable as prose. If your team wants a
dedicated scripting language, Ink is the safer choice; if you want dialogue
embedded in documents that non-programmers already edit, Questmark is aimed at
that.

## How is it different from Yarn Spinner?

[Yarn Spinner](https://yarnspinner.dev/) is a dialogue system with a strong
Unity ecosystem. Questmark has an experimental bridge,
[questmark-yarn](https://github.com/jorisvddonk/questmark-yarn), that compiles
Yarn Spinner 2.0 to QuestVM. If you are shipping a Unity game today, use Yarn
Spinner directly. The bridge exists for interoperability, not as a replacement.

## How is it different from Twine?

[Twine](https://twinery.org/) is an authoring environment for hypertext, and
its output is a self-contained HTML story. Questmark is a language and a
bytecode VM meant to be embedded in someone else's engine. Twine gives you an
editor first; Questmark gives you a document format and a runtime.

## How is it different from Ren'Py?

[Ren'Py](https://www.renpy.org/) is a complete visual-novel engine built on
Python. Questmark has no renderer, no save UI, no images, and no audio; it emits
text and choices. Ren'Py is the right tool for a visual novel. Questmark is for
dialogue inside another game, where the host already has presentation and
save systems.

## How is it different from ChoiceScript?

[ChoiceScript](https://www.choiceofgames.com/make-your-own-games/choicescript-intro/)
is a hosted scripting language for Choice of Games-style interactive fiction.
Questmark is self-hosted, compiles to portable JSON, and is designed to be
embedded. ChoiceScript is more complete as an authoring-to-publication pipeline.

## Can I use HTML and CSS?

No. Questmark emits text, not markup. Inline HTML tags are dropped and their
text survives; images are dropped entirely. Styling and layout are the host's
job.

## Can I play audio or show images?

Not through the language. Register an underscore host hook (`_playSound`,
`_showPortrait`) and trigger it from an option effect. Unregistered hooks are
silent no-ops, so the document still plays in the
[playground](../playground.md). See
[embed Questmark](../how-to/use-the-library.md#custom-opcodes).

## Can I translate a document?

There is no built-in localization. Text is compiled into the bytecode, so a
translation means compiling a translated document. Keeping scripting logic in
small backticked snippets and prose in plain paragraphs makes the text easier
to extract and replace. The project lists localization as an open question in
[Why Questmark?](why-questmark.md).

## Can I add my own directives or syntax?

Only `@once` exists as a directive. Custom Tzo opcodes can be added by the host
through `additionalFunctions`; use an underscore prefix for hooks that should
be no-ops when absent. Adding new Markdown directives means changing the
compiler and is an explicit open question, not a plugin API.

## Can I split a document into files?

No. One document is one compilation unit with one options header. For large
works, split into separate episodes/quests with their own headers, or
concatenate scene files with a script before compiling. See
[organize a larger document](../how-to/organize-a-document.md).

## Can I save progress?

Yes, with a checkpoint model: persist the context and the current state name,
then re-enter that state on load. The pending menu itself is not serialized.
See [save and load progress](../how-to/save-and-load.md).

## Can I run documents from users?

Only with a budget. The VM has no built-in instruction or time limit, and a
document can loop forever. See
[run untrusted documents safely](../how-to/run-untrusted-documents.md).

## Does it support variables and arithmetic?

Yes, through Tzo. Context values are strings or numbers; `+`, `-`, `*`,
comparisons, logic, `randInt`, `charCode`, and string concatenation are
available. There is no division or modulo. See
[Tzo code](../reference/language.md#tzo-code).

## What is "the stack" people keep mentioning?

Tzo is a stack machine, and Questmark snippets compile to stack operations. A
balanced snippet is invisible; an unbalanced one can change a later
precondition. The players on this site have an **Inspect state** panel that
shows the stack and context after each turn. See
[numbers, strings, and randomness](../tutorials/numbers-strings-and-randomness.md).

## Is there an editor or IDE?

- The [playground](../playground.md) runs in a browser and needs no install.
- [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer)
  renders documents inline.
- [questmark-ide](https://github.com/jorisvddonk/questmark-ide) is a
  work-in-progress IDE.
- [tzo-concisetext-language-support](https://github.com/jorisvddonk/tzo-concisetext-language-support)
  adds VS Code support for Tzo's concise text.

## How do I port Questmark to another language or engine?

Compile to a VMState and implement the Tzo opcodes plus the QuestVM menu
protocol. The [porting guide](../how-to/implement-a-runtime.md) and the
[conformance corpus](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md) are the starting points.

## Where do I report a bug or ask a question?

Open an issue at
[github.com/jorisvddonk/questmark/issues](https://github.com/jorisvddonk/questmark/issues).

## See also

- [Limitations and compatibility](../reference/limitations.md)
- [The Questmark and Tzo ecosystem](ecosystem.md)
- [Why Questmark?](why-questmark.md)

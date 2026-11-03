# The text contract

Questmark emits **text**. It does not emit HTML, Markdown, or a scene graph. A
host receives a stream of strings (and occasionally numbers), and decides how to
present them. That boundary is small, but it has consequences worth
understanding.

## What is emitted

The `emit` opcode hands one value to the host. The value is a string or a
number. A single state can emit several chunks:

- one for each text node,
- one for each inline code snippet that ends in `emit`,
- one for each paragraph,
- the option's post-option text after a choice.

The contract is the **concatenation** of those chunks, not the chunk boundaries.
The reference emits paragraphs with a trailing blank line; another
implementation may split a paragraph into words. Hosts should concatenate.

The [conformance corpus](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md) compares the
concatenated text exactly. That is the strongest statement the project makes
about presentation: every runtime should produce the same words, in the same
order, with the same paragraph separators.

## Why not HTML?

HTML would tie the language to a renderer, a DOM, and a sanitizer. Questmark is
used in a terminal, a browser, and game engines; none of those should have to
agree on markup. Text is the smallest common denominator, and it keeps the
runtime portable.

It also keeps testing honest. The conformance cases do not need a headless
browser or a DOM implementation; they assert strings.

## Why not Markdown out?

The input is Markdown, but the compiler consumes it. Emitting Markdown again
would force every host to run a Markdown renderer and would make the output
ambiguous: is `*text*` emphasis, a literal asterisk, or a list marker?

Instead, Questmark flattens the inline formatting it understands:

| Markdown | Emitted text |
| --- | --- |
| `**bold**` | `*bold*` |
| `*italic*` | `*italic*` |
| `[label](#state)` | `label` |
| `\*escaped\*` | `*escaped*` |
| `![alt](image.png)` | *(nothing)* |
| `<b>text</b>` | `text` |

The single-asterisk convention is deliberately minimal. A host that wants
emphasis can interpret asterisks, render them as-is, or strip them. A host that
wants plain terminal output can leave them. The language does not prescribe a
typographic renderer.

Two details are easy to miss:

- **Inline HTML tags are dropped, but their text survives.** HTML is not a
  supported rendering feature.
- **Images are dropped entirely**, including their alt text. If an image
  matters, describe it in prose or trigger a host hook.

## Paragraphs and post-option text

State text is emitted in paragraphs, and a paragraph ends with a blank line in
the reference output. Post-option text is emitted as written, without an extra
separator. That is why consecutive replies can look like this in a raw
transcript:

```
Bought one.2 coins left.
```

The runtime is not a layout engine. A host normally adds spacing between turns,
or renders each `emit` batch as a block. The reference playground does the
latter; the CLI writes raw text.

Do not rely on a particular chunk size or on a blank line after every emission.
Concatenate, then present.

## What the host owns

Because Questmark emits text, the host is responsible for:

- rendering and styling the transcript,
- presenting choices and accepting input,
- accessibility (labels, roles, keyboard navigation, screen readers),
- audio, images, animation, and haptics,
- persisting the transcript and save data,
- locale-specific typography and translation,
- sanitizing anything the host itself injects into a rich renderer.

The language's job ends at the words. This is what allows a terminal host, a
web host, and a game host to share the same compiled document.

## Why exact text matters

The conformance suite asserts exact emitted text because it is the one part of
the pipeline every host can observe. If one runtime emits `*bold*` and another
emits `<b>bold</b>`, they are not playing the same document. Exact text also
catches accidental whitespace changes in the compiler, and it makes transcripts
diffable.

The trade-off is that the text contract includes some compiler quirks:

- post-option text has no trailing separator,
- newlines inside Tzo strings are preserved,
- `whitespace: retain` preserves entities and literal backslashes but still
  resolves Markdown escapes,
- `emit_on: end_of_line` can reorder inline-code output.

These are pinned by cases rather than hidden in prose. See
[the language reference](../reference/language.md#text-emission).

## Accessibility and media

A text stream is screen-reader friendly in principle, but the host must do the
work:

- Announce state text as it arrives, not all at once if the host streams it.
- Present choices as real controls with labels.
- Do not encode meaning only in typography; the emitted text has no images,
  colours, or layout.
- Provide a transcript if the host clears the screen.

For media, use host hooks (`_playSound`, `_showPortrait`) rather than trying to
embed assets in the document. The language deliberately has no asset system.

## Localization

Localization can happen at runtime: localized builds emit `message` references,
and the VM formats them through a catalog installed with `setCatalog`. The text
contract is unchanged; the host still receives strings. See
[how to localize at runtime](../how-to/localize-at-runtime.md).

## See also

- [The Questmark mental model](mental-model.md) — where text sits in the model.
- [Why a stack machine?](why-a-stack-machine.md) — why `emit` is an opcode.
- [Language reference: text emission](../reference/language.md#text-emission)
- [How to embed Questmark](../how-to/use-the-library.md) — a host
  implementation.

# Control how text is emitted

Questmark is a Markdown dialect, but it is not a Markdown renderer. The
interpreter does not produce HTML; it produces a stream of text for whatever
host is playing the document. This tutorial explains exactly what reaches the
player, and how the header flags change it.

## 1. Paragraphs become text, one chunk at a time

A state's prose is emitted when the player enters the state. Each paragraph is
emitted as a text chunk that ends with a blank line, so paragraphs stay
separated in the output:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "start" }

# start

The first paragraph is emitted on entry.

The second paragraph is emitted right after it.

Inline code runs in place: `1 2 + emit`. And text continues afterwards.

* [Continue](#end)

# end

You reach the end.
`exit`
```

Notice the inline code: the literal text `1 2 +` is compiled as Tzo, not shown.
This is how context values are interpolated into prose.

## 2. Emphasis, links, and other inline Markdown

Questmark keeps only a small part of Markdown's inline formatting:

| Markdown | What the player sees |
| --- | --- |
| `**bold**` | `*bold*` |
| `*italic*` | `*italic*` |
| `[link text](#state)` | `link text` (the URL is dropped) |
| `\*escaped\*` | `*escaped*` |
| `` `code` `` | the result of running the code |

Both strong and emphasis arrive as a single pair of asterisks. Links in state
text are plain text; only links on **options** change navigation. Images are
dropped entirely — their alt text is not emitted either.

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "start" }

# start

This is **very** important and *rather* urgent.

A [link to the end](#end) keeps its words but loses its target.

Escapes survive as literal characters: \*stars\*, \[brackets\], and \`backticks\`.

* [Continue](#end)

# end

Done.
`exit`
```

## 3. Headings

Only **top-level `#` headings** define states. A `#` heading starts a new state,
and everything until the next `#` heading belongs to it.

Do not use `##` or deeper headings inside a state. The compiler treats every
heading as a state boundary, so a `##` section ends the current state's text and
its options are never collected:

```markdown
# start

## A section heading

This text and the option below are lost — they belong to no state.

* [This option will not appear](#end)
```

Use a horizontal rule (`---`) or a bold lead-in paragraph instead when you want
to break up prose inside a state.

## 4. Writer comments: fenced blocks named `comment`

A fenced code block with the language `comment` is invisible: the parser skips
it entirely, and the interpreter never sees it. It is the place for notes that
should stay in the source:

````markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "start" }

# start

The player sees this paragraph.

```comment
TODO: rewrite the second sentence. Ask Joris whether the ferry runs in winter.
```

* [Continue](#end)

# end

The player sees this too.
`exit`
````

Keep comments in the same document as the prose they describe: they survive
review, diff cleanly, and cannot drift out of sync the way an external notes
file can.

## 5. Source text and `whitespace: retain`

By default, Markdown escapes are resolved before emission: `\*` becomes `*`,
`\[` becomes `[`, and HTML entities are decoded. That is usually what you want.

Setting `options.whitespace` to `"retain"` tells the compiler to use the
original source substring for each text node instead of the parsed text. HTML
entities and literal backslashes are preserved:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "options": { "whitespace": "retain" }
    }

# start

Retained: A &amp; B and a literal C:\\path.

* [Continue](#end)

# end

Done.
`exit`
```

That document emits `A &amp; B` and `C:\\path` as written. Without `retain` it
would emit `A & B` and `C:\path`.

The standard Markdown escapes (`\*`, `\[`, `\]`, `\#`, `\(`, `\)`) are still
resolved, so `\*` still becomes `*`. `retain` changes how text is extracted, not
how Questmark paragraphs are formed. Use it when the document is a faithful
transcript of source text; leave it off for normal prose.

## 6. `emit_on: end_of_line`

By default every text node is emitted immediately. With
`options.emit_on: "end_of_line"`, text is accumulated until a line ends, then
emitted as one chunk. This produces fewer, larger emissions — useful for hosts
that render a line at a time.

There is a catch: **inline code still runs immediately**. Because the
surrounding text is deferred, the code's output can appear before the text that
precedes it in the source. For example:

```markdown
Hello `1 emit` world.
```

with `emit_on: "end_of_line"` emits `1` first, then `Hello  world.`. If you need
strict left-to-right output, keep the default `"classic"` mode.

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "log",
      "options": { "emit_on": "end_of_line", "strip_leading_newlines": true }
    }

# log

Entry one: the gate is quiet.
Entry two: a cart arrives from the north.
Entry three: the cart leaves again.

* [Close the log](#end)

# end

The log closes.
`exit`
```

`strip_leading_newlines: true` removes leading newline characters from each
emitted chunk, which is useful together with `end_of_line` when source
indentation would otherwise leak into the output.

## 7. `no_link_behaviour` and text

The last header flag, `options.no_link_behaviour`, does not change text, but it
changes what happens after an option is chosen: it decides whether an option
with no link and no effect returns to the menu or ends the conversation. It is
covered in [Choices with consequences](choices-with-consequences.md#6-ending-the-story).

## 8. The full header

Everything in one place:

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "gold": 0 },
      "options": {
        "no_link_behaviour": "loopback_to_options",
        "whitespace": "retain",
        "emit_on": "end_of_line",
        "strip_leading_newlines": true
      }
    }
```

The options header is optional. When it is present it must contain valid JSON
in an indented code block, and `initial-state` should name a real state.

## Recap

- Paragraph text is emitted on entry; paragraphs end with a blank line.
- Strong and emphasis both become `*text*`; links in prose lose their target.
- Only `#` headings define states; `##` and deeper break the current state.
- `comment` code blocks are invisible to the compiler and the player.
- `whitespace: retain` uses source text for each node, preserving entities and
  literal backslashes (Markdown escapes still resolve).
- `emit_on: end_of_line` batches text, and can reorder inline-code output.
- `strip_leading_newlines` cleans up batched chunks.

## Where to next

- [Write a branching dialogue](branching-dialogue.md) — a conversation-tree
  capstone using everything so far.
- [Build a text adventure](text-adventure.md) — a larger, room-based game.
- [Language reference: text and options](../reference/language.md) — the formal
  rules.

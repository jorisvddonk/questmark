# Questmark language reference

Questmark is a dialect of Markdown for dialogue trees and interactive fiction.
A document is a series of `#`-headed sections called **states**, connected by
links and code. The compiler turns the document into Tzo bytecode, which an
interpreter such as `QuestVM` executes.

This page describes the language precisely. If you are learning it for the
first time, start with the [tutorials](../tutorials/first-conversation.md), and
keep the [cheat sheet](cheatsheet.md) open while you write.

## Document structure

```markdown
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "start" }

# start

Some text.

* An option
* Another option
```

- The `QUESTMARK-OPTIONS-HEADER` section is optional. When present, its
  indented code block must contain valid JSON (see below).
- Every other top-level `# heading` defines a state.
- Text before the first unordered list is the state's text.
- The unordered list items are the state's **options**.
- Lines starting with `##` or deeper do **not** create states; see
  [headings](#headings).

## Options header

The `QUESTMARK-OPTIONS-HEADER` section configures the document. Its fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `questmark-spec` | string | Spec version. Currently `"1.0"`. |
| `initial-state` | string | Name of the state to start in. |
| `initial-context` | object | Initial values for the context bag. Values are numbers or strings. |
| `options` | object | Interpreter behaviour flags, below. |

### `options` flags

| Flag | Values | Default | Meaning |
| --- | --- | --- | --- |
| `no_link_behaviour` | `"loopback_to_options"`, `"exit"` | `"loopback_to_options"` | What happens after an option with no link is chosen. |
| `whitespace` | `"retain"` | normal | Retain original source whitespace instead of the parsed text. |
| `emit_on` | `"classic"`, `"end_of_line"` | `"classic"` | Emit on every text node, or only when a line ends. |
| `strip_leading_newlines` | `true` | `false` | Strip leading newlines from emitted text chunks. |

`initial-context` is applied before execution starts, so every state can read
those keys safely. `initial-state` is the state entered first; if it is omitted,
execution starts at the beginning of the compiled program, which is usually the
first state in the file.

### Complete header example

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "gold": 0, "name": "Ada" },
      "options": {
        "no_link_behaviour": "loopback_to_options",
        "emit_on": "classic",
        "strip_leading_newlines": false
      }
    }
```

Unknown `no_link_behaviour` values are a compile error. Other unknown fields
are ignored.

## States

A state is a top-level `#`-headed section. Its name is the heading text. Names
are used as `goto` targets and as the target of `#name` links.

A state contains:

- **text** — everything before the first unordered list, emitted on entry;
- **options** — the items of the first unordered list, offered as a menu;
- **code** — backticked Tzo code, executed in place (see [Tzo code](#tzo-code)).

Everything after the first unordered list belongs to the options list. A
paragraph after the last option is that option's post-option text, not state
text.

### Headings

Only **top-level** `#` headings define states. The compiler treats a heading at
any level as a state boundary, so a `##` or deeper heading inside a state ends
that state's text and options early. Do not use them inside a state:

```markdown
# start

## This breaks the state

This text and the option below belong to no state.

* [Lost option](#end)
```

Use a horizontal rule (`---`) or a styled paragraph instead.

State names must be unique. Defining the same heading twice overwrites the
label map entry for the earlier state.

### State text and code

Plain paragraphs are emitted as text when the player enters the state. Inline
code inside the text is executed as Tzo code at that point:

```markdown
You have `"cookies" getContext emit` cookies!
```

This pushes the value of `cookies`, then emits it, so the player sees
`You have 3 cookies!`.

A fenced code block with language `comment` is ignored entirely and never
reaches the player or the interpreter:

````markdown
```comment
This is a note for the human writers. It is never executed or shown.
```
````

## Options

Options are the items of the state's first unordered list. An option can have:

- a **label** (the text shown in the menu),
- a **link** (a `#state` target to jump to when chosen),
- **precondition** code (backticks before the label; the option is offered only
  when the code leaves a positive value),
- a **directive** (backticks before the label starting with `@`),
- **effect** code (backticks after the label; executed when chosen),
- **post-option text** (paragraphs or text after the option; emitted when
  chosen).

### Anatomy

```markdown
* `@once` `"gold" getContext 0 gt` [Buy the map](#market) `0 "gold" setContext`

  The merchant rolls up the map and hands it over.
```

| Part | Example | Notes |
| --- | --- | --- |
| directive | `@once` | Before the label. |
| precondition | `"gold" getContext 0 gt` | Before the label. |
| label | `[Buy the map](#market)` | The menu text. |
| link | `(#market)` | Inside the label's link. |
| effect | `0 "gold" setContext` | After the label. |
| post-option text | The indented paragraph | After the option. |

Only the label is required. An option can be a plain statement with no effect
(`* Look around`), a link (`* [Go north](#north)`), or any combination.

### Option labels

Labels are plain text. Supported inline Markdown is limited:

- **Supported:** ordinary words, punctuation, emoji, quotes, dashes, and a
  Markdown link. When the label is a link, the link text is the label and the
  target is the jump.
- **Not supported:** emphasis (`*italic*`, `**bold**`) and inline code in the
  label. Emphasis nodes become effect nodes, which truncates the label and can
  make compilation fail. Inline code in a label is reported with a warning and
  is not part of the label.
- **Not supported:** mixing a link and additional text in one label. The text
  before the link becomes the label and the remainder becomes post-option
  text.

Keep labels short and plain:

```markdown
* [Buy the map](#market)
* Ask about the weather
* [Leave](#street)
```

### Preconditions

Backticked code before an option's label is a precondition. The interpreter
executes it while building the menu and offers the option only if the code
leaves a value greater than zero on the stack.

The usual patterns:

```markdown
* `0 "gold" getContext gt` You can afford it.
* `"lamp" hasContext` You have a light.
* `"lamp" hasContext not` You have no light.
* `0 "map" getContext eq 3 "gold" getContext gt and` Two tests, combined.
```

Two rules matter:

1. **Leave exactly one value.** `jgz` pops one value. Values left behind
   leak into the next menu build. If you have several tests, combine them with
   `and` / `or` rather than writing two separate backticked preconditions.
2. **Grade comparisons in the right order.** Tzo pops the top of the stack
   first, so `0 "gold" getContext gt` means `gold > 0`. See
   [stack order](#a-stack-read-right-to-left).

Reading a key that does not exist with `getContext` throws. Initialize it in
`initial-context`, or test it with `hasContext`.

### Directives

The only directive currently implemented is `@once`.

An option marked `@once` is offered until it is chosen once. It then disappears
for the rest of the play session. The interpreter implements this with an
internal context key (`__once__N`); do not reuse those names.

```markdown
* `@once` Read the notice
* `@once` `0 "sharpened" getContext eq` Sharpen your knife `1 "sharpened" setContext`
```

A directive and a precondition can be combined. Both are written before the
label, in any order.

### Effects

Backticked code after the label runs when the option is chosen, in source
order. Code blocks (fenced blocks) after the label also become effect code; a
`comment` block is skipped.

```markdown
* Open the chest `1 "chest_open" setContext` `"key" delContext`
```

Effects run **before** the link is followed and **before** post-option text is
emitted. If an effect contains `goto` or `exit`, later post-option text never
runs:

```markdown
* Take the tunnel `"tunnel" goto`

  This paragraph is never reached — the goto above leaves the state first.
```

### Post-option text

Text after an option line, before the next option, is emitted only when that
option is chosen:

```markdown
* Open the letter `1 "read" setContext`

  The seal cracks. Your sister's handwriting fills the page.
```

Indented or not, a paragraph after an option belongs to that option. Put the
next option at the same list level; do not nest lists inside an option.
Indenting post-option text is clearer for readers, even though the parser
accepts both forms.

### Links

A link on the label jumps to a state when the option is chosen:

```markdown
* [Go north](#north)
```

A link is optional. An option with no link loops back to the state's menu after
its effect and post-option text, unless `no_link_behaviour` is `"exit"`.

### `no_link_behaviour`

This header flag decides what happens to an option that has no link:

| Value | Behaviour |
| --- | --- |
| `"loopback_to_options"` (default) | Return to the same state's menu. |
| `"exit"` | End the conversation after the effect and post-option text. |

It applies even when the option emits post-option text. Effects that call
`goto` or `exit` override it.

### Choosing an option

When the player chooses an option, the interpreter:

1. runs the option's effect code,
2. emits the option's post-option text (interleaved with the effect),
3. follows the option's link (`goto`),
4. or, if there is no link, applies `no_link_behaviour`.

Preconditions and `@once` are evaluated when the menu is **built**, not when an
option is chosen. Context changes from an effect only affect the next menu.

## Context

The **context** is a bag of named variables (numbers and strings) that tracks
what the player has done. It is initialized from `initial-context` and mutated
by effect code. It lives for the whole play session, across states.

Common patterns:

```markdown
`1 "door_open" setContext`          store the number 1 under "door_open"
`"door_open" getContext`            push the value of "door_open"
`"door_open" hasContext`            push 1 if the key exists, else 0
`"door_open" delContext`            remove the key
```

Values are never scoped: every state sees the same context. Use a naming
convention (for example `quest_*`, `npc_mira_*`) in larger documents.

Important details:

- `getContext` throws if the key is absent.
- `hasContext` never throws.
- `setContext` takes the value first and the key on top:
  `1 "door_open" setContext`.
- Numbers are JavaScript numbers. The Tzo source format used here accepts
  integers; do not rely on floating-point literals.
- Strings are double-quoted. Do not put escaped double quotes inside a Tzo
  string; the tokenizer keeps the backslashes.
- Context values are visible to `eq`, `gt`, `lt`, and the logical opcodes when
  they are numbers.

The `@once` directive stores its state in reserved `__once__N` keys. Treat any
key beginning with `__` as internal.

## Tzo code

Code inside backticks is Tzo bytecode written in **reverse-Polish** order:
operands first, operator last. Strings are double-quoted; numbers are integer
literals. Opcodes and operands are separated by whitespace.

Example:

```markdown
"NORMAL_HELLO_" 2 randInt 65 + charCode rconcat goto
```

### A stack, read right to left

Values are pushed onto a stack. An opcode pops what it needs and pushes its
result. **Every opcode pops the topmost value first.**

For a binary opcode written `x y op`, the first operand is `y` (the top) and
the second is `x`. That gives the following, possibly surprising, results:

| Source | Result | Why |
| --- | --- | --- |
| `3 10 -` | `7` | top `10` minus next `3`. |
| `10 3 -` | `-7` | top `3` minus next `10`. |
| `3 10 gt` | `1` | top `10` > next `3`. |
| `10 3 gt` | `0` | top `3` is not > next `10`. |
| `"a" "b" concat` | `"ba"` | top `"b"` then next `"a"`. |
| `"a" "b" rconcat` | `"ab"` | next `"a"` then top `"b"`. |
| `1 "key" setContext` | stores `1` under `key` | key is on top. |

Put the value you care about **last** when comparing. In practice this means
`0 "gold" getContext gt` reads as `gold > 0`, and `2 "coins" getContext -` reads
as `coins - 2`.

The stack is shared by the whole program. Inline snippets that leave values
behind change what later code sees. Balance every snippet.

### Opcodes

The standard opcode set (provided by Tzo and QuestVM):

| Opcode | Stack effect | Description |
| --- | --- | --- |
| `emit` | `(value)` | Emit text/number to the player. |
| `exit` | | End the conversation. |
| `goto` | `(label \| pc)` | Jump to a label or program position. |
| `pause` | | Suspend the VM. |
| `getContext` | `(key) -> value` | Push the value of a context key (throws if absent). |
| `hasContext` | `(key) -> 0 \| 1` | Push whether the key exists. |
| `setContext` | `(value key)` | Store `value` under `key`. |
| `delContext` | `(key)` | Remove `key` from the context. |
| `eq` | `(a b) -> 0 \| 1` | Push `1` if `b == a`. `7 7 eq` → `1`. |
| `gt` | `(a b) -> 0 \| 1` | Push `1` if `b > a`. `3 10 gt` → `1`. |
| `lt` | `(a b) -> 0 \| 1` | Push `1` if `b < a`. `10 3 lt` → `1`. |
| `and` | `(a b) -> 0 \| 1` | Logical and (zero is false). |
| `or` | `(a b) -> 0 \| 1` | Logical or (zero is false). |
| `not` | `(a) -> 0 \| 1` | Push `1` if `a` is zero, else `0`. |
| `jgz` | `(a)` | Skip the next instruction if `a > 0`. |
| `jz` | `(a)` | Skip the next instruction if `a == 0`. |
| `+` / `plus` | `(a b) -> b+a` | Addition. |
| `-` / `min` | `(a b) -> b-a` | Subtraction. `3 10 -` → `7`. |
| `*` / `mul` | `(a b) -> b*a` | Multiplication. |
| `concat` | `(a b) -> "b"+"a"` | Concatenate, topmost first. |
| `rconcat` | `(a b) -> "a"+"b"` | Concatenate, topmost last. |
| `dup` | `(a) -> a a` | Duplicate the top of the stack. |
| `pop` | `(a)` | Discard the top of the stack. |
| `stacksize` | `() -> n` | Push the current stack depth (now one larger). |
| `randInt` | `(max) -> 0..max-1` | Push a random integer. |
| `charCode` | `(n) -> char` | Push the character for code point `n`. |
| `nop` | | Do nothing. |
| `{` / `}` | | Block delimiters used by `jgz`/`jz`. |
| `ppc` | `() -> pc` | Push the current program counter (used internally). |

The QuestVM adds the choice machinery, used by the compiler internally:

| Opcode | Description |
| --- | --- |
| `response` | Register the current option's effect position as a choice. |
| `getResponse` | Suspend the VM and ask the host for a choice. |

`optionEnabled`, `optionDisabled`, `disableOption`, and `enableOption` are
deprecated and should not be used.

Tzo also provides `stdout`, which writes to the host's standard output rather
than the player. Hosts should use `emit` instead.

### Blocks and conditional code

`jgz` and `jz` skip the **next instruction**. Combined with `{` and `}`, they
guard a block:

```markdown
`"torch" hasContext jgz { "The torch burns steadily." emit }`
```

- If the test value is positive, `jgz` skips the `{`, and the body runs.
- If it is not, the `{` scans forward to its matching `}` and jumps past it.

For an if/else pair, guard the second block with `jz` on the **same** value:

```markdown
`"torch" hasContext jgz { "The torch burns." emit }`
`"torch" hasContext jz { "It is dark." emit }`
```

`}` does nothing when execution reaches it normally; it exists so `{` can find
the end of its block.

### Labels

`goto` accepts a state name. State names are registered in the label map, as is
every state's `__options` label (used internally to loop back to a menu). You
can also jump by program counter with a number, but state names are the stable
interface.

### Host hooks

Functions not registered in the VM are a runtime error, unless their name starts
with `_`. Underscore-prefixed opcodes are silently treated as no-ops when the
host has not registered them, which makes them safe markers and hooks:

```markdown
* Open the door `_playDoorSound` The door creaks open.
```

A host can register `_playDoorSound` in `additionalFunctions` to trigger sound,
animation, or telemetry. See [embed Questmark](../how-to/use-the-library.md).

## Text emission

Questmark emits text, not HTML. The host decides how to present it.

- Paragraphs in state text are emitted as text chunks and end with a blank
  line. Post-option text is emitted as written; hosts usually add spacing
  between turns themselves.
- Inline code is executed at its position in the text.
- Markdown strong and emphasis are both emitted with single asterisks:
  `**bold**` and `*italic*` both become `*text*`.
- Link text is emitted; the URL is dropped. Images are not rendered.
- Escapes are resolved by default (`\*` becomes `*`).
- Ordered lists, blockquotes, and horizontal rules emit their text as ordinary
  paragraphs. They are not structural for Questmark.
- Fenced `comment` blocks are skipped.

### Formatting flags

**`whitespace: "retain"`** takes text verbatim from the source, including
backslashes and original spacing, instead of using the parsed text. Use it for
faithful transcripts; leave it off for normal prose.

**`emit_on: "end_of_line"`** accumulates text until a line ends. Inline code
still executes immediately, so its output can appear before the text that
precedes it in the source. Use the default `"classic"` when strict
left-to-right output matters.

**`strip_leading_newlines: true`** removes leading newline characters from each
emitted text chunk. It is useful together with `end_of_line`.

## Execution model

Compilation produces a Tzo `VMState`: a flat `programList`, a `labelMap`, and
the initial context. At runtime:

1. `initial-context` is written with `setContext`.
2. `initial-state` is entered with `goto`.
3. State code and text run, emitting as they go.
4. Options register themselves as they are reached. Preconditions that fail
   skip the registration entirely.
5. The state ends with `getResponse`, which suspends the VM and hands the
   collected options to the host.
6. When the host resolves a choice, the VM pushes that option's effect position
   and resumes.

Because options are registered by running code, a failed precondition never
reaches the host. The host only ever sees the options that are actually
available.

## Errors and diagnostics

| Symptom | Cause | Fix |
| --- | --- | --- |
| `getContext: null/undefined can not be pushed to the context!` | Reading a key that does not exist. | Initialize it in `initial-context` or test with `hasContext`. |
| `Cannot find function in function table: name` | Unknown opcode. | Check the spelling; use an underscore prefix for host hooks. |
| `... is not a number` / `... is not a string` | Wrong operand type or wrong stack order. | Check what is on top of the stack. |
| Label or option disappears | A `##` heading ended the state. | Use `#` only for states; use `---` for visual breaks. |
| Option label is truncated or compilation fails | Emphasis or inline code in a label. | Keep labels plain text. |
| Menu shows the same option forever | Option has no link and no effect. | Add a link/effect, or set `no_link_behaviour` to `"exit"`. |
| `Option text contains a backtick` warning | Inline code in a label. | Move the code after the label or into prose. |
| Values seem to leak between snippets | Unbalanced stack. | Consume every value you push. |
| `Unknown 'options.no_link_behaviour'` | Header value is not one of the two allowed strings. | Use `"loopback_to_options"` or `"exit"`. |

## Complete worked example

This document combines states, context, preconditions, effects, `@once`,
post-option text, comparisons, and two endings:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "harbour",
      "initial-context": { "trust": 0, "coins": 2 }
    }

# harbour

Rain on the harbour. The ferryman waits under a tarpaulin.

* `@once` Ask about the crossing `1 "trust" getContext + "trust" setContext`

  "Last one tonight," he says. "After that the tide turns."

* `@once` Ask about the weather `1 "trust" getContext + "trust" setContext`

  "It will clear," he says, without conviction.

* `1 "trust" getContext gt` [Ask for a favour](#favour)

* [Offer two coins](#pay) `0 "coins" setContext`

* [Walk home](#home)

# favour

He looks at the sky, then at you. "Get in," he says. "No charge. You look like
you've somewhere to be."

`exit`

# pay

The coins disappear into his coat. He unties the rope.

`exit`

# home

You turn back towards the lit windows of the town.

`exit`
```

## Compatibility and status

- The spec is informal and the feature set is still evolving.
- The reference interpreter is TypeScript, available as the `questmark`
  package. Tzo has reference implementations in TypeScript, Rust, C, and
  WebAssembly text; Questmark runtimes exist for Rust, C, and Godot. See
  [Related projects](../explanation/ecosystem.md).
- Compile once to JSON, then ship the compiled `VMState` to any runtime that
  implements the same opcodes. Hosts that do not implement `response` /
  `getResponse` cannot play choice-driven documents.

## See also

- [Cheat sheet](cheatsheet.md) — the same information on one page.
- [API reference](api.md) — `parseMarkdown`, `QuestVM`, and the compiled state.
- [Cookbook: common patterns](../how-to/recipes.md) — copy-paste recipes.
- [The Questmark and Tzo ecosystem](../explanation/ecosystem.md) — runtimes and
  tools.

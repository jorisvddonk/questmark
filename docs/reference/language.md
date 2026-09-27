# Questmark language reference

Questmark is a dialect of Markdown for dialogue trees and interactive fiction.
A document is a series of `#`-headed sections called **states**, connected by
links and code. The compiler turns the document into Tzo bytecode, which an
interpreter such as `QuestVM` executes.

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
- Every other `# heading` defines a state.
- Text before the first list item is the state's text.
- List items are the state's **options**.

## Options header

The `QUESTMARK-OPTIONS-HEADER` section configures the document. Its fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `questmark-spec` | string | Spec version. Currently `"1.0"`. |
| `initial-state` | string | Name of the state to start in. |
| `initial-context` | object | Initial values for the context bag. |
| `options` | object | Interpreter behaviour flags, below. |

### `options` flags

| Flag | Values | Default | Meaning |
| --- | --- | --- | --- |
| `no_link_behaviour` | `"loopback_to_options"`, `"exit"` | `"loopback_to_options"` | What happens when a chosen option has neither a link nor an `exit`/`goto` effect. |
| `whitespace` | `"retain"` | normal | Retain original source whitespace instead of the parsed text. |
| `emit_on` | `"end_of_line"` | `"classic"` | Only emit text when a line ends, instead of on every text node. |
| `strip_leading_newlines` | `true` | `false` | Strip leading newlines from emitted text. |

## States

A state is a `#`-headed section. Its name is the heading text. `#` characters
inside the heading are removed from the name.

A state contains:

- **Text** — paragraphs shown to the player on entry.
- **Options** — the list of things the player can do.
- **Code** — backticked Tzo code (see below), executed in place.

### State text and code

Plain paragraphs are emitted as text when the player enters the state.
Inline code in the text is executed as Tzo code at that point:

```markdown
You have `"cookies" getContext emit` cookies!
```

This pushes the value of `cookies`, then emits it, so the player sees
`You have 3 cookies!`.

A code block with language `comment` is ignored entirely and never reaches the
player or the interpreter:

````markdown
```comment
This is a note for the human writers. It is never executed or shown.
```
````

## Options

Options are list items under a state's text. An option can have:

- a **text** (the label shown in the menu),
- a **link** (a `#state` target to jump to when chosen),
- **precondition** code (backticks before the text; the option is hidden when
  the code leaves a non-positive value),
- a **directive** (backticks before the text starting with `@`),
- **effect** code (backticks after the text; executed when chosen),
- **post-option text** (paragraphs after the option line; emitted when chosen).

Examples:

```markdown
* A simple statement with no effect
* [A link to another state](#other)
* A statement that quits when chosen `exit`
* `"key" getContext` A conditional option (hidden unless "key" is positive)
* `@once` An option that can only be chosen once
* `@once` `"a" getContext` Once, and only when "a" is positive
```

When a player chooses an option, the interpreter:

1. runs the option's effect code,
2. emits the option's post-option text (interleaved with the effect),
3. follows the option's link (`goto`),
4. or, if there is no link and no effect, applies `no_link_behaviour`.

### Preconditions

Backticked code before an option's text is a precondition. The interpreter
executes it and offers the option only if the code leaves a value greater than
zero on the stack. Preconditions are how you build branching, story-aware menus
(see [context](#context)).

Note that `getContext` throws if the key is not present in the context, so
every key read in a precondition should be initialized in `initial-context`.

### The `@once` directive

An option marked `@once` is only offered once per play session. After the
player chooses it, it disappears from the menu. The interpreter implements this
with an internal context key (`__once__N`).

## Context

The **context** is a bag of named variables (numbers and strings) that tracks
what the player has done. It is initialized from `initial-context` and mutated
by effect code.

Common patterns:

```markdown
`1 "door_open" setContext`          ; store the number 1 under "door_open"
`"door_open" getContext`            ; push the value of "door_open"
`"door_open" hasContext`            ; push 1 if the key exists, else 0
`"door_open" delContext`            ; remove the key
```

Use the `emit` opcode to show a context value in text, and `getContext` in a
precondition to gate options on it.

## Tzo code

Code inside backticks is Tzo bytecode written in reverse-Polish order: operands
first, operator last. Strings are double-quoted. Example:

```
"NORMAL_HELLO_" 2 randInt 65 + charCode rconcat goto
```

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
| `setContext` | `(key value)` | Store `value` under `key`. |
| `delContext` | `(key)` | Remove `key` from the context. |
| `eq` | `(a b) -> 0 \| 1` | Push `1` if `a == b`. |
| `gt` | `(a b) -> 0 \| 1` | Push `1` if `a > b`. |
| `lt` | `(a b) -> 0 \| 1` | Push `1` if `a < b`. |
| `and` | `(a b) -> 0 \| 1` | Logical and. |
| `or` | `(a b) -> 0 \| 1` | Logical or. |
| `not` | `(a) -> 0 \| 1` | Logical not. |
| `jgz` | `(a)` | Skip the next instruction if `a > 0`. |
| `jz` | `(a)` | Skip the next instruction if `a == 0`. |
| `+` / `plus` | `(a b) -> a+b` | Addition. |
| `-` / `min` | `(a b) -> a-b` | Subtraction. |
| `*` / `mul` | `(a b) -> a*b` | Multiplication. |
| `concat` | `(a b) -> "a"+"b"` | Concatenate (topmost value first). |
| `rconcat` | `(a b) -> "b"+"a"` | Concatenate (topmost value last). |
| `dup` | `(a) -> a a` | Duplicate the top of stack. |
| `pop` | `(a)` | Discard the top of stack. |
| `stacksize` | `() -> n` | Push the stack depth. |
| `randInt` | `(max) -> 0..max-1` | Push a random integer. |
| `charCode` | `(n) -> char` | Push the character for code point `n`. |
| `nop` | | Do nothing. |
| `{` / `}` | | Block delimiters used by `jgz`/`jz` to skip code. |
| `ppc` | `() -> pc` | Push the current program counter (used internally). |

The QuestVM adds the choice machinery, used by the compiler internally:

| Opcode | Description |
| --- | --- |
| `response` | Register the current option's effect position as a choice. |
| `getResponse` | Suspend the VM and ask the host for a choice. |

`optionEnabled`, `optionDisabled`, `disableOption`, and `enableOption` are
deprecated and should not be used.

Functions not registered in the VM are an error at runtime, unless their name
starts with `_`, in which case they are silently treated as a no-op (handy as
markers or hooks for host applications).

## Limitations and notes

- The spec is still informal, and the feature set is still evolving.
- `getContext` on an uninitialized key throws; initialize keys up front.
- An option that has neither a link nor an effect loops back to the menu by
  default (`loopback_to_options`), which can appear to loop forever if the
  option is always available. Set `no_link_behaviour` to `"exit"` or give the
  option a link/effect if that's not what you want.
- Comments inside option text are not yet supported by the interpreter; a
  backtick in an option label produces a warning.
# Cheat sheet

A one-page summary of the language. For explanations, see the
[language reference](language.md); for lessons, the
[tutorials](../tutorials/first-conversation.md).

## Document skeleton

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "gold": 0 },
      "options": { "no_link_behaviour": "loopback_to_options" }
    }

# start

State text. Inline code runs here: `"gold" getContext emit`.

* `@once` An option with a directive
* `0 "gold" getContext gt` A gated option
* [A link](#other) `1 "gold" setContext`
* An option with a reply

  This paragraph is emitted when the option is chosen.

# other

Another state.
`exit`
```

## Header fields

| Field | Values | Default |
| --- | --- | --- |
| `questmark-spec` | `"1.0"` | — |
| `initial-state` | state name | start of program |
| `initial-context` | `{ "key": number \| string }` | `{}` |
| `options.no_link_behaviour` | `"loopback_to_options"`, `"exit"` | loopback |
| `options.whitespace` | `"retain"` | parsed text |
| `options.emit_on` | `"classic"`, `"end_of_line"` | classic |
| `options.strip_leading_newlines` | `true` | `false` |

## Option anatomy

```markdown
* `@once` `"key" getContext` [Label](#state) `effect code`

  Post-option text.
```

| Part | Where | Notes |
| --- | --- | --- |
| directive | before label | `@once` |
| precondition | before label | must leave one positive number |
| label | — | plain text only |
| link | inside label | `[Label](#state)` |
| effect | after label | runs on choice |
| post-option text | after the line | emitted on choice |

## Context

| Code | Meaning |
| --- | --- |
| `0 "gold" getContext gt` | gold > 0 |
| `0 "gold" getContext eq` | gold == 0 |
| `"lamp" hasContext` | lamp exists |
| `"lamp" hasContext not` | lamp does not exist |
| `1 "gold" setContext` | gold = 1 |
| `1 "gold" getContext + "gold" setContext` | gold += 1 |
| `2 "gold" getContext - "gold" setContext` | gold -= 2 |
| `"gold" delContext` | delete gold |
| `"a" hasContext "b" hasContext and` | both flags set |

**Operand order:** the top of the stack is the first operand. In
`x y op`, the result is `y op x`. So `0 "gold" getContext gt` is
`gold > 0`.

## Jumps and blocks

```markdown
`"torch" hasContext jgz { "You can see." emit }`
`"torch" hasContext jz { "It is dark." emit }`
`"path" goto`
`exit`
```

- `jgz`: run the block when the value is > 0.
- `jz`: run the block when the value is 0.
- `{ ... }` is a real block; `{` skips to the matching `}`.
- Directives and preconditions are evaluated when the menu is built.

## Common opcodes

| Opcode | Use |
| --- | --- |
| `emit` | show a value |
| `exit` | end the conversation |
| `goto` | jump to a state |
| `getContext` / `setContext` / `hasContext` / `delContext` | context |
| `eq` / `gt` / `lt` | comparisons |
| `and` / `or` / `not` | logic |
| `+` / `-` / `*` | arithmetic |
| `concat` / `rconcat` | strings (`"a" "b" rconcat` → `"ab"`) |
| `randInt` | `6 randInt 1 +` → 1..6 |
| `charCode` | `65 charCode` → `A` |
| `dup` / `pop` | stack manipulation |
| `_name` | host hook, no-op if unregistered |

## Text

- Paragraphs emit on entry; each ends with a blank line.
- `**bold**` and `*italic*` both emit as `*text*`.
- Links in prose emit their text, not their URL.
- Escape Markdown with a backslash: `\*`, `\[`, `\]`, `\#`, `\(`, `\)`.
- Fenced code blocks with language `comment` are invisible.
- Only top-level `#` headings are states; `##` breaks the current state.
- Option labels must be plain text (no bold, italics, or code).

## Rules of thumb

1. Initialize every key you read with `getContext`.
2. Leave exactly one value from a precondition.
3. Combine tests with `and` / `or` in one span.
4. Use `hasContext` for optional keys.
5. Every non-terminal state needs a way out.
6. Use `@once` for one-off topics and actions.
7. Keep prose in state text and state changes in effects.
8. Run the document; the compiler is the first reviewer.

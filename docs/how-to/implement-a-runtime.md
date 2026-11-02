# How to implement a Questmark runtime

Questmark documents compile to Tzo bytecode. The compiler is one project; a
runtime that executes that bytecode can live anywhere — Rust, C, Godot, a
game engine, a test harness. This guide describes what such a runtime must
implement and how to prove it matches the reference.

The reference implementation is the TypeScript `questmark` package. The
portable contract is the [conformance corpus](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md).

## 1. The input: a compiled VMState

A compiled document is plain JSON:

```json
{
  "type": "questmarkVMState",
  "stack": [],
  "context": { "coins": 3 },
  "programList": [
    { "type": "push-number-instruction", "value": 3 },
    { "type": "push-string-instruction", "value": "coins" },
    { "type": "invoke-function-instruction", "functionName": "setContext" },
    { "type": "push-string-instruction", "value": "start" },
    { "type": "invoke-function-instruction", "functionName": "goto" }
  ],
  "labelMap": { "start": 4, "start__options": 12 },
  "programCounter": 0,
  "exit": false,
  "pause": false
}
```

`programList` contains three instruction shapes:

| `type` | Payload | Meaning |
| --- | --- | --- |
| `push-number-instruction` | `value: number` | Push a number. |
| `push-string-instruction` | `value: string` | Push a string. |
| `invoke-function-instruction` | `functionName: string` | Call an opcode. |

`labelMap` maps state names — and every state's `<name>__options` loopback
label — to positions in `programList`. The `__options` label is how an option
without a link returns to the same menu.

See [document tree and VMState](../reference/document-tree.md) for the full
shape.

## 2. The execution loop

Tzo is a stack machine. A minimal interpreter:

```
while not exit and not pause:
    instruction = programList[programCounter]
    if instruction is missing: exit = true; break
    oldPC = programCounter
    execute(instruction)
    if programCounter == oldPC: programCounter += 1
```

Each instruction either pushes a value or invokes an opcode. An opcode may
change `programCounter`, set `pause`, or set `exit`.

Two details are easy to get wrong:

- **Operand order.** Opcodes pop the **topmost** value first. In source
  `3 10 -`, the top is `10`, so the result is `10 - 3 = 7`. The compiler emits
  operands left to right; the stack reverses them.
- **Block scanning.** `{` scans forward for the matching `}` (respecting
  nesting) and jumps to one past it. `}` does nothing. `jgz` and `jz` pop one
  number and skip the *next instruction* (they add 2 to the program counter)
  when their test passes. This is how preconditions and `@once` are gated.

## 3. Required opcodes

Implement the Tzo standard runtime, plus the three QuestVM opcodes. The full
table with examples is in the [language reference](../reference/language.md#opcodes).

### Tzo standard runtime

`nop`, `pop`, `dup`, `stacksize`, `+`, `-`, `*`, `concat`, `rconcat`,
`randInt`, `charCode`, `not`, `and`, `or`, `jgz`, `jz`, `gt`, `lt`, `eq`,
`pause`, `exit`, `{`, `}`, `getContext`, `hasContext`, `setContext`,
`delContext`, `goto`, `ppc`, `stdout`.

Notes:

- `getContext` **throws** if the key is missing; `hasContext` never throws.
- `not` returns `1` only for zero, `0` for every other number (including
  negative numbers).
- `randInt` returns `0 .. max-1`; `charCode` maps a code point to a string.
- `goto` accepts a number (program counter) or a string (label lookup).
- `pause` suspends; `exit` ends. A host resumes a paused VM itself.
- `stdout` writes to the host's debug output, not to the player. Questmark
  documents should use `emit`.

### QuestVM opcodes

| Opcode | Behaviour |
| --- | --- |
| `emit` | Pop one string/number and hand it to the host's text callback. |
| `response` | Pop a program counter (number) and a label (string); register them as the current choice. |
| `getResponse` | Suspend the VM, hand the registered choices to the host, and wait for a choice id. |

The menu protocol is:

1. While building a state's menu, each available option reaches `response`,
   which records its label and the program counter of its effect body.
2. `getResponse` suspends and gives the host the list of `{ title, id }`
   choices, in registration order. Hidden options never reach this point.
3. The host resolves with an option id.
4. The runtime pushes the chosen option's saved program counter and resumes
   execution from there. The compiled code immediately runs `goto`, which
   consumes that counter and enters the option's effect.

Choice ids are positional within the current menu. Do not persist them across
menus.

`optionEnabled`, `optionDisabled`, `enableOption`, and `disableOption` are
deprecated. You can implement them for old documents or reject them with a
clear error.

### Host hooks

An unknown opcode is an error, unless its name starts with `_`. Underscore
opcodes are **no-ops** when the host has not registered them, and registering
one must not change the stack. This is what lets the same document run in a
plain interpreter and in a game that provides sound, inventory, or telemetry
hooks. See [host hooks](../reference/language.md#host-hooks).

## 4. Run the conformance corpus

The corpus lives in [`test/conformance/`](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md) as
pairs of `*.md` and `*.json` files. For each case:

1. compile the `.md`;
2. start at `initial-state`;
3. for each entry in `choices`, wait for a menu, compare the menu titles in
   order, and choose that title;
4. concatenate every emitted chunk and compare it **exactly** with
   `expected.emitted`;
5. after the last choice, expect `exit: true`;
6. compare the final public context (ignore keys beginning with `__`) and the
   final stack.

The reference runner is `test/conformance.test.cjs`, but the format is
language-agnostic. A port can add the cases to its own test harness without
depending on this repository's code.

Why the rules are strict:

- `emitted` is the observable text contract, including paragraph separators
  and the `*emphasis*` rendering.
- `menus` pins down which options preconditions and `@once` hide.
- `context` proves effects ran; internal `__once__N` keys are excluded because
  their names are an implementation detail.
- `stack` catches code that leaves values behind.

## 5. Things to test beyond the corpus

The conformance cases are deliberately small. A runtime should also test:

- **Every standard opcode**, including type errors and missing context keys.
- **Parser-level behaviour**: headers, `initial-context`, all four `options`
  flags, `@once`, post-option text, and label rules.
- **Long documents and loops**, with a host-side instruction budget. A
  document can loop forever; the VM has no built-in limit. See
  [run untrusted documents safely](run-untrusted-documents.md).
- **Save/restore** of context and state. See
  [save and load progress](save-and-load.md).
- **Your host hooks**, especially that they leave the stack unchanged.

## Checklist

- [ ] Standard Tzo opcodes implemented with correct operand order.
- [ ] `emit`, `response`, and `getResponse` implemented.
- [ ] `{`/`}` scanning and `jgz`/`jz` skip semantics match.
- [ ] `labelMap` drives both state and `<state>__options` targets.
- [ ] Unknown `_` opcodes are silent no-ops; other unknown opcodes error.
- [ ] All conformance cases pass.
- [ ] An instruction budget protects the host from looping documents.
- [ ] Save/restore has been tested with a real game state.

## See also

- [Conformance corpus format](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md)
- [Document tree and VMState](../reference/document-tree.md)
- [Language reference](../reference/language.md)
- [Run untrusted documents safely](run-untrusted-documents.md)
- [Save and load progress](save-and-load.md)

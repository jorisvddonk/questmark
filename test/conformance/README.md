# Questmark conformance cases

This directory is the portable part of Questmark's test suite. Each case is a
pair of files:

```
cases/01-basic.md       the Questmark document
cases/01-basic.json     the choices to make and the expected results
```

The reference runner lives in [`../conformance.test.cjs`](../conformance.test.cjs),
but the format has no dependency on JavaScript or on this repository. A port of
the compiler or VM (Rust, C, Godot, …) can read the same pairs and run them with
its own implementation.

## What a runner must do

1. Compile the `.md` document with spec version `1.0`.
2. Start at the document's `initial-state`.
3. For each entry in `choices` (in order):
   - wait until the document asks the player to choose;
   - record the offered option titles, in order, as one **menu**;
   - choose the option whose title exactly equals the entry.
4. Concatenate every piece of text emitted by the document, in order.
5. After the last choice, wait for the VM to exit.
6. Compare against `expected` (see below).

## File format

```json
{
  "description": "human-readable summary",
  "choices": ["Go north", "Go back", "Leave"],
  "expected": {
    "emitted": "You are in a small room.\n\nA cold corridor.\n\n...",
    "menus": [
      ["Go north", "Leave"],
      ["Go back"],
      ["Go north", "Leave"]
    ],
    "exit": true,
    "context": { "coins": 2 },
    "stack": []
  }
}
```

| Field | Meaning |
| --- | --- |
| `description` | Summary of the feature under test. |
| `choices` | Option titles to choose, one per menu. |
| `expected.emitted` | Exact concatenation of all emitted text chunks. |
| `expected.menus` | Every menu offered, in order, including the final one. |
| `expected.exit` | Always `true`: a case must end in a natural exit. |
| `expected.context` | Final public context values. |
| `expected.stack` | Final VM stack. Every current case expects `[]`. |

### Context and internal keys

`expected.context` only contains **public** keys. A runner must exclude keys
beginning with `__` from the comparison. Those keys are implementation-private
bookkeeping (for example, `@once` uses `__once__N`). A port is free to implement
`@once` differently; only the observable behaviour is specified.

### Text comparison

`emitted` is compared **exactly**, including blank lines. This is deliberate:
the corpus pins down chunk concatenation, paragraph separators, emphasis
rendering (`**bold**` becomes `*bold*`), and the whitespace flags. If a port
cannot reproduce the text exactly, that is a conformance difference worth
discussing, not something to smooth over in the runner.

The reference emits the contents of post-option text without an extra trailing
newline, so some expected strings look like `"Bought one.2 coins left.\n"`.
Hosts are expected to add presentation spacing; a VM should not.

### Host hooks

Conformance runs register no host functions. An opcode whose name starts with
`_` must therefore be a no-op, and it must leave the stack unchanged. Cases
that use hooks verify this implicitly through `stack: []`.

## Running the reference cases

```bash
npm run conformance
# or, without rebuilding:
node --test test/conformance.test.cjs
```

They are also part of `npm test`.

## Adding a case

1. Add `cases/<NN>-<name>.md` with a complete document.
2. Add `cases/<NN>-<name>.json` containing `description` and `choices` only.
3. Run `node test/conformance/generate.cjs` to fill in `expected`.
4. Review the generated `emitted` and `menus` by hand before committing. Do not
   hand-edit a generated value without understanding the behaviour it pins
   down.
5. Commit both files.

Keep cases small and focused on one feature. A case with dozens of states is
harder to port and harder to review than several small ones.

## What is deliberately not covered

- **Randomness.** `randInt` is host-dependent; a portable case cannot assert a
  specific roll. Randomness is tested in the reference suite instead.
- **Interactive CLI behaviour.** Cases exercise the compiler and VM, not the
  terminal UI.
- **Timing or host rendering.** `emit` chunks are concatenated; the runner does
  not require a particular callback cadence.

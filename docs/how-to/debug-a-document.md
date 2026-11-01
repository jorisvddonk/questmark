# How to debug a Questmark document

Questmark documents fail in a few characteristic ways. This guide walks
through finding the problem quickly: compile first, then play one step at a
time, then inspect the compiled bytecode.

## 1. Compile without running

Most authoring mistakes are compile errors. Check the document without starting
a play session:

```bash
npx questmark --input path/to/document.md --no-run
```

Inside a checkout:

```bash
npm start -- --input path/to/document.md --no-run
```

If nothing is printed and the command exits with status `0`, the document
compiled cleanly. A thrown error names the offending construct.

You can also use the [playground](../playground.md): press **Run** and read the
error panel. It shows the same compile/runtime error without leaving the
browser.

## 2. Read the error message

| Message | Cause | Fix |
| --- | --- | --- |
| `getContext: null/undefined can not be pushed to the context!` | A key was read before it existed. | Add it to `initial-context`, or guard with `hasContext`. |
| `Cannot find function in function table: foo` | An opcode name is misspelled or not provided by the VM. | Fix the spelling, or prefix host hooks with `_`. |
| `gt: stack param 1 is not a number!` | The operand on top of the stack is a string, or the stack order is wrong. | Check what is on top; see [stack order](../reference/language.md#a-stack-read-right-to-left). |
| `Unknown 'options.no_link_behaviour'` | The header flag has an unsupported value. | Use `"loopback_to_options"` or `"exit"`. |
| `Option text contains a backtick` warning | Inline code was used in an option label. | Move the code after the label. |
| A state's text or options are missing | A `##` heading split the state. | Use only `#` for states. |

Some errors only happen at **runtime**, not compile time: an unknown opcode is
detected when the VM loads the compiled state, and `getContext` throws when the
state containing it runs. `--no-run` cannot catch those; play the document or
use the playground.

## 3. Play with the CLI and read the output

```bash
npx questmark --input path/to/document.md
```

The CLI prints emitted text as it happens, then the menu. If the text appears
without a menu, the state ended with `exit` or has no options. If the menu
repeats identically forever, an option has no link and no effect and
`no_link_behaviour` is looping (the default).

To bisect a long document, temporarily change `initial-state` to the state you
suspect, then play just that state.

## 4. Inspect the compiled state

Compile to JSON and look at what the compiler produced:

```bash
npx questmark --input path/to/document.md --output /tmp/vmstate.json --no-run
```

Useful checks:

- `labelMap` should contain one entry per state, plus `<state>__options`
  entries. A missing state means its heading was not top-level or its name
  collides with another.
- `programList` should not be empty. An empty program usually means the document
  has no `#` headings.
- The first instructions are the `setContext` sequence for `initial-context`,
  followed by a `goto` for `initial-state`. If they are missing, the header JSON
  is malformed or uses the wrong field names.

A short Node script can load the JSON and run it without the CLI:

```js
const fs = require("fs");
const { QuestVM } = require("questmark");
const state = JSON.parse(fs.readFileSync("/tmp/vmstate.json", "utf8"));

const vm = new QuestVM(
  (text) => process.stdout.write(String(text)),
  async (choices) => {
    console.log(choices);
    return choices[0].id;
  }
);
vm.loadVMState(state);
vm.run();
```

## 5. Check the three usual suspects

1. **Uninitialized context.** Every key read with `getContext` must exist. Use
   `hasContext` when presence is genuinely optional.
2. **Stack imbalance.** Every snippet should leave the stack as it found it,
   except for the single value a precondition is supposed to leave. A stray
   value changes the next `jgz`.
3. **Markdown structure.** Labels are plain text; options are one unordered
   list at the same level; `#` is for states; `##` breaks states.

## 6. Use the playground for fast iteration

The [playground](../playground.md) runs the real compiler and VM in your
browser. It is the quickest loop for authoring:

1. Paste the document.
2. Press **Run**.
3. Change one thing.
4. Press **Run again**.

The output panel shows the emitted text, the current choice menu, and the error
message when something throws. Because the playground starts a fresh VM on each
run, it is also the easiest way to test `@once` and context from a clean state.

## 7. Add temporary instrumentation

Because `emit` prints any value, it is a reliable debugger:

```markdown
DEBUG trust=`"trust" getContext emit` key=`"key" hasContext emit`
```

Put a line like that in a state while you are working, then delete it. For a
structured log, use a host hook:

```markdown
* Choose this `_logTrust`
```

and register `_logTrust` in `additionalFunctions` to print the context. The
playground ignores unregistered `_` opcodes, so the document remains playable
without the host.

## Checklist

- [ ] `--no-run` exits cleanly.
- [ ] `initial-state` names a real state.
- [ ] Every `getContext` key is initialized or guarded.
- [ ] Each precondition leaves exactly one number.
- [ ] Option labels are plain text.
- [ ] States use `#`, not `##`.
- [ ] Every non-terminal state has a way out.

## See also

- [Language reference: errors and diagnostics](../reference/language.md#errors-and-diagnostics)
- [How to play a document](play-a-document.md)
- [How to organize a larger document](organize-a-document.md)

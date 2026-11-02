# How to save and load progress

A Questmark conversation has no built-in save format. What you save is the
compiled document plus the interpreter state you care about: the context, and
the state the player was in. This guide shows a checkpoint model that works
with the public API.

## What "the current state" means

The VM does not expose a state name, but every state is a label in
`labelMap`, and at a menu the program counter sits inside the current state.
Given the state names from `parsedMDFile`, the nearest state label at or
before the program counter is the current one:

```js
import { parseMarkdown, QuestVM } from "questmark";

function stateNames(parsedMDFile) {
  return new Set(
    parsedMDFile.children.filter((node) => node.type === "state").map((node) => node.name)
  );
}

function currentState(vm, names) {
  let best = null;
  for (const [name, pc] of Object.entries(vm.labelMap)) {
    if (!names.has(name)) continue;
    if (pc <= vm.programCounter && (!best || pc > best.pc)) {
      best = { name, pc };
    }
  }
  return best ? best.name : null;
}
```

Only real state names are considered, so inline Tzo labels and the internal
`<state>__options` labels do not confuse the result.

## Saving at a menu

The natural save point is when the VM is waiting for a choice. Save the state
name, the context, and the (normally empty) stack:

```js
const { parsedMDFile, qvmState } = parseMarkdown(markdown);
const names = stateNames(parsedMDFile);

const vm = new QuestVM(
  (text) => showText(String(text)),
  async (choices) => {
    const save = {
      version: 1,
      document: documentId, // see "Versioning" below
      state: currentState(vm, names),
      context: { ...vm.context },
      stack: vm.stack.slice(),
    };
    await writeSave(save);

    return await askPlayer(choices); // your UI
  }
);

vm.loadVMState(qvmState);
vm.run();
```

At a menu `vm.stack` is normally `[]`; saving it anyway keeps the format
honest if a document deliberately carries a value.

## Loading

Recompile the same document, restore the context and stack, jump to the saved
state label, and run:

```js
function loadGame(save, markdown) {
  const { parsedMDFile, qvmState } = parseMarkdown(markdown);
  const names = stateNames(parsedMDFile);

  if (!names.has(save.state)) {
    throw new Error(`saved state "${save.state}" does not exist in this document`);
  }

  const vm = new QuestVM(
    (text) => showText(String(text)),
    (choices) => askPlayer(choices)
  );

  vm.loadVMState(qvmState);

  // loadVMState resets the context to the document's initial-context.
  vm.context = { ...save.context };
  vm.stack = save.stack.slice();

  vm.setProgramCounter(vm.labelMap[save.state]);
  vm.run();

  return vm;
}
```

The state's entry text is emitted again, and the menu is rebuilt from the
restored context. `@once` bookkeeping lives in context keys beginning with
`__`, so it survives the round trip without extra handling.

## What a checkpoint does not preserve

A same-turn, exact resume is not possible through the public API: when the VM
suspends, the pending menu is handed to the host as `{ title, id }` choices and
is not part of the VMState. Saving at a state boundary is the supported model.

Consequences:

- **Entry text re-emits.** The player sees the saved state's text again after
  loading. Persist your transcript separately if you want the history to
  remain on screen.
- **Entry code re-runs.** If a state's text contains effects (a counter, a
  random roll), they run again on entry. Keep entry effects idempotent, or move
  them into a one-shot option instead.
- **Random state text re-rolls.** Values already stored in context are stable;
  a `randInt` executed on entry is not.
- **A pending choice is not stored.** The player chooses again after loading.

For most games the trade-off is invisible: the context is the game state, and
re-entering the room is acceptable. If you need frame-exact resume, persist the
transcript for display and make state entry effect-free.

## Versioning and validation

Save the document identity alongside the state:

```js
import { createHash } from "node:crypto";

const documentId = createHash("sha256").update(markdown).digest("hex");
```

On load, compare it. If the document changed, a saved state name may no longer
exist or its context may mean something different. A simple policy is to
refuse the save, or to migrate it and bump a `save.version`.

Also validate saves that come from users:

- `state` is a string and exists in the document.
- `context` is a plain object with string/number values.
- `stack` is an array of strings/numbers.
- size limits are respected (see
  [run untrusted documents safely](run-untrusted-documents.md)).

Never `eval` or execute a save file. A save should be data, not code.

## Endings

At an ending (`vm.exit === true`) you usually do not need to resume. Save the
context for new-game-plus, statistics, or unlocking content; there is no menu
to restore.

## See also

- [How to implement a runtime](implement-a-runtime.md) — the VMState contract.
- [Run untrusted documents safely](run-untrusted-documents.md) — validate
  loaded state and bound execution.
- [API reference: lifecycle](../reference/api.md#lifecycle)
- [Language reference: context](../reference/language.md#context)

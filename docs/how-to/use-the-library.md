# How to embed Questmark in your own application

The library exposes two pieces: `parseMarkdown`, which compiles a Questmark
document into a Tzo VM state, and `QuestVM`, which interprets that state. This
guide wires them together in Node.js, in a browser, and with your own opcodes.

## Install

```bash
npm install questmark
```

## Compile and run a document

```js
const fs = require("node:fs");
const { parseMarkdown, QuestVM } = require("questmark");

const markdown = fs.readFileSync("conversation.md", "utf8");
const { qvmState } = parseMarkdown(markdown);

const vm = new QuestVM(
  // emitFunction: called every time the document emits text.
  (body) => process.stdout.write(String(body)),

  // getResponseFunction: called whenever the document asks the player
  // to choose. Return a Promise of the chosen option's id.
  async (choices) => {
    choices.forEach((c) => console.log(`${c.id}: ${c.title}`));
    const id = Number(await askUser("Your choice: "));
    return id;
  },

  // additionalFunctions: optional extra Tzo opcodes.
  {}
);

vm.loadVMState(qvmState);
vm.run();
```

`vm.run()` returns when the VM either **exits** or **suspends** to ask for a
choice. When the player chooses, `QuestVM` resumes the VM itself; you do not
call `run()` again for a normal choice flow.

## What the callbacks do

- **emitFunction** — invoked by the `emit` opcode with the text (or number) the
  document wants to show. It can be called several times while rendering a
  single state (for example `` You have `"cookies" getContext emit` cookies! ``).
  Concatenate the calls to reconstruct the full text.

- **getResponseFunction** — invoked by the `getResponse` opcode with the list
  of options currently available, as `{ title, id }` objects. The ids are
  positional within the current menu (0, 1, 2, ...). Return a `Promise`
  resolving to the chosen id. Hidden options never appear here: their
  preconditions did not run.

- **additionalFunctions** — a map of extra opcode names to functions. A
  function receives `(stack, context, vm)`. Opcode names beginning with `_` are
  ignored by the VM when not registered, so you can use underscore-prefixed
  calls in documents as hooks for your own logic. Hooks must leave the stack
  unchanged; pass arguments through the context instead (see below). Opcodes
  without the underscore prefix may use the stack, but then every VM that plays
  the document must register them.

## Detecting the end

`vm.exit` is `true` once the program has ended; `vm.pause` is `true` while it is
suspended on a choice. A small wrapper makes the lifecycle explicit:

```js
vm.eventBus.on("error", (err) => console.error("Interpreter error:", err));

vm.loadVMState(qvmState);
vm.run();

if (vm.exit) {
  console.log("\n— the end —");
}
```

When the player chooses an option, the interpreter resumes inside a promise
callback. If the resumed code throws, `QuestVM` catches the error, emits it on
`eventBus` under `error`, and quits. Subscribe **before** calling `run()`.

## Restarting a playthrough

The context lives in the loaded state. To replay from a clean slate, compile
again and load the fresh state into a new VM:

```js
function newPlaythrough(markdown) {
  const { qvmState } = parseMarkdown(markdown);
  const vm = new QuestVM(emit, choose, hooks);
  vm.loadVMState(qvmState);
  vm.run();
  return vm;
}
```

`loadVMState` assigns the state's `stack`, `context`, and program arrays to the
VM; reusing an already-played `qvmState` object would continue from its mutated
context rather than start over.

## Running in a browser

The webpack build produces a browser bundle at `dist/browser/bundle.js`, built
from the same `src/index.ts` as the package. It exposes a global `Questmark`
object:

```html
<script src="questmark/dist/browser/bundle.js"></script>
<script>
  const { parseMarkdown, QuestVM } = window.Questmark;

  const { qvmState } = parseMarkdown(document.querySelector("#source").value);

  const vm = new QuestVM(
    (text) => {
      document.querySelector("#story").append(String(text));
    },
    (choices) =>
      new Promise((resolve) => {
        const menu = document.querySelector("#choices");
        menu.replaceChildren();
        for (const choice of choices) {
          const button = document.createElement("button");
          button.textContent = choice.title;
          button.onclick = () => resolve(choice.id);
          menu.append(button);
        }
      })
  );

  vm.loadVMState(qvmState);
  vm.run();
</script>
```

Two practical notes:

- The bundle touches `document` while it initializes, so it cannot run during
  server-side rendering. Load it lazily on the client (the
  [playground](https://github.com/jorisvddonk/questmark/blob/master/docs/.vitepress/theme/runtime.ts)
  does this with a `<script>` tag).
- If you minify the bundle, keep function names (`keep_fnames`). Tzo inspects
  `Function.prototype.name` for its brace handling.

## Custom opcodes

Use host hooks for engine integration: sound, animation, achievements,
telemetry, or saving. Write the hook in the document, then register it:

```markdown
* Open the door `_playDoorSound` The door creaks open.
```

```js
const vm = new QuestVM(emit, choose, {
  _playDoorSound: (stack, context, vm) => {
    audio.play("door-open");
  },
  // Hooks read their arguments from the context, never from the stack:
  _giveItem: (stack, context) => {
    inventory.add(context.pending_item);
    delete context.pending_item;
  },
});
```

Document side:

```markdown
* Pick up the lamp `1 "lamp" setContext` `"lamp" "pending_item" setContext _giveItem` You take the lamp.
```

The context carries the argument, and the hook returns without touching the
stack. The document sets its own state (`lamp`) too; the hook is a notification
to the host, not the source of truth for the game state. That matters because
unregistered `_` hooks are silent no-ops: if a hook consumed a stack value, the
document would leave a different stack in the playground than in your game. If
you need an opcode that genuinely manipulates the stack, omit the underscore
prefix and register it in every VM that plays the document.

## Handling runtime errors

`QuestVM` extends `EventEmitter` through its `eventBus`. Runtime errors in the
initial run are thrown from `run()`; errors raised while resuming after a
choice are emitted on `eventBus` and end the VM. Handle both:

```js
const vm = new QuestVM(emit, choose, hooks);
vm.eventBus.on("error", (err) => showError(err));

try {
  vm.loadVMState(qvmState);
  vm.run();
} catch (err) {
  showError(err);
}
```

The `eventBus` also emits `emit` and `response` events for every text emission
and option registration, which is useful for logging, debug UIs, or tests.

## A note on preconditions

Context lookups with `getContext` throw if the key is not present, so always
initialize every variable you plan to read in the document's
`initial-context` (see the [language reference](../reference/language.md#context)).
Use `hasContext` for genuinely optional keys.

## Further reading

- [API reference](../reference/api.md) — exact signatures and types.
- [Tutorial: write your first conversation](../tutorials/first-conversation.md)
  — the basics of the language.
- [The playground](../playground.md) — a working browser host.
- The repository's `test/` directory contains more complete examples of
  driving a `QuestVM` programmatically.

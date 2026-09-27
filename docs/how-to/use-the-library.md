# How to embed Questmark in your own application

The library exposes two pieces: `parseMarkdown`, which compiles a Questmark
document into a Tzo VM state, and `QuestVM`, which interprets that state. This
guide wires them together in a small Node.js application.

## Install

```bash
npm install questmark
```

## Compile and run a document

```js
const { parseMarkdown, QuestVM } = require("questmark");
const fs = require("fs");

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

## What the callbacks do

- **emitFunction** — invoked by the `emit` opcode with the text (or number) the
  document wants to show. It can be called several times while rendering a
  single state (for example `` You have `"cookies" getContext emit` cookies! ``).
  Concatenate the calls to reconstruct the full text.

- **getResponseFunction** — invoked by the `getResponse` opcode with the list
  of options currently available, as `{ title, id }` objects. The ids are
  positional (0, 1, 2, ...). Return a `Promise` resolving to the chosen id;
  the VM resumes execution from that option's effect.

- **additionalFunctions** — a map of extra opcode names to functions. Opcode
  names beginning with `_` are ignored at compile time, so you can use
  underscore-prefixed calls in documents as hooks for your own logic.

## Running in a browser

The webpack build produces a browser bundle at `dist/browser/bundle.js`. Load
it with a `<script>` tag and use the global `Questmark` object the same way:

```html
<script src="questmark/dist/browser/bundle.js"></script>
<script>
  const { parseMarkdown, QuestVM } = Questmark;
  // ...same API as above, wiring emitFunction to the DOM instead of stdout.
</script>
```

## Handling errors

`QuestVM` extends `EventEmitter`. Runtime errors in the interpreter are emitted
on the `eventBus` under the `error` event:

```js
vm.eventBus.on("error", (err) => {
  console.error("Interpreter error:", err);
  vm.quit();
});
```

The `eventBus` also emits `emit` and `response` events for every text emission
and option registration, which can be useful for logging or debug UIs.

## A note on preconditions

Context lookups with `getContext` throw if the key is not present, so always
initialize every variable you plan to read in the document's
`initial-context` (see the [language reference](../reference/language.md)).

## Further reading

- [API reference](../reference/api.md) — exact signatures and types.
- [Tutorial: write your first conversation](../tutorials/first-conversation.md) —
  the basics of the language.
- The repository's `test/` directory contains more complete examples of
  driving a `QuestVM` programmatically.
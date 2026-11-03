# Questmark API reference

The library entry point (`src/index.ts`, built to `dist/node/`) exports the
compiler and the interpreter. All of the API below is available from the
package entry point (`import ... from "questmark"` / `require("questmark")`):

```js
import { parseMarkdown, QuestVM, NoLinkBehaviour } from "questmark";
```

Type names (`Choice`, `Directive`, `OptionNode`, `QuestMarkVMState`,
`LocalizableMessage`, `Catalog`) are exported as TypeScript types. The Tzo
`Tokenizer` is not re-exported; import it from `tzo` if you need to tokenize
code yourself.

## `parseMarkdown(fileContents: string, options?: ParseOptions)`

Compiles a Questmark document into a Tzo VM state.

**Returns** `{ parsedMDFile, qvmState, messages }`

- `parsedMDFile` — the compiler's document tree (`questmarkDocument` with
  `state` and `option` nodes). It is useful for tooling, link validation, and
  analyzers. State text positions are removed; compiler-built option children
  keep their positions. See [document tree and VMState](document-tree.md).
- `qvmState` — a `QuestMarkVMState` (a `TzoVMState` plus the parsed document),
  ready to load into a `QuestVM` or serialize to JSON.
- `messages` — every translatable text unit, with a path-based ID, its source
  text, and its kind. See [localization](localization.md#message-ids).

`ParseOptions.translate` is an optional callback that returns a translation for
a message, or `undefined` to keep the source. The compiler validates
placeholders and applies the translation. `{{key}}` interpolation works without
a catalog.

**Throws** on malformed option headers (for example an unknown
`no_link_behaviour`), invalid JSON in the header, Tzo tokenizer errors, or a
translation with mismatched placeholders. Unknown opcodes are *not* caught here;
they fail when the VM loads the state.

```js
import { parseMarkdown } from "questmark";

const { parsedMDFile, qvmState } = parseMarkdown(markdown);
console.log(qvmState.labelMap);   // state name -> program counter
console.log(qvmState.programList.length);
```

## `QuestVM`

`class QuestVM extends VM` — an interpreter for compiled Questmark documents.
It extends Tzo's `VM` and adds the `emit`, `response`, and `getResponse`
opcodes that implement text output and choices.

### Constructor

```ts
new QuestVM(
  emitFunction: (body: string | number) => void,
  getResponseFunction: (choices: Choice[]) => Promise<number>,
  additionalFunctions?: Functions
)
```

- `emitFunction` — called by the `emit` opcode for each piece of text output.
  It may be called several times per state; concatenate the calls.
- `getResponseFunction` — called by the `getResponse` opcode whenever the
  document asks the player to choose. Receives the currently available options
  (`{ title, id }`) and must return a `Promise` resolving to the chosen option's
  `id`. Option ids are positional within the current menu.
- `additionalFunctions` — a map of extra Tzo opcode names to functions, merged
  into the function table. Each function receives `(stack, context, vm)`.
  Names beginning with `_` are silently ignored when not registered. Hooks
  (underscore-prefixed opcodes) must leave the stack unchanged; pass arguments
  through the context. Opcodes without the prefix may use the stack, but then
  every VM that plays the document must register them.

### Lifecycle

```js
const vm = new QuestVM(emit, choose, hooks);

vm.eventBus.on("error", (err) => {
  console.error(err);
});

vm.loadVMState(qvmState); // prepare the program
vm.run();                 // run until exit or a choice
```

- `run()` executes until the VM exits or suspends. It does not return a value.
- When a choice is made, `QuestVM` resumes the VM internally; do not call
  `run()` again for the normal choice flow.
- `vm.exit` is `true` after the program ends.
- `vm.pause` is `true` while the VM is suspended.
- To replay, create a new `QuestVM` and load a freshly compiled state. Loading
  an already-played state continues from its mutated context.

### Events

`eventBus` is an `EventEmitter` with these events:

| Event | Payload | When |
| --- | --- | --- |
| `emit` | `string \| number` | Every text emission. |
| `response` | `{ response: string, pc: number }` | Every option registration while building a menu. |
| `error` | `Error` | Runtime errors raised while resuming after a choice. |

Errors during the initial `run()` are thrown synchronously; errors during a
resumed run are emitted on `eventBus` and end the VM. Handle both. See
[How to embed Questmark](../how-to/use-the-library.md#handling-runtime-errors).

### Inherited methods (from Tzo `VM`)

| Method | Description |
| --- | --- |
| `loadVMState(tzoVMState)` | Load a compiled VM state and prepare it for execution. |
| `run()` | Execute the program until the VM exits or suspends. |
| `quit()` | Mark the VM as exited. |
| `suspend()` | Pause execution (the `pause` opcode / `getResponse`). |
| `tick()` | Execute a single instruction. |
| `invoke(instructions)` | Run a list of instruction functions. |
| `setProgramCounter(pc)` | Jump to a program position. |

### Properties

`stack`, `context`, `programList`, `labelMap`, `programCounter`, `exit`,
`pause` — the interpreter state. They are mutable; treat them as read-only
unless you are implementing a debugger or a custom opcode.

## `Choice`

```ts
interface Choice {
  title: string;
  id: number;
}
```

An option offered to the player. `id` is the option's positional index within
the current state's choice list.

## `NoLinkBehaviour`

```ts
enum NoLinkBehaviour {
  EXIT = 0,
  LOOPBACK_TO_OPTIONS = 1
}
```

Behaviour when a chosen option has no link. Exported for host applications;
documents configure this via the header flag `options.no_link_behaviour`
(`"exit"` or `"loopback_to_options"`).

## `QuestMarkVMState`

The compiled representation produced by `parseMarkdown` and consumed by
`loadVMState`:

```ts
interface QuestMarkVMState extends TzoVMState {
  // unist nodes for the parsed document, with positions removed
}
interface TzoVMState {
  stack: any[];
  context: { [key: string]: string | number };
  programList: Instruction[];
  labelMap: { [label: string]: number };
  programCounter: number;
  exit: boolean;
  pause: boolean;
}
```

The state is plain JSON and survives a round-trip through
`JSON.stringify`/`JSON.parse`.

## Browser bundle

The webpack build produces `dist/browser/bundle.js`, which exposes a
`window.Questmark` global with the same `parseMarkdown`, `QuestVM`, and
`NoLinkBehaviour` exports. It is built from the same source as the Node package.

```html
<script src="questmark/dist/browser/bundle.js"></script>
<script>
  const { parseMarkdown, QuestVM } = window.Questmark;
</script>
```

The bundle touches `document` at import time (through the Markdown parser), so
load it client-side only. If you minify it, preserve function names: Tzo
inspects `Function.prototype.name` for brace handling.

This site's [playground](../playground.md) is a complete browser host built on
this bundle.

## Localization

These helpers implement the compile-time catalog design. The full format is in
the [localization reference](localization.md).

### `extractCatalog(markdown: string, locale = "en"): Catalog`

Parses a document and returns a catalog with every message and an empty
`translation`. Use it to bootstrap a locale.

### `parseMarkdownForLocale(markdown, catalog, options?): ParseResult`

Compiles with a catalog. Throws on a stale `source` or a placeholder mismatch.
The result is the same shape as `parseMarkdown`.

### `createCatalogTranslator(catalog, options?): (message) => string | undefined`

Builds the translator used by `parseMarkdown`. `options.failOnStaleSource`
defaults to `true`.

### `missingTranslations(markdown, catalog): string[]`

Returns IDs that are missing or have an empty translation.

### `Catalog`

```ts
interface Catalog {
  version: 1;
  locale: string;
  messages: Record<string, { source: string; translation: string }>;
}
```

An empty translation falls back to the source text. Translations may reorder
`{{key}}` placeholders but must keep the same set.

## Full usage example

```js
const { parseMarkdown, QuestVM } = require("questmark");

const { qvmState } = parseMarkdown(markdown);
const emitted = [];

const vm = new QuestVM(
  (text) => emitted.push(String(text)),
  async (choices) => {
    const index = await pickFrom(choices);
    return choices[index].id;
  },
  {}
);

vm.eventBus.on("error", console.error);
vm.loadVMState(qvmState);
vm.run();

console.log(emitted.join(""));
```

## Related reading

- [Language reference](language.md) — what the compiler accepts.
- [Document tree and VMState](document-tree.md) — the shapes `parseMarkdown`
  returns.
- [Localization reference](localization.md) — catalogs, placeholders, and
  helpers.
- [CLI reference](cli.md) — the command-line wrapper.
- [How to embed Questmark](../how-to/use-the-library.md) — a longer guide.

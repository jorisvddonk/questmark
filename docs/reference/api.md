# Questmark API reference

The library entry point (`src/index.ts`, built to `dist/node/`) exports the
compiler and the interpreter. All of the API below is available from the
package entry point (`import ... from "questmark"` / `require("questmark")`).

## `parseMarkdown(fileContents: string)`

Compiles a Questmark document into a Tzo VM state.

**Returns** `{ parsedMDFile, qvmState }`

- `parsedMDFile` — the parsed document as a unist tree, with position
  information removed.
- `qvmState` — a `TzoVMState` (see below) ready to load into a `QuestVM`.

**Throws** on malformed option headers (for example an unknown
`no_link_behaviour`) or Tzo tokenizer errors.

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
- `getResponseFunction` — called by the `getResponse` opcode whenever the
  document asks the player to choose. Receives the currently available options
  and must return a `Promise` resolving to the chosen option's `id`.
- `additionalFunctions` — a map of extra Tzo opcode names to functions, merged
  into the function table.

### Events

`eventBus` is an `EventEmitter` with these events:

| Event | Payload | When |
| --- | --- | --- |
| `emit` | `string \| number` | Every text emission. |
| `response` | `{ response, pc }` | Every option registration. |
| `error` | `Error` | Runtime errors in the response flow. |

### Inherited methods (from Tzo `VM`)

| Method | Description |
| --- | --- |
| `loadVMState(tzoVMState)` | Load a compiled VM state and prepare it for execution. |
| `run()` | Execute the program until the VM exits or suspends. |
| `quit()` | Mark the VM as exited. |
| `suspend()` | Pause execution (the `pause` opcode / `getResponse`). |
| `tick()` | Execute a single instruction. |

### Properties

`stack`, `context`, `programList`, `labelMap`, `programCounter`, `exit`,
`pause` — the interpreter state.

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

Behaviour when a chosen option has no link and no effect. Exported for host
applications; documents configure this via the header flag
`options.no_link_behaviour`.

## `TzoVMState`

The compiled representation produced by `parseMarkdown` and consumed by
`loadVMState`:

```ts
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

## `Tokenizer`

Re-exported from Tzo. Parses a string of Tzo source code into an array of
instructions:

```ts
new Tokenizer().parse("1 2 +") // -> [push-number 1, push-number 2, invoke +]
```

## Full usage example

```js
const { parseMarkdown, QuestVM } = require("questmark");
const { qvmState } = parseMarkdown(md);

const vm = new QuestVM(
  (text) => console.log(text),
  async (choices) => {
    const index = await pickFrom(choices);
    return choices[index].id;
  },
  {}
);
vm.loadVMState(qvmState);
vm.run();
```
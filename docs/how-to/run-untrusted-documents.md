# How to run untrusted documents safely

Questmark documents are programs. They cannot open files or sockets on their
own, but they can loop, allocate, and emit without bound. If your application
accepts documents from users — or even from a CMS — treat them as untrusted
code and give the interpreter a budget.

## The threats

| Risk | How it happens |
| --- | --- |
| Non-termination | A state `goto`s itself, a state cycle repeats, or a no-link option loops back forever. `run()` has no built-in instruction limit. |
| Memory growth | A loop keeps pushing onto the stack or adding context keys. |
| Output floods | A loop emits text; the host or terminal grows without bound. |
| Endless menus | The player can be trapped in a menu, or a host can be asked for choices forever. |
| Log floods | The standard `stdout` opcode writes to the host's standard output. |
| Dangerous hooks | A `_hook` is harmless when unregistered, but a host that maps hooks to filesystem or network operations gives documents those powers. |
| Parser cost | A very large document is expensive to parse before any execution limit applies. |

The parser and interpreter are ordinary JavaScript, so keep dependencies
updated as you would for any other parser.

## Put a budget on the interpreter

Subclass `QuestVM` and override `tick()`. Every instruction goes through it:

```js
import { QuestVM } from "questmark";

class BudgetVM extends QuestVM {
  constructor(emit, choose, hooks = {}, limits = {}) {
    super(emit, choose, hooks);
    this.limits = { ticks: 100_000, stack: 1_000, context: 1_000, ...limits };
    this.ticks = 0;
  }

  tick() {
    this.ticks += 1;

    if (this.ticks > this.limits.ticks) {
      this.quit();
      throw new Error("instruction budget exceeded");
    }
    if (this.stack.length > this.limits.stack) {
      this.quit();
      throw new Error("stack limit exceeded");
    }
    if (this.ticks % 1000 === 0 && Object.keys(this.context).length > this.limits.context) {
      this.quit();
      throw new Error("context limit exceeded");
    }

    super.tick();
  }
}
```

`run()` wraps thrown errors in an `An error occurred!` message that includes
the stack, program counter, and context. Catch it at the host boundary and
show a generic error to the player.

Decide whether `ticks` is a **per-turn** or **whole-session** budget. If it is
per-turn, reset `vm.ticks = 0` before each `run()`; the VM resumes a choice
inside its own promise callback, so a per-turn reset needs to happen from the
host's choice handler. A whole-session budget is simpler and safer for
untrusted content.

## Add an output budget

`emit` is your callback, so cap it there:

```js
let emittedChars = 0;

let vm; // assigned below
vm = new BudgetVM(
  (text) => {
    emittedChars += String(text).length;
    if (emittedChars > 1_000_000) {
      vm.quit();
      throw new Error("output budget exceeded");
    }
    ui.append(String(text));
  },
  choose,
  {}
);
```

Also cap the number of turns: count calls to `choose` and refuse after, say,
10,000. A document cannot force a choice, but it can offer an endless one.

## Cap the input before parsing

```js
const MAX_DOCUMENT_BYTES = 256 * 1024;

if (Buffer.byteLength(markdown, "utf8") > MAX_DOCUMENT_BYTES) {
  throw new Error("document is too large");
}

const compiled = parseMarkdown(markdown);

if (compiled.qvmState.programList.length > 200_000) {
  throw new Error("document compiles to too many instructions");
}
```

The same applies to compiled JSON received from outside: validate the shape,
cap the size, and only load states you produced. A `VMState` is data, not
JavaScript, but it can still describe a very long-running program.

## Do not give untrusted documents powerful hooks

Underscore hooks are no-ops unless registered. For untrusted documents, either
register no hooks at all, or register only safe, local ones (sound, animation,
analytics). Never map a hook directly to filesystem access, arbitrary network
requests, or code evaluation. Hooks must also be stack-neutral; see
[host hooks](../reference/language.md#host-hooks).

## Use a worker for hard isolation

A tick budget handles CPU loops, but it does not contain memory blowups or a
bug in the interpreter. For documents from the public internet, run the VM in a
`worker_threads` worker (or a child process) with a wall-clock timeout, and
terminate it on expiry:

```js
const worker = new Worker("./questmark-worker.mjs", {
  workerData: { markdown, choices },
});
const timer = setTimeout(() => worker.terminate(), 5_000);
worker.on("message", handleMessage);
worker.on("exit", () => clearTimeout(timer));
```

The worker needs to talk to the host for `emit` and `getResponse`; keep that
protocol small and validate what crosses it.

## A practical default

| Budget | Suggested starting point |
| --- | --- |
| Document size | 256 KiB |
| Program size | 200,000 instructions |
| Total instructions | 100,000 |
| Stack depth | 1,000 values |
| Context keys | 1,000 |
| Emitted characters | 1 MiB |
| Turns | 10,000 |
| Wall clock (worker) | 5 seconds |

These are starting points, not hard rules. Profile your own documents and set
the limits above what legitimate content needs.

## See also

- [Run a document](../how-to/play-a-document.md)
- [Save and load progress](save-and-load.md) — validate loaded saves too.
- [Language reference: opcodes](../reference/language.md#opcodes)
- [How to implement a runtime](implement-a-runtime.md) — budgets belong in the
  host, not in the bytecode.

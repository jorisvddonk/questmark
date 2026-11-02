# The trust model

A Questmark document is not a passive script. It is a program with prose on
top. The compiler turns it into bytecode, and the VM executes that bytecode
until it exits or asks the player to choose. How much you trust a document is a
deployment decision, and the language deliberately leaves that decision to the
host.

## Two layers of input

A document contains:

- **Markdown prose**, which the compiler turns into emitted text, and
- **Tzo code**, which the VM executes.

Both are untrusted input if they come from someone else. Markdown can be
enormous, and Tzo can loop, allocate, and emit. Neither is sandboxed by the
language.

## What a document cannot do

By construction, Tzo has no access to:

- the filesystem, network, or environment;
- the host's DOM, engine objects, or process;
- functions, classes, modules, or arbitrary code evaluation;
- timing or concurrency primitives.

The only way out of the VM is:

- `emit` — hand text to the host;
- `response` / `getResponse` — ask the host for a choice;
- `goto`, `pause`, `exit` — control the program;
- an underscore host hook (`_name`) registered by the host.

Unknown non-underscore opcodes are errors. Unknown `_` hooks are no-ops. That
keeps a document portable: the same file runs in a plain interpreter and in a
game with extra hooks.

## What a document can do

The absence of ambient authority is not the absence of risk:

| Capability | Effect |
| --- | --- |
| Loop / `goto` cycles | Consume CPU forever; `run()` has no built-in limit. |
| Push values | Grow the stack without bound. |
| `setContext` in a loop | Grow the context without bound. |
| `emit` in a loop | Flood output, UI, logs, or the transcript. |
| Offer choices forever | Keep a host asking for input indefinitely. |
| Call registered hooks | Trigger whatever power the host attached to that hook. |
| Be very large | Make parsing and compilation expensive. |

None of these are exotic exploits. They are ordinary consequences of executing
a program. The host has to decide which ones matter.

## Three trust levels

A useful way to think about it:

### Trusted

Content written by the team, shipped with the game, reviewed like source code.
You still want tests and budgets for bugs, but you do not need adversarial
isolation.

### Semi-trusted

Content from a CMS, a modding community, or a partner. Assume mistakes and
casual abuse. Use instruction and output budgets, validate saves, and register
only safe hooks. Treat compiled JSON as code.

### Untrusted

Content from the public internet. Use budgets **and** isolation: a worker or
child process with a wall-clock timeout, no dangerous hooks, and limits on input
size. Never expose filesystem, network, or code evaluation through a hook.

The [untrusted-document guide](../how-to/run-untrusted-documents.md) has
concrete budgets and an example VM.

## Hooks are capabilities

A hook is not a sandbox escape; it is a door the host installs. Every document
run by that VM can use every registered hook. There is no per-document ACL.

That means:

- Register hooks per trust level. Do not give a public document the same hook
  table as a first-party campaign.
- Keep hooks narrow: `_playSound("door")`, not `_eval(code)`.
- Assume a hook can be called at any time, in any state, with any context.
- Hooks must be stack-neutral. A hook that pops arguments changes the document
  in hosts where it is not registered.
- Do not put secrets in context or hook arguments; documents can read context.

If a game needs per-document capabilities, instantiate the VM with a different
`additionalFunctions` table per document. That is a host design, not a language
feature.

## Compiled JSON is code

A `VMState` is data, but it describes a program. If you accept compiled JSON
from an untrusted source:

- validate the shape and size before loading;
- cap program length, stack depth, context keys, and output;
- do not trust `labelMap` or `programCounter` to be reasonable;
- prefer compiling source you control, or compare a hash of the JSON against a
  known build.

A JSON file cannot run arbitrary JavaScript, but it can describe a very long
loop and a very large output.

## Text injection is a host problem

The compiler drops HTML tags and emits their text, but the emitted text is
still attacker-controlled. If a host inserts it into a page with `innerHTML`,
the host has an injection problem. Escape text on the way into any rich
renderer. Questmark does not sanitize prose, and it should not: text is the
interface, not markup.

## Why the limits live in the host

A browser game, a CLI, a turn-based mobile game, and an embedded engine have
different resources and different notions of "too much". A built-in limit would
be either too low for legitimate content or too high to protect the smallest
host. It would also make conformance depend on a policy rather than on the
language.

So the split is:

- **The language** defines observable behaviour.
- **The host** defines budgets, isolation, capabilities, and persistence.

The conformance corpus runs with no hooks and no limits; it is about behaviour,
not policy.

## Trust is not anti-cheat

Questmark does not protect competitive integrity:

- the VMState and context are usually on the player's machine;
- a player can edit a save or patch the bytecode;
- there is no signing, encryption, or server authority.

If you need authoritative state, keep it on a server and use Questmark only for
presentation, or validate decisions server-side. That is an engine architecture
question, not something the document format can solve.

## See also

- [How to run untrusted documents safely](../how-to/run-untrusted-documents.md)
- [Why a stack machine?](why-a-stack-machine.md) — why the VM has no ambient
  authority.
- [The text contract](text-contract.md) — why the host owns rendering and
  escaping.
- [Save and load progress](../how-to/save-and-load.md) — validating restored
  state.

# How Questmark is tested

Questmark has no formal specification in the mathematical sense. Instead, the
reference implementation is the executable spec, and a portable conformance
corpus is the contract other runtimes are measured against. This page explains
the testing philosophy and what the suite actually guarantees.

## The reference is the spec — but not only the reference

A compiler test cannot prove an informal spec. It can do something more
practical: pin down observable behaviour in small, reviewable cases, then ask
every runtime to reproduce it.

That is the split:

- **Unit and integration tests** protect the TypeScript implementation.
- **Conformance cases** define the behaviour a port must match.
- **Documentation examples** are tested so the docs cannot silently rot.

The conformance corpus lives in
[`test/conformance/`](https://github.com/jorisvddonk/questmark/tree/master/test/conformance).
Each case is a small document plus choices and expected output. It is
deliberately language-agnostic.

## The layers

### Compiler tests

Small documents compiled and inspected directly: labels, initial context,
initial state, option registration, `no_link_behaviour`, empty input. These
catch structural regressions early and are the fastest tests to read.

### VM tests

Play a document with a fixed sequence of choices and assert the emitted text,
the menus, the final context, and the stack. Also covers navigation, `@once`,
preconditions, post-option text, JSON round-trips, host hooks, and an
instruction-budget wrapper.

### Integration tests

A longer real document (`examples/space_alien.md`) played to an ending, plus
context-gated choices. This catches interactions that isolated documents miss.

### Documentation tests

Every `{playground}` document in the docs is compiled and played one step. Every
file in `examples/` is compiled and played one step. A deliberately broken
example in the docs would fail the suite, not just look wrong on the site.

### Route tests

The capstone tutorials have full walkthroughs with explicit choices: the
branching dialogue, the text-adventure key route, the bribe route, the
trust-gated conversation. These assert the narrative actually reaches the
intended endings.

### Stack hygiene

The stack is the easiest place for a document to go subtly wrong, so there is a
dedicated test. It plays every example and every playable doc across seeded
random walks and coverage-biased walks, recording the stack at **every menu**
and **every natural exit**. A non-empty stack is a failure.

The test also includes a deliberate-leak document to prove the detector works.
Without that self-test, a broken detector could make the suite look green.

### Conformance

The portable cases. They assert:

- exact concatenated emitted text;
- every menu, in order;
- the chosen option by title;
- final public context (excluding `__` internals);
- final stack;
- a natural exit.

Conformance does not use randomness. Randomness is host-dependent and would make
a cross-runtime contract unstable.

### CLI and browser bundle

The CLI is tested by spawning it: compile, `--output`, JSON replay, HTTP input,
missing input, bad extensions, `--version`. The browser bundle is loaded with a
minimal DOM and used to play a document, so the published artifact is exercised,
not just the Node build.

### Document checker

`scripts/check-documents.mjs` compiles a directory, checks duplicate state
names, resolves `initial-state`, validates option links, and loads the program to
catch unknown opcodes. It runs on the examples in `npm test` and in CI.

## Why deterministic tests matter

The VM's `randInt` uses the host's `Math.random`. A random walk test that
depends on real randomness is flaky and unreproducible. The suite therefore:

- replaces `Math.random` with a seeded generator per run;
- uses fixed seeds for choice selection;
- caps the number of steps so a looping document cannot hang the suite;
- fails on timeouts, not by hanging;
- avoids randomness in conformance cases entirely.

The result is a suite that explores many paths but produces the same result on
every machine.

## What the suite does not prove

No test suite is a proof. This one does not cover:

- **Every possible path.** The stack-hygiene test samples paths, including
  coverage-biased walks that prefer less-chosen options, but it does not
  exhaust the state space.
- **UI behaviour.** The inline players and playground are checked manually in a
  browser, not in the committed suite.
- **Performance.** There are no benchmarks or large-document stress tests.
- **Security.** The trust model is a host responsibility; there is no fuzzing
  or adversarial input corpus.
- **Cross-platform browser differences.** The bundle is tested in Node with a
  minimal DOM, not in every browser.
- **Localization.** There is no built-in localization to test yet.

The [limitations page](../reference/limitations.md) lists the functional gaps
these tests do not close.

## Adding a test

- For a compiler or VM rule, add a small document to `test/compile.test.cjs` or
  `test/questvm.test.cjs` with a fixed sequence of choices.
- For a tutorial route, add it to `test/docs-routes.test.cjs`.
- For a new playable document, add a `{playground}` fence; the docs test picks
  it up automatically.
- For a portable behaviour, add a pair in `test/conformance/cases/`, generate
  the expectations, and review them.

The [conformance README](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md)
describes the case format and the rules for runners.

## See also

- [Design principles](design-principles.md) — why the contract is observable
  behaviour.
- [Why a stack machine?](why-a-stack-machine.md) — why stack hygiene is a
  meaningful invariant.
- [How to implement a runtime](../how-to/implement-a-runtime.md) — run the
  conformance cases in a port.
- [Limitations and compatibility](../reference/limitations.md)

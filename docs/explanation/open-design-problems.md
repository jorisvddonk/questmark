# Open design problems

Questmark is deliberately small, and some things are missing not because they
were forgotten but because they are hard to add without changing the character
of the language. This page describes the open questions: why they are difficult,
what the options are, and where the project currently stands.

These are design notes, not roadmaps. Nothing here is a promise.

## Localization

**The problem:** text is compiled into the bytecode as emitted strings. Inline
code is interleaved with prose:

```markdown
You have `"coins" getContext emit` coins.
```

A translator cannot simply replace a sentence. Word order differs, the embedded
value may need a different position, and languages have gender, plurality, and
formality rules that the source sentence did not encode.

**Why it is hard:**

- The compiler sees text nodes, not message IDs. There is no stable key to
  translate against.
- Logic and prose are intentionally close together. Extracting one without the
  other changes the document.
- The same phrase may need different translations depending on context, speaker,
  or the player's state.
- Right-to-left scripts, ruby text, and CJK line breaking are presentation
  concerns the host owns.

**Possible directions:**

1. **One document per locale.** Simple and requires no language changes, but
   duplicates the logic and risks divergence.
2. **Stable message IDs.** The compiler emits IDs instead of literals, and a
   runtime catalog supplies translations. This is the cleanest long-term
   design, but it changes the bytecode contract and needs tooling.
3. **Source transformation.** An external tool extracts prose, translates it,
   and reassembles the document while leaving code spans untouched. Workable,
   but fragile around context-dependent strings.
4. **A translation layer in the host.** The host intercepts `emit` and maps
   text to a locale. This only works for whole-string replacements and cannot
   reorder embedded values.

**Current state:** parallel translated documents with a structural parity
checker are implemented (see
[how to translate with parallel documents](../how-to/translate-with-parallel-documents.md)
and the [translation parity reference](../reference/translation-parity.md)).
Catalog-based alternatives are under review. The open parts are avoiding logic
duplication, runtime switching, ICU-style plurals/gender, and paragraph-level
messages. The [FAQ](faq.md#can-i-translate-a-document) has the short answer.

## Inline HTML

**The problem:** Questmark emits text, not markup. Raw HTML tags are currently
dropped and their text survives; images are dropped entirely. Hosts that want
rich presentation cannot get it from the language.

**Why it is hard:**

- A browser can render HTML; a terminal and a game engine cannot. Any markup
  feature needs a portability story.
- Allowing raw HTML invites sanitization, security, and accessibility problems,
  and makes conformance depend on a renderer.
- Styling in documents fights the host's design system.
- "Just emit HTML" would make Questmark a worse Twine.

**Possible directions:**

1. **Keep text-only** (current). Hosts style text and use hooks for media.
2. **Host-defined inline tags.** The compiler recognizes an allowlist and emits
   structured spans; each host renders or ignores them.
3. **Structured output.** Emit a small tree of spans (emphasis, speaker,
   keyword) instead of a string. This is a larger change to the bytecode and
   the text contract.
4. **Raw HTML passthrough.** Easiest for the web, hostile to every other host
   and to security. Unlikely.

**Current state:** text-only. HTML is a listed open question in
[Why Questmark?](why-questmark.md).

## Custom directives and macros

**The problem:** the only directive is `@once`. Authors who want new syntax
must change the compiler. Hosts can add runtime opcodes, but those cannot
change how a document is parsed or compiled.

**Why it is hard:**

- Directives are compiler features. A plugin system needs a parse hook, a
  compile hook, stable node shapes, conflict rules, and error reporting.
- Macros that expand to states/options blur the line between authoring sugar
  and a second language.
- Every extension is another thing a port has to implement to be conformant.
- The compiler currently special-cases `@once` in the option visitor; that is
  not an extension point.

**Possible directions:**

1. **Keep the closed set.** Add directives slowly, as language features.
2. **Compiler plugins.** A documented visitor API with named hooks and
   deterministic ordering.
3. **Host hooks only.** Use `_name` opcodes for side effects and leave syntax
   alone. This is what exists today.
4. **Macro preprocessing.** A separate pass expands macros to plain Questmark
   before compilation. Keeps the core small, but adds a preprocessor and source
   maps.

**Current state:** `@once` only; custom Tzo opcodes via `additionalFunctions`.
The compiler is not pluggable.

## Includes and modules

**The problem:** one document is one compilation unit with one options header.
There are no includes, imports, or namespaces. Large works either live in one
file or are split into independent episodes.

**Why it is hard:**

- State names and links are global. Includes need namespacing or collision
  detection.
- Each file would need a header or a way to inherit one; duplicate headers are
  ambiguous today (the last one wins).
- Source maps and error messages would need to point into included files.
- Include cycles need detection.
- A package/module system starts to look like a build tool, which the project
  has avoided.

**Possible directions:**

1. **Separate episodes.** Each file is a complete document with its own header;
   the game chooses which to load.
2. **Concatenation with a build script.** Merge scene files, strip duplicate
   headers, and detect collisions. Simple, but a custom build step.
3. **First-class includes.** `!include` or a header field, with namespacing and
   cycle detection. A meaningful language feature, not a small patch.

**Current state:** no includes. The [organization guide](../how-to/organize-a-document.md)
describes the workarounds.

## Exact save and restore

**The problem:** when the VM is waiting for a choice, the pending menu lives in
the host. The VM's registered `responses` are cleared before the host callback,
and a VMState does not contain the menu. Saving at a state boundary re-enters
the state, re-emitting its text and re-running its entry code.

**Why it is hard:**

- The menu is a host-visible artifact but not part of the serialized VM state.
- A faithful save would need to serialize the choices and their effect targets,
  plus the program position after `getResponse`.
- That exposes compiler/VM internals and creates a new compatibility surface.
- The host still owns the dialogue UI, input, and transcript.

**Possible directions:**

1. **Checkpoint model** (current): save context + state name, rebuild the menu
   on load. Works with public APIs; re-emits entry text.
2. **Serialize the pending menu.** Add a documented save/restore API for the
   current choices and program position. More exact, more coupling.
3. **Move state entry out of states.** Encourage idempotent entry and separate
   "on first entry" logic, making checkpoints safer.

**Current state:** the checkpoint model is documented in
[save and load progress](../how-to/save-and-load.md). Exact mid-menu resume is
not supported.

## Versioning and compatibility

**The problem:** `questmark-spec` is `"1.0"`, but the spec is informal. Unknown
header fields are ignored, invalid `no_link_behaviour` is an error, and opcodes
are not versioned. Ports pin a compiler version and hope.

**Why it is hard:**

- A version number is only useful if there is a compatibility policy: what may
  change in a minor release, what breaks, and how a runtime negotiates.
- The conformance corpus is a behavioural contract, but it is not a spec
  document or a migration tool.
- Document authors need to know which features a target runtime supports.

**Possible directions:**

1. **Freeze the corpus per spec version.** Keep `1.0` cases immutable; add a
   `2.0` set for breaking changes.
2. **Feature flags** in the header for optional behaviour.
3. **A compatibility matrix** of runtimes and supported opcodes/features.
4. **Migration tooling** that rewrites documents between versions.

**Current state:** informal `1.0`; conformance cases are the portable contract;
no formal negotiation or migration.

## What these questions have in common

Every one of them is a request to make the language do more:

- translate text,
- render markup,
- extend syntax,
- compose files,
- save exact state,
- promise compatibility.

Each would make Questmark more capable and less small. The project's bias is to
keep the core language and bytecode minimal, and to push presentation, policy,
and composition into the host or external tooling — until the cost of not having
the feature is clearly higher than the cost of adding it.

## See also

- [Why Questmark?](why-questmark.md) — the original problem and the listed open
  questions.
- [Limitations and compatibility](../reference/limitations.md) — current
  constraints.
- [FAQ and comparisons](faq.md) — short answers.
- [Design principles](design-principles.md) — the bias toward a small core.

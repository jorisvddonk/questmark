# Localization design: runtime catalogs

This design moves translation to the runtime. The compiler emits message IDs
and stores source templates in the VMState; `QuestVM` formats them through a
locale catalog. The main benefit is **language switching without recompiling**
and one bytecode build for every locale. The main cost is a new opcode and
runtime work in every port.

This is one of three localization alternatives; compare it with compile-time
catalogs and parallel translated documents before choosing.

## The constraints

Localization for Questmark has to fit the same four constraints as any design:

1. Translators should work on prose, not Tzo code.
2. The VM is portable; changing the bytecode affects every runtime.
3. Text is the contract; the host owns presentation.
4. Dynamic values (names, counters) must be reorderable across languages.

Runtime catalogs accept a larger bytecode change in exchange for flexibility.

## The design

### 1. Interpolation stays explicit

Authors write `{{key}}` where a value belongs:

```markdown
Hello {{name}}, you have {{coins}} coins.
```

In a runtime-localized build the placeholder stays in the message template and
is resolved from the context when the message is formatted. This lets a
translation reorder `{{coins}}` and `{{name}}`.

### 2. The compiler emits message references

`parseMarkdown(md, { localize: true })` emits:

```
pushString "start.text.0"
message
emit
```

- `messages` maps IDs to source templates.
- `message` pops an ID, formats the template, and pushes a string.
- Option labels use the same opcode and feed the formatted string to
  `response`.
- Trailing paragraph newlines are emitted separately, so templates stay clean.

A non-localized build is unchanged: text is compiled as literals, and
`{{key}}` is compiled inline through `getContext`/`emit`.

### 3. The runtime owns the catalog

```js
vm.setCatalog(frenchCatalog);
vm.loadVMState(qvmState);
vm.run();
```

The catalog can be swapped between turns:

```js
async function askPlayer(choices) {
  if (languageChanged) {
    vm.setCatalog(loadCatalog(language));
  }
  return prompt(choices);
}
```

Text already emitted stays; subsequent messages use the new catalog. A missing
entry or empty translation falls back to the source template.

### 4. Validation is split

- **Build time** (`validateCatalogForDocument`): unknown IDs, stale sources,
  placeholder mismatches.
- **Runtime**: the same checks at the point of use, because catalogs can change
  without recompiling. This is deliberate: it allows hot-fixing translations,
  and it makes a malformed catalog fail at the message where it is used.

## Why runtime?

The decisive feature is live language switching. A player can change language
in a settings menu mid-conversation, and the next turn uses the new locale. A
single VMState serves every locale, and translation updates do not require
recompiling documents.

This matters if:

- the game has an in-game language setting,
- translations ship separately from the story build,
- you want to hot-fix a translation without a full build,
- you have many locales and want to avoid rebuilding each document per locale.

It matters less if languages are selected before launch and assets are built
per locale anyway.

## Alternatives considered

### Compile-time catalogs

Translation is substituted into bytecode at build time. Pros: no VM changes,
existing ports work, all validation at build time. Cons: one build per locale,
no live switch. This is the smallest design and the best fit for a static
multi-build pipeline.

### Parallel translated documents

Translators edit a full document per locale; a structural checker compares the
state graph and code. Pros: full context for translators, natural prose, no
catalog format, no compiler change. Cons: duplicated logic and drift.

### Host-side string mapping

The host translates emitted chunks by exact string. No compiler/runtime change,
but fragments and dynamic values make it unreliable. A stopgap.

## Trade-offs

| Benefit | Cost |
| --- | --- |
| Switch locale without recompiling | New `message` opcode in every port |
| One bytecode build for all locales | VMState carries IDs + source templates |
| Translation fixes without rebuild | Runtime validation and failure modes |
| Placeholder reordering | Text-node granularity still limits sentence merging |
| Catalogue separate from story assets | Versioning catalogs against document changes |

## What this design leaves out

- **ICU MessageFormat.** No plural/gender/select; `{{count}}` is direct
  substitution.
- **Paragraph joining.** Inline code still splits messages.
- **Literal `{{` escape.**
- **Conformance coverage for localized builds.** The portable corpus currently
  covers non-localized behaviour; ports implementing `message` need their own
  tests for now.
- **Locale negotiation.** The host chooses; the catalog is trusted input.

## Why this could be the right choice

If live language switching or shipping translations independently is a product
requirement, runtime catalogs pay for their complexity. The VM change is small:
one opcode, one VMState field, and a formatter. The compiler and catalog format
are familiar from the compile-time design, so moving between the two later is
mostly a question of when formatting happens.

The risk is ecosystem fragmentation: a port that does not implement `message`
cannot play localized builds. That is a real cost for a language whose value
proposition includes portable bytecode.

## See also

- [How to localize at runtime](../how-to/localize-at-runtime.md)
- [Runtime localization reference](../reference/runtime-localization.md)
- [The text contract](text-contract.md)
- [How to implement a runtime](../how-to/implement-a-runtime.md)
- [Open design problems](open-design-problems.md)

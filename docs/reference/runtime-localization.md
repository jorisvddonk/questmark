# Runtime localization reference

This design compiles translatable text to **runtime message references**. The
VMState stores source templates; `QuestVM` formats them through a locale
catalog. That allows switching language between turns without recompiling.

The interpolation syntax `{{key}}` and the catalog shape are the same as the
compile-time design; the difference is when translation happens.

## Interpolation

`{{key}}` works in state prose, post-option text, and option labels:

```markdown
Hello {{name}}, you have {{coins}} coins.
* Buy for {{price}} coins
```

In a normal build, placeholders compile to `getContext`/`emit` (or a label
concatenation). In a **localized** build they stay in the message template and
are formatted at runtime from the context. Missing keys throw.

`{{` is reserved syntax; there is no literal-brace escape yet.

## Compiled state

`parseMarkdown(markdown, { localize: true })` produces a VMState with:

```json
{
  "programList": [
    { "type": "push-string-instruction", "value": "start.text.0" },
    { "type": "invoke-function-instruction", "functionName": "message" },
    { "type": "invoke-function-instruction", "functionName": "emit" }
  ],
  "messages": {
    "start.text.0": "Hello {{name}}, you have {{coins}} coins."
  }
}
```

`messages` maps path-based IDs to source templates. Every translatable text
unit compiles to `push-string <id>; message`, followed by the normal `emit`
(or label handling). The `message` opcode formats and pushes a string.

| Message kind | ID shape |
| --- | --- |
| State text | `<state>.text.<n>` |
| Option label | `<state>.option.<i>.label` |
| Post-option text | `<state>.option.<i>.text.<n>` |

Trailing paragraph newlines are not part of the template; they are emitted
separately, as in a normal build.

## Runtime catalog

A catalog has the same shape as the compile-time design:

```json
{
  "version": 1,
  "locale": "fr",
  "messages": {
    "start.text.0": {
      "source": "Hello {{name}}, you have {{coins}} coins.",
      "translation": "Vous avez {{coins}} pièces, {{name}}."
    }
  }
}
```

A JSON Schema is available at
[questmark-catalog.schema.json](/questmark/questmark-catalog.schema.json).

Load it with:

```js
vm.setCatalog(catalog); // or vm.setCatalog(null) for source text
```

The catalog can be changed between turns. Text already emitted stays as it was;
subsequent `message` opcodes use the new catalog.

Fallbacks and validation:

- No catalog, a missing entry, or an empty translation → source template.
- A translation whose `source` no longer matches the compiled message → error.
- Placeholders in a translation must exactly match the source placeholders →
  error. They may be reordered.
- Missing context keys throw.
- Unknown message IDs throw.

These checks happen when the message is formatted, so a bad catalog fails at
the point of use rather than at compile time.

## `QuestVM` API

### `setCatalog(catalog: Catalog | null)`

Validates the catalog shape and installs it. Pass `null` to return to the source
templates. The catalog may be swapped at any time.

### `formatMessage(id: string, context: Context): string`

Formats one message. Useful in host tests or custom opcodes. It performs the
same fallback/validation as the `message` opcode.

### `messages`

The source templates loaded from the current VMState. Read-only in practice.

### `loadVMState(state)`

Also loads `state.messages` when present. A VMState compiled without
`localize: true` has no messages; using `message` against it is an error.

## Compiler API

```ts
import {
  parseMarkdown,
  extractCatalog,
  missingTranslations,
  validateCatalog,
  type Catalog,
} from "questmark";

const { qvmState, messages } = parseMarkdown(markdown, { localize: true });
const catalog = extractCatalog(markdown, "fr");
const missing = missingTranslations(markdown, catalog);
```

- `parseMarkdown(markdown, { localize: true })` stores `qvmState.messages` and
  emits `message` opcodes.
- `messages` is always returned as an array of message metadata.
- `extractCatalog` produces an empty catalog with source templates.
- `missingTranslations` lists untranslated IDs.
- `validateCatalog` checks the runtime catalog envelope.

## CLI

```bash
# Extract a catalog
npx questmark --input story.md --extract-catalog locales/fr.json --locale fr

# Compile a message-based VMState
npx questmark --input story.md --localize --output story.vmstate.json --no-run

# Play with a runtime catalog
npx questmark --input story.vmstate.json --catalog locales/fr.json

# Or compile + play a source document with a catalog
npx questmark --input story.md --catalog locales/fr.json
```

| Flag | Meaning |
| --- | --- |
| `--localize` | Compile to runtime message references. |
| `--catalog <path>` | Set a runtime catalog; source input is compiled with `--localize` automatically. |
| `--extract-catalog <path>` | Write a catalog and exit. |
| `--locale <code>` | Locale metadata for extraction. Default `en`. |

`--extract-catalog` cannot be combined with `--localize` or `--catalog`.
`--localize` cannot be used with a compiled `.json` input.

## Porting note

A runtime that wants to play localized documents must implement:

1. the `message` opcode (`string id` → formatted string on the stack),
2. loading the `messages` map from the VMState,
3. catalog lookup and `{{key}}` substitution from the context.

Runtimes that do not implement `message` can still play non-localized builds;
unknown opcodes fail when the VMState is loaded.

## Limitations

- **New opcode.** Every runtime that plays a localized build needs `message`.
- **Runtime validation.** Stale sources and placeholder mismatches fail during
  play, not at compile time.
- **No ICU.** No plural, gender, select, or number/date formatting.
- **Text-node granularity.** Inline code splits messages; use `{{key}}` for
  values translators must reorder.
- **No literal `{{` escape** yet.
- **Message-based bytecode is larger** than literal strings for large documents
  (IDs plus the `messages` map), though translations are not embedded.
- **Catalog updates can change runtime output** without recompiling, which is
  the point — and also a reason to version catalogs carefully.

## See also

- [How to localize at runtime](../how-to/localize-at-runtime.md)
- [Runtime localization design](../explanation/localization-runtime-design.md)
- [Language reference: text emission](language.md#text-emission)
- [API reference](api.md)

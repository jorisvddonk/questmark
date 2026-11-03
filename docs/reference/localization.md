# Localization reference

Questmark supports **compile-time localization catalogs**. A document is
compiled once per locale; the runtime and the bytecode format are unchanged.
This page describes the interpolation syntax, message IDs, catalog format, and
API precisely.

## Interpolation

Text in **state prose**, **post-option text**, and **option labels** may contain
placeholders:

```markdown
Hello {{name}}, you have {{coins}} coins.
* Buy for {{price}} coins
```

A placeholder is `{{`, optional whitespace, a key, optional whitespace, and `}}`.
The key must match `[A-Za-z_][A-Za-z0-9_.-]*`.

At compile time a placeholder becomes a context lookup:

- prose and post-option text: `"key" getContext emit`
- option labels: the value is concatenated into the menu label

The context value must exist when the text is reached; a missing key throws the
same error as `getContext`. Values may be strings or numbers.

`{{` is **reserved syntax**. There is currently no escape for a literal `{{` in
prose; avoid it or use a different wording.

Interpolation is available even without a catalog. It is a normal language
feature; catalogs only replace the surrounding text.

## Message IDs

The compiler assigns every translatable text unit a path-based ID:

| Kind | ID shape | Example |
| --- | --- | --- |
| State text | `<state>.text.<n>` | `start.text.0` |
| Option label | `<state>.option.<i>.label` | `start.option.2.label` |
| Post-option text | `<state>.option.<i>.text.<n>` | `start.option.0.text.1` |

- `n` counts translatable text nodes in order, starting at zero.
- `i` is the zero-based option index in the source.
- Whitespace-only text nodes do not receive IDs.
- Trailing newlines are **not** part of the source text; the compiler re-applies
  the original separators after translation.

IDs are stable while the document structure is stable. Reordering paragraphs or
options changes the IDs. Renaming a state changes its IDs.

## Catalog format

A catalog is JSON:

```json
{
  "version": 1,
  "locale": "fr",
  "messages": {
    "start.text.0": {
      "source": "Hello {{name}}, you have {{coins}} coins.",
      "translation": "Vous avez {{coins}} pièces, {{name}}."
    },
    "start.option.0.label": {
      "source": "Buy for {{price}} coins",
      "translation": "Acheter pour {{price}} pièces"
    }
  }
}
```

A JSON Schema is available at
[questmark-catalog.schema.json](/questmark/questmark-catalog.schema.json).

| Field | Meaning |
| --- | --- |
| `version` | Currently `1`. |
| `locale` | Locale metadata, for tooling. |
| `messages` | Map from message ID to source and translation. |
| `source` | The exact source text the translation belongs to. |
| `translation` | The translated text; empty means “not translated yet”. |

Rules:

- Entries are looked up by **ID**.
- An empty or missing translation falls back to the source text.
- If an entry exists but its `source` no longer matches the document, compilation
  fails with a stale-catalog error. Re-extract the catalog.
- Placeholders in the translation must be **exactly** the placeholders in the
  source. Missing or unknown placeholders are compile errors. Translations may
  reorder them.

## Library API

```ts
import {
  parseMarkdown,
  extractCatalog,
  parseMarkdownForLocale,
  createCatalogTranslator,
  missingTranslations,
  type Catalog,
  type LocalizableMessage,
} from "questmark";
```

### `parseMarkdown(markdown, options?)`

Compiles a document. In addition to `parsedMDFile` and `qvmState`, the result
contains `messages: LocalizableMessage[]`, collected in compilation order.

```ts
interface ParseOptions {
  translate?: (message: LocalizableMessage) => string | undefined;
}

interface LocalizableMessage {
  id: string;
  kind: "state-text" | "option-label" | "option-text";
  source: string;
  state: string;
  optionIndex?: number;
}
```

A translator returns a translation or `undefined` to keep the source. The
compiler validates placeholders and applies the translation.

### `extractCatalog(markdown, locale = "en")`

Returns a catalog with every message and an empty `translation`. Commit the
result or hand it to a translation tool.

### `parseMarkdownForLocale(markdown, catalog, options?)`

Builds a translator from a catalog and compiles. Throws on a stale source or a
placeholder mismatch.

### `createCatalogTranslator(catalog, options?)`

Returns a translator for `parseMarkdown`. `failOnStaleSource` defaults to
`true`; pass `false` to ignore source changes (not recommended).

### `missingTranslations(markdown, catalog)`

Returns the IDs that are missing or empty. Useful in CI before shipping a
locale.

## CLI

```bash
# Extract a catalog
npx questmark --input story.md --extract-catalog locales/fr.json --locale fr

# Compile a localized build
npx questmark --input story.md --catalog locales/fr.json \
  --output dist/story.fr.vmstate.json --no-run

# Play a localized build
npx questmark --input dist/story.fr.vmstate.json
```

| Flag | Meaning |
| --- | --- |
| `--catalog <path>` | Apply a catalog while compiling a source document. |
| `--extract-catalog <path>` | Write a catalog for the source and exit. |
| `--locale <code>` | Locale metadata for extraction. Default `en`. |

`--extract-catalog` requires a `.md`/`.qmd` source and exits without playing.
`--catalog` cannot be combined with `--extract-catalog`, and cannot be used with
a compiled `.json` input.

## Limitations

- **One build per locale.** Switching locale at runtime requires reloading a
  different VMState. There is no runtime catalog in this design.
- **No ICU features.** Plurals, gender, select, and number/date formatting are
  not implemented. Placeholders substitute values directly.
- **Text-node granularity.** Inline code splits a paragraph into separate
  messages. Use `{{key}}` rather than inline code for values that translators
  need to reorder.
- **No paragraph joining.** A translation can reorder placeholders within one
  text node, but cannot merge two text nodes across inline code.
- **Path-based IDs.** Reordering paragraphs/options or renaming states changes
  IDs; re-extract and review the catalog.
- **`{{` is reserved.** There is no literal-brace escape yet.
- **Catalogs are trusted input** at build time. They are not executed, but a
  huge catalog can still consume memory.

## See also

- [How to localize a document](../how-to/localize-a-document.md)
- [Localization design](../explanation/localization-design.md)
- [Language reference: text emission](language.md#text-emission)
- [CLI reference](cli.md)

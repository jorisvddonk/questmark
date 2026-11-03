# How to localize a document

Questmark localizes at **compile time**. You write the document once, extract a
catalog of translatable messages, translate the catalog, and compile one
VMState per locale. The runtime and the bytecode format stay unchanged, so every
existing host and port can play a localized build.

This guide walks through the workflow. The exact catalog format is in the
[localization reference](../reference/localization.md).

## 1. Put dynamic values in placeholders

Translatable prose should use placeholders instead of inline code:

```markdown
Hello {{name}}, you have {{coins}} coins.
```

`{{name}}` reads `name` from the context and emits it. A translator can move the
placeholder, which is impossible with a hard-coded inline-code span:

```markdown
Vous avez {{coins}} pièces, {{name}}.
```

Placeholders work in state text, post-option text, and option labels. A missing
context key throws at runtime, just like `getContext`.

You do not have to convert every document. Inline code still works, but a
translator cannot reorder values across it, because the compiler sees the text
around the code as separate messages.

Play with interpolation (no catalog required):

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "name": "Ada", "coins": 3 }
    }

# start

Hello {{name}}, you have {{coins}} coins.
* [Leave](#end)

# end

Goodbye, {{name}}.
`exit`
```

## 2. Extract a catalog

```bash
npx questmark --input story.md --extract-catalog locales/en.json --locale en
```

The command prints the number of messages and exits without playing. The result
looks like this:

```json
{
  "version": 1,
  "locale": "en",
  "messages": {
    "start.text.0": {
      "source": "Hello {{name}}, you have {{coins}} coins.",
      "translation": ""
    },
    "start.option.0.label": {
      "source": "Leave",
      "translation": ""
    }
  }
}
```

Commit the catalog. It is the translator's source of truth.

## 3. Translate the catalog

Copy the extracted file and fill in `translation` values:

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
      "source": "Leave",
      "translation": "Partir"
    }
  }
}
```

Keep the IDs and the `source` fields. A translator may reorder placeholders, but
must keep the same set. Empty translations fall back to the source, so a partly
translated locale still runs.

## 4. Compile the locale

```bash
npx questmark --input story.md --catalog locales/fr.json \
  --output dist/story.fr.vmstate.json --no-run
```

Ship `dist/story.fr.vmstate.json`. Play it like any other document:

```bash
npx questmark --input dist/story.fr.vmstate.json
```

You can also compile and run in one step:

```bash
npx questmark --input story.md --catalog locales/fr.json
```

One document therefore produces one VMState **per locale**. There is no runtime
language switch in this design; load the appropriate build when the player
chooses a language.

## 5. Use the library

```js
import {
  extractCatalog,
  parseMarkdownForLocale,
  missingTranslations,
} from "questmark";
import fs from "node:fs";

const markdown = fs.readFileSync("story.md", "utf8");
const french = JSON.parse(fs.readFileSync("locales/fr.json", "utf8"));

const untranslated = missingTranslations(markdown, french);
if (untranslated.length > 0) {
  console.warn("Untranslated:", untranslated);
}

const { qvmState } = parseMarkdownForLocale(markdown, french);
fs.writeFileSync("story.fr.vmstate.json", JSON.stringify(qvmState));

// Bootstrapping a new locale:
fs.writeFileSync(
  "locales/de.json",
  JSON.stringify(extractCatalog(markdown, "de"), null, 2)
);
```

## 6. Add it to CI

A useful check is: every locale catalog is complete and in sync.

```js
import fs from "node:fs";
import { missingTranslations } from "questmark";

const markdown = fs.readFileSync("story.md", "utf8");
for (const locale of ["fr", "de", "ja"]) {
  const catalog = JSON.parse(fs.readFileSync(`locales/${locale}.json`, "utf8"));
  const missing = missingTranslations(markdown, catalog);
  if (missing.length) {
    throw new Error(`${locale}: missing translations for ${missing.join(", ")}`);
  }
}
```

`parseMarkdownForLocale` also throws on stale `source` values and on
placeholder mismatches, so a compile step catches the other common failures.

## What translators can and cannot do

- **Can** translate prose, option labels, and post-option text.
- **Can** reorder placeholders inside a message.
- **Cannot** move a value across inline code; the compiler has already split
  the paragraph.
- **Cannot** add or remove placeholders.
- **Cannot** change the document's state graph, options, or code.
- **Can** leave a translation empty; the source is used as a fallback.

## Common problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Catalog source mismatch for "..."` | The document text changed after extraction. | Re-extract and update the catalog. |
| `missing placeholder "{{coins}}"` | The translation dropped a placeholder. | Add it back. |
| `unknown placeholder "{{gold}}"` | The translation invented a placeholder. | Remove it or add it to the source. |
| A value appears in the wrong order | It is inline code, not a placeholder. | Convert it to `{{key}}` and re-extract. |
| Menu labels are untranslated | The option label has no catalog entry. | Extract again; labels are messages too. |
| `{{` appears literally in prose | It is reserved interpolation syntax. | Reword the text; there is no escape yet. |

## See also

- [Localization reference](../reference/localization.md)
- [Localization design](../explanation/localization-design.md)
- [Compile to bytecode](compile-to-bytecode.md)
- [How to embed Questmark](use-the-library.md)

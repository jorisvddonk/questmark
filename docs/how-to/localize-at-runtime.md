# How to localize a document at runtime

This guide uses **runtime catalogs**: the compiler emits message references,
the VMState stores the source templates, and `QuestVM` formats them through a
locale catalog. You can switch language between turns without recompiling.

The catalog format and message IDs are described in the
[runtime localization reference](../reference/runtime-localization.md).

## 1. Use placeholders for dynamic values

```markdown
Hello {{name}}, you have {{coins}} coins.
```

A translation can reorder the same placeholders:

```markdown
Vous avez {{coins}} pièces, {{name}}.
```

Placeholders work in state text, post-option text, and option labels. They are
formatted from the context at runtime.

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
npx questmark --input story.md --extract-catalog locales/fr.json --locale fr
```

Fill in the `translation` fields:

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

## 3. Compile once

```bash
npx questmark --input story.md --localize --output story.vmstate.json --no-run
```

The VMState contains a `messages` map and uses the `message` opcode for
translatable text. It has no locale baked in.

## 4. Load a catalog at runtime

```js
import fs from "node:fs";
import { QuestVM, parseMarkdown } from "questmark";

const { qvmState } = parseMarkdown(
  fs.readFileSync("story.md", "utf8"),
  { localize: true }
);

const french = JSON.parse(fs.readFileSync("locales/fr.json", "utf8"));

const vm = new QuestVM(renderText, askPlayer);
vm.setCatalog(french);
vm.loadVMState(qvmState);
vm.run();
```

When a compiled JSON file is used instead of source, `parseMarkdown` is not
needed; `QuestVM.loadVMState` reads the `messages` map.

## 5. Switch language between turns

Call `setCatalog` at any time:

```js
async function askPlayer(choices) {
  if (settings.language !== currentLanguage) {
    currentLanguage = settings.language;
    vm.setCatalog(loadCatalog(currentLanguage)); // or null for source text
  }
  return prompt(choices);
}
```

Text already on screen stays as it was. The next state text, option labels,
and post-option text use the new catalog. This is the main reason to choose
runtime catalogs over compile-time builds.

## 6. CLI shortcuts

```bash
# Play a compiled localized build with a catalog
npx questmark --input story.vmstate.json --catalog locales/fr.json

# Compile and play a source document with a catalog
npx questmark --input story.md --catalog locales/fr.json
```

`--catalog` on a source document implies `--localize`. On a compiled `.json`,
it only sets the runtime catalog.

## 7. Validate catalogs in CI

`validateCatalogForDocument` checks a catalog against the document without
running it:

```js
import fs from "node:fs";
import { validateCatalogForDocument, missingTranslations } from "questmark";

const markdown = fs.readFileSync("story.md", "utf8");
for (const locale of ["fr", "de", "ja"]) {
  const catalog = JSON.parse(fs.readFileSync(`locales/${locale}.json`, "utf8"));
  const errors = validateCatalogForDocument(markdown, catalog);
  if (errors.length) throw new Error(`${locale}: ${errors.join("; ")}`);

  const missing = missingTranslations(markdown, catalog);
  if (missing.length) throw new Error(`${locale}: missing ${missing.join(", ")}`);
}
```

Runtime also validates source match and placeholders at the point of use, but
catching them in CI is better.

## What translators can and cannot do

- **Can** translate prose, option labels, and post-option text.
- **Can** reorder placeholders within a message.
- **Cannot** move values across inline code.
- **Cannot** add or remove placeholders.
- **Can** leave a translation empty; the source is used.
- **Can** update a catalog without recompiling, as long as the source template
  and placeholders still match.

## Common problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| `message: unknown message id` | The VMState was not compiled with `--localize`, or the ID is wrong. | Recompile with `--localize`; re-extract the catalog. |
| `message: missing context key` | The placeholder does not exist in context. | Add it to `initial-context` or set it before the state. |
| `Catalog source mismatch` | The document changed after the catalog was written. | Re-extract; the ID now maps to different source text. |
| `missing placeholder` / `unknown placeholder` | The translation's placeholder set differs. | Match the source set exactly. |
| Menu labels are English | The catalog is missing those IDs, or was not installed before the menu. | Validate the catalog; call `setCatalog` before `run`. |
| Language switch does nothing | `setCatalog` was called after the text was already emitted. | Switch before the next turn. |

## See also

- [Runtime localization reference](../reference/runtime-localization.md)
- [Runtime localization design](../explanation/localization-runtime-design.md)
- [Compile to bytecode](compile-to-bytecode.md)
- [How to embed Questmark](use-the-library.md)

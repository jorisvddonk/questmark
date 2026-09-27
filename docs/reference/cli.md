# Questmark CLI reference

The Questmark command line interface compiles and interprets Questmark
documents.

## Usage

```
questmark [options]
```

Run it from a checkout with `npm start -- [options]`, or from the published
package with `npx questmark [options]`.

## Options

| Option | Description |
| --- | --- |
| `-V, --version` | Print the version number. |
| `-c, --clear` | Clear the console on each state. *(Declared but not yet implemented.)* |
| `--input <path>` | Load a source `.md`, `.qmd`, `.qmd.html`, `.md.html`, or `.json` file. `path` can be a local filesystem path or an `http(s)://` URL. |
| `--output <path>` | Emit the compiled VMState as JSON to `path`. |
| `--no-run` | Do not interpret the input; only parse and (optionally) emit output. |
| `-h, --help` | Display help. |

`--input` is required. Without it the CLI prints `Missing input!` and exits
with status 1.

## Examples

Play a local document:

```bash
questmark --input examples/space_alien.md
```

Compile a document to bytecode without running it:

```bash
questmark --input examples/space_alien.md --output vmstate.json --no-run
```

Play a compiled document:

```bash
questmark --input vmstate.json
```

Play a document hosted online:

```bash
questmark --input https://example.com/document.md
```

## Exit codes

- `0` — success.
- `1` — missing `--input`, or a runtime/interpretation error.

## Behaviour

- `.json` inputs are treated as pre-compiled VM states and interpreted directly.
- `.md`, `.qmd`, `.md.html`, and `.qmd.html` inputs are compiled with
  `parseMarkdown` before interpretation.
- Any other extension is an error.
- Inputs beginning with `http://` or `https://` are fetched before processing.
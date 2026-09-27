# How to compile a Questmark document to bytecode

Questmark compiles to [Tzo](https://github.com/jorisvddonk/tzo) bytecode. A
compiled document is a JSON file describing a complete VM state, which you can
store, inspect, or ship in a game.

## Compile a document to JSON

```bash
npx questmark --input path/to/document.md --output path/to/vmstate.json --no-run
```

- `--input` — the Questmark document (local path or `http(s)://` URL).
- `--output` — where to write the compiled JSON.
- `--no-run` — parse and compile only; do not interpret the document.

The output is a JSON serialization of a Tzo `VMState`, containing the compiled
program, its label map, and the initial context. No interpreter is required to
produce or read this file.

## Compile without writing a file

Omit `--output`. The CLI parses the document but discards the compiled state —
handy for checking that a document parses cleanly:

```bash
npx questmark --input path/to/document.md --no-run
```

## Play a compiled document

You can interpret a compiled `.json` the same way you play a source document:

```bash
npx questmark --input path/to/vmstate.json
```

## From the project directory

Inside a checkout of the repository the same commands are available via
`npm start`:

```bash
npm start -- --input path/to/document.md --output path/to/vmstate.json --no-run
npm start -- --input path/to/vmstate.json
```

## What the compiled output looks like

A compiled VM state has these top-level fields:

| Field | Description |
| --- | --- |
| `programList` | The array of instructions in the compiled program. |
| `labelMap` | Maps state names (and state `__options` labels) to positions in `programList`. |
| `context` | The initial context bag of variables. |
| `stack` | The interpreter stack (empty at compile time). |
| `programCounter` | Where execution starts (0 at compile time). |
| `exit` / `pause` | Interpreter flags (both `false` at compile time). |

See the [explanation of how Questmark works](../explanation/how-questmark-works.md)
for what these instructions mean.
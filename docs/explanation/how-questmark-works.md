# How Questmark works

Questmark is a compiler and an interpreter. A document goes through a
pipeline:

```
Markdown document
      │  mdast-util-from-markdown
      ▼
mdast AST (generic Markdown tree)
      │  visit headings, collect children
      ▼
Questmark tree (states, options, headers)
      │  visit nodes, tokenize Tzo code
      ▼
Tzo bytecode (VMState: programList + labelMap)
      │  QuestVM (a Tzo VM)
      ▼
A running conversation
```

## 1. From Markdown to a Questmark tree

The compiler first parses the document with
[`mdast-util-from-markdown`](https://www.npmjs.com/package/mdast-util-from-markdown),
producing a standard Markdown abstract syntax tree.

It then walks that tree. Every top-level `# heading` starts a **state**, and
everything between one heading and the next belongs to that state. One heading
is special: `QUESTMARK-OPTIONS-HEADER`. Its indented code block is parsed as
JSON and supplies the document's configuration — the initial state, the initial
context, and interpreter behaviour flags.

Each state's children are split into two parts:

- the **text**, everything before the first list, and
- the **options**, the list items themselves.

Each option is decomposed further: backticked code *before* the option's text
becomes a **precondition** or a **directive** (like `@once`); the option's text
and link are kept as the label and target; backticked code *after* the text,
and paragraphs following the option line, become its **effect** and its
**post-option text**.

The result is a small custom tree of `state` and `option` nodes, built with
[`unist-builder`](https://www.npmjs.com/package/unist-builder) so that it
benefits from the unist ecosystem's visitor utilities.

## 2. From the tree to Tzo bytecode

The compiler visits that tree with [`unist-util-visit`](https://www.npmjs.com/package/unist-util-visit)
and emits instructions into a flat program list, using Tzo's `Tokenizer` to
turn each snippet of backticked code into instructions.

Text nodes become `pushString` + `emit`. Inline code becomes the tokenized
instructions directly. Each state registers two positions in the program's
`labelMap`: one for the state itself, and one for its `__options` menu (used to
loop back to the options after an effect).

An option compiles to roughly this shape:

```
pushString "Order a drink"   ; the label, shown in the menu
ppc  4 +  {  ...effect...  } ; the effect body, entered when chosen
response                     ; register the choice with the player
```

Preconditions and the `@once` directive wrap the option in a conditional block:

```
...precondition code...  jgz  {  ...option...  }
```

The block delimiters `{` and `}` are real instructions: `jgz` (and `jz`) skip
the *next* instruction when their test passes, and `{` scans forward and jumps
past its matching `}`. So a precondition leaves a value on the stack; if it is
greater than zero the `jgz` skips the `{` and the option body runs, otherwise
the `{` jumps to the end of the block and the option is never offered. `@once`
works the same way, keyed on an internal `__once__N` context variable.

The whole document compiles to a **VMState**: the `programList`, the
`labelMap`, and the initial `context`, which is populated from
`initial-context` by a sequence of `setContext` instructions at the top of the
program.

## 3. Interpreting with QuestVM

[`QuestVM`](../reference/api.md) extends Tzo's `VM`. It registers the three
opcodes that make a conversation interactive:

- **`emit`** calls the host's text callback. A single state can emit several
  chunks — text, a number from `getContext`, more text — which is why a host
  typically concatenates them.
- **`response`** records the position of an option's effect body, along with
  its label, as a candidate choice.
- **`getResponse`** suspends the VM and hands the collected choices to the
  host. When the host returns the chosen option's id, the VM pushes the saved
  program position and resumes — executing that option's effect and following
  its `goto`/`exit`.

Because choices are only recorded inside their precondition blocks, options
that are hidden by preconditions never reach the host. The interpreter never
needs to know *why* an option is hidden; the compiled bytecode handles it.

## The two behaviours worth knowing about

- **No-link options.** When a chosen option has no link and no effect, the
  compiled code either jumps back to the state's `__options` label
  (`loopback_to_options`, the default) or exits the conversation (`exit`),
  depending on the header flag. With loopback, an option that is always
  available and always chosen will loop forever — which is correct, but can
  surprise new authors.
- **Persistence.** The compiled VMState is plain JSON. It can be written out
  and reloaded later, which is how the CLI's `--output`/`--no-run` flow works:
  compile once, ship the JSON, interpret it in a game or a web page without
  needing the compiler at runtime.

## See also

- [Why Questmark?](why-questmark.md) — the problem this design is answering.
- [Language reference](../reference/language.md) — what you can write.
- [Tzo](https://github.com/jorisvddonk/tzo) — the bytecode and VM Questmark
  is built on.
# Document tree and VMState

`parseMarkdown` returns two things:

```js
const { parsedMDFile, qvmState } = parseMarkdown(markdown);
```

`parsedMDFile` is the compiler's own tree, for tooling. `qvmState` is the
compiled bytecode, for a runtime. This page describes both shapes, so editors,
linters, and ports do not have to reverse-engineer them.

## The document tree

The root is a unist node:

```json
{
  "type": "questmarkDocument",
  "options": {
    "questmark-spec": "1.0",
    "initial-state": "start",
    "initial-context": { "coins": 3 }
  },
  "children": [
    {
      "type": "state",
      "name": "start",
      "options": [],
      "children": [
        {
          "type": "paragraph",
          "children": [
            { "type": "text", "value": "Hello.\n" },
            { "type": "inlineCode", "value": "exit" }
          ]
        }
      ]
    }
  ]
}
```

- `options` is the parsed options header, or `{}` when there is none.
- `children` of the root are `state` nodes, in document order.
- A `state` node has `name`, `children` (the state text, as mdast nodes), and
  `options` (the menu, as `option` nodes).
- State text keeps its Markdown structure: paragraphs, emphasis, inline code,
  and so on.

### Option nodes

An option is a compiler-built node:

```json
{
  "type": "option",
  "preconditionChildren": [
    { "type": "inlineCode", "value": "0 \"coins\" getContext gt" }
  ],
  "effectChildren": [
    { "type": "inlineCode", "value": "1 \"coins\" setContext" },
    { "type": "text", "value": "You go." }
  ],
  "text": "Go",
  "link": "#end",
  "directives": ["@once"]
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `text` | `string \| null` | The plain label. |
| `link` | `string \| null` | The target including `#`, or `null`. |
| `directives` | `string[] \| null` | For example `["@once"]`. |
| `preconditionChildren` | `Node[] \| null` | Code and nodes before the label. |
| `effectChildren` | `Node[] \| null` | Code and text after the label. |

`option` nodes are not part of standard mdast, so `unist-util-visit` does not
descend into `state.options` automatically. Iterate the array explicitly.

### Positions

The Markdown tree is stripped of positions before it is returned. The
compiler-built option children are an exception: their `position` fields are
preserved, which is useful for showing line numbers for precondition and
effect code.

If you need positions for the Markdown prose as well, parse the source yourself
with `mdast-util-from-markdown` instead of relying on `parsedMDFile`.

## The compiled state

`qvmState` is the JSON a runtime loads:

```json
{
  "type": "questmarkVMState",
  "stack": [],
  "context": {},
  "programList": [
    { "type": "push-number-instruction", "value": 3 },
    { "type": "push-string-instruction", "value": "coins" },
    { "type": "invoke-function-instruction", "functionName": "setContext" },
    { "type": "push-string-instruction", "value": "start" },
    { "type": "invoke-function-instruction", "functionName": "goto" },
    { "type": "push-string-instruction", "value": "Hello.\n" },
    { "type": "invoke-function-instruction", "functionName": "emit" },
    { "type": "invoke-function-instruction", "functionName": "exit" }
  ],
  "labelMap": { "start": 5, "start__options": 8 },
  "programCounter": 0,
  "exit": false,
  "pause": false
}
```

| Field | Meaning |
| --- | --- |
| `programList` | Flat instruction array. |
| `labelMap` | State names (and `<state>__options` labels) to instruction indices. |
| `stack`, `context` | Initial interpreter state; context is filled from `initial-context` at runtime. |
| `programCounter` | Start position, `0` at compile time. |
| `exit`, `pause` | Flags, both `false` at compile time. |

Instructions have one of three shapes:

```json
{ "type": "push-number-instruction", "value": 42 }
{ "type": "push-string-instruction", "value": "hello" }
{ "type": "invoke-function-instruction", "functionName": "emit" }
```

Extra fields such as `comment` on a push instruction are informational and
should be ignored by a runtime.

The first instructions install `initial-context` with `setContext` (when it is
present); the next two enter `initial-state` (when it is present). The program
ends with `exit`. Every state registers two labels: its name and
`<name>__options`, the latter used to loop back to the menu after an option
effect.

At runtime, `@once` adds `__once__N` keys to the context. They are not part of
the compiled state.

## Recipes

### Validate links

```js
const states = parsedMDFile.children.filter((node) => node.type === "state");
const names = new Set(states.map((state) => state.name));

for (const state of states) {
  for (const option of state.options ?? []) {
    if (option.link?.startsWith("#") && !names.has(option.link.slice(1))) {
      console.error(`${state.name}: missing link target ${option.link}`);
    }
  }
}
```

### Find options with preconditions

```js
for (const state of states) {
  for (const option of state.options ?? []) {
    if (option.preconditionChildren?.length) {
      console.log(state.name, option.text);
    }
  }
}
```

### Walk the Markdown text

Use `unist-util-visit` on a state's `children`, or on the whole tree for the
prose that is standard unist:

```js
import { visit } from "unist-util-visit";

visit(parsedMDFile, "inlineCode", (node) => {
  console.log(node.value);
});
```

This visits state text, not `option` children. Iterate `option` fields
separately when you need those.

## Header JSON schema

The options header has a JSON Schema:

[questmark-options.schema.json](/questmark/questmark-options.schema.json)

Use it in editors and CI to catch typos in `initial-context`, `options`, and the
behaviour flags. The schema allows unknown fields because the compiler ignores
them; tightening that is up to your tooling.

## Stability

The tree shape is exposed for tooling but follows the compiler, not a stable
portable spec. If you are writing a runtime, consume `qvmState` and the
[conformance cases](https://github.com/jorisvddonk/questmark/blob/master/test/conformance/README.md). If you are writing an
editor or analyzer, pin the `questmark` version you target and test against a
few documents.

## See also

- [How to implement a runtime](../how-to/implement-a-runtime.md)
- [Language reference](language.md)
- [API reference](api.md)

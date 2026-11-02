# Why a stack machine?

Questmark compiles to [Tzo](https://github.com/jorisvddonk/tzo), a stack-based
virtual machine, rather than interpreting Markdown directly or embedding a
general-purpose scripting language. That decision explains a lot of the
language's character — including why snippets look the way they do.

## The requirements

The runtime had to be:

- **small enough to embed** in a game or terminal;
- **portable** to languages other than TypeScript;
- **serialisable**, so a compiled document is a shippable asset;
- **inspectable**, so tooling and tests can see what will execute;
- **not a general-purpose language**, so documents do not turn into programs.

A stack machine with a flat instruction list is a good fit for all five. It is
also one of the easiest virtual machines to implement correctly: a stack, a
program counter, a context object, and a switch over opcodes.

## What Tzo actually is

Tzo has:

- a **stack** of strings and numbers;
- a **context** object of named values;
- a **program list** of instructions;
- a **label map** from names to program positions;
- a handful of flags (`exit`, `pause`).

The instruction set is small: arithmetic, comparisons, logic, context access,
jumps, blocks, `emit`, `exit`, and a few string utilities. There are no
functions, classes, modules, or user-defined types. A document can express
counters, flags, choices, and comparisons; it cannot express an application.

That is the point. The language is deliberately not powerful enough to become
the place where the game lives. The game lives in the host; Questmark decides
what to say next.

## Why a stack?

A stack machine maps naturally onto an expression tree. The compiler walks a
small AST and emits operands, then the operator:

```
3 10 -        push 3, push 10, subtract
"key" getContext emit
```

There is no register allocation, no calling convention, and no parser at
runtime. A port can implement the whole VM in a few hundred lines, which matters
when the target is C, Rust, GDScript, or a constrained engine.

The cost is readability. Reverse-Polish code is terse, and the top of the stack
is the first operand: `3 10 -` is `10 - 3`. This is the single most common
source of confusion. The [inspector](../playground.md) and the
[stack-hygiene tests](how-questmark-is-tested.md) exist because the project
would rather make the stack visible than pretend it is not there.

## Why bytecode instead of the Markdown AST?

You could compile Markdown and then walk the AST at runtime. Questmark does not,
for three reasons:

1. **The runtime should not need a Markdown parser.** A game engine should not
   ship a Markdown implementation, a compiler, or their bugs.
2. **State must be portable.** A VMState is a flat program plus context. It is
   easy to serialise, inspect, and load in another language. A tree-walking
   interpreter would need a serialised AST and a walker in every port.
3. **The contract is testable.** The conformance cases assert emitted text,
   menus, context, and stack. A flat instruction list makes those observations
   straightforward and language-independent.

The compiler and the runtime are therefore separate products. You can change
the Markdown parser without changing the VM; you can port the VM without
touching the parser.

## Why blocks and jumps?

Preconditions and `@once` could have been special opcodes with structured
arguments. Instead, the compiler lowers them to ordinary control flow:

```
...precondition...
jgz {
  ...the option...
}
```

`jgz` skips the `{`, and `{` scans to its matching `}`. Nesting works because
the braces are real instructions. This keeps the VM primitive: it does not need
to know what a precondition is, only how to skip a block.

The price is that the bytecode is less obvious to read than a syntax tree. The
`@once` bookkeeping and menu registration are compiler conventions, not VM
features. A port that reproduces the conventions gets the behaviour; it does not
need to reproduce the compiler's internals.

## Why not JavaScript (or Lua, or Python)?

Embedding a general-purpose language would make the runtime larger, harder to
port, and much harder to bound. It would also change the authoring culture:
documents would start to contain arbitrary logic, file paths, and dependencies.

Tzo can only manipulate its own stack and context. The only way out is an
explicit host hook (`_name`). That is a small, auditable boundary. It does not
make documents safe by itself — they can still loop forever or exhaust memory —
but it keeps the surface small. See [the trust model](trust-model.md).

## What it costs

| Benefit | Cost |
| --- | --- |
| Tiny, portable VM | Snippets are terse and operand order is easy to get wrong. |
| Flat, serialisable program | Bytecode is less readable than source; debugging needs tooling. |
| No runtime parser | The compiler is a separate dependency for authors. |
| Primitive control flow | Compiler conventions (`__options`, `response`, `@once`) must match across ports. |
| No general-purpose language | No functions, loop constructs, division, or rich data structures. |
| Deterministic structure | `randInt` is host-dependent; tests must account for it. |

None of these are accidents. They are the price of a runtime that fits in a
game, a terminal, and a browser without dragging a language runtime along.

## Could a port use a different representation?

Yes. The conformance corpus is defined in terms of observable behaviour, not the
JSON layout. A port can store bytecode in a compact binary form, or translate
the program into its own instruction set, as long as it reproduces the emitted
text, menus, context, and stack. The JSON VMState is the reference format and
the interchange format, not a requirement on internal representation.

## How to read a snippet

When you see:

```markdown
`2 "coins" getContext gt`
```

read it as:

1. push `2`;
2. push the string `"coins"`;
3. `getContext` pops the key and pushes its value;
4. `gt` pops the value and `2`, and pushes `value > 2`.

The value you care about is usually written **last**, because it ends up on top
of the stack and becomes the first operand. That is why preconditions read
`0 "gold" getContext gt` for `gold > 0`.

If a snippet is hard to read, check it in the inspector: run the document, open
**Inspect state**, and look at the stack and context at the menu.

## See also

- [How Questmark works](how-questmark-works.md) — the compilation pipeline.
- [The text contract](text-contract.md) — what the VM emits.
- [The trust model](trust-model.md) — why the VM is small and host-bounded.
- [How Questmark is tested](how-questmark-is-tested.md) — conformance and stack
  hygiene.
- [Language reference: Tzo code](../reference/language.md#tzo-code)

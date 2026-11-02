# Numbers, strings, and randomness

So far the code in backticks has been short: read a key, store a value, test a
condition. Underneath, every snippet is a program for **Tzo**, a small
stack-based virtual machine. This tutorial teaches the whole instruction set you
are likely to use: arithmetic, comparisons, string building, random numbers,
and the block instructions that let code skip itself.

You do not need to memorise it. The goal is to be able to read a snippet, and to
write one when the story needs it.

## 1. A stack, read right to left

Values go onto a **stack**. A number or string pushes itself; an opcode pops
what it needs and pushes its result. Code is written in reverse-Polish order:

```markdown
1 2 +
```

pushes `1`, pushes `2`, and `+` pops both and pushes `3`.

The important consequence: **operators take their first operand from the top
of the stack**. For a binary opcode written `x y op`, the result is `y op x`.
That does not matter for `+` and `*`, but it does for comparisons and
subtraction:

| You write | Result |
| --- | --- |
| `3 10 -` | `7` |
| `10 3 -` | `-7` |
| `3 10 gt` | `1` (10 > 3) |
| `10 3 gt` | `0` |

Put the value you care about **last** when you compare it. This is the same
reason `getContext` reads `"key" getContext`: the key is on top.

Play with it — every line emits its result:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "lab" }

# lab

Addition: `1 2 + emit`
Subtraction: `3 10 - emit`
Multiplication: `2 5 * emit`
Greater than: `3 10 gt emit`
Less than: `3 10 lt emit`
Equality: `7 7 eq emit`
Not: `0 not emit`
And: `1 0 and emit`
Or: `1 0 or emit`
Numbers print too: `42 emit`

* [Leave the lab](#end)

# end

The instruments power down.
`exit`
```

The stack is shared by the whole program, so **balance it**. Every value you
push should be consumed, and every effect should leave a predictable stack. A
single stray value can change a later precondition, because that is what the
next `jgz` will pop.

## 2. Arithmetic for game state

The arithmetic opcodes are `+` (or `plus`), `-` (or `min`), and `*` (or `mul`).
There is no division or modulo. For counters, the order is forgiving because
addition is commutative:

```markdown
`1 "coins" getContext + "coins" setContext`
```

That is "coins = coins + 1". To spend coins, subtract with the amount first:

```markdown
`2 "coins" getContext - "coins" setContext`
```

That is "coins = coins - 2", because `2` is pushed first and `coins` is on top
when `-` runs.

A worked example:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "stall",
      "initial-context": { "coins": 5, "apples": 0 }
    }

# stall

An apple stall. You have `"coins" getContext emit` coins and
`"apples" getContext emit` apples.

* `0 "coins" getContext gt` Buy an apple `1 "coins" getContext - "coins" setContext` `1 "apples" getContext + "apples" setContext`

  The stallholder drops an apple into your bag.

* Eat an apple `0 "apples" getContext gt` `1 "apples" getContext - "apples" setContext`

  You eat an apple. It is sharp and sweet.

* [Leave](#leave)

# leave

You walk home with `"apples" getContext emit` apples.
`exit`
```

Notice that buying is gated on having a coin. Without the
`0 "coins" getContext gt` precondition you could buy on credit and drive the
balance negative; Questmark does not stop you.

## 3. Strings

Strings are written in double quotes. String context values work exactly like
numbers. Two opcodes join strings:

- `concat` joins the top value onto the **front**: `"a" "b" concat` → `"ba"`.
- `rconcat` joins the top value onto the **back**: `"a" "b" rconcat` → `"ab"`.

Use `rconcat` when you want the order you read:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "desk",
      "initial-context": { "name": "Ada", "title": "Mapmaker" }
    }

# desk

A name plate reads:

`"Hello, " "name" getContext rconcat " is a " rconcat "title" getContext rconcat emit`

* [Turn the plate over](#back)

# back

The back is blank.
`exit`
```

Read the snippet from left to right: push `"Hello, "`, append the name, append
`" is a "`, append the title, emit. Each `rconcat` takes the value on top and
adds it to the end of the string underneath.

The `charCode` opcode turns a code point into a one-character string:

```markdown
`65 charCode emit`
```

That emits `A`. That makes it possible to generate letters:

```markdown
`65 3 randInt + charCode emit`
```

which emits `A`, `B`, or `C`.

## 4. Randomness

`randInt` takes a maximum and pushes a random integer from `0` up to but not
including that maximum. To roll a six-sided die you need to add one:

```markdown
`6 randInt 1 + emit`
```

Randomness is read at the moment the code runs. An option's effect runs when
the player picks it, so an effect can roll a fresh result each time it is
chosen:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "chest",
      "initial-context": { "roll": 0 }
    }

# chest

A chest with a heavy combination lock. Above it, a sign reads: "Nine or better."

* Roll the dice `6 randInt 1 + 6 randInt 1 + "roll" setContext`

  You roll `"roll" getContext emit`.

* `8 "roll" getContext gt` [Open the chest](#chest-open)

* `9 "roll" getContext lt` You try the latch, but it does not budge.

* [Walk away](#away)

# chest-open

The latch clicks. Inside is a folded map and a handful of silver.
`exit`

# away

You leave the chest for someone with better luck.
`exit`
```

A roll of nine or more opens the chest. Because the roll option returns to the
same menu, you can keep rolling; the "does not budge" option has no link and no
effect, so it also loops back. The default `loopback_to_options` behaviour is
what makes this work.

`randInt` is only as random as the host's `Math.random`. Do not use it for
anything that needs to be reproducible.

## 5. Blocks: skipping code

`jgz` and `jz` are the conditional jumps. Each pops one number and skips the
**next instruction** when its test passes. Combined with the block delimiters
`{` and `}`, that lets you guard a piece of code:

```markdown
`"torch" hasContext jgz { "The torch burns steadily." emit }`
```

Read it as: if `hasContext(torch)` is positive, skip the `{` and run the body;
otherwise the `{` scans forward to its matching `}` and jumps past it. The `}`
at the end is what makes the scan possible — blocks are real instructions, not
punctuation.

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "cave",
      "initial-context": { "torch": 0 }
    }

# cave

You step into the cave.

`"torch" hasContext jgz { "The torch pushes the dark back to the walls." emit }`
`"torch" hasContext not jgz { "Without a torch, the dark is complete." emit }`

* Light a torch `1 "torch" setContext`

  You strike a match.

* [Feel your way out](#out)

# out

You escape into daylight.
`exit`
```

There is no special `if`/`else` instruction. To make alternatives, guard the
second block with `jz` on the **same** condition: `jz` runs its block when the
value is zero, so the two bodies never overlap.

```markdown
`"torch" hasContext jgz { "The torch burns." emit }`
`"torch" hasContext jz { "It is dark." emit }`
```

`pause` is the other unusual instruction: it suspends the VM without ending it,
leaving the host to resume later. The built-in choice machinery uses it
internally; documents rarely need it.

## 6. Host hooks: opcodes that start with `_`

An unknown opcode is a runtime error. The exception is names beginning with an
underscore: they compile, and the VM treats them as no-ops unless the host
registers a function with that name. This is the extension point for games:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "inn" }

# inn

* Order a drink `_recordDrink` The innkeeper pours.

* [Leave](#end)

# end

You step out into the rain.
`exit`
```

The playground has no `_recordDrink` function, so nothing happens. A game
embedding Questmark can register one and trigger an animation, a sound, or an
achievement. Hook arguments should travel through the context, not the stack:
hooks leave the stack exactly as they found it, so the document behaves the
same whether or not the host registered the hook. See
[embed Questmark in your application](../how-to/use-the-library.md#custom-opcodes).

## 7. A complete random scene

This scene combines a die roll, context, a block guard, and a one-off action:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "road",
      "initial-context": { "luck": 0 }
    }

# road

A fork in the road. A crow watches from a fence post.

`1 "luck" getContext gt jgz { "You feel strangely confident." emit }`

* Toss a coin for luck `3 randInt "luck" setContext`

  The coin lands. You call it luck.

* `1 "luck" getContext gt` [Take the overgrown path](#path)

* [Take the main road](#main)

# path

The path is shorter than it looks. You arrive before nightfall.
`exit`

# main

The main road is crowded, but you arrive safely.
`exit`
```

Every run can go differently: with luck 2 or higher the confident line appears,
and the overgrown path opens.

## Recap

- Code is reverse-Polish and runs on one shared stack.
- Binary opcodes take their first operand from the top; put the important value
  last.
- `+`, `-`, `*` handle numbers; there is no division or modulo.
- `concat` and `rconcat` build strings; `charCode` turns a code point into text.
- `randInt` returns `0..max-1`.
- `jgz`, `jz`, `{`, and `}` guard blocks of code.
- `_name` opcodes are host hooks and silently do nothing when unregistered.

## Where to next

- [Control how text is emitted](control-text-output.md) — paragraphs, comments,
  and the header flags that change output.
- [Build a text adventure](text-adventure.md) — put all of it together.
- [Language reference: Tzo code](../reference/language.md#tzo-code) — the
  complete opcode table.

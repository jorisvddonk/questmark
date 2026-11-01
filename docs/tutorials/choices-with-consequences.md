# Choices with consequences

A choice is more than a link. It can change the world, show a reply, disappear
after it has been used, or end the story. This tutorial covers everything you
can put on an option line and what the interpreter does with it.

## 1. The shape of an option

Every option is an unordered list item under a state's text:

```markdown
* `@once` `"gold" getContext 0 gt` [Buy the map](#market) `0 "gold" setContext`

  The merchant rolls up the map and hands it over.
```

Read from left to right:

| Part | Example | Purpose |
| --- | --- | --- |
| directive | `@once` | Behaviour flags for the option. |
| precondition | `"gold" getContext 0 gt` | Offer the option only when this leaves a positive number. |
| label | `[Buy the map](#market)` | The text shown in the menu. |
| link | `(#market)` | The state to jump to when chosen. |
| effect | `0 "gold" setContext` | Code that runs when chosen. |
| post-option text | The indented paragraph | Text emitted when chosen. |

Only the label is required. Everything else is optional.

## 2. Effects run when the option is chosen

Backticked code **after** the option's label is its effect. Effects are how
choices change the context. An option with an effect but no link returns to the
same state's menu, so you can build "do a thing, then choose again" loops:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "yard",
      "initial-context": { "polish": 0 }
    }

# yard

Your shield is dull. It has `"polish" getContext emit` coats of polish on it.

* Polish the shield `1 "polish" getContext + "polish" setContext`

  You work the cloth in circles. It comes away black.

* `2 "polish" getContext gt` [Show the captain](#captain)

* [Leave it dull](#leave)

# captain

The captain turns the shield to the light. "That will do," she says.
`exit`

# leave

You leave the shield on the rack.
`exit`
```

Choose "Polish the shield" three times. Each time you return to the same menu,
and after the third polish the "Show the captain" option appears. That is the
`loopback_to_options` default at work.

## 3. Post-option text is the reply

Text below an option line — indented or not, as long as it follows the option —
is emitted **when that option is chosen**, not when the menu is built. Use it
for the immediate consequence of a choice:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "desk",
      "initial-context": { "read": 0 }
    }

# desk

A sealed letter sits on the desk.

* Open the letter `1 "read" setContext`

  The seal cracks. Inside, your sister writes that the harvest failed and the
  village needs money by winter.

* `1 "read" getContext eq` [Send money](#send)

* [Leave the letter sealed](#leave)

# send

You sit down and write a reply, enclosing everything you have.
`exit`

# leave

You put the letter back where you found it.
`exit`
```

The paragraph under "Open the letter" is part of that option. It disappears
from the source of the menu and only exists after the choice is made.

## 4. `@once` removes an option after use

Marking an option `@once` makes it appear only until it is chosen. This is the
natural way to model "read the notice", "ask about the weather", or any other
one-off action that leaves the player in the same scene:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "camp",
      "initial-context": { "sharpened": 0 }
    }

# camp

A waystation at dusk. A notice is nailed to the post.

* `@once` Read the notice

  "North road closed until the thaw. Take the ferry."

* `@once` `0 "sharpened" getContext eq` Sharpen your knife `1 "sharpened" setContext`

  You spend a quiet minute working the blade.

* `1 "sharpened" getContext eq` [Sleep](#sleep)

# sleep

You sleep until the ferryman wakes you at dawn.
`exit`
```

The second option combines a directive with a precondition. Both must pass:
the option must not have been used yet, **and** `sharpened` must still be `0`.
The third option demonstrates the flip side — once the knife is sharpened it is
no longer offered, so the menu changes as the context does.

**Careful:** directives and preconditions share the space before the label,
which is why the directive comes first. `@once` never touches the context
directly; it uses an internal `__once__N` key that you should not reuse.

**One span, one test.** A precondition is a single piece of code. If you write
two backticked preconditions, both run but the menu only looks at the top of
the stack, and the leftover value leaks. Combine tests inside one span with
`and` / `or`:

```markdown
`0 "map" getContext eq 3 "gold" getContext gt and`
```

## 5. Options that leave the scene: links and `goto`

A link after the label jumps to another state:

```markdown
* [Go north](#north)
```

Sometimes you want to jump from **code** instead, because the destination
depends on a condition. The `goto` opcode jumps to a state by label:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "crossroads"
    }

# crossroads

Two routes lead east: the road, and a gap in the hedge.

* Learn a secret `1 "secret" setContext`

  You notice a trail of fresh mud leading into the hedge.

* `"secret" hasContext` Take the smuggler's path `"tunnel" goto`

* [Take the road](#road)

# tunnel

You squeeze through the hedge and follow the trail to a hidden clearing.
`exit`

# road

The road is long but safe.
`exit`
```

Note the ordering trap: the effect `"tunnel" goto` runs **before** any
post-option text in the same list item, because the code comes first. If you
want a description of the tunnel, put it in the target state, not under the
option.

## 6. Ending the story

There are three ways a conversation can end:

- the state's code runs `exit`,
- the player chooses an option whose effect runs `exit`, or
- the header sets `options.no_link_behaviour` to `"exit"`, and the player
  chooses an option with neither a link nor an effect.

The last one is useful for documents where every option is terminal. Compare it
with the default, which returns to the menu:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "oracle",
      "options": { "no_link_behaviour": "exit" }
    }

# oracle

The oracle waits, eyes closed.

* Ask about the harvest

  "There will be rain," she says, "and then there will not."

* Ask about the road

  "It will take you where you are going."

* [Leave without asking](#leave)

# leave

You bow and leave the oracle to her silence.
`exit`
```

With `"loopback_to_options"` (the default), the first two options would return
to the oracle's menu. With `"exit"` they end the conversation immediately. Use
whichever matches the scene.

## 7. Keep labels plain

Option labels are stored as plain text. Markdown inside a label is not
interpreted the way it is in paragraph text, and some constructs break the
document. The safe rules are:

- **Do:** use plain words, punctuation, emoji, quotes, and dashes.
- **Do:** use `[Label](#state)` when the label itself is the link.
- **Don't:** put `**bold**`, `*italic*`, or backticked code inside a label.
  Emphasis nodes are not part of the label and can make the compiler throw.
- **Don't:** nest a list under an option. Post-option paragraphs are fine;
  nested list items are not.

## 8. Put it together

This small scene uses an effect, a precondition, a `@once` option, a reply, and
two endings:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "shop",
      "initial-context": { "gold": 3, "map": 0 }
    }

# shop

A cramped map shop. The shopkeeper watches you over his glasses.
You have `"gold" getContext emit` gold.

* `@once` Ask about the ruins

  "Dangerous," he says. "The east gate is the only way in."

* `0 "map" getContext eq 3 "gold" getContext gt and` Buy the map `2 "gold" getContext - "gold" setContext` `1 "map" setContext`

  He rolls it up and taps the east gate with a fingernail.

* `1 "map" getContext eq` [Leave for the ruins](#ruins)

* [Leave without a map](#street)

# ruins

With the map, you find the east gate before dark.
`exit`

# street

You wander the streets until the shops close.
`exit`
```

Notice that the "Buy the map" precondition is `map == 0` **and**
`gold > 3` (it needs four gold, and you start with three). The price is then
deducted by subtracting two from `gold`. Try changing the starting gold to
`5` and see the option appear.

## Recap

- Effects are backticked code after the label; they run when the option is
  chosen.
- Post-option text is the immediate reply.
- `@once` hides an option after it has been used.
- Links jump on choice; `goto` jumps from code.
- `no_link_behaviour` decides what happens to options with no link or effect.
- Labels are plain text.

## Where to next

- [Numbers, strings, and randomness](numbers-strings-and-randomness.md) —
  arithmetic, comparisons, and dice.
- [Write a branching dialogue](branching-dialogue.md) — a full conversation
  with topics that come and go.
- [Language reference: options](../reference/language.md#options) — the formal
  description.

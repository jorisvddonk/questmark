# Write a branching dialogue

Conversation trees are Questmark's home turf. This tutorial builds one properly:
a hub-and-spoke dialogue with topics that appear and disappear, a relationship
value that gates personal questions, and several ways for the conversation to
end.

## 1. The hub-and-spoke shape

Most dialogue is not a linear chain. It is a **hub** — the thing the character
is doing right now — with **spokes** the player can explore in any order. The
player returns to the hub after each spoke.

In Questmark, the hub is a state, and the spokes are options. The simplest way
to return is to give a topic no link: an option with no link and no effect
loops back to the same state's menu by default. Add `@once` and the topic
disappears after it has been discussed, so the conversation narrows as it goes:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "fire" }

# fire

An old soldier stares at the fire and does not look up.

* `@once` Ask about the war

  "Which one?"

* `@once` Ask about the road ahead

  "Mud, until the hills. Then more mud."

* [Leave him to the fire](#end)

# end

You leave the fire crackling behind you.
`exit`
```

Each topic's reply is **post-option text**: it is emitted after the choice, then
the menu is rebuilt without that topic. This pattern — `@once` topic + reply
paragraph — is the workhorse of dialogue-heavy games.

## 2. Gate topics on trust

A relationship value is just another context variable. Raise it when the player
shows interest, and gate personal topics on it:

```markdown
* `@once` Ask about the crossing `1 "trust" getContext + "trust" setContext`

  "Water's high. Might be the last crossing this season."

* `1 "trust" getContext gt` `@once` Ask why she left the capital

  She is quiet for a moment. "There was nothing left there for me."
```

The order inside the backticks matters in the same way as before: preconditions
and directives come before the label, effects come after it. Here the effect
raises trust by one, and the personal topic is offered once trust is greater
than one — after at least two other topics.

Remember that multiple backticked preconditions are **not** combined
automatically. If a topic needs both a trust threshold and a flag, write one
span that ends in a single value:

```markdown
`1 "trust" getContext gt "met_mira" hasContext and`
```

## 3. A full conversation

Here is the whole pattern in one document. Mira runs the ferry, and whether she
tells you the truth depends on how you treated her:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "dock",
      "initial-context": { "trust": 0, "silver": 5 }
    }

# dock

Mira leans on a pole at the end of the dock. A flat-bottomed ferry tugs at its
rope behind her.

"Crossing's five silver," she says. "Or a good conversation."

* `@once` [Ask about the crossing](#crossing) `1 "trust" getContext + "trust" setContext`

* `@once` [Ask about the ferry](#ferry) `1 "trust" getContext + "trust" setContext`

* `1 "trust" getContext gt` `@once` [Ask why she left the capital](#capital) `1 "trust" getContext + "trust" setContext`

* `1 "trust" getContext gt` [Ask for passage](#passage)

* [Offer five silver](#pay) `0 "silver" setContext`

* [Walk away](#leave)

# crossing

"Water's high," she says. "This might be the last crossing before the thaw.
After that, you wait or you swim."

* [Ask something else](#dock)

# ferry

She knocks a knuckle against the hull. "Built her myself, out of a barn and a
lot of stubbornness. She'll float until she doesn't."

* [Ask something else](#dock)

# capital

She looks at the water rather than at you. "I had a shop. Then a fire. Then a
debt. The order doesn't matter much any more."

* [Ask something else](#dock)

# passage

She watches you for a long moment.

`2 "trust" getContext gt jgz { "“All right,” she says at last. “Get in. No charge. But you owe me the truth about why you're crossing.”" emit }`
`2 "trust" getContext gt jz { "“Five silver,” she says, holding out her hand. “I don't know you well enough for charity.”" emit }`

* [Pay her](#pay)

* [Tell her the truth](#truth)

# pay

You count five silver into her palm. She nods, unties the rope, and poles the
ferry into the current.
`exit`

# truth

You tell her everything. She listens without interrupting, then steps aside and
holds the rope steady.
`exit`

# leave

You leave her to the river.
`exit`
```

Play it more than once. The topics you ask about change what she says at the
passage, and the ending depends on how much she trusts you.

Note the two guard blocks in `passage`: the first emits the friendly line when
trust is above two, and the second emits the businesslike line when it is not.
Both use `jgz`/`jz` with a `{ ... }` body, so neither line can leak into the
other case.

## 4. Topics with their own state

Not every reply belongs in a paragraph under the option. A topic that needs
sub-choices — asking a follow-up question, showing an item, arguing — should
jump to its own state and offer a way back:

```markdown
* `@once` [Ask about the cargo](#cargo) `1 "trust" getContext + "trust" setContext`

# cargo

She lifts a corner of the tarpaulin. Underneath are six crates stamped with a
city seal that has been scratched out.

"Salvage," she says. "Mostly."

* [Ask where it came from](#cargo-origin)
* [Say nothing](#dock)
```

This is the same hub-and-spoke shape one level deeper. Keep a link back to the
hub state on every spoke, or the player can get stranded.

## 5. Endings

A dialogue can end in as many ways as you like. The reliable options are:

- **A terminal state.** The state's code runs `exit`; the player sees the final
  text and the conversation stops.
- **A terminal option.** An option's effect runs `exit` without a link.
- **Context-driven endings.** Gate the options that lead to an ending on
  context values, and give the player a neutral way out.

For a conversation, it is worth making the ending text reflect the path taken.
The trust value in the example does exactly that at `passage`, then hands off to
one of three final states.

## 6. Common mistakes

- **A topic that never disappears.** Without `@once`, an option with no link
  loops back forever and the player can repeat it. That can be intentional for
  "look around" actions, but it is usually noise in a conversation.
- **A spoke with no way back.** Every state that a topic jumps to needs a link
  back to the hub, or a terminal `exit`.
- **Trust checks in the wrong order.** `1 "trust" getContext gt` means
  `trust > 1`, not `trust >= 1`. With integer values, "at least 2" is
  `1 "trust" getContext gt`.
- **Reading a flag that might not exist.** Use `hasContext` for optional keys,
  or initialize them in `initial-context`.

## Recap

- A hub state with `@once` topics and post-option replies makes a clean
  conversation tree.
- Raise and check a relationship variable to gate personal topics.
- Use separate states when a topic needs sub-choices, and link back to the hub.
- End with terminal states whose text reflects the context.

## Where to next

- [Build a text adventure](text-adventure.md) — the room-and-inventory
  capstone.
- [Choices with consequences](choices-with-consequences.md) — revisit effects,
  `@once`, and `no_link_behaviour`.
- [Language reference: options](../reference/language.md#options) — every
  option form in one table.

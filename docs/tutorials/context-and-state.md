# Remember what the player did

In the [first tutorial](first-conversation.md) the barkeep asked a question and
forgot the answer immediately. Real conversations don't work like that: people
remember what you said, what you did, and what you carry. Questmark calls that
memory the **context**.

This tutorial teaches you to initialize it, read it, change it, test it, and
remove it. Every section ends with a complete document you can play right here.

## 1. The context is a bag of variables

The context is a set of named values that lives for the whole play session. A
value is either a **number** or a **string**. You initialize it in the
document's options header:

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "gate",
      "initial-context": { "name": "Traveller", "coins": 7 }
    }
```

`initial-context` is applied before the first state runs, so every state can
read those values safely.

## 2. Read a value with `getContext`

`getContext` takes a key from the top of the stack and pushes its value.
Inside a paragraph, wrap it in backticks and follow it with `emit` to show the
value to the player:

```markdown
You have `"coins" getContext emit` coins.
```

Try it:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "gate",
      "initial-context": { "name": "Traveller", "coins": 7 }
    }

# gate

A guard looks up from a ledger. "Name?" she asks.
"`"name" getContext emit`," you say.
She counts something under her breath. "And `"coins" getContext emit` coins.
That's a start."

* [Ask about the road](#road)

# road

"North road is washed out," she says. "South road goes to the market."
* [Thank her](#end)

# end

You step through the gate.
`exit`
```

Notice that `getContext` **throws** if the key does not exist. That is why
`name` and `coins` are initialized up front. If a key is optional, test for it
with `hasContext` (section 5) before reading it.

## 3. Change a value with `setContext`

`setContext` takes a value and a key, and stores the value. Read the stack from
the key downwards: the **key is on top**, the value underneath. So storing `1`
under `wood` is:

```markdown
`1 "wood" setContext`
```

A counter is the most common pattern: read the old value, add one, store the
result.

```markdown
`1 "wood" getContext + "wood" setContext`
```

Play this foraging loop. The "Light the fire" option only appears once you have
enough wood, because its precondition reads the same variable:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "camp",
      "initial-context": { "wood": 0 }
    }

# camp

A cold camp site. You have `"wood" getContext emit` bundles of wood.

* Gather wood `1 "wood" getContext + "wood" setContext`

  You add a dry branch to your pack.

* `2 "wood" getContext gt` Light the fire `0 "wood" setContext`

  The fire catches. You sit by it until the sun comes up.

* [Sleep in the cold](#sleep)

# sleep

You wake up stiff and cold.
`exit`
```

This is the single most important idiom in Questmark: **the same context key
drives both what the player sees and which options exist**.

## 4. Preconditions test the context

Backticked code **before** an option's text is a precondition. Questmark runs
it while building the menu and offers the option only if the code leaves a
positive number on the stack.

The comparison order matters. Tzo operators take their **first operand from the
top of the stack**, so if you push a number and then read a variable, the
comparison reads the variable first:

| You write | It means |
| --- | --- |
| `0 "gold" getContext gt` | `gold > 0` |
| `2 "wood" getContext gt` | `wood > 2` |
| `0 "gold" getContext eq` | `gold == 0` |
| `3 "wood" getContext lt` | `wood < 3` |

Put the constant on the left of a comparison when you want to compare the
variable from the right. (Addition and multiplication are commutative, so the
order doesn't matter there.)

## 5. Test for presence with `hasContext`

`hasContext` pushes `1` if the key exists and `0` if it does not. It lets you
use a key as a flag without initializing it, and it never throws:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "cellar"
    }

# cellar

A dark cellar. A lamp hangs by the stairs.

* `"lamp" hasContext not` Take the lamp `1 "lamp" setContext`

  You unhook the lamp. The cellar brightens.

* `"lamp" hasContext` [Descend the stairs](#stairs)

* `"lamp" hasContext not` [Descend in the dark](#dark)

# stairs

At the bottom you find a crate of apples.

* [Take the apples and leave](#outside)

* [Go back up](#cellar)

# outside

You carry the crate up into the daylight and do not come back.
`exit`

# dark

You feel your way down the stairs, miss the last step, and land badly.
`exit`
```

Because `lamp` was never initialized, `hasContext` is the only safe way to ask
about it. Reading it with `getContext` before taking the lamp would be an error.

## 6. Remove a value with `delContext`

`delContext` removes a key. Use it when a thing is consumed: a potion drunk, a
key used up, a status effect cleared.

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "cell",
      "initial-context": { "potions": 1, "health": 2 }
    }

# cell

Your health is `"health" getContext emit` and a half-empty potion sits on the
floor.

* `"potions" hasContext` Drink the potion `2 "health" getContext + "health" setContext` `"potions" delContext`

  Warmth spreads through your chest. The bottle is empty.

* [Rest](#rest)

# rest

You rest until morning.
`exit`
```

The effect line is read left to right: raise health, then delete the potion
key. Because the option's precondition is now false, it disappears — a consumed
item behaves exactly like a flag that is no longer set.

## 7. Combine conditions with logic

The standard logical opcodes are `and`, `or`, and `not`. They work on numbers,
where `0` is false and anything non-zero is true. This example offers a way
past the guard when the player has paid **or** taken the key:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "gate",
      "initial-context": { "gold": 5 }
    }

# gate

A guard blocks the gate. "Entrance is five gold," he says, "or a key."

* Pay the guard `0 "gold" setContext` `1 "paid" setContext`

  You hand over the coins.

* Take the key from the hook `1 "key" setContext`

  You lift the key from the hook while he is looking away.

* `"paid" hasContext "key" hasContext or` [Show the guard your proof](#pass)

* [Walk away](#leave)

# pass

The guard steps aside.
`exit`

# leave

You turn back.
`exit`
```

`or` pops the top value first: the precondition is
`hasContext(key) or hasContext(paid)`.

## Recap

You can now:

- initialize context values in the options header,
- read them with `getContext` and show them with `emit`,
- change them with `setContext`,
- hide options with preconditions,
- test for presence with `hasContext` and remove values with `delContext`,
- combine conditions with `and`, `or`, and `not`.

## Where to next

- [Choices with consequences](choices-with-consequences.md) — effects,
  `@once`, and options that don't leave the state.
- [Numbers, strings, and randomness](numbers-strings-and-randomness.md) — the
  full Tzo stack, arithmetic, and dice.
- [Language reference: context](../reference/language.md#context) — the formal
  rules.

# Cookbook: common patterns

Copy-paste recipes for the situations that come up again and again. Each
recipe is small enough to adapt; the [tutorials](../tutorials/first-conversation.md)
explain the ideas in depth.

## A hub with one-off topics

The basic conversation shape: a state, `@once` topics with post-option replies,
and a way out.

```markdown
# fire

An old soldier stares at the fire.

* `@once` Ask about the war

  "Which one?"

* `@once` Ask about the road

  "Mud, until the hills."

* [Leave](#end)

# end

You leave the fire behind.
`exit`
```

## A counter

```markdown
* Gather wood `1 "wood" getContext + "wood" setContext`
```

Show it in prose with `` `"wood" getContext emit` ``.

## A flag (item, door, event)

```markdown
* Take the lamp `1 "lamp" setContext`
* `"lamp" hasContext` [Descend the stairs](#stairs)
* `"lamp" hasContext not` [Descend in the dark](#dark)
```

Never initialize a flag that you test with `hasContext`; absence is the initial
state.

## A consumable

Decrement the count, and gate the option on having one:

```markdown
* `0 "potions" getContext gt` Drink a potion `1 "potions" getContext - "potions" setContext`

  You feel better.

* `0 "potions" getContext gt` [Fight the troll](#troll)

* [Run away](#run)
```

If you want the key gone once the count hits zero, delete it in a guarded
block:

```markdown
`0 "potions" getContext eq jgz { "potions" delContext }`
```

## Two conditions at once

Combine them inside **one** backticked span with `and` / `or`. Two separate
preconditions leave stray values on the stack.

```markdown
* `0 "map" getContext eq 3 "gold" getContext gt and` Buy the map
* `"paid" hasContext "key" hasContext or` [Show the guard your proof](#pass)
* `"lamp" hasContext not` [Enter the dark](#dark)
```

## A limited number of actions

Use a counter and a precondition:

```markdown
* `3 "searched" getContext lt` Search the room `1 "searched" getContext + "searched" setContext`
```

After three searches the option disappears.

## A random table

Roll once, store the result, then let mutually exclusive guards branch on it:

```markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "road",
      "initial-context": { "coins": 0, "searches": 0 }
    }

# road

A quiet road. Something glints in the ditch.

* `3 "searches" getContext lt` Search the ditch `1 "searches" getContext + "searches" setContext` `4 randInt "roll" setContext`

  `0 "roll" getContext eq jgz { 2 "coins" getContext + "coins" setContext "Two silver coins." emit }`
  `1 "roll" getContext eq jgz { 1 "coins" getContext + "coins" setContext "A silver coin." emit }`
  `2 "roll" getContext eq jgz { "A brass button. Worthless." emit }`
  `3 "roll" getContext eq jgz { "A boot with no owner." emit }`

* [Move on](#end)

# end

You move on with `"coins" getContext emit` coins.
`exit`
```

The guards are mutually exclusive because each tests a different value, not
because execution stops after the first match.

## A dice check

```markdown
# chest

A lock with a sign: "Nine or better."

* Roll the dice `6 randInt 1 + 6 randInt 1 + "roll" setContext`

  You roll `"roll" getContext emit`.

* `8 "roll" getContext gt` [Open the chest](#open)
* `8 "roll" getContext lt` The lock holds.
* [Walk away](#away)
```

`8 "roll" getContext gt` means `roll > 8`, which is nine or better.

## Conditional text

```markdown
`"torch" hasContext jgz { "The torch lights the way." emit }`
`"torch" hasContext jz { "It is too dark to see." emit }`
```

Use `jz` with the same condition for the else branch. Two `jgz` blocks would
both be able to run.

## Multiple endings

Gate the ending options on context, and always leave a neutral exit:

```markdown
* `2 "trust" getContext gt` [Ask for passage](#ending-free)
* [Pay the fare](#ending-paid)
* [Walk away](#ending-leave)

# ending-free
She waves you aboard.
`exit`

# ending-paid
The coins change hands.
`exit`

# ending-leave
You turn back.
`exit`
```

## Jump without showing a menu

An effect can take over from a link:

```markdown
* `"secret" hasContext` Take the hidden path `"tunnel" goto`
```

Effects run before post-option text, so put the description in the target
state.

## Finish on a statement

`options.no_link_behaviour` is `"loopback_to_options"` by default. For a
document where every option is terminal, set it to `"exit"`:

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "oracle",
      "options": { "no_link_behaviour": "exit" }
    }
```

Now an option with no link and no effect ends the conversation after its reply.

## Print a debug value

```markdown
DEBUG trust=`"trust" getContext emit` has_key=`"key" hasContext emit`
```

Delete the line when you are done. A host hook (`_logState`) is the tidier
option if you need it to stay.

## Add a host hook

```markdown
* Open the door `_playDoorSound` The door creaks open.
* Pick up the lamp `1 "lamp" setContext` `"lamp" "pending_item" setContext _giveItem` You take the lamp.
```

Register `_playDoorSound` / `_giveItem` in `additionalFunctions`; unregistered
hooks are silent no-ops, so the document still plays in the playground.
Hooks must leave the stack unchanged — read arguments from the context
(`context.pending_item` above), not by popping the stack.
See [embed Questmark](use-the-library.md#custom-opcodes).

## See also

- [Tutorials](../tutorials/first-conversation.md) — the same patterns explained.
- [Language reference](../reference/language.md) — exact rules.
- [Cheat sheet](../reference/cheatsheet.md) — one-page summary.

# Design patterns for quests and dialogue

The [cookbook](recipes.md) covers primitives: counters, flags, consumables,
random tables. This page is about the shapes those primitives form in a real
quest or conversation. Each pattern is small enough to adapt.

## 1. A multi-stage quest

Store the stage in the context and gate each step on it. The same key drives
the quest text, the available options, and the ending.

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "village",
      "initial-context": { "stage": 0 }
    }

# village

The elder waits by the well.

* `0 "stage" getContext eq` [Find the smith](#smith) `1 "stage" setContext`
* `1 "stage" getContext eq` [Return to the elder](#elder)
* [Leave the village](#leave)
```

Each step's option sets the next stage. The next option appears only when the
stage is right, so the player cannot skip ahead. If a step can fail, add a
stage for failure (`"stage": -1`) or a separate flag.

Rules of thumb:

- Use one stage key per quest, not one flag per step.
- Give every stage a visible next action; a stage with no options is a dead end
  unless it ends the quest.
- Keep stage transitions in effects, not in prose.

## 2. Reputation tiers

A single number with thresholds is easier to reason about than a pile of
booleans:

```markdown
* `2 "trust" getContext gt` [Ask for the truth](#truth)
* `5 "trust" getContext gt` [Ask for the secret](#secret)
```

| Trust | What the player can ask |
| --- | --- |
| 0–2 | Small talk, directions |
| 3–5 | Personal history |
| 6+ | The secret |

Raise trust on meaningful choices, and show it in prose only when the player
should notice it. If trust can go down, clamp it at zero with a guarded block
or accept negative values and use lower thresholds.

## 3. Companion approval

When two characters must both agree, combine the tests in one span:

```markdown
* `2 "trust_mira" getContext gt 3 "trust_kael" getContext gt and` [Propose the plan](#plan)
```

`and` pops the second test and then the first; both must be non-zero. Do not
write two separate backticked preconditions — only the top result is checked,
and the leftover value leaks onto the stack.

## 4. Knowledge-gated conversation topics

Use flags for things the player learned, then offer topics based on them. This
keeps a hub from repeating itself while still allowing follow-up questions:

```markdown
# harbour

* `@once` Ask about the ferry

  "She runs at dawn, if the wind holds."

* `"met_mira" hasContext` `@once` Ask about Mira

  "Mira? She built that boat herself."

* `"knows_smuggler" hasContext` [Confront Mira](#confront)
```

Set `met_mira` when the player actually meets her, not when a topic is
mentioned. Flags are cheap; use them to separate "heard the name" from "met the
person".

## 5. A journal or quest log

A journal state can read the same context the quest uses:

```markdown
# journal

`1 "stage" getContext eq jgz { "The smith is waiting." emit }`
`2 "stage" getContext eq jgz { "Return to the elder." emit }`
`"has_key" hasContext jgz { "You found the iron key." emit }`
`"stage" getContext 0 eq "has_key" hasContext not and jgz { "Nothing yet." emit }`

* [Close the journal](#camp)
```

The last line shows the "nothing yet" entry only when the quest has not
started. Multi-line journals can get long; keep the checks in a stable order so
the log reads top to bottom.

## 6. Lock, key, and consumed items

Gate the option on the item, then consume it in the effect:

```markdown
* `"key" hasContext` [Unlock the vault](#vault) `"key" delContext`
```

The effect runs before the link. If the vault should be unlockable more than
once, keep the key; if not, `delContext` removes it. A consumed item behaves
exactly like a flag that is no longer set.

For a one-time reward, pair an item flag with `@once` on the pickup option.

## 7. Endings chosen by context

Make endings a matrix of conditions rather than a chain of states:

| Condition | Ending |
| --- | --- |
| Has key, trust > 2 | `ending-free` |
| Has key, trust ≤ 2 | `ending-paid` |
| No key | `ending-leave` |

```markdown
* `"key" hasContext 2 "trust" getContext gt and` [Open the gate](#ending-free)
* `"key" hasContext` [Pay the toll](#ending-paid)
* [Walk away](#ending-leave)
```

Order matters only for display; conditions should be mutually exclusive where
possible. If they are not, the player gets a choice between endings, which is
usually a bug.

## 8. Save points

A save point is not a state; it is the moment the game writes context and the
current state name. See [save and load progress](save-and-load.md) for the
checkpoint model. In design terms:

- Keep state-entry effects idempotent (do not increment on every re-entry).
- Put rewards in one-shot options, not in the room description.
- Store enough context that the room can rebuild its menu.

## 9. Barks and ambient flavour

Random one-liners make a place feel alive without changing the plot:

```markdown
`4 randInt 0 eq jgz { "A gull cries." emit }`
`4 randInt 1 eq jgz { "The tide turns." emit }`
```

Use a separate roll per bark, or store one roll in context if the lines should
correlate. The [cookbook](recipes.md#a-random-table) has a full random table.

## 10. Hub-and-spoke dialogue

The dialogue tutorial covers this in depth. The shape is: a hub state, `@once`
topics with post-option replies, and context-gated personal topics. Keep a link
back to the hub on every spoke, or the player can get stranded.

## Choosing the shape

| If you need… | Use… |
| --- | --- |
| Ordered progress | One stage counter |
| A relationship | One trust number with thresholds |
| Two characters to agree | `and` inside one precondition |
| Knowledge, not progress | Presence flags with `hasContext` |
| A summary screen | A journal state with guarded emits |
| A reward that disappears | A flag plus `delContext` |
| Several outcomes | A table of mutually exclusive conditions |
| Atmosphere | Random barks |

## See also

- [Cookbook: common patterns](recipes.md) — the primitives.
- [Write a branching dialogue](../tutorials/branching-dialogue.md)
- [Build a text adventure](../tutorials/text-adventure.md)
- [Language reference](../reference/language.md)

# Build a text adventure

This is the capstone tutorial. You will build a small text adventure with
rooms, items, a locked gate, a limited number of searches, a random find, and
two ways to escape. It uses every major feature of the language, and the whole
document is playable below.

## 1. Map the rooms

The castle has five locations:

```
              tower
                |
courtyard ── cellar
    |
  gate
```

- **courtyard** — the hub, with the gate, the tower, the cellar, and some weeds.
- **tower** — a viewpoint with a random patrol.
- **cellar** — dark unless you have a torch; contains the key.
- **gate** — the exit; needs the key or three coins.
- **escape / leave** — endings.

Each location is a state, and each move is an option with a link.

## 2. Track the world in the context

The whole world fits in three context values:

| Key | Meaning |
| --- | --- |
| `torch` | Present once the player takes it. |
| `key` | Present once the player finds it. |
| `coins` | A number, increased by searching. |
| `searched` | A number, capped at three. |

`torch` and `key` are flags, so they are never initialized; `hasContext` is the
safe way to test them. `coins` and `searched` are numbers and start at `0`.

## 3. Write the document

````markdown{playground}
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "courtyard",
      "initial-context": { "coins": 0, "searched": 0 }
    }

# courtyard

Weeds push through the flagstones of a ruined courtyard. A gatehouse stands to
the north, a tower to the east, and stone steps lead down to a cellar.

```comment
The torch is the gate to the cellar. Do not let the player skip it.
```

* `@once` `"torch" hasContext not` Take the torch from the gatehouse wall `1 "torch" setContext`

  You lift the torch from its bracket. It is dry and heavy.

* `3 "searched" getContext lt` Search the weeds `1 "searched" getContext + "searched" setContext` `2 randInt "found" setContext`

  `0 "found" getContext eq jgz { 1 "coins" getContext + "coins" setContext "A silver coin glints between the stones." emit }`
  `0 "found" getContext eq jz { 2 "coins" getContext + "coins" setContext "Two silver coins are wedged under a tile." emit }`

* [Go down to the cellar](#cellar)

* [Climb the tower](#tower)

* [Try the gate](#gate)

* [Leave the castle](#leave)

# tower

The tower stairs are intact. From the top you can see the whole valley, and the
gate below.

`2 randInt 0 eq jgz { "A patrol crosses the courtyard below, then vanishes into the trees." emit }`

* [Go back down](#courtyard)

# cellar

The cellar smells of wet stone.

`"torch" hasContext jgz { "Your torch pushes the dark back to the walls. A key hangs from a hook." emit }`
`"torch" hasContext not jgz { "It is too dark to search. You would need a light." emit }`

* `"torch" hasContext` `@once` Take the iron key `1 "key" setContext`

  Your fingers close around a cold iron key.

* [Go back up](#courtyard)

# gate

The gatekeeper leans on a spear by the portcullis. He does not look surprised
to see you.

* `"key" hasContext` [Unlock the gate](#escape-key)

* `2 "coins" getContext gt` [Bribe the gatekeeper](#escape-bribe) `3 "coins" getContext - "coins" setContext`

* [Go back to the courtyard](#courtyard)

# escape-key

The iron key turns with a groan. You lift the latch, slip through, and do not
look back until the castle is a shape against the sky.
`exit`

# escape-bribe

Three silver coins change hands. The gatekeeper studies them, then pulls the
lever. The portcullis rises just far enough.
`exit`

# leave

You turn your back on the castle and walk until the road meets the river.
`exit`
````

## 4. Play it

There are two winning routes:

1. **The key route.** Take the torch, go down to the cellar, take the key,
   return to the courtyard, and unlock the gate.
2. **The bribe route.** Search the weeds up to three times. Each search finds
   one or two coins, so three searches always yield enough to bribe the
   gatekeeper.

The tower is optional, but it shows a random patrol, which is a useful trick
for making a place feel alive without changing the plot.

## 5. How the pieces fit

- **Rooms** are states. Movement is an option with a link.
- **The hub** is `courtyard`; every room has a link back to it.
- **Items** are flags. `hasContext` tests them; `setContext` creates them.
- **The dark cellar** is a precondition on the torch flag.
- **The limited search** is a counter with a precondition:
  `3 "searched" getContext lt` means `searched < 3`.
- **The random find** is `randInt` stored in `found`, then two guarded blocks
  that emit different text and, for a find, add a coin.
- **The endings** are terminal states.
- **The comment block** is invisible to the player and safe to keep in the
  source.

## 6. Make it yours

Try these changes in the playground:

- Make the gatekeeper demand five coins instead of three. You will need to
  search more, or give the player an extra coin at the start.
- Add a `rope` item in the tower. Let the player climb down from the tower
  directly to the gate, skipping the courtyard.
- Add a state for the gatehouse interior, with a `@once` option to read a
  logbook that reveals the gatekeeper's name.
- Replace the coin find with a random item: use `charCode` and `rconcat` to
  build a random letter, or use two blocks with different `randInt` results.
- Set `options.no_link_behaviour` to `"exit"` and notice what happens to the
  "Go back" options. (This is why the default is loopback.)

## Recap

You have now used states, links, context, preconditions, effects, post-option
text, `@once`, `hasContext`, counters, comparisons, `randInt`, guarded blocks,
`goto`-less endings, comment blocks, and multiple ending states. That is the
full practical surface of Questmark.

## Where to next

- [The language reference](../reference/language.md) — every rule and opcode in
  one place.
- [Compile to bytecode](../how-to/compile-to-bytecode.md) — ship the compiled
  JSON with a game.
- [Embed Questmark in your application](../how-to/use-the-library.md) — drive a
  `QuestVM` from your own engine.

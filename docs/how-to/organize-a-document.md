# How to organize a larger document

A one-scene conversation fits in a screen. A game with rooms, characters, and
several endings needs conventions. Questmark deliberately has no module system,
no includes, and no build steps beyond compilation, so the structure lives in
the document itself. This guide describes a layout that stays reviewable as it
grows.

## One playable document, one file

A Questmark document is compiled as a whole: one options header, one program,
one context. Keep each playable document in its own `.md` file.

There is currently no include directive. If a work grows beyond a comfortable
single file, the practical options are:

- split it into several independent documents (episodes, chapters, quests),
  each with its own header, or
- concatenate scene files with a small script before compiling, keeping exactly
  one header and renaming any colliding states.

Do not put two `QUESTMARK-OPTIONS-HEADER` sections in one document. The compiler
reads the last one it finds and the result is confusing.

## Layout

Put the pieces in the order a reader needs them:

```markdown
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "harbour", "initial-context": {} }

# harbour

The opening scene. Introduce the place and the problem.

* [Talk to the ferryman](#ferryman)
* [Walk into town](#town)

# ferryman

...the hub for this character...

# town

...the next scene...

# ending-ferry

The first ending.

`exit`

# ending-town

The second ending.

`exit`
```

- The header comes first.
- The `initial-state` state comes next.
- Ends of routes are grouped at the bottom and named `ending-*` so they are easy
  to find.
- Any state that is not reachable is either a work in progress or dead; the
  compiler will not tell you, so prune them during review.

## Name things predictably

State names and context keys are the public interface of the document. Choose
conventions and stick to them:

| Kind | Convention | Example |
| --- | --- | --- |
| States | lowercase, hyphens | `harbour`, `ending-ferry` |
| Character hubs | `npc-<name>` | `npc-mira` |
| Context flags | lowercase, `snake_case` | `has_lamp`, `door_open` |
| Counters | noun, `snake_case` | `coins`, `trust_mira`, `searched` |
| Internal keys | never | `__once__0` (reserved) |

Links are state names, so renaming a state means updating every `#link` to it.
Search the document before renaming; the compiler does not warn about a link to
a missing state until the player follows it.

Context keys are global. Prefixing per-character values (`trust_mira`,
`trust_ferryman`) avoids accidental collisions in a large cast.

## Keep prose and logic apart

Prose belongs in state text. Logic belongs in backticks. When the two mix, the
document becomes hard for writers to edit and hard for programmers to reason
about.

- Put a value into prose only where the player should see it:
  `` You have `"coins" getContext emit` coins. ``
- Put state changes in option effects, not in the middle of paragraphs.
- Use post-option text for immediate replies, and separate states for branches
  that need their own menu.
- Give every `_hostHook` a clear name; it is the seam between the document and
  the engine.

## Use comments as review notes

A `comment` fenced block is invisible to the compiler and the player. Use it for
writer notes, open questions, and TODOs:

````markdown
```comment
TODO: Mira's answer should hint at the fire without naming it.
Reviewer: the trust threshold here feels too high. — J.
```
````

Because comments live in the same file as the prose, they are reviewed, diffed,
and versioned with it. Delete or resolve them as the scene settles.

## Test the routes, not just the text

A single playthrough never visits every state. Before calling a scene done:

1. Compile with `--no-run`; fix every thrown error.
2. Play each branch that changes context, not just the first option.
3. Check the endings: does every route have one, and does the ending text match
   the context?
4. Test the failure states: no item, no coins, no trust. A doc that only works
   on the happy path is not finished.
5. Run the same scene twice in the playground to confirm `@once` options reset
   in a fresh VM and that no state leaks between runs.

For repeatable checks, write a small Node script that loads the document and
drives it with a fixed list of choices, like the tests in this repository. That
turns a manual route into a regression test.

## Keep the header boring

The options header should change rarely. Treat it as configuration:

- `questmark-spec` stays `"1.0"`.
- `initial-state` points at the opening scene.
- `initial-context` lists every numeric counter and every string the document
  reads with `getContext`. Flags read with `hasContext` can be omitted.
- Behaviour flags (`no_link_behaviour`, `emit_on`, `whitespace`,
  `strip_leading_newlines`) are document-wide. Do not flip them for one scene.

If a variable is only needed in one scene, initialize it there with
`setContext` before use. If it must survive scene changes, initialize it in the
header.

## A checklist for large documents

- [ ] One header, first in the file.
- [ ] Every state reachable from `initial-state`.
- [ ] Every non-terminal state has an exit (link, `goto`, or `exit`).
- [ ] Context names follow the convention; no `__` keys used by hand.
- [ ] Every route tested, including failure routes.
- [ ] Comments resolved or intentional.
- [ ] `--no-run` passes.
- [ ] A fresh playthrough reaches every ending.

## See also

- [How to debug a document](debug-a-document.md)
- [Cookbook: common patterns](recipes.md)
- [Tutorial: write a branching dialogue](../tutorials/branching-dialogue.md)
- [Tutorial: build a text adventure](../tutorials/text-adventure.md)
- [Language reference](../reference/language.md)

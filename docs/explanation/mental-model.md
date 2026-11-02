# The Questmark mental model

Questmark is small enough to hold in your head. The whole language is four
ideas: **states**, **text**, **options**, and **context**. Almost every
confusion comes from mixing two of them up.

## A document is a graph

A Questmark document is a directed graph. Each state is a node. Each option is
an outgoing edge. The player is always at exactly one state.

```
          ┌─────────────────────────────┐
          │            state            │
          │  text: what the player sees │
          │  options: what they can do  │
          └──────────────┬──────────────┘
                         │ option
                         │ precondition
                         │ effect
                         ▼
          ┌─────────────────────────────┐
          │          next state         │
          └─────────────────────────────┘

context: memory shared by every state and edge
```

The graph is not drawn anywhere. It is inferred from `# headings` and the links
on options, and it is realised at runtime by `goto`.

## The four ideas

### States are places

A state is a `# heading`. Entering it emits its text. A state can be a room, a
conversation turn, a menu screen, a quest stage, or an ending. It is a node in
the graph, not necessarily a "scene" in the narrative sense.

State text is what the player sees **on entry**. Code inside state text runs at
that point. The first unordered list is the menu.

### Text is what the player perceives

Text is emitted, not rendered. It can contain inline code that emits a value:

```markdown
You have `"coins" getContext emit` coins.
```

The output is a stream of strings. Formatting, layout, and audio are the host's
job. See [the text contract](text-contract.md).

### Options are edges

An option is a list item under a state's text. It has:

- a **label** shown in the menu,
- optionally a **link** to another state,
- optionally a **precondition** that decides whether it is offered,
- optionally an **effect** that runs when it is chosen,
- optionally **post-option text** that is emitted when it is chosen.

An option is an edge, not a node. A choice that loops back to the same state is
still an edge; a choice with no link stays at the same node by default. The
option's effect is the logic that changes the world, and the link is where the
player goes next.

### Context is memory

The context is a flat bag of named strings and numbers. It is the game state:
flags, counters, inventory, relationships, quest stages. It is not tied to a
state; every state sees the same bag.

Context is also how menus adapt. A precondition reads context and hides or
offers an option. This is the same data the story uses to describe the world,
which is why keeping it explicit matters.

## A turn, step by step

1. The player enters a state.
2. The state's text and inline code run, emitting text and changing context.
3. The VM builds the menu. For each option in source order, it runs the
   directive (`@once`) and precondition. If the gate passes, the option is
   registered; if not, it is never offered.
4. The VM suspends and hands the available options to the host.
5. The player chooses.
6. The option's effect runs. This is where counters change, flags are set, and
   items are consumed.
7. The option's post-option text is emitted.
8. The option's link is followed, or the state's menu is rebuilt, or the
   document exits.

The important ordering: **preconditions are evaluated when the menu is built;
effects run when the option is chosen.** Context changes from an effect affect
the next menu, not the current one.

## State versus context

| Question | Answer |
| --- | --- |
| Where is the player? | The state. |
| What does the player know, have, or feel? | The context. |
| Can I store the location in context? | Technically yes, but usually a mistake. |
| Can I store inventory in the state? | No. States are shared by every player. |
| What survives a save? | Context, plus the state name (see [save and load](../how-to/save-and-load.md)). |
| What resets between runs? | Everything: context starts from `initial-context`. |

Keeping the location in the state, and knowledge in the context, makes saves,
debugging, and reasoning much simpler. A state name is already a label; a
`"current_room"` context key duplicates it and can disagree with reality.

## Options are rebuilt, not stored

There is no persistent menu object. Every time the player arrives at a state,
the menu is built from the document's code and the current context. That has
consequences:

- An option can appear, disappear, or change its gate without any explicit
  refresh.
- The order of the options follows the source order of the list.
- A `@once` option is just a generated flag (`__once__N`) that the menu checks.
- Context changes inside an option effect only affect the next build.

This is why a no-link option loops back to the menu: the compiler emits a jump
to the state's `__options` label, not to the state's text.

## Post-option text belongs to the edge

Text under an option is emitted when that option is chosen, not when the menu is
shown. It is the immediate reply or consequence of the choice. State text
belongs to the node; post-option text belongs to the edge.

This distinction is the easiest way to decide where prose goes:

- Is it true every time the player is here? Put it in state text.
- Is it true only because the player chose this? Put it under the option.

## `@once` is a flag with syntax

An option marked `@once` disappears after it is chosen. Conceptually it is:

```markdown
* `"read_notice" hasContext not` Read the notice `1 "read_notice" setContext`
```

The directive exists so authors do not have to invent a flag for every one-off
topic. The observable behaviour is what matters; the internal `__once__N` key
is an implementation detail.

## The same model, three genres

The four ideas do not change between the things Questmark is used for:

| Genre | What is a state? | What is context? |
| --- | --- | --- |
| Conversation tree | A dialogue node | Trust, topics discussed, quest flags |
| Hypertext fiction | A passage | Visited passages, inventory, knowledge |
| Quest / text adventure | A room or quest stage | Location flags, items, counters, stages |

The difference is how much context you keep and how linear the graph is, not a
different execution model. That is why the [tutorials](../tutorials/first-conversation.md)
can move from a tavern conversation to a castle adventure without introducing a
second language.

## Common misconceptions

- **"An option is a state."** No. It is an edge. Effects and links belong to the
  edge; text belongs to the node.
- **"State text re-runs on every choice."** Only when you re-enter the state. A
  no-link option loops to the menu, not to the state text.
- **"Preconditions run when I choose."** They run when the menu is built. A
  choice cannot reveal an option until the next build.
- **"The context is saved automatically."** No. Saving is a host decision; see
  [save and load](../how-to/save-and-load.md).
- **"The menu is part of the state."** The menu is computed from the state's
  code and the current context every time.
- **"Markdown formatting is rendered."** It is flattened to text; emphasis
  becomes asterisks, links lose their targets.

## A model to write by

When drafting a scene, answer four questions:

1. **Where is the player?** That is the state heading.
2. **What do they see?** That is the state text.
3. **What can they do?** Those are the options, with links to where each leads.
4. **What changes if they do it?** That is the effect and the context key it
   touches.

If a draft has an answer that does not fit one of those four, it is usually a
sign that the scene should be split, or that the logic belongs on an edge
rather than in the prose.

## See also

- [Your first conversation](../tutorials/first-conversation.md) — the model in
  practice.
- [Design principles](design-principles.md) — the choices behind the model.
- [The text contract](text-contract.md) — what "text" means.
- [Language reference: options](../reference/language.md#options) — the exact
  rules.

import spaceAlien from "../../../examples/space_alien.md?raw";
import selfDescribing from "../../../examples/self-describing.md?raw";
import cookieStore from "../../../examples/cookieStore.md?raw";
import postOptionEmit from "../../../examples/post-option-emit.md?raw";

export const DEFAULT_DOCUMENT = `# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "bar",
      "initial-context": { "had_drink": 0 }
    }

# bar

The barkeep eyes you from behind the counter.
* [Order a drink](#drink)
* \`"had_drink" getContext\` [Ask about the storm](#storm)
* [Leave](#leave)

# drink

A frothing mug of ale slides across the counter.
\`1 "had_drink" setContext\`
* [Back to the bar](#bar)

# storm

"Storm's coming. Mark my words."
\`exit\`

# leave

"Safe travels, stranger."
\`exit\`
`;

export const EXAMPLES = [
  { name: "The tavern (tutorial)", source: DEFAULT_DOCUMENT },
  { name: "Space alien", source: spaceAlien },
  { name: "Self-describing adventure", source: selfDescribing },
  { name: "Cookie store", source: cookieStore },
  { name: "Post-option emit", source: postOptionEmit },
];

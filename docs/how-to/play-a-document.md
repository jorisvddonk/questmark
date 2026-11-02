# How to play a Questmark document

This guide shows you how to run a Questmark document interactively.

## In your browser

The fastest way to try a document is the [playground](../playground.md). It
runs the real compiler and interpreter in the page: paste a document, press
**Run**, and choose options to play. Nothing is uploaded, and the document is
not saved.

Any complete document in the [tutorials](../tutorials/first-conversation.md)
or in the [reference](../reference/language.md) has **Code** and **Play** tabs.
Switch to **Play** to run the document right there, without leaving the page.
Open **Inspect state** under the story to see the VM stack and context after
each turn. To edit the document instead, use the
[playground](../playground.md).

## From the project directory

After cloning the repository and running `npm install`, play any local
document with:

```bash
npm start -- --input path/to/document.md
```

The document must have one of the extensions `.md`, `.qmd`, `.md.html`, or
`.qmd.html` (or be a compiled `.json` — see
[compile a document to bytecode](compile-to-bytecode.md)).

## From the published CLI

If you don't have a checkout of the repository, the CLI is published on npm:

```bash
npx questmark --input path/to/document.md
```

## From a URL

The input path can be an `http://` or `https://` URL, so you can play a
document that's hosted online:

```bash
npx questmark --input https://ghcdn.rawgit.org/jorisvddonk/questmark/master/examples/self-describing.md
```

## During a play session

- The interpreter prints the current state's text, then shows a menu of the
  options currently available.
- Use the arrow keys to navigate and `Enter` to choose.
- Text that appears *after* an option line in the source is only shown once
  that option has been chosen.
- Options can be hidden by preconditions, or appear only once when marked
  `@once` — if an option is missing from the menu, that's the story telling
  you it isn't available.
- An `exit` state ends the session. In the playground, the status changes to
  **Ended**; in the CLI, the process returns to the shell.

## Troubleshooting

- **"Missing input!"** — you didn't pass `--input`. Pass the path or URL of a
  document.
- **The menu loops forever** — you chose an option that has neither a link nor
  an `exit`/`goto` effect. With the default `loopback_to_options` behaviour the
  interpreter returns to the menu. Change the behaviour in the document header
  (see the [language reference](../reference/language.md)), or give the option
  a link or an effect.
- **The interpreter quits immediately** — the document uses the `exit`
  `no_link_behaviour`, or the state you entered runs an `exit` instruction.
  This is often intended.
- **An option is missing, or the text after an option never appears** — check
  the option's precondition and its post-option text. For a deeper walkthrough,
  see [How to debug a document](debug-a-document.md).
- **The document throws `getContext` errors** — initialize every key you read
  in `initial-context`, or test it with `hasContext` first.
- **A state's text or options disappear** — a `##` heading inside the state
  ended it. Use only `#` headings for states.

## See also

- [The playground](../playground.md) — play a document in the browser.
- [Compile to bytecode](compile-to-bytecode.md) — ship a document as JSON.
- [Embed Questmark in an application](use-the-library.md) — put a `QuestVM` in
  your own program.
# How to play a Questmark document

This guide shows you how to run a Questmark document interactively.

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
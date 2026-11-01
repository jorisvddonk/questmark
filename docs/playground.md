---
title: Playground
description: Write and play Questmark documents directly in your browser.
---

# Playground

Write a Questmark document on the left and press **Run** to play it on the
right. Everything happens in your browser — the compiler and the interpreter
run locally, and nothing you type is sent anywhere.

<Playground />

## Things to try

- Pick an example from the dropdown, or paste in your own document.
- Press **⌘/Ctrl + Enter** in the editor to run the document.
- Remove the `` `1 "had_drink" setContext` `` line from the tavern example and
  watch the conditional option disappear.
- Open the [tutorial](./tutorials/first-conversation.md) in another tab and
  follow along in the playground.

## What is running here?

The playground loads the same browser bundle that ships with Questmark
(`dist/browser/bundle.js`, built from `src/index.ts`). It contains the complete
Markdown compiler and the Tzo virtual machine, so the behaviour you see here is
identical to running `npx questmark` on the same file.

Documents are not saved. If you want to keep one, copy it into a file and play
it with the CLI — see [Play a document](./how-to/play-a-document.md).

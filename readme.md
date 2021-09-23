# introduction

Questmark is a [hypertext fiction](https://en.wikipedia.org/wiki/Hypertext_fiction) and [conversation tree](https://en.wikipedia.org/wiki/Dialogue_tree) language, compiler, interpreter, and TypeScript library. The Questmark language is designed to be easy to understand, and designed to support BOTH conversation trees (like in games such as Star Control 2) and quests / hypertext fiction / text adventures / visual novels (like in games such as Space Rangers 2). It's based heavily on Markdown, and compiles to [Tzo](https://github.com/jorisvddonk/tzo) bytecode.

# The problem that Questmark tries to solve

Many modern games feature complex dialog trees or dialog graphs, which allow a player to interact with NPCs in the game world through dialogue that is predefined by the game's creators. Modern games implementing such systems are Skyrim, The Witcher, Deus Ex: Mankind Divided, Mass Effect: Andromeda... The list really [goes on and on](https://www.giantbomb.com/dialogue-trees/3015-77/)...

Often, if a player chooses a certain option within such a dialog system, this has some kind of side-effect in the game world. Dialogue systems therefore need to be able to model conversation graphs as well as be able to trigger side-effects when necessary.

This means that, the people that are responsible for writing dialog prose with side-effect for game should know how to *write prose* as well as how to *program side-effects*!

Unfortunately, the authors that write dialogue prose may not know how to program, and the programmers that write dialogue graph and side-effect code may not know how to write dialogue prose!

This means that, if you come up with [an advanced scripting language with associated editor](https://github.com/jorisvddonk/p6014-dialogue-scripting-tool), you're likely to only attract programmers. Your dialogue prose authors will either be programmers (which may be terrible at writing dialogue prose!), or your dialogue prose authors will just continue to work inside Word documents...

Maybe your dialogue prose authors are writing using a different, proprietary system instead. That might actually work out OK, or it might not, for instance if these proprietary systems use binary file formats that are difficult/impossible to merge.

# The solution!

Both authors and programmers, however, are likely to know Markdown or any of its modern dialects. This knowledge shared between authors and programmers is what Questmark makes use of.

Questmark is a natural dialect of Markdown, allowing for the creation of dialogue graphs with in-state and state-transition side-effects.

Every Markdown document with properly structured headers and in-document links is a Questmark document. Questmark-specific features and code can then be added to add further interactivity and side-effects to a dialogue system.

Questmark aims to make the following workflow viable:

1. Authors write dialogue trees in Markdown, which can be demoed interactively, either by interpreting Markdown and compiling it as HTML, by interpreting Questmark in a simple Questmark runner, or by interpreting Questmark inside of a modern game engine. Note that the Markdown->HTML approach only works for simple documents without scripting.
2. Authors, project managers, and other reviewers can add comments to provide feedback or clarification on dialogue without affecting interpreted Questmark output. These comments will *not* be visible anywhere when the dialogue tree definition is interpreted as Questmark.
3. Gameplay programmers can add interactivity where needed.
4. Authors can modify dialogue prose easily without affecting dialogue interactivity, if needed.
5. Game can be shipped!

Ideally, your dialogue tree Questmark files would be saved under revision control (e.g. git).

# Current status of Questmark

The spec is currently not written down properly, the supported featureset has not been decided on, and there is no formal test library (though [Tzo](https://github.com/jorisvddonk/tzo) *does* have a [testsuite](https://github.com/jorisvddonk/tzo/tree/master/src/tests)). This Github repository, however, contains a proof of concept implemented in TypeScript!

You should look in the [examples](https://github.com/jorisvddonk/questmark/blob/master/examples) folder for examples. Particularly, [self-describing.md](https://github.com/jorisvddonk/questmark/blob/master/examples/self-describing.md) is a text adventure written in Questmark that explains how Questmark works to you!

There are a few things that are still a bit "up in the air" and need to be thought about or implemented properly:

* How should inline HTML be treated?
* How can the Questmark compiler be modified to add custom directives and macros?
* How can a Questmark document be translated to another language, whilst keeping the scripting logic intact and easy to modify?

# Questmark cli usage

Questmark contains a simple CLI to compile and optionally interpret Questmark documents that don't contain any foreign opcodes that aren't implemented by the standard reference inplementation.

## Compiling a Questmark document to Tzo bytecode

```bash
npx questmark --no-run --input path_to_questmark_document.md --output path_to_output.json
```

## Interpreting a Questmark document

```bash
npx questmark --input path_to_questmark_document.md
```

# Questmark library usage

TODO: document this.

See [cli.ts](https://github.com/jorisvddonk/questmark/blob/master/src/cli.ts) in the meantime.

# Questmark cli usage

If you have Node.js installed, you can use the Questmark cli via [`npx`](https://docs.npmjs.com/cli/v7/commands/npx).

To get cli usage instructions:

```bash
npx questmark --help
```

To play through a Questmark document:

```bash
npx questmark --input <path_to_file.md>
```

You can also play a Questmark document that's hosted online:

```bash
npx questmark --input https://ghcdn.rawgit.org/jorisvddonk/questmark/master/examples/self-describing.md
```

To convert a Questmark .md file to Tzo bytecode (VMState), without interpreting the document:

```bash
npx questmark --input <path_to_file.md> --output <path_to_output_VMState.json> --no-run
```

# Other tools / libraries

Want to write a Questmark document and have the ability to play it easily from within your webbrowser? Consider trying out the [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer).


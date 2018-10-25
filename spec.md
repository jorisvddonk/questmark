# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "Welcome",
      "initial-context": {
        "myvar": 1
      }
    }

# The problem...

Many modern games feature dialog trees or dialog graphs. Often, if a player chooses a certain option within such a dialog system, this has some kind of side-effect in the game world. Dialogue systems therefore need to be able to model conversation graphs as well as be able to trigger side-effects when necessary.

The authors that write dialogue prose may not know how to program.
The programmers that write dialogue graph and side-effect code may not know how to write dialogue prose.

Both authors and programmers, however, are likely to know Markdown or any of its modern dialects. This knowledge shared between authors and programmers is what Questmark makes use of.

Questmark is a natural dialect of Markdown, allowing for the creation of dialogue graphs with in-state and state-transition side-effects.

Every Markdown document with properly structured headers and in-document links is a Questmark document. Questmark-specific features and code can then be added to add further interactivity and side-effects to a dialogue system.

Questmark aims to make the following workflow viable, within a Git-based workflow:

1. Authors write dialogue trees in Markdown, which can be demoed interactively, either by interpreting Markdown and compiling it as HTML, by interpreting Questmark in a simple Questmark runner, or by interpreting Questmark inside of a modern game engine.
2. Authors, project managers, and other reviewers can add comments to provide feedback or clarification on dialogue without affecting interpreted Questmark output. These comments will *not* be visible anywhere when the dialogue tree definition is interpreted as Questmark.
3. Gameplay programmers can add interactivity where needed.
4. Authors can modify dialogue prose easily without affecting dialogue interactivity, if needed.
5. Game can be shipped!

# Current status of Questmark

The spec is currently not written down properly, the supported featureset has not been decided on, and there is no formal test library.

# Welcome

Hiya!
Welcome to the first ever Questmark quest!

Context variable 'myvar' is {{=context.myvar}}

* [Navigate to start section!](#Start)
* [Increment myvar!](#Welcome) `context.myvar += 1;`
* [Invoke test function!](#Test) `test()`
* Quit

# Start

Hi! You are now at the start section. Ain't it fun?

* [Go back to the welcome section!](#Welcome)

# Test

You just invoked a test function, if it was defined!

* [Go back to the welcome section!](#Welcome)


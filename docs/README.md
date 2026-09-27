# Questmark documentation

Questmark is a hypertext fiction and conversation tree language, compiler,
interpreter, and TypeScript library. These docs follow the
[Diátaxis](https://diataxis.fr/) framework, which splits documentation into
four complementary modes of use:

| Mode | Audience | Purpose | Start here |
| --- | --- | --- | --- |
| [Tutorials](tutorials/) | Learners | Learning-oriented lessons that take you by the hand | [`tutorials/first-conversation.md`](tutorials/first-conversation.md) |
| [How-to guides](how-to/) | Doers | Goal-oriented steps for solving real problems | [`how-to/`](how-to/) |
| [Reference](reference/) | Everyone | Information-oriented descriptions of the machinery | [`reference/`](reference/) |
| [Explanation](explanation/) | Everyone | Understanding-oriented background and context | [`explanation/`](explanation/) |

## Quick orientation

- **New to Questmark?** Start with the [tutorial](tutorials/first-conversation.md).
  It takes about ten minutes and gets you writing and playing your first
  conversation.
- **Trying to get something done?** The [how-to guides](how-to/) show you how to
  play a document, compile one to bytecode, and embed Questmark in your own app.
- **Need a fact?** The [reference](reference/) pages describe the language, the
  CLI, and the library API precisely and completely.
- **Want to understand the design?** The [explanation](explanation/) pages
  cover why Questmark exists and how it works under the hood.

## Related projects

- [Tzo](https://github.com/jorisvddonk/tzo) — the stack-machine bytecode and VM
  that Questmark compiles to.
- [questmark-webrenderer](https://github.com/jorisvddonk/questmark-webrenderer) —
  render and play Questmark documents in the browser.
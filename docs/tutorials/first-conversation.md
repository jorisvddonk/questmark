# Write and play your first conversation

In this tutorial you'll write a small piece of interactive fiction from
scratch, and play it. Along the way you'll meet the three ideas everything in
Questmark is built on: **states**, **options**, and **context**.

You don't need any programming experience, but you do need to be comfortable
with Markdown — which is exactly the point. Everything you write here is
ordinary Markdown plus a few backticked additions.

This tutorial takes about ten minutes. If you follow it to the end, you'll
have a working, playable conversation.

---

## 1. Get set up

Clone the repository and install its dependencies:

```bash
git clone https://github.com/jorisvddonk/questmark.git
cd questmark
npm install
```

The Questmark command line is available from the project directory as
`npm start`, and the published CLI is also available via
`npx questmark` if you'd rather use that.

## 2. Write your first document

Create a file called `tavern.md` with the following contents:

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "bar"
    }

# bar

The barkeep eyes you from behind the counter.
* [Order a drink](#drink)
* [Leave](#leave)

# drink

A frothing mug of ale slides across the counter.
* [Back to the bar](#bar)

# leave

"Safe travels, stranger."
`exit`
```

Let's take it apart.

Every Questmark document starts with a **`QUESTMARK-OPTIONS-HEADER`** section.
Its indented code block is JSON that tells the interpreter where to start
(`initial-state`) and, later, what variables to set up (`initial-context`).

Each `# heading` in the document defines a **state**. A state is one "room" of
your fiction — the thing the player sees at one moment in the story. The text
under a heading is shown to the player when they enter that state.

Each `*` list item is an **option**: one thing the player can choose to do.
The Markdown link in `[Order a drink](#drink)` means "when the player picks
this, jump to the `drink` state."

The last line, `` `exit` ``, is a piece of code that ends the conversation.

## 3. Play it

Run the document:

```bash
npm start -- --input tavern.md
```

You should see the barkeep's text, and then a menu with two choices. Pick
"Order a drink", then "Back to the bar", then "Leave". Each time you make a
choice, the story moves to the state that choice pointed at.

Play it once more and make a different choice. The story branches — that's the
whole trick behind conversation trees.

## 4. Remember something the player did

Right now the barkeep can't tell whether you've already had a drink. Let's add
some memory. Questmark tracks what the player has done in a bag of variables
called the **context**.

Update the header to initialize a variable, and set it when the player orders
a drink:

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "bar",
      "initial-context": { "had_drink": 0 }
    }

# bar

The barkeep eyes you from behind the counter.
* [Order a drink](#drink)
* [Leave](#leave)

# drink

A frothing mug of ale slides across the counter.
`1 "had_drink" setContext`
* [Back to the bar](#bar)

# leave

"Safe travels, stranger."
`exit`
```

The new line `` `1 "had_drink" setContext` `` means "push the number `1`, then
store it into the context under the name `had_drink`." Code inside backticks is
Tzo bytecode, written in a reverse-Polish style: the values come first, then
the operation.

## 5. Make an option conditional

Now let's use that memory. A new option should appear only once the player has
had a drink. Backticks *before* an option's text are a **precondition**: the
option is only offered when the code leaves a positive number on the stack.

Add the option to the `bar` state:

```markdown
# bar

The barkeep eyes you from behind the counter.
* [Order a drink](#drink)
* `"had_drink" getContext` [Ask about the storm](#storm)
* [Leave](#leave)
```

The precondition `` `"had_drink" getContext` `` means "look up `had_drink` and
push its value." On your first visit the value is `0`, so the option is hidden.
After you've ordered a drink the value is `1`, so the option appears.

Now add the `storm` state the option links to:

```markdown
# storm

"Storm's coming. Mark my words."
`exit`
```

## 6. Try the finished conversation

Here is the complete document:

```markdown
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "bar",
      "initial-context": { "had_drink": 0 }
    }

# bar

The barkeep eyes you from behind the counter.
* [Order a drink](#drink)
* `"had_drink" getContext` [Ask about the storm](#storm)
* [Leave](#leave)

# drink

A frothing mug of ale slides across the counter.
`1 "had_drink" setContext`
* [Back to the bar](#bar)

# storm

"Storm's coming. Mark my words."
`exit`

# leave

"Safe travels, stranger."
`exit`
```

Play it and notice the difference:

1. On your first visit to the bar, "Ask about the storm" is **not** in the
   menu.
2. Order a drink, return to the bar, and the option is **now** there.

```bash
npm start -- --input tavern.md
```

## 7. Where to go next

You've used states, options, links, context, and a precondition. Those are the
core of the language.

- Read the [how-to guide on playing documents](../how-to/play-a-document.md)
  for more ways to run a document.
- Read the [language reference](../reference/language.md) for the complete set
  of language features, including the `@once` directive and effects.
- Browse the [examples](https://github.com/jorisvddonk/questmark/tree/master/examples)
  in the repository — `space_alien.md` is a longer conversation tree that puts
  everything together.
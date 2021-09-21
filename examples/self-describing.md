# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "introduction",
      "initial-context": {
        "myCounter": 0,
        "coin": 0
      },
      "options": {}
    }

# introduction

Questmark is a hypertext narrative fiction writing language, that's designed to be easy to understand, and designed to support both conversation trees (like in games such as Star Control 2) and quests (like in games such as Space Rangers 2). It's based heavily on Markdown.

This Questmark document describes the Questmark language through examples. This document itself is actually a Questmark document, and can be interpreted with a compatible Questmark interpretation engine, or compiled to a bytecode via the Questmark compiler (more on that later).

If you're reading this document online on GitHub, you should be able to click through most of the text here via the webview, but do note that as soon as you come across (inline) code blocks, those mean something special to the Questmark compiler, and in a real interpreter, not all text that you can read is always visible to a player.

* [Click here to figure out how Questmark works!](#how_questmark_works)

# how_questmark_works

Questmark largely revolves around three concepts: States, Options and Context.

Think of "States" the way you do about State Diagrams or State Machines, if you're familiar with any of those terms. If you're not familiar with those, you can consider them to be equal to "rooms". In fact, within the context of quests, many States will in fact map directly to a room within the quest, from which the player can perform actions.

States have one or more Options. Options are the main way that players interact with your quest or conversation. They model the options for the things the player can say in a conversation, and the narrative actions a player can perform within a quest.

States can contain text. You're reading some of that text right now. Depending on whether or not you're writing a quest or a conversation tree, it may or may not make sense to have text accompany a State. More on that later.

Context encapsulates historical actions the player has made in a conversation or quest. "Did the player pick up the sword?", "Has the player entered the toilet before?", "Did the player insult the alien by asking a stupid question earlier?", things like that. Technically speaking, Context contains all of the variables that are key to determining conditional logic within your quest or conversation. We'll talk about logic and variables later.

Every Questmark conversation or quest is always in a single State, and Questmark conversations always have a single initial state from which the conversation or quest "starts". In this document, the starting state is the "introduction" state, which you saw earlier; that's where we introduced what Questmark is and what its design goals were. From that state, you selected the "Click here to figure out..." option, which *transitioned* you to a different state. You're currently in the "how_questmark_works" State, and you're currently reading some of that State's text.

In case you're familiar with Markdown, you may have noticed that everything seems pretty familiar so far. States and Options are, indeed, encoded purely using simple Markdown constructs.

Now that you're familiar with the core concepts, let's give you a few options for additional learning!

What would you like to learn more about?

* [Defining states](#defining_states)
* [Flowers](#flowers)

# flowers

Flowers are very good, but you probably want to know more about defining states ;)

* [Yes, I want to know more about defining states](#defining_states)

# defining_states

To declare a state, simply write a Markdown header using a single hash character (#) followed by a space and then your State's identifier (name). For compatibility reasons with many Markdown reader software, I'd recommend that you don't use any spaces within your State names, and keep everything lowercase.

For example:

\# my_awesome_state

Once you've declared a state, follow it with an empty newline, and then start writing text that contains the text body of your State.

* [Learn more about declaring options](#declaring_simple_options)

# declaring_simple_options

Declaring Options is pretty simple: you use Markdown bulletpoints followed by a line of text (the option text that the user will see, like "I heard you like Hamsters" or "Pick up the can")! If you check the source code of this document, you'll see how this has been done so far, but here's an example:

\* Pick up the can


All (!) bulletpoints within a State are interpreted as Options, and will be presented to the user as such.

If a bulletpoint has a Markdown link that encapsulates its text completely, the link target attribute of this link specifies the state name that's targeted by that Option. It should be noted that bulletpoints do NOT (!) have to contain Markdown links for them to be Options. When a bulletpoint does not contain any Markdown links and just plain text, it's said to be a "No Link Option". These are very useful, especially for conversation trees, but more on them later.

In case you forgot, to create a Markdown link you write a square bracket open ([), followed by the link text, followed by a square bracket close (]), followed by an open parenthesis and a hash ((#) followed by the link target, which is the target State name, followed by a close parenthesis ()).

Here's an example of an option with the text "hi there" that would go to the "my_awesome_state" state:

\* \[hi there\]\(\#my_awesome_state\)

Options can be written anywhere within a State, but it is *very* important that you understand that the *first* Option that appears within a State's text body is very, *very* special, as it signifies the start of the Options Section of a State. *A State's text body ends where its Options Section begins*.

Want to know more?

* [What happens when I select an Option](#selecting_an_option_what_happen)

# selecting_an_option_what_happen

When you select an Option, a few things happen:

Step 1: If the Option has an *effect* or *transition text* associated with it, then this is invoked. More on effects and transition text later!

Step 2: If the Option has a Link associated with it, then the State that this link points to (the Target State) is transitioned to. The Target State then becomes the Current State

Step 3: The State body (that we just transitioned to) is executed, meaning that any scripts within are executed, and any text within is emitted to the player.

Step 4: All of the State's Option Conditions are evaluated to figure out which Options are available to the player, and all available Options are displayed to the player.

(more on Conditional Options later)

If a Link does not have an Option (if it is a No Link Option), then steps 2 and 3 are skipped: the State remains the same, and the State Body is not executed, but the Option Conditions are re-evaluated, the the Options are displayed again to the player.

* [Teach me about effects and transition text](#effects_and_transition_text)

# effects_and_transition_text

So far, you have not seen any effects or transition text yet, but that's about to change!

In both quests and conversations, there are many cases where you as an author want to display specific text to a user *only* when they picked a specific Option.

This is most common within conversations; almost every single thing a player can say will have its own specific response from their conversational partner. But it can also be common within Quests, for instance if the player can move onto the streets from either the garden or from the house. You might want to display something like "You open the front door of the house and step outside into the streets...", followed by the description of the streets, but only if the player decided to enter the streets from the house.

Effects and Transition Text allow you to specify exactly what an Options bespoke response is, without having to define a specific State for it.

We'll discuss effects later, because they require knowledge of scripting and code, but we can already start with a very simple example.

* [Show me the example!](#transition_text_example)

You step into a wormhole and suddenly are transported to the TRANSITION TEXT EXAMPLE!

# transition_text_example

Welcome to the Streets of the Transition Text Example!
The streets are filled with beautiful cobblestone, and you see a cute cat trying to climb a tree nearby.
Where do you want to go to from here?

* [Enter the house](#transition_text_example_house)

You open the door to the house and enter it

* [Enter the garden](#transition_text_example_garden)

You walk around the perimeter and jump over the small fence to enter the garden.

* [Leave](#post_transition_text_example)

You decide that you've seen enough of the Transition Text Example and decide to leave.

# transition_text_example_house

You're in the Transition Text Example house.
The house was made in the 80's and smells of old books.
Where to next?

* [Enter the garden](#transition_text_example_garden)

You open the door to the garden and leave the house through the open door.

* [Back to the streets](#transition_text_example)

You leave the house through the front door, and step back into the streets.

# transition_text_example_garden

You're in the Transition Text Example garden!
Beautiful flowers can be seen in the garden, with bees and butterflies buzzing nearby.
Where to next?

* [Enter the house](#transition_text_example_house)

You open the door to the house and enter it

* [Leave](#post_transition_text_example)

You decide that you've seen enough of the Transition Text Example and decide to leave.

# post_transition_text_example

That was the Transition Text Example! I invite you to check the source code out to see if you can figure out what happened and how it was written!

Now that you know about Transition Text, let's talk about how No Link Options interact with Transition Text.

* [That sounds interesting; tell me about No Link Options and Transition Text!](#no_link_options_and_transition_text)

# no_link_options_and_transition_text

As a reminder: No Link Options are Options, which you declare via a simple Markdown bulletpoint, that don't contain a Markdown link. So far, in this entire document, you haven't encountered any of them. As we previously elaborated, No Link Options do NOT cause a State transition, and do NOT cause the State Body to be re-evaluated.

No Link Options are *very* common and useful within conversations, as they allow you to write a script where a user interrogates an NPC on a single topic, with a single generic piece of text introducing the player to the topic that's not repeated every time the user selects an option.

* I'm not sure I follow.

Well, if you're using a Questmark interpreter, you'll be seeing this bit of Transition Text now. We're still in the State that introduces No Link Options in combination with Transition Text, but that introduction text was not displayed (!) and you'll again be presented with all of the same options that you previously were able to see.

* What is the relation betwen No Link Options and Fluffy Sheep?

There is none.

* Why is the earth flat?

It's not.

* Are No Link Options with Transition Text also useful within quests?

Yes, No Link Options with Transition Text are also useful within quests. Consider a quest where you're in a room, and the relevant State contains a thorough description of said room, including the fact that there's a dog there. If there's an Option to pet the dog (there damn well be one!!), you might want to show the user some cute text informing them that they pet the dog and the dog waggles its tail, but you might not want to repeat the entire room description again or invoke its scripting. In those cases, you can use a No Link Option, and use the Transition Text to inform the player of the tail waggling. If as a scripting writer you DO actually want to repeat the room description and run the room (State) code, you can simply use a Link Option that links to the same state, causing a State Transition to the current (same) State.

* [Okay, I think I understand this now. Let's talk about SCRIPTING!](#scripting)

# scripting

Questmark contains a very simple scripting language, that's used for both effects, conditions and inline calculated text. It's admittedly not super easy to use, but it is trivial to implement for programmers, and should be easy to integrate within existing game engines as well.

The scripting language, Tzo (https://github.com/jorisvddonk/tzo) is a stack-based virtual machine with support for "foreign opcodes". Don't worry if this doesn't mean anything to you; we'll explain later.

So far, you haven't seen any scripting just yet. No scripts at all have been invoked so far. You can double-check by reading the source code of this questmark document.

Adding scripting to a document is fairly straightforward. You simply use Markdown inline code fragments (which you start and end using backticks (\`)) and write Tzo ConciseText Representation (https://github.com/jorisvddonk/tzo#concisetext-representation) in between the backticks that represent your code. The most difficult part, really, is writing the *right* code. Hopefully, examples in this document and elsewhere will be a good guide for you.

As an example, if I were to write \`1 1 +\`, then Questmark would push the number 1 to the stack twice, and then pop both of them, add them up, pushing the result back to the stack. If I wanted to display this result back to the user, I'd use the "emit" foreign opcode: \`1 1 + emit\`

Here, let's give it a spin:

The result of \`1 1 + emit\` is: `1 1 + emit`

Neat!

Worth noting for nerds: currently, Questmark's main interpreter actually operates in two passes: the first pass compiles an entire Questmark document to Tzo bytecode (!) that includes a whole lot of bespoke Questmark interpreter specific foreign opcodes like "emit" and "option", which are then interpreted by the second pass, which is a plain Tzo bytecode interpreter with implementations for the imported foreign opcodes. This is pretty neat, in my opinion. Maybe worth reading the source code to figure out how that works ;)

* [Okay, cool. You told me about Context, variables and effects a while ago; how do they work?](#context_variables_and_effects)

# context_variables_and_effects

Glad you remembered about effects, context and variables!

We can use simple Tzo core opcodes to set, get and delete variables in the Context.

For example, the result of \`"myCounter" getContext emit\` is: `"myCounter" getContext emit`

To increment this counter as part of an Option, we can simply write code anywhere as part of an Option's Transition Text, or we can write code directly within the bulletpoint line, after the Markdown link element or No Link Option text.

* increment the counter using \`"myCounter" getContext 1 + "myCounter" setContext\` `"myCounter" getContext 1 + "myCounter" setContext`

The value of myCounter is now: `"myCounter" getContext emit`

* [Okay, cool, let's talk about conditional options!](#conditional_options)

# conditional_options

(Let's just reset this counter back to 0.... `0 "myCounter" setContext` There, done! :P )

The value of myCounter is now: `"myCounter" getContext emit`

To conditionally enable an option, simply *prefix* the option text with a code block that pushes a single (!) number onto the stack. If the value on the stack is 1 or greater, then the Option is enabled. Otherwise, it's not.

* `"myCounter" getContext 0 eq` Set the value of myCounter (currently: 0) to 1 `1 "myCounter" setContext`

The value of myCounter is now: `"myCounter" getContext emit`

* `"myCounter" getContext 1 eq` Let's do that again: set the value of myCounter (currently: 1) to 2 `2 "myCounter" setContext`

The value of myCounter is now: `"myCounter" getContext emit`

* `"myCounter" getContext 2 eq` Awesome! Set the value of myCounter (currently: 2) to 3 `3 "myCounter" setContext`

The value of myCounter is now: `"myCounter" getContext emit`

* `"myCounter" getContext 3 eq` So that counter that's now 3, make it 4 `4 "myCounter" setContext`

The value of myCounter is now: `"myCounter" getContext emit`

* `"myCounter" getContext 4 eq` There are 4 lights on my counter. MAKE THEM 5!!! `5 "myCounter" setContext`

The value of myCounter is now: `"myCounter" getContext emit`

* [I think I understand what's going on. Can you teach me about Directives next?](#directives)

# directives

Hey, what!? I never told you about directives! How do you know about them!?

Okay, fine. I suppose you read the source code or something.

You might have seen, if you read some Questmark source code documents like this one, that conditionals can get a bit unwieldy, especially for some simple use cases like only being able to select a given option once. Some common use cases require plenty of verbose code, which doesn't make things particularly easy to understand.

Directives are designed to simplify common use cases. They're effectively "macros" for common functionality, but there's a slight catch: you can't define these yourself, and they're a compile-time feature as they're defined in the Questmark first-pass Tzo compiler.

Directives are easy to recognize: they're simple tags, prefixed with an at sign (@), surrounded by backticks (\`), like so: \`@once\`. Internally, they use a different code path, and so you can NOT match Directives with regular Tzo bytecode. If you try, things will just break.

At the moment, there's only one directive: \`@once\`. This directive ensures that a given option is only ever available once: once you select it, you can never select it again. The Questmark compiler manages the required Context variables and conditionals for you so you don't have to think about it!

Here are some examples:

* `@once` You can only select me once

You selected an option!

* `@once` You can only select me once also

wow

* `@once` This is only selectable once

yay

* `@once` Can't touch this (more than once)!

woot

* [Okay, I get it. Interesting. I'd like to use Questmark in my own game; how would I make it possible to trigger custom game logic, play voice files, load media, etc?](#custom_game_integration)

# custom_game_integration

As mentioned previously, Questmark compiles down to Tzo bytecode, ready to be interepreted by a Tzo interpreter that implements Questmark's specific foreign functions and Questmark's conventions. Any code blocks (other than directives) you write as part of a Questmark document will actually literally end up within the output Tzo bytecode. As such, when you want to do a custom game integration, you can use Tzo's foreign function functionality to perform your own custom game logic.

For instance, in one of the Author's own games, \`"hello.ogg" playAudio\` is used to play a voice-over file, and \`"city.png" displayBackground\` is used to load and display a State-specific background image.

You could also use these foreign functions to customize the text appearance, as well, though whether or not that makes sense considering that Markdown also supports inline HTML is a good question that the Author has no good answer to at the moment. This is something worthy of additional research and experimentation in the future.

* [Awesome. How do I display text to the user conditionally?](#conditional_text)

# conditional_text

Displaying text conditionally can be a challenging task in some languages, but it's relatively staightforward in Questmark.

Remember that Markdown code blocks are literally emitted in the resulting Tzo bytecode by the Questmark Tzo compiler? Well, something VERY similar happens to regular Markdown text: when you write "hi there" in Markdown, the resulting Tzo bytecode (in ConciseText representation) actually looks like this: \`"hi there" emit\`. Basically, the paragraph you wrote is written as a Tzo string literal, followed by the 'emit' opcode.

Don't worry if that didn't make any sense to you. The important bit is that it means that you can use Tzo's conditional logic and jumping routines to fence blocks off, preventing them from getting displayed to the user (getting emitted).

As an example, here's a simple conditional text render: (please read the source code to see how it was implemented!)

`"coin" getContext 1 eq jgz {`

There is a coin on a table here. The HEADS side is up.

`}`

`"coin" getContext 0 eq jgz {`

There is a coin on a table here. The TAILS side is up.

`}`

* [Flip the coin](#conditional_text) `"coin" getContext 1 eq dup jgz { 0 "coin" setContext } jz { 1 "coin" setContext }`

You turn over the coin, so that the other side is facing up.

* [Great, thanks! I think I understand things now. What's next in my journey to understand Questmark?](#whats_next)

# whats_next

You should pretty much know most by now :) Questmark is relatively simple and a lot of the heavy lifting is done by Tzo and the Questmark to Tzo compiler.

I'd recommend that you read through the example source code and understand how it works.

If you want to learn more about how to integrate your game, please read more elsewhere (TODO: write an integration guide!), but the TLDR basically is that you need to start with a Tzo interpreter and then bolt on an implementation of the required Questmark foreign functions.

Oh, one more thing...

If you want to exit a conversation, you simply call the 'exit' opcode. This will terminate the Tzo VM.

* [Thanks! I think I know enough now. Goodbye!](#goodbye)

# goodbye

Goodbye!

`exit`

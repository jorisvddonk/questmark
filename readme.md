# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "Welcome",
      "initial-context": {
        "myvar": 1
      }
    }

# Huh? What's that JSON at the start of this file?

..you can safely ignore that JSON blob, for now.. :) Read on please!

# The problem...

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

1. Authors write dialogue trees in Markdown, which can be demoed interactively, either by interpreting Markdown and compiling it as HTML, by interpreting Questmark in a simple Questmark runner, or by interpreting Questmark inside of a modern game engine.
2. Authors, project managers, and other reviewers can add comments to provide feedback or clarification on dialogue without affecting interpreted Questmark output. These comments will *not* be visible anywhere when the dialogue tree definition is interpreted as Questmark.
3. Gameplay programmers can add interactivity where needed.
4. Authors can modify dialogue prose easily without affecting dialogue interactivity, if needed.
5. Game can be shipped!

Ideally, your dialogue tree Questmark files would be saved under revision control (e.g. git).

# Current status of Questmark

The spec is currently not written down properly, the supported featureset has not been decided on, and there is no formal test library.
This Github repository, however, contains a proof of concept implemented in JavaScript!

# Welcome

Hiya!
Welcome to the first ever Questmark quest!
That's right, this document is actually a totally valid Questmark quest, that can be interpreted by the example proof-of-concept reference questmark interpreter!

If you're interpreting this file (readme.md) via a Questmark interpreter, and then compare it with the actual file's contents, you'll notice that there was LOTS OF TEXT that you're never going to see when interpreting via the Questmark interpreter. That's because the first section of a Questmark file contains what is called the Questmark options header. This options header defines the default entrypoint of a dialogue graph, and in this particular document's case that's the Welcome section that you're reading right now.

The questmark options header is designed to be flexible and extendable, and will probably be used to specify which language version is targeted, which language features should be enabled/supported, which language extensions should be loaded (if any), which runtime scripts are required to provide functionality, and maybe even which assets should be preloaded before loading the dialogue tree (think interactive fiction that has embedded images).

Questmark also supports context variables that can be modified through dialogue options! For instance, context variable 'myvar' is {{=context.myvar}}. Ain't that splendid?

Below are some dialogue options you'll be able to invoke. In games, these correspond with the things your character can say to the NPC you're talking with.

* [Navigate to start section!](#Start)
* [Increment myvar!](#Welcome) `context.myvar += 1;`
* [Invoke test function!](#Test) `test()`
* Quit. This will quit the dialogue in a questmark interpreter, as it is a dialogue option with no corresponding state.

# Start

Hi! You are now at the start section. Ain't it fun?

Here is some fancy lorem ipsum text to make this section a little bigger. This will allow you to see how Questmark makes use of existing Markdown functionality to transport you to different states of a dialogue tree!

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc nibh elit, lacinia eu tortor at, scelerisque vulputate leo. Cras sollicitudin tincidunt lorem ac consectetur. Sed et aliquam lacus. Vestibulum condimentum porttitor orci in interdum. Donec iaculis vitae diam id elementum. Donec sed orci augue. Curabitur scelerisque felis nec justo molestie, id placerat augue bibendum. Integer fermentum ut quam at convallis. Quisque a augue sed libero finibus viverra a at nulla.

In aliquet placerat justo, id varius elit vulputate ut. Quisque finibus tellus sed mi imperdiet, et accumsan nunc dapibus. Nam massa tortor, luctus non ante in, volutpat commodo ante. Vestibulum quis nisl eu enim suscipit sagittis. Proin lacinia erat ut cursus elementum. Curabitur rhoncus dictum lectus, auctor tempus neque congue sit amet. Nulla sagittis euismod lorem, et fringilla odio consequat sit amet. Curabitur imperdiet, mi lobortis luctus varius, mauris urna pharetra magna, tincidunt rutrum massa risus sed diam. In hac habitasse platea dictumst. Etiam at sollicitudin ligula. Duis in vestibulum ante. In a lectus tortor. Donec porttitor quam id fringilla egestas. Aenean pretium nulla vitae purus vehicula, ut mattis purus sagittis. Etiam eget vestibulum neque.

Sed maximus, sem sed venenatis faucibus, augue mauris rutrum eros, non ullamcorper risus lorem in elit. Donec lorem augue, ornare quis sapien nec, accumsan dictum quam. Quisque nec tristique quam. Nullam vel tortor at massa congue condimentum. Nunc id ultricies tortor. Quisque vel purus neque. Nullam urna tortor, hendrerit quis quam tincidunt, vehicula iaculis felis. Suspendisse potenti. Nulla pharetra, sapien a fringilla ornare, ligula justo bibendum augue, quis luctus elit diam sed libero. Quisque non augue sit amet sem eleifend ultrices. Quisque blandit tempus erat. In varius magna sit amet dapibus commodo. Nunc sit amet pulvinar arcu. Suspendisse elementum massa vel ligula dapibus dapibus.

Proin vel euismod justo. Vivamus placerat urna ac urna dapibus viverra. Morbi dictum lectus vel vestibulum mollis. Cras dictum semper venenatis. Nullam gravida id augue id tempor. Morbi ante leo, consectetur sit amet sollicitudin eu, sagittis eu elit. Proin quis leo tellus. In maximus tempor faucibus. Pellentesque eu facilisis nulla. Morbi at mollis ligula. Sed non quam ut lorem malesuada hendrerit vitae quis est. Sed blandit egestas hendrerit. Praesent eu fringilla elit. Nullam ultrices, risus et consequat pretium, risus erat vulputate magna, consequat laoreet erat magna eu ex. Nunc et mollis mauris. Etiam nec tortor eget dolor laoreet aliquam ut nec erat.

Donec sed libero leo. Sed venenatis ante non dui tempus, sed pretium ex tristique. Ut mauris urna, rhoncus in euismod sed, cursus convallis dui. Nunc pretium, neque eget vestibulum convallis, risus metus porta sapien, auctor faucibus felis justo eget orci. Pellentesque nec aliquam metus. Duis ultricies enim blandit sem lobortis, nec posuere odio mattis. Sed eleifend ex ut interdum aliquet. Fusce quam enim, efficitur ac viverra eu, sagittis vel nulla.

* [Go back to the welcome section!](#Welcome)

# Test

You just invoked a test function, if it was defined!

Here is some fancy lorem ipsum text to make this section a little bigger. This will allow you to see how Questmark makes use of existing Markdown functionality to transport you to different states of a dialogue tree!

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc nibh elit, lacinia eu tortor at, scelerisque vulputate leo. Cras sollicitudin tincidunt lorem ac consectetur. Sed et aliquam lacus. Vestibulum condimentum porttitor orci in interdum. Donec iaculis vitae diam id elementum. Donec sed orci augue. Curabitur scelerisque felis nec justo molestie, id placerat augue bibendum. Integer fermentum ut quam at convallis. Quisque a augue sed libero finibus viverra a at nulla.

In aliquet placerat justo, id varius elit vulputate ut. Quisque finibus tellus sed mi imperdiet, et accumsan nunc dapibus. Nam massa tortor, luctus non ante in, volutpat commodo ante. Vestibulum quis nisl eu enim suscipit sagittis. Proin lacinia erat ut cursus elementum. Curabitur rhoncus dictum lectus, auctor tempus neque congue sit amet. Nulla sagittis euismod lorem, et fringilla odio consequat sit amet. Curabitur imperdiet, mi lobortis luctus varius, mauris urna pharetra magna, tincidunt rutrum massa risus sed diam. In hac habitasse platea dictumst. Etiam at sollicitudin ligula. Duis in vestibulum ante. In a lectus tortor. Donec porttitor quam id fringilla egestas. Aenean pretium nulla vitae purus vehicula, ut mattis purus sagittis. Etiam eget vestibulum neque.

Sed maximus, sem sed venenatis faucibus, augue mauris rutrum eros, non ullamcorper risus lorem in elit. Donec lorem augue, ornare quis sapien nec, accumsan dictum quam. Quisque nec tristique quam. Nullam vel tortor at massa congue condimentum. Nunc id ultricies tortor. Quisque vel purus neque. Nullam urna tortor, hendrerit quis quam tincidunt, vehicula iaculis felis. Suspendisse potenti. Nulla pharetra, sapien a fringilla ornare, ligula justo bibendum augue, quis luctus elit diam sed libero. Quisque non augue sit amet sem eleifend ultrices. Quisque blandit tempus erat. In varius magna sit amet dapibus commodo. Nunc sit amet pulvinar arcu. Suspendisse elementum massa vel ligula dapibus dapibus.

Proin vel euismod justo. Vivamus placerat urna ac urna dapibus viverra. Morbi dictum lectus vel vestibulum mollis. Cras dictum semper venenatis. Nullam gravida id augue id tempor. Morbi ante leo, consectetur sit amet sollicitudin eu, sagittis eu elit. Proin quis leo tellus. In maximus tempor faucibus. Pellentesque eu facilisis nulla. Morbi at mollis ligula. Sed non quam ut lorem malesuada hendrerit vitae quis est. Sed blandit egestas hendrerit. Praesent eu fringilla elit. Nullam ultrices, risus et consequat pretium, risus erat vulputate magna, consequat laoreet erat magna eu ex. Nunc et mollis mauris. Etiam nec tortor eget dolor laoreet aliquam ut nec erat.

Donec sed libero leo. Sed venenatis ante non dui tempus, sed pretium ex tristique. Ut mauris urna, rhoncus in euismod sed, cursus convallis dui. Nunc pretium, neque eget vestibulum convallis, risus metus porta sapien, auctor faucibus felis justo eget orci. Pellentesque nec aliquam metus. Duis ultricies enim blandit sem lobortis, nec posuere odio mattis. Sed eleifend ex ut interdum aliquet. Fusce quam enim, efficitur ac viverra eu, sagittis vel nulla.

* [Go back to the welcome section!](#Welcome)


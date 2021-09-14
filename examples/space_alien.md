# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "init",
      "initial-context": {
        "asked_about_glowy_bits": 0,
        "cars_not_spaceships": 0,
        "know_about_cheese": 0,
        "know_alien_name": 0,
        "details_about_hamsters": 0,
        "bad_details_about_hamsters": 0
      },
      "options": {
        "no_link_behaviour": "loopback_to_options"
      }
    }

# init

Greetings, Human! Glad you've finally woken up! You banged your head quite badly there and we were worried that your central processing unit was severely damaged, but it seems that you're fine enough to open your eyes! Wonderful. How do you feel?

* `@once` Uuuuh... "central processing unit"?

Oh! Right, sorry. "brain" you call it, I think. Funny word. Sounds almost fake, if you ask me.

* `@once` Hey! What are those glowy bits inside you? `1 "asked_about_glowy_bits" setContext`

Ah, those are a private matter to us. Please don't ask about our glowy bits ever again, thanks.

* [What happened?](#what_happen)

# what_happen

Well, we were zipping around space in our awesome spaceship, when we randomly stumbled upon your nice planet.
Our pilot figured it'd be great to land on your world, and we did!
Or, well, we tried to.
See, the thing is, our spaceship is rather difficult to control in atmospheres as thick as around your world.
..and... well...
We happened to accidentally veer widely off course and land RIGHT on top of your parked spaceship.
Sorry about that!

* `0 "cars_not_spaceships" getContext eq` Err... Spaceship? I don't have a spaceship. You mean my car? `1 "cars_not_spaceships" setContext`

"Car"? Is that what you call spaceships?

* `1 "cars_not_spaceships" getContext eq` No; cars are something different entirely. They're on wheels. We don't have spaceships; not really at least. `2 "cars_not_spaceships" setContext`

You don't have spaceships!? Wow! How do you people even get to space?

* `2 "cars_not_spaceships" getContext eq` [We don't go to space. Well, not really. Most of us don't. Some do. It's complicated.](#now_what)

Oh, I see this bothers you.
`"asked_about_glowy_bits" getContext jgz {`
Just like our glowy bits bother us when you ask about it.
`}`
We won't mention cars again. Sorry.

# now_what

* `@once` So, who are you? `1 "know_alien_name" setContext`

We are the Humsters. We're intergalactical space travellers! Awesome, huh?

* `@once` `"know_alien_name" getContext 1 eq "know_about_cheese" getContext 0 eq and` "Humsters"? That's a bit of a weird name. Sounds familiar.

Yeah, some other humanoid-like creature gave it to us. We don't really know why.

* `@once` `"know_alien_name" getContext 1 eq "know_about_cheese" getContext 1 eq and` [Oh, no. You're called "Humsters" because you're like Hamsters and like cheese!?](#about_hamsters)

```comment
If you know both their name AND about cheese, you can connect the dots.
```

Huh? "Hamsters"? That name sounds just like ours... What are "Hamsters"? Are they also intergalactical space travellers!? We'd love to get to meet more advanced species that also travel across space!

* `@once` What are you doing in our solar system? `1 "know_about_cheese" setContext`

We're just travelling and looking for cheese.

* `@once` `"know_about_cheese" getContext` Cheese?

Yeah, we love cheese!

* I have had enough. Goodbye!

Goodbye, human!

`exit`

# about_hamsters

* [Hamsters are AWESOME](#awesome_hamsters)

Wow, they sound amazing!

* [Hamsters aren't particularly awesome](#bad_hamsters)
* Oh, look at my watch, it's time to go. Goodbye!

What is a watch?
Oh... You are already gone.
Well, goodbye then.

`exit`

# awesome_hamsters

Can you tell us more about hamsters please?

* `@once` Hamsters have soft hair `"details_about_hamsters" getContext 1 + "details_about_hamsters" setContext`

We have soft hair!

* `@once` Hamsters have cute eyes `"details_about_hamsters" getContext 1 + "details_about_hamsters" setContext`

We have cute eyes!

* `@once` Hamsters have a fuzzy tail `"details_about_hamsters" getContext 1 + "details_about_hamsters" setContext`

We have a fuzzy tail!

* `@once` `"details_about_hamsters" getContext 3 eq` [Hamsters are great at running in wheels](#humsters_are_hamsters)

WE ARE GREAT AT RUNNING IN WHEELS!

Wow, Human! It seems that we just discovered something AWESOME.

WE.
ARE.
HAMSTERS!
Not Humsters!

Wow!

# bad_hamsters

* `@once` Hamsters smell `"bad_details_about_hamsters" getContext 1 + "bad_details_about_hamsters" setContext`

Are you sure about this?

* `@once` Hamsters poop `"bad_details_about_hamsters" getContext 1 + "bad_details_about_hamsters" setContext`

Are you sure about this?

* `@once` Hamsters make lots of noise `"bad_details_about_hamsters" getContext 1 + "bad_details_about_hamsters" setContext`

Are you sure about this?

* `@once` `"bad_details_about_hamsters" getContext 3 eq` [Hmm, you're right, I might be wrong about hamsters. Now they actually sound pretty awesome](#awesome_hamsters)

Wow, I'm sure!

# humsters_are_hamsters

* Wow, that's amazing.

Sure is! I'm glad we managed to figure that out, Human!

Now, it seems that it is time for us to run around in a hamster wheel.

Goodbye, human!

`"goodbye" goto`

# goodbye

* Goodbye, humsters! `exit`




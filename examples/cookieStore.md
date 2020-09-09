# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "main",
      "initial-context": {
        "cookies": 1
      }
    }

# main

`"NORMAL_HELLO_" 2 randInt 65 + charCode rconcat goto`

# NORMAL_HELLO_A

Hello, random person!

* [Buy cookie](#buyCookie)
* `precondition` [link](#link) `effect`
* `precondition` text `effect`
* Leave the store `"exit" goto`

# NORMAL_HELLO_B

Sorry, we have no cookies anymore!
`exit`

# buyCookie

Buying cookie...
`"cookies" getContext 1 + "cookies" setContext`
You now have `"cookies" getContext` cookies!
`"main" goto`

# exit

"See you again!"
`exit`
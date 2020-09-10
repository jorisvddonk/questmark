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
You have `"cookies" getContext emit` cookies!

* [Buy cookie](#buyCookie)
* [Eat cookie](#NORMAL_HELLO_A) `"cookies" getContext 1 - "cookies" setContext "You eat a cookie" emit`
* Leave the store `"exit" goto`

# NORMAL_HELLO_B

Sorry, we have no cookies in store today!
`exit`

# buyCookie

Buying cookie...
`"cookies" getContext 1 + "cookies" setContext`
You now have `"cookies" getContext emit` cookies!
`"NORMAL_HELLO_A" goto`

# exit

See you again!
`exit`
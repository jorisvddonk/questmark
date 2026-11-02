# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "name": "Ada", "coins": 3 }
    }

# start

`"name" getContext emit` has `"coins" getContext emit` coins.
* Buy something `1 "coins" getContext - "coins" setContext`

  Bought one.

* [Leave](#end)

# end

`"coins" getContext emit` coins left.
`exit`

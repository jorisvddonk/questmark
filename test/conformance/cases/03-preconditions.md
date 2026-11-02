# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "camp",
      "initial-context": { "wood": 0 }
    }

# camp

Wood: `"wood" getContext emit`.
* Gather wood `1 "wood" getContext + "wood" setContext`

  You gather wood.

* `1 "wood" getContext gt` Light the fire

  The fire burns.

* [Leave](#end)

# end

You leave the camp.
`exit`

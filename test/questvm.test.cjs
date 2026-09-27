const test = require("node:test");
const assert = require("node:assert/strict");
const { compile, run, normalize } = require("./helpers.cjs");

const NAVIGATION = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start"
    }

# start

Hello there!
* [Go north](#north)
* [Go south](#south)

# north

You went north!
\`exit\`

# south

You went south!
\`exit\`
`;

test("emits state text and offers the state's options", async () => {
  const { emitted, choicesSeen, vm } = await run(NAVIGATION, ["Go north"]);
  assert.ok(normalize(emitted).includes("Hello there!"));
  assert.deepEqual(choicesSeen, [["Go north", "Go south"]]);
  assert.equal(vm.exit, true);
});

test("navigates to a linked state", async () => {
  const { emitted } = await run(NAVIGATION, ["Go north"]);
  assert.ok(normalize(emitted).includes("You went north!"));
  assert.ok(!normalize(emitted).includes("You went south!"));
});

test("navigates to a different linked state", async () => {
  const { emitted } = await run(NAVIGATION, ["Go south"]);
  assert.ok(normalize(emitted).includes("You went south!"));
  assert.ok(!normalize(emitted).includes("You went north!"));
});

const POST_OPTION_EMIT = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start"
    }

# start

Main text
* Choose A

After choosing A.
\`exit\`
* Choose B

After choosing B.
\`exit\`
`;

test("emits post-option text when an option is selected", async () => {
  const { emitted } = await run(POST_OPTION_EMIT, ["Choose A"]);
  const normalized = normalize(emitted);
  assert.ok(normalized.includes("After choosing A."));
  assert.ok(!normalized.includes("After choosing B."));
});

const ONCE = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start"
    }

# start

Start text
* \`@once\` Greet again

Hi again!
* Leave \`exit\`
`;

test("@once options are only offered once", async () => {
  const { emitted, choicesSeen } = await run(ONCE, ["Greet again", "Leave"]);
  assert.ok(normalize(emitted).includes("Hi again!"));
  assert.deepEqual(choicesSeen, [
    ["Greet again", "Leave"],
    ["Leave"],
  ]);
});

const PRECONDITION = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "door_open": 0 }
    }

# start

Start text
* [Unlock the door](#unlock)
* \`"door_open" getContext\` [Go through the door](#through)

# unlock

You unlock the door.
\`1 "door_open" setContext\`
\`"start" goto\`

# through

You go through the door.
\`exit\`
`;

test("preconditions hide options until the context allows them", async () => {
  const { emitted, choicesSeen } = await run(PRECONDITION, [0, 1]);
  assert.deepEqual(choicesSeen, [
    ["Unlock the door"],
    ["Unlock the door", "Go through the door"],
  ]);
  const normalized = normalize(emitted);
  assert.ok(normalized.includes("You unlock the door."));
  assert.ok(normalized.includes("You go through the door."));
});

const CONTEXT_TEXT = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "cookies": 3 }
    }

# start

You have \`"cookies" getContext emit\` cookies!
* Exit \`exit\`
`;

test("initial-context values can be emitted as text", async () => {
  const { emitted } = await run(CONTEXT_TEXT, ["Exit"]);
  assert.ok(normalize(emitted).includes("You have 3 cookies!"));
});

test("compiled VMState survives a JSON round-trip", async () => {
  const state = compile(CONTEXT_TEXT);
  const roundTripped = JSON.parse(JSON.stringify(state));
  const { emitted, vm } = await run(roundTripped, ["Exit"]);
  assert.ok(normalize(emitted).includes("You have 3 cookies!"));
  assert.equal(vm.exit, true);
});

const NO_LINK_EXIT = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "options": { "no_link_behaviour": "exit" }
    }

# start

Just standing here.
* Just an observation
`;

test("no_link_behaviour exit ends the quest when an option has no link or effect", async () => {
  const { emitted, vm } = await run(NO_LINK_EXIT, [0]);
  assert.equal(vm.exit, true);
  assert.ok(normalize(emitted).includes("Just standing here."));
});

test("exits when a state runs an exit opcode", async () => {
  const { vm } = await run(CONTEXT_TEXT, ["Exit"]);
  assert.equal(vm.exit, true);
});
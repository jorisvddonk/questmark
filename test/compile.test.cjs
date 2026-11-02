const test = require("node:test");
const assert = require("node:assert/strict");
const { compile } = require("./helpers.cjs");
const { parseMarkdown } = require("../dist/node/parseMarkdown.js");

const BASIC = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "cookies": 3 }
    }

# start

You have \`"cookies" getContext emit\` cookies!
* [Go north](#north)
* Go away \`exit\`

# north

You went north!
\`exit\`
`;

const INST_FN = "invoke-function-instruction";
const INST_PUSH_NUM = "push-number-instruction";
const INST_PUSH_STR = "push-string-instruction";

test("compiles state labels", () => {
  const state = compile(BASIC);
  assert.ok(state.labelMap["start"] !== undefined, "start label present");
  assert.ok(state.labelMap["start__options"] !== undefined, "start__options label present");
  assert.ok(state.labelMap["north"] !== undefined, "north label present");
});

test("compiles initial-context into setContext instructions", () => {
  const state = compile(BASIC);
  assert.deepEqual(
    state.programList.slice(0, 3).map((i) => ({
      type: i.type,
      value: i.value,
      functionName: i.functionName,
    })),
    [
      { type: INST_PUSH_NUM, value: 3, functionName: undefined },
      { type: INST_PUSH_STR, value: "cookies", functionName: undefined },
      { type: INST_FN, value: undefined, functionName: "setContext" },
    ]
  );
});

test("compiles initial-state into a goto instruction", () => {
  const state = compile(BASIC);
  const last = state.programList.slice(3, 5);
  assert.equal(last[0].type, INST_PUSH_STR);
  assert.equal(last[0].value, "start");
  assert.equal(last[1].type, INST_FN);
  assert.equal(last[1].functionName, "goto");
});

test("compiles options into response and getResponse instructions", () => {
  const state = compile(BASIC);
  const fns = state.programList.filter((i) => i.type === INST_FN).map((i) => i.functionName);
  assert.ok(fns.includes("response"), "contains response opcode");
  assert.ok(fns.includes("getResponse"), "contains getResponse opcode");
});

test("no_link_behaviour exit emits an exit opcode for effectless options", () => {
  const md = `
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
  const state = compile(md);
  const fns = state.programList.filter((i) => i.type === INST_FN).map((i) => i.functionName);
  assert.ok(fns.includes("exit"), "contains exit opcode");
});

test("rejects documents with unknown no_link_behaviour", () => {
  const md = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "options": { "no_link_behaviour": "banana" }
    }

# start

* [x](#y)

# y
`;
  assert.throws(() => compile(md), /no_link_behaviour/);
});

test("compiles empty input to an empty program that just exits", () => {
  const state = compile("");
  assert.deepEqual(state.labelMap, {});
  const fns = state.programList.filter((i) => i.type === INST_FN).map((i) => i.functionName);
  assert.ok(fns.includes("exit"));
});

test("returns the parsed document tree with positions removed", () => {
  const { parsedMDFile, qvmState } = parseMarkdown(BASIC);

  assert.equal(parsedMDFile.type, "questmarkDocument");
  const states = parsedMDFile.children.filter((node) => node.type === "state");
  assert.deepEqual(states.map((state) => state.name), ["start", "north"]);
  assert.equal(states[0].position, undefined);

  const [northOption, exitOption] = states[0].options;
  assert.equal(northOption.text, "Go north");
  assert.equal(northOption.link, "#north");
  assert.equal(northOption.directives, null);
  assert.equal(exitOption.text, "Go away");
  assert.equal(exitOption.link, null);

  assert.equal(typeof qvmState.labelMap.start, "number");
  assert.equal(typeof qvmState.labelMap.north, "number");
});
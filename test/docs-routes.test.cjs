const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("./helpers.cjs");

const ROOT = path.join(__dirname, "..");

function playgroundDocuments(file) {
  const markdown = fs.readFileSync(path.join(ROOT, file), "utf8");
  const fence = /^(`{3,})(?:markdown)?\s*\{playground\}\s*\n([\s\S]*?)^\1\s*$/gm;
  return [...markdown.matchAll(fence)].map((match) => match[2]);
}

async function play(file, index, picks) {
  const { emitted, errors } = await run(playgroundDocuments(file)[index], picks);
  assert.deepEqual(
    errors.map((error) => error.message),
    [],
    "route should run without interpreter errors"
  );
  return emitted;
}

test("branching dialogue: trust route reaches the friendly ending", async () => {
  const emitted = await play("docs/tutorials/branching-dialogue.md", 1, [
    "Ask about the crossing",
    "Ask something else",
    "Ask about the ferry",
    "Ask something else",
    "Ask why she left the capital",
    "Ask something else",
    "Ask for passage",
    "Tell her the truth",
  ]);

  assert.match(emitted, /Water's high/);
  assert.match(emitted, /Built her myself/);
  assert.match(emitted, /I had a shop/);
  assert.match(emitted, /Get in\. No charge/);
  assert.match(emitted, /You tell her everything/);
});

test("text adventure: the key route escapes through the gate", async () => {
  const emitted = await play("docs/tutorials/text-adventure.md", 0, [
    "Take the torch from the gatehouse wall",
    "Go down to the cellar",
    "Take the iron key",
    "Go back up",
    "Try the gate",
    "Unlock the gate",
  ]);

  assert.match(emitted, /You lift the torch/);
  assert.match(emitted, /cold iron key/);
  assert.match(emitted, /The iron key turns/);
});

test("text adventure: three searches fund the bribe route", async () => {
  const emitted = await play("docs/tutorials/text-adventure.md", 0, [
    "Take the torch from the gatehouse wall",
    "Search the weeds",
    "Search the weeds",
    "Search the weeds",
    "Try the gate",
    "Bribe the gatekeeper",
  ]);

  assert.match(emitted, /silver coin/);
  assert.match(emitted, /Three silver coins change hands/);
});

test("language reference example: topics raise trust and unlock the favour", async () => {
  const emitted = await play("docs/reference/language.md", 0, [
    "Ask about the crossing",
    "Ask about the weather",
    "Ask for a favour",
  ]);

  assert.match(emitted, /Last one tonight/);
  assert.match(emitted, /It will clear/);
  assert.match(emitted, /No charge/);
});

test("context tutorial: the foraging loop reaches the fire ending", async () => {
  const emitted = await play("docs/tutorials/context-and-state.md", 1, [
    "Gather wood",
    "Gather wood",
    "Gather wood",
    "Light the fire",
    "Sleep in the cold",
  ]);

  assert.match(emitted, /dry branch/);
  assert.match(emitted, /The fire catches/);
  assert.match(emitted, /stiff and cold/);
});

test("numbers tutorial: eating is gated on having an apple", async () => {
  const { choicesSeen } = await run(
    playgroundDocuments("docs/tutorials/numbers-strings-and-randomness.md")[1],
    ["Buy an apple", "Eat an apple", "Leave"]
  );

  assert.deepEqual(choicesSeen[0], ["Buy an apple", "Leave"]);
  assert.ok(choicesSeen[1].includes("Eat an apple"));
});

test("numbers tutorial: the dice check totals both dice", async () => {
  const { emitted } = await run(
    playgroundDocuments("docs/tutorials/numbers-strings-and-randomness.md")[3],
    ["Roll the dice", "Walk away"]
  );

  const match = emitted.match(/You roll (\d+)/);
  assert.ok(match, `expected a roll in ${JSON.stringify(emitted)}`);
  const total = Number(match[1]);
  assert.ok(total >= 2 && total <= 12, `expected 2..12, got ${total}`);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { run, normalize } = require("./helpers.cjs");

const spaceAlien = fs.readFileSync(path.join(__dirname, "..", "examples", "space_alien.md"), "utf8");

test("space_alien can be played through to the ending", async () => {
  const { emitted, choicesSeen, errors } = await run(spaceAlien, [
    "What happened?",
    "Err... Spaceship? I don't have a spaceship. You mean my car?",
    "No; cars are something different entirely. They're on wheels. We don't have spaceships; not really at least.",
    "We don't go to space. Well, not really. Most of us don't. Some do. It's complicated.",
    "So, who are you?",
    "What are you doing in our solar system?",
    "I have had enough. Goodbye!",
  ]);

  assert.deepEqual(errors, []);
  const normalized = normalize(emitted);
  assert.ok(normalized.includes("Well, we were zipping around space"));
  assert.ok(normalized.includes("We are the Humsters."));
  assert.ok(normalized.includes("We're just travelling and looking for cheese."));
  assert.ok(normalized.includes("Goodbye, human!"));
  assert.ok(choicesSeen.length >= 7, `expected at least 7 choice prompts, got ${choicesSeen.length}`);
});

test("space_alien offers the right options as context evolves", async () => {
  const { choicesSeen } = await run(spaceAlien, ["What happened?"]);
  // After landing in what_happen with cars_not_spaceships = 0, only the first
  // option should be available (the rest are hidden by preconditions).
  assert.deepEqual(choicesSeen[1], ["Err... Spaceship? I don't have a spaceship. You mean my car?"]);
});
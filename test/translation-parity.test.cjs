const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { compareDocumentStructure } = require("../dist/node/index.js");

const FIXTURES = path.join(__dirname, "fixtures", "translations");
const english = fs.readFileSync(path.join(FIXTURES, "en.md"), "utf8");
const french = fs.readFileSync(path.join(FIXTURES, "fr.md"), "utf8");

function differences(translated) {
  return compareDocumentStructure(english, translated);
}

function has(differences, pathPart, messagePart) {
  return differences.some(
    (difference) =>
      difference.path.includes(pathPart) &&
      (!messagePart || difference.message.includes(messagePart))
  );
}

test("a translated document with the same structure passes", () => {
  assert.deepEqual(differences(french), []);
});

test("translated prose, labels, post-option text, and string context may differ", () => {
  // The fixtures already translate all of those, including name: "Ada" → "Adèle".
  assert.deepEqual(differences(french), []);
});

test("a changed option link is reported", () => {
  const translated = french.replace("[Partir](#end)", "[Partir](#start)");
  const result = differences(translated);
  assert.ok(has(result, "state[0].option[1].link"), JSON.stringify(result));
});

test("changed effect code is reported", () => {
  const translated = french.replace(
    '`1 "coins" getContext - "coins" setContext`',
    '`1 "coins" hasContext - "coins" setContext`'
  );
  const result = differences(translated);
  assert.ok(has(result, "state[0].option[0].effects", "hasContext"), JSON.stringify(result));
});

test("changed state-text code is reported", () => {
  const translated = french.replace("Bienvenue, Adèle.", "Bienvenue, Adèle. `1 emit`");
  const result = differences(translated);
  assert.ok(has(result, "state[0].code", "inline:1 emit"), JSON.stringify(result));
});

test("a different option count is reported", () => {
  const translated = french.replace("* [Partir](#end)\n", "");
  const result = differences(translated);
  assert.ok(has(result, "state[0].options", "option count"), JSON.stringify(result));
});

test("a changed state name is reported", () => {
  const translated = french.replace("# end", "# fin");
  const result = differences(translated);
  assert.ok(has(result, "state[1].name"), JSON.stringify(result));
});

test("a missing initial-context key is reported", () => {
  const translated = french.replace('"name": "Adèle", "coins": 3', '"coins": 3');
  const result = differences(translated);
  assert.ok(has(result, "header.initial-context.name", "missing in translation"), JSON.stringify(result));
});

test("a changed numeric context value is reported but a translated string is not", () => {
  const numeric = differences(french.replace('"coins": 3', '"coins": 4'));
  assert.ok(has(numeric, "header.initial-context.coins", "number differs"), JSON.stringify(numeric));

  const stringChanged = differences(french.replace('"name": "Adèle"', '"name": "Ada"'));
  assert.deepEqual(stringChanged, []);
});

test("changed header options are reported", () => {
  const translated = french.replace(
    '"initial-context": { "name": "Adèle", "coins": 3 }',
    '"initial-context": { "name": "Adèle", "coins": 3 }, "options": { "no_link_behaviour": "exit" }'
  );
  const result = differences(translated);
  assert.ok(has(result, "header.options.no_link_behaviour", "exit"), JSON.stringify(result));
});

test("a changed directive is reported", () => {
  const translated = french.replace("* Acheter quelque chose", "* `@once` Acheter quelque chose");
  const result = differences(translated);
  assert.ok(has(result, "state[0].option[0].directives", "@once"), JSON.stringify(result));
});

test("a changed initial-state is reported", () => {
  const translated = french.replace('"initial-state": "start"', '"initial-state": "end"');
  const result = differences(translated);
  assert.ok(has(result, "header.initial-state"), JSON.stringify(result));
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("./helpers.cjs");

const CASES = path.join(__dirname, "conformance", "cases");

function caseFiles(extension) {
  return fs
    .readdirSync(CASES)
    .filter((file) => file.endsWith(extension))
    .sort();
}

function publicContext(context) {
  const result = {};
  for (const [key, value] of Object.entries(context)) {
    if (!key.startsWith("__")) {
      result[key] = value;
    }
  }
  return result;
}

test("every conformance case has a document and a definition", () => {
  const documents = caseFiles(".md").map((file) => file.slice(0, -3));
  const definitions = caseFiles(".json").map((file) => file.slice(0, -5));

  assert.deepEqual(
    definitions,
    documents,
    "every .json definition needs a matching .md document and vice versa"
  );
  assert.ok(definitions.length >= 10, `expected at least 10 conformance cases, found ${definitions.length}`);
});

for (const file of caseFiles(".json")) {
  const name = file.slice(0, -5);
  const definition = JSON.parse(fs.readFileSync(path.join(CASES, file), "utf8"));
  const source = fs.readFileSync(path.join(CASES, `${name}.md`), "utf8");

  test(`conformance: ${name}`, async () => {
    assert.equal(typeof definition.description, "string", "case needs a description");
    assert.ok(Array.isArray(definition.choices), "case needs a choices array");
    assert.ok(definition.expected && typeof definition.expected === "object", "case needs expected results");

    const { emitted, choicesSeen, errors, vm } = await run(source, definition.choices);

    assert.deepEqual(errors.map((error) => error.message), [], "the document should run without errors");
    assert.equal(emitted, definition.expected.emitted, "emitted text should match exactly");
    assert.deepEqual(choicesSeen, definition.expected.menus, "menus should match exactly");
    assert.equal(vm.exit, definition.expected.exit, "the VM should end in the expected state");
    assert.deepEqual(publicContext(vm.context), definition.expected.context, "public context should match");
    assert.deepEqual(vm.stack, definition.expected.stack, "the final stack should match");
  });
}

/**
 * Regenerate the expected results for every conformance case from the
 * reference implementation.
 *
 * Usage:
 *   npm run build
 *   node test/conformance/generate.cjs
 *
 * Review the diff before committing: this tool records what the reference does
 * today, including any behaviour that might be a bug worth fixing first.
 */
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("../helpers.cjs");

const CASES = path.join(__dirname, "cases");

function publicContext(context) {
  const result = {};
  for (const [key, value] of Object.entries(context)) {
    if (!key.startsWith("__")) {
      result[key] = value;
    }
  }
  return result;
}

(async () => {
  const definitions = fs
    .readdirSync(CASES)
    .filter((file) => file.endsWith(".json"))
    .sort();

  for (const file of definitions) {
    const name = file.slice(0, -5);
    const definitionPath = path.join(CASES, file);
    const definition = JSON.parse(fs.readFileSync(definitionPath, "utf8"));
    const source = fs.readFileSync(path.join(CASES, `${name}.md`), "utf8");

    if (!Array.isArray(definition.choices)) {
      throw new Error(`${file}: missing choices array`);
    }

    const { emitted, choicesSeen, errors, vm } = await run(source, definition.choices);
    if (errors.length > 0) {
      throw new Error(`${file}: ${errors.map((error) => error.message).join(", ")}`);
    }

    definition.expected = {
      emitted,
      menus: choicesSeen,
      exit: vm.exit,
      context: publicContext(vm.context),
      stack: vm.stack,
    };

    fs.writeFileSync(definitionPath, `${JSON.stringify(definition, null, 2)}\n`);
    console.log(`updated ${file}`);
  }
})();

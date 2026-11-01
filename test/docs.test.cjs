const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { compile } = require("./helpers.cjs");
const { QuestVM } = require("../dist/node/QuestVM.js");

const ROOT = path.join(__dirname, "..");

function walk(dir, extension) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".vitepress" || entry.name === "dist") {
        continue;
      }
      files.push(...walk(full, extension));
    } else if (entry.name.endsWith(extension)) {
      files.push(full);
    }
  }
  return files;
}

function extractPlaygrounds(markdown) {
  const documents = [];
  const fence = /^(`{3,})(?:markdown)?\s*\{playground\}\s*\n([\s\S]*?)^\1\s*$/gm;
  let match;
  while ((match = fence.exec(markdown)) !== null) {
    documents.push(match[2]);
  }
  return documents;
}

/**
 * Compile a document and let it run until it reaches the first menu. Pick the
 * first option, let that effect run, then end the playthrough. This exercises
 * the compiler, the first state, and one choice without depending on the
 * document's full route.
 */
function playOneStep(markdown) {
  return new Promise((resolve) => {
    const state = compile(markdown);
    const emitted = [];
    const errors = [];
    const choicesSeen = [];
    let finished = false;
    let timer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer !== null) clearTimeout(timer);
      resolve({ emitted, errors, choicesSeen });
    };

    let picked = false;

    const vm = new QuestVM(
      (body) => emitted.push(String(body)),
      async (choices) => {
        choicesSeen.push(choices.map((choice) => choice.title));
        if (choices.length === 0) {
          errors.push(new Error("the document offered an empty menu"));
          finish();
          return 0;
        }

        if (picked) {
          // The first choice led straight to another menu. Stop here; this
          // test only exercises one choice, not a full route.
          finish();
          return new Promise(() => {});
        }

        picked = true;
        setImmediate(() => {
          vm.exit = true;
          finish();
        });
        return choices[0].id;
      },
      {}
    );

    vm.eventBus.on("error", (error) => {
      errors.push(error);
      finish();
    });

    try {
      vm.loadVMState(state);
      vm.run();
    } catch (error) {
      errors.push(error);
      finish();
      return;
    }

    if (vm.exit) {
      finish();
      return;
    }

    // A document that never asks for a choice should still terminate.
    timer = setTimeout(() => {
      vm.exit = true;
      finish();
    }, 1000);
  });
}

const tutorialFiles = walk(path.join(ROOT, "docs"), ".md");
let playgroundCount = 0;

for (const file of tutorialFiles) {
  const relative = path.relative(ROOT, file);
  const markdown = fs.readFileSync(file, "utf8");
  const documents = extractPlaygrounds(markdown);

  documents.forEach((document, index) => {
    playgroundCount += 1;
    test(`playable document: ${relative} [${index + 1}]`, async () => {
      assert.match(document, /# QUESTMARK-OPTIONS-HEADER/, "playable documents need an options header");
      assert.match(document, /"initial-state"/, "playable documents need an initial-state");

      const state = compile(document);
      assert.ok(state.programList.length > 0, "compiled program should not be empty");

      const { emitted, errors, choicesSeen } = await playOneStep(document);
      assert.deepEqual(
        errors.map((error) => error.message),
        [],
        "document should run without interpreter errors"
      );
      assert.ok(
        emitted.join("").trim().length > 0 || choicesSeen.length > 0,
        "document should emit text or offer a choice"
      );
    });
  });
}

test("the documentation contains playable examples", () => {
  assert.ok(playgroundCount >= 10, `expected at least 10 playable documents, found ${playgroundCount}`);
});

// The examples are offered in the playground's example menu, so they must play.
const exampleFiles = walk(path.join(ROOT, "examples"), ".md");
for (const file of exampleFiles) {
  const relative = path.relative(ROOT, file);
  test(`plays example: ${relative}`, async () => {
    const markdown = fs.readFileSync(file, "utf8");
    compile(markdown);
    const { errors } = await playOneStep(markdown);
    assert.deepEqual(
      errors.map((error) => error.message),
      [],
      "example should run without interpreter errors"
    );
  });
}

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseMarkdown,
  extractCatalog,
  missingTranslations,
  validateCatalog,
} = require("../dist/node/index.js");
const { QuestVM } = require("../dist/node/QuestVM.js");

const DOCUMENT = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "name": "Ada", "coins": 3 }
    }

# start

Hello {{name}}, you have {{coins}} coins.
* [Buy for 2](#buy) \`1 "coins" getContext - "coins" setContext\`

  Bought one. Now {{coins}} coins.

* [Leave](#end)

# buy

A purchase.
* [Back](#start)

# end

Bye, {{name}}.
\`exit\`
`;

function frenchCatalog() {
  const catalog = extractCatalog(DOCUMENT, "fr");
  catalog.messages["start.text.0"].translation = "Vous avez {{coins}} pièces, {{name}}.";
  catalog.messages["start.option.0.label"].translation = "Acheter";
  catalog.messages["start.option.0.text.0"].translation = "Acheté. Maintenant {{coins}} pièces.";
  catalog.messages["start.option.1.label"].translation = "Partir";
  catalog.messages["buy.text.0"].translation = "Un achat.";
  catalog.messages["buy.option.0.label"].translation = "Retour";
  catalog.messages["end.text.0"].translation = "Au revoir, {{name}}.";
  return catalog;
}

function play(compiled, picks, { beforeRun, onMenu } = {}) {
  const state = structuredClone(compiled.qvmState);
  const emitted = [];
  const menus = [];

  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve({ emitted: emitted.join(""), menus, vm });
    };

    let pickIndex = 0;
    const vm = new QuestVM(
      (text) => emitted.push(String(text)),
      async (choices) => {
        menus.push(choices.map((choice) => choice.title));
        onMenu?.(vm, menus.length, choices);
        const pick = picks[pickIndex];
        pickIndex += 1;
        if (pick === undefined) {
          reject(new Error(`No pick for menu ${JSON.stringify(menus)}`));
          return new Promise(() => {});
        }
        if (typeof pick === "number") {
          return choices[pick].id;
        }
        const choice = choices.find((candidate) => candidate.title === pick);
        if (choice === undefined) {
          reject(new Error(`Choice ${pick} not offered: ${JSON.stringify(menus)}`));
          return new Promise(() => {});
        }
        return choice.id;
      }
    );

    beforeRun?.(vm);
    vm.eventBus.on("error", reject);
    vm.loadVMState(state);
    vm.run();

    const started = Date.now();
    const check = () => {
      if (vm.exit) return finish();
      if (Date.now() - started > 3000) return reject(new Error("VM did not exit"));
      setTimeout(check, 10);
    };
    check();
  });
}

test("localize compiles message references and stores source templates", () => {
  const { qvmState, messages } = parseMarkdown(DOCUMENT, { localize: true });

  assert.equal(typeof qvmState.messages["start.text.0"], "string");
  assert.equal(qvmState.messages["start.text.0"], "Hello {{name}}, you have {{coins}} coins.");
  assert.equal(qvmState.messages["start.option.0.label"], "Buy for 2");
  assert.equal(messages.length, 7);
  assert.ok(
    qvmState.programList.some(
      (instruction) =>
        instruction.type === "invoke-function-instruction" && instruction.functionName === "message"
    )
  );
});

test("a localized build falls back to the source templates", async () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const { emitted, menus } = await play(compiled, ["Buy for 2", "Back", "Leave"]);

  assert.ok(emitted.includes("Hello Ada, you have 3 coins."));
  assert.ok(emitted.includes("Acheté") === false);
  assert.deepEqual(menus[0], ["Buy for 2", "Leave"]);
});

test("setting a catalog before the run localizes everything", async () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const { emitted, menus } = await play(compiled, ["Acheter", "Retour", "Partir"], {
    beforeRun: (vm) => vm.setCatalog(frenchCatalog()),
  });

  assert.ok(emitted.includes("Vous avez 3 pièces, Ada."));
  assert.ok(emitted.includes("Acheté. Maintenant 2 pièces."));
  assert.ok(emitted.includes("Au revoir, Ada."));
  assert.deepEqual(menus[0], ["Acheter", "Partir"]);
  assert.deepEqual(menus[1], ["Retour"]);
});

test("switching the catalog between turns changes the remaining text", async () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const catalog = frenchCatalog();

  const { emitted, menus } = await play(compiled, ["Buy for 2", "Retour", "Partir"], {
    onMenu: (vm, menuNumber) => {
      if (menuNumber === 1) {
        vm.setCatalog(catalog);
      }
    },
  });

  assert.ok(emitted.startsWith("Hello Ada, you have 3 coins."));
  assert.ok(emitted.includes("Acheté. Maintenant 2 pièces."));
  assert.ok(emitted.includes("Au revoir, Ada."));
  assert.deepEqual(menus[0], ["Buy for 2", "Leave"]);
  assert.deepEqual(menus[1], ["Retour"]);
});

test("runtime translations may reorder placeholders", async () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const catalog = frenchCatalog();
  catalog.messages["start.text.0"].translation = "{{coins}} pièces, {{name}}.";

  const { emitted } = await play(compiled, ["Acheter", "Retour", "Partir"], {
    beforeRun: (vm) => vm.setCatalog(catalog),
  });
  assert.ok(emitted.startsWith("3 pièces, Ada."));
});

test("empty translations fall back to the source", async () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const catalog = frenchCatalog();
  catalog.messages["start.text.0"].translation = "";

  const { emitted } = await play(compiled, ["Acheter", "Retour", "Partir"], {
    beforeRun: (vm) => vm.setCatalog(catalog),
  });
  assert.ok(emitted.startsWith("Hello Ada, you have 3 coins."));
});

test("a translation with a missing placeholder fails at runtime", () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const catalog = frenchCatalog();
  catalog.messages["start.text.0"].translation = "Vous avez des pièces.";

  const vm = new QuestVM(() => {}, async () => 0);
  vm.setCatalog(catalog);
  vm.loadVMState(structuredClone(compiled.qvmState));
  assert.throws(() => vm.run(), /missing placeholder "\{\{name\}\}"/);
});

test("a stale catalog source fails at runtime", () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const catalog = frenchCatalog();
  catalog.messages["start.text.0"].source = "An older sentence.";

  const vm = new QuestVM(() => {}, async () => 0);
  vm.setCatalog(catalog);
  vm.loadVMState(structuredClone(compiled.qvmState));
  assert.throws(() => vm.run(), /Catalog source mismatch for "start\.text\.0"/);
});

test("unknown message ids and missing context keys throw", () => {
  const compiled = parseMarkdown(DOCUMENT, { localize: true });
  const vm = new QuestVM(() => {}, async () => 0);
  vm.loadVMState(structuredClone(compiled.qvmState));

  assert.throws(() => vm.formatMessage("nope", {}), /unknown message id/);
  assert.throws(() => vm.formatMessage("start.text.0", {}), /missing context key "name"/);
});

test("validateCatalog checks the runtime catalog shape", () => {
  assert.throws(() => validateCatalog({ version: 2, locale: "fr", messages: {} }), /Unsupported catalog version/);
  assert.throws(() => validateCatalog({ version: 1, locale: "", messages: {} }), /missing locale/);
  assert.throws(() => validateCatalog({ version: 1, locale: "fr", messages: [] }), /messages must be an object/);
});

test("extraction and missingTranslations work on complex docs", () => {
  const catalog = extractCatalog(DOCUMENT, "fr");
  assert.deepEqual(Object.keys(catalog.messages), [
    "start.text.0",
    "start.option.0.label",
    "start.option.0.text.0",
    "start.option.1.label",
    "buy.text.0",
    "buy.option.0.label",
    "end.text.0",
  ]);
  assert.deepEqual(missingTranslations(DOCUMENT, catalog), Object.keys(catalog.messages));
});

test("validateCatalogForDocument catches stale, unknown, and placeholder problems", () => {
  const { validateCatalogForDocument } = require("../dist/node/index.js");
  const catalog = frenchCatalog();
  assert.deepEqual(validateCatalogForDocument(DOCUMENT, catalog), []);

  catalog.messages["start.text.0"].source = "An older sentence.";
  catalog.messages["nope"] = { source: "Nope", translation: "Non" };
  catalog.messages["start.option.0.label"].translation = "Acheter {{price}}";
  const errors = validateCatalogForDocument(DOCUMENT, catalog);

  assert.ok(errors.some((error) => error.includes('source mismatch for "start.text.0"')));
  assert.ok(errors.some((error) => error.includes('unknown message id "nope"')));
  assert.ok(errors.some((error) => error.includes('unknown placeholder "{{price}}"')));
});

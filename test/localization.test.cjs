const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseMarkdown,
  extractCatalog,
  parseMarkdownForLocale,
  createCatalogTranslator,
  missingTranslations,
} = require("../dist/node/index.js");
const { run, normalize } = require("./helpers.cjs");

const DOCUMENT = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "name": "Ada", "coins": 3, "price": 2 }
    }

# start

Hello {{name}}, you have {{coins}} coins.
* [Buy for {{price}} coins](#buy) \`1 "coins" getContext - "coins" setContext\`

  Bought one. Now {{coins}} coins.

* [Leave](#end)

# buy

A purchase.
* [Back](#start)

# end

Bye.
\`exit\`
`;

function frenchCatalog() {
  const catalog = extractCatalog(DOCUMENT, "fr");
  catalog.messages["start.text.0"].translation = "Vous avez {{coins}} pièces, {{name}}.";
  catalog.messages["start.option.0.label"].translation = "Acheter pour {{price}} pièces";
  catalog.messages["start.option.0.text.0"].translation = "Acheté. Maintenant {{coins}} pièces.";
  catalog.messages["start.option.1.label"].translation = "Partir";
  catalog.messages["buy.text.0"].translation = "Un achat.";
  catalog.messages["buy.option.0.label"].translation = "Retour";
  catalog.messages["end.text.0"].translation = "Au revoir.";
  return catalog;
}

test("interpolation emits context values without a catalog", async () => {
  const { emitted, choicesSeen, errors } = await run(DOCUMENT, [
    "Buy for 2 coins",
    "Back",
    "Leave",
  ]);

  assert.deepEqual(errors, []);
  assert.ok(normalize(emitted).includes("Hello Ada, you have 3 coins."));
  assert.ok(normalize(emitted).includes("Bought one. Now 2 coins."));
  assert.deepEqual(choicesSeen[0], ["Buy for 2 coins", "Leave"]);
});

test("extraction produces path-based messages without trailing paragraph newlines", () => {
  const catalog = extractCatalog(DOCUMENT, "en");

  assert.equal(catalog.version, 1);
  assert.equal(catalog.locale, "en");
  assert.deepEqual(Object.keys(catalog.messages), [
    "start.text.0",
    "start.option.0.label",
    "start.option.0.text.0",
    "start.option.1.label",
    "buy.text.0",
    "buy.option.0.label",
    "end.text.0",
  ]);
  assert.equal(catalog.messages["start.text.0"].source, "Hello {{name}}, you have {{coins}} coins.");
  assert.equal(catalog.messages["start.text.0"].translation, "");
});

test("a catalog translates prose, labels, and post-option text", async () => {
  const catalog = frenchCatalog();
  const localized = parseMarkdownForLocale(DOCUMENT, catalog);

  const { emitted, choicesSeen, errors } = await run(localized.qvmState, [
    "Acheter pour 2 pièces",
    "Retour",
    "Partir",
  ]);

  assert.deepEqual(errors, []);
  assert.ok(normalize(emitted).includes("Vous avez 3 pièces, Ada."));
  assert.ok(normalize(emitted).includes("Acheté. Maintenant 2 pièces."));
  assert.ok(normalize(emitted).includes("Au revoir."));
  assert.deepEqual(choicesSeen[0], ["Acheter pour 2 pièces", "Partir"]);
  assert.deepEqual(choicesSeen[1], ["Retour"]);
});

test("translations may reorder placeholders", async () => {
  const catalog = extractCatalog(DOCUMENT);
  catalog.messages["start.text.0"].translation = "{{coins}} coins, {{name}}.";
  const localized = parseMarkdownForLocale(DOCUMENT, catalog);

  const { emitted } = await run(localized.qvmState, ["Buy for 2 coins", "Back", "Leave"]);
  assert.ok(normalize(emitted).startsWith("3 coins, Ada."));
});

test("a translation with a missing placeholder is rejected", () => {
  const catalog = extractCatalog(DOCUMENT);
  catalog.messages["start.text.0"].translation = "Vous avez des pièces.";

  assert.throws(
    () => parseMarkdownForLocale(DOCUMENT, catalog),
    /missing placeholder "\{\{name\}\}"/
  );
});

test("a translation with an unknown placeholder is rejected", () => {
  const catalog = extractCatalog(DOCUMENT);
  catalog.messages["start.text.0"].translation = "Bonjour {{nope}}.";

  assert.throws(
    () => parseMarkdownForLocale(DOCUMENT, catalog),
    /unknown placeholder "\{\{nope\}\}"/
  );
});

test("a stale catalog source is rejected", () => {
  const catalog = extractCatalog(DOCUMENT);
  catalog.messages["start.text.0"].source = "An older sentence.";

  assert.throws(
    () => parseMarkdownForLocale(DOCUMENT, catalog),
    /Catalog source mismatch for "start\.text\.0"/
  );
});

test("empty or missing translations fall back to the source", async () => {
  const empty = extractCatalog(DOCUMENT);
  const localized = parseMarkdownForLocale(DOCUMENT, empty);

  const { emitted, choicesSeen } = await run(localized.qvmState, [
    "Buy for 2 coins",
    "Back",
    "Leave",
  ]);
  assert.ok(normalize(emitted).includes("Hello Ada, you have 3 coins."));
  assert.deepEqual(choicesSeen[0], ["Buy for 2 coins", "Leave"]);
});

test("missingTranslations reports untranslated ids", () => {
  const catalog = frenchCatalog();
  assert.deepEqual(missingTranslations(DOCUMENT, catalog), []);

  catalog.messages["start.text.0"].translation = "";
  assert.deepEqual(missingTranslations(DOCUMENT, catalog), ["start.text.0"]);
});

test("createCatalogTranslator validates the catalog shape", () => {
  assert.throws(() => createCatalogTranslator({ version: 2, locale: "fr", messages: {} }), /Unsupported catalog version/);
  assert.throws(() => createCatalogTranslator({ version: 1, locale: "", messages: {} }), /missing locale/);
  assert.throws(() => createCatalogTranslator({ version: 1, locale: "fr", messages: [] }), /messages must be an object/);
});

test("messages expose their kind, state, and option index", () => {
  const { messages } = parseMarkdown(DOCUMENT);
  assert.deepEqual(messages[0], {
    id: "start.text.0",
    kind: "state-text",
    source: "Hello {{name}}, you have {{coins}} coins.",
    state: "start",
  });
  assert.equal(messages[1].kind, "option-label");
  assert.equal(messages[1].optionIndex, 0);
  assert.equal(messages[2].kind, "option-text");
});

test("a numeric placeholder-only label is coerced to a string", async () => {
  const markdown = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "price": 2 }
    }

# start

* [{{price}}](#end)
* [Leave](#end)

# end

Done.
\`exit\`
`;

  const { choicesSeen, errors } = await run(markdown, ["2"]);
  assert.deepEqual(errors, []);
  assert.deepEqual(choicesSeen[0], ["2", "Leave"]);
});

test("interpolation works with emit_on end_of_line", async () => {
  const markdown = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "name": "Ada" },
      "options": { "emit_on": "end_of_line" }
    }

# start

One {{name}}.
Two.
* [Done](#end)

# end

Done.
\`exit\`
`;

  const { emitted, errors } = await run(markdown, ["Done"]);
  assert.deepEqual(errors, []);
  assert.ok(normalize(emitted).includes("One Ada. Two."));
});

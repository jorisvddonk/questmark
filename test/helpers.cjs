const { parseMarkdown } = require("../dist/node/parseMarkdown.js");
const { QuestVM } = require("../dist/node/QuestVM.js");

function compile(md) {
  return parseMarkdown(md).qvmState;
}

function normalize(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

/**
 * Compile a questmark document (or accept a pre-compiled VMState) and run it
 * through a QuestVM, resolving each choice prompt from the `picks` array.
 *
 * A pick can be:
 *  - a number: the index of the choice to select
 *  - a string: the title of the choice to select (must be offered)
 *
 * Returns { emitted, vm, choicesSeen, errors }.
 */
async function run(md, picks = []) {
  const qvmState = typeof md === "string" ? compile(md) : md;
  const emitted = [];
  const choicesSeen = [];
  const errors = [];
  let pickIndex = 0;

  const vm = new QuestVM(
    (body) => emitted.push(String(body)),
    async (choiceList) => {
      choicesSeen.push(choiceList.map((c) => c.title));
      const pick = picks[pickIndex++];
      if (pick === undefined) {
        throw new Error(
          `VM asked for more choices than provided (${picks.length} picks given). Choices offered: ${JSON.stringify(choiceList.map((c) => c.title))}`
        );
      }
      if (typeof pick === "number") {
        const choice = choiceList[pick];
        if (choice === undefined) {
          throw new Error(`Choice index ${pick} out of range. Choices offered: ${JSON.stringify(choiceList.map((c) => c.title))}`);
        }
        return choice.id;
      }
      if (typeof pick === "string") {
        const choice = choiceList.find((c) => c.title === pick);
        if (choice === undefined) {
          throw new Error(`Choice "${pick}" was not offered. Choices offered: ${JSON.stringify(choiceList.map((c) => c.title))}`);
        }
        return choice.id;
      }
      throw new Error(`Unknown pick type: ${typeof pick}`);
    },
    {}
  );

  vm.eventBus.on("error", (e) => errors.push(e));
  vm.loadVMState(qvmState);
  vm.run();

  await new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      if (vm.exit) return resolve();
      if (Date.now() - started > 5000) {
        return reject(new Error("VM did not exit within 5s (possible infinite loop or deadlock)"));
      }
      setImmediate(check);
    };
    check();
  });

  return { emitted: emitted.join(""), vm, choicesSeen, errors };
}

module.exports = { compile, run, normalize };
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const BUNDLE = path.join(__dirname, "..", "dist", "browser", "bundle.js");

function fakeElement() {
  return {
    _html: "",
    set innerHTML(value) {
      this._html = value;
    },
    get textContent() {
      // Good enough for the named-character-reference helper: our fixtures do
      // not rely on entity decoding in the browser bundle test.
      return this._html;
    },
  };
}

test("browser bundle exposes Questmark and can play a document", async () => {
  assert.ok(fs.existsSync(BUNDLE), "dist/browser/bundle.js should be built before tests");

  const previousWindow = global.window;
  const previousDocument = global.document;

  global.window = global;
  global.document = { createElement: () => fakeElement() };

  try {
    delete require.cache[require.resolve(BUNDLE)];
    require(BUNDLE);

    const Questmark = global.Questmark;
    assert.equal(typeof Questmark, "object");
    assert.equal(typeof Questmark.parseMarkdown, "function");
    assert.equal(typeof Questmark.QuestVM, "function");

    const markdown = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start"
    }

# start

Hello from the browser bundle.
* [Finish](#end)

# end

Bye.
\`exit\`
`;

    const { qvmState } = Questmark.parseMarkdown(markdown);
    const emitted = [];
    const menus = [];

    const vm = new Questmark.QuestVM(
      (text) => emitted.push(String(text)),
      async (choices) => {
        menus.push(choices.map((choice) => choice.title));
        return choices[0].id;
      }
    );

    vm.loadVMState(qvmState);
    vm.run();

    await new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (vm.exit) {
          resolve();
        } else if (Date.now() - started > 3000) {
          reject(new Error("browser bundle VM did not exit"));
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });

    assert.deepEqual(menus, [["Finish"]]);
    assert.match(emitted.join(""), /Hello from the browser bundle\./);
    assert.match(emitted.join(""), /Bye\./);
    assert.deepEqual(vm.stack, []);
  } finally {
    delete require.cache[require.resolve(BUNDLE)];
    delete global.Questmark;
    global.window = previousWindow;
    global.document = previousDocument;
  }
});

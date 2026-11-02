const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseMarkdown } = require("../dist/node/parseMarkdown.js");
const { QuestVM } = require("../dist/node/QuestVM.js");

const ROOT = path.join(__dirname, "..");
const MAX_STEPS = 100;
const RANDOM_RUNS = 30;
const COVERAGE_RUNS = 20;
const WALK_TIMEOUT_MS = 1000;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".vitepress" || entry.name === "node_modules" || entry.name === "dist") {
        return [];
      }
      return walk(full);
    }
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

function extractPlaygrounds(markdown) {
  const fence = /^(`{3,})(?:markdown)?\s*\{playground\}\s*\n([\s\S]*?)^\1\s*$/gm;
  return [...markdown.matchAll(fence)].map((match) => match[2]);
}

function collectDocuments() {
  const documents = [];
  const examples = fs.existsSync(path.join(ROOT, "examples")) ? walk(path.join(ROOT, "examples")) : [];
  for (const file of examples) {
    documents.push({
      label: path.relative(ROOT, file),
      markdown: fs.readFileSync(file, "utf8"),
    });
  }
  for (const file of walk(path.join(ROOT, "docs"))) {
    extractPlaygrounds(fs.readFileSync(file, "utf8")).forEach((markdown, index) => {
      documents.push({
        label: `${path.relative(ROOT, file)} [${index + 1}]`,
        markdown,
      });
    });
  }
  return documents;
}

/**
 * Play one document along a seeded path. Records the VM stack at every menu
 * and at a natural exit. A non-empty stack at either point is a leak: the
 * compiler emits balanced code, so every value a document pushes should be
 * consumed before the player is asked to choose (or before the VM exits).
 */
function playWalk(compiled, runSeed, policy, chosenCounts) {
  return new Promise((resolve) => {
    const qvmState = structuredClone(compiled);
    const originalRandom = Math.random;
    const choiceRandom = mulberry32(runSeed);
    Math.random = mulberry32(runSeed ^ 0x9e3779b9);

    const leaks = [];
    const history = [];
    let steps = 0;
    let finished = false;
    let fallback = null;
    let failure = null;
    let vm;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (fallback !== null) clearTimeout(fallback);
      Math.random = originalRandom;
      resolve({ leaks, failure, history, capped: failure === "capped" });
    };

    const record = (phase) => {
      const stack = vm.stack.slice();
      if (stack.length > 0) {
        leaks.push({
          phase,
          stack,
          path: history.slice(-6),
          context: { ...vm.context },
        });
      }
    };

    try {
      vm = new QuestVM(
        () => {},
        async (choices) => {
          record("menu");
          if (steps >= MAX_STEPS) {
            failure = "capped";
            finish();
            return new Promise(() => {});
          }
          steps += 1;

          let choice;
          if (policy === "coverage") {
            const least = Math.min(...choices.map((c) => chosenCounts.get(c.title) || 0));
            const pool = choices.filter((c) => (chosenCounts.get(c.title) || 0) === least);
            choice = pool[Math.floor(choiceRandom() * pool.length)];
          } else {
            choice = choices[Math.floor(choiceRandom() * choices.length)];
          }
          chosenCounts.set(choice.title, (chosenCounts.get(choice.title) || 0) + 1);
          history.push(choice.title);

          // The VM resumes in a promise callback; look for a natural exit after it.
          setTimeout(() => {
            if (vm.exit) {
              record("exit");
              finish();
            }
          }, 0);
          return choice.id;
        },
        {}
      );

      vm.eventBus.on("error", (error) => {
        failure = `error: ${error.message}`;
        finish();
      });

      vm.loadVMState(qvmState);
      vm.run();

      if (vm.exit) {
        record("exit");
        finish();
      } else {
        fallback = setTimeout(() => {
          failure = "timeout";
          finish();
        }, WALK_TIMEOUT_MS);
      }
    } catch (error) {
      failure = `throw: ${error.message}`;
      finish();
    }
  });
}

test("every example keeps the VM stack clean on every sampled path", async () => {
  const documents = collectDocuments();
  assert.ok(documents.length > 0, "expected at least one example document");

  const failures = [];

  for (const document of documents) {
    let compiled;
    try {
      compiled = parseMarkdown(document.markdown).qvmState;
    } catch (error) {
      failures.push(`${document.label}: failed to compile: ${error.message}`);
      continue;
    }

    const chosenCounts = new Map();
    const walks = [
      ...Array.from({ length: RANDOM_RUNS }, (_, index) => ({ seed: 0x1000 + index, policy: "random" })),
      ...Array.from({ length: COVERAGE_RUNS }, (_, index) => ({ seed: 0x2000 + index, policy: "coverage" })),
    ];

    for (const { seed, policy } of walks) {
      const result = await playWalk(compiled, seed, policy, chosenCounts);
      if (result.failure && result.failure !== "capped") {
        failures.push(`${document.label}: ${result.failure} after ${JSON.stringify(result.history.slice(-6))}`);
      }
      for (const leak of result.leaks) {
        failures.push(
          `${document.label}: ${leak.phase} stack ${JSON.stringify(leak.stack)} after ${JSON.stringify(leak.path)} (context ${JSON.stringify(leak.context)})`
        );
      }
    }
  }

  assert.deepEqual(failures, [], `unclean stacks found:\n${failures.join("\n")}`);
});

test("the stack hygiene check detects a deliberate leak", async () => {
  const leaky = `
# QUESTMARK-OPTIONS-HEADER

    { "questmark-spec": "1.0", "initial-state": "start" }

# start

* [Leak a value](#end) \`1\`

# end

Done.
\`exit\`
`;

  const { qvmState } = parseMarkdown(leaky);
  const result = await playWalk(qvmState, 1, "random", new Map());

  assert.equal(result.failure, null);
  assert.ok(result.leaks.length > 0, "expected the detector to report the leftover value");
  assert.deepEqual(result.leaks[0].stack, [1]);
});

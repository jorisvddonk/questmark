const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const ROOT = path.join(__dirname, "..");
const BIN = path.join(ROOT, "bin", "questmark.mjs");

const PLAIN = `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start"
    }

# start

Hello from the CLI.
\`exit\`
`;

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "questmark-cli-"));
}

function runCli(args) {
  return execFileAsync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    timeout: 15000,
    maxBuffer: 4 * 1024 * 1024,
  });
}

test("CLI compiles a document to a VMState with --no-run", async () => {
  const dir = tempDir();
  try {
    const input = path.join(dir, "document.md");
    const output = path.join(dir, "vmstate.json");
    fs.writeFileSync(input, PLAIN);

    const { stdout } = await runCli(["--input", input, "--output", output, "--no-run"]);
    assert.equal(stdout, "");

    const state = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.ok(Array.isArray(state.programList));
    assert.ok(state.programList.length > 0);
    assert.equal(typeof state.labelMap.start, "number");
    assert.deepEqual(state.context, {});
    assert.equal(state.exit, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI compiles without writing output", async () => {
  const dir = tempDir();
  try {
    const input = path.join(dir, "document.md");
    fs.writeFileSync(input, PLAIN);

    const { stdout } = await runCli(["--input", input, "--no-run"]);
    assert.equal(stdout, "");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI plays a source document and a compiled document", async () => {
  const dir = tempDir();
  try {
    const input = path.join(dir, "document.md");
    const output = path.join(dir, "vmstate.json");
    fs.writeFileSync(input, PLAIN);

    const fromSource = await runCli(["--input", input]);
    assert.match(fromSource.stdout, /Hello from the CLI\./);

    await runCli(["--input", input, "--output", output, "--no-run"]);
    const fromCompiled = await runCli(["--input", output]);
    assert.match(fromCompiled.stdout, /Hello from the CLI\./);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI fetches a document over HTTP", async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/markdown" });
    response.end(PLAIN);
  });

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    const { stdout } = await runCli(["--input", `http://127.0.0.1:${port}/document.md`]);
    assert.match(stdout, /Hello from the CLI\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("CLI rejects a missing --input", async () => {
  await assert.rejects(runCli([]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stdout, /Missing input!/);
    return true;
  });
});

test("CLI rejects an unsupported extension", async () => {
  const dir = tempDir();
  try {
    const input = path.join(dir, "document.txt");
    fs.writeFileSync(input, PLAIN);

    await assert.rejects(runCli(["--input", input]), (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Program input file needs to have \.json or \.qmd/);
      return true;
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI reports its version", async () => {
  const { stdout } = await runCli(["--version"]);
  assert.match(stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("CLI extracts a catalog, compiles runtime messages, and localizes at play time", async () => {
  const dir = tempDir();
  try {
    const input = path.join(dir, "document.md");
    const catalogPath = path.join(dir, "fr.json");
    const output = path.join(dir, "localized.vmstate.json");
    fs.writeFileSync(
      input,
      `
# QUESTMARK-OPTIONS-HEADER

    {
      "questmark-spec": "1.0",
      "initial-state": "start",
      "initial-context": { "name": "Ada" }
    }

# start

Hello {{name}}, welcome.
\`exit\`
`
    );

    const extracted = await runCli(["--input", input, "--extract-catalog", catalogPath, "--locale", "fr"]);
    assert.match(extracted.stdout, /Extracted 1 message/);

    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
    assert.equal(catalog.messages["start.text.0"].source, "Hello {{name}}, welcome.");
    catalog.messages["start.text.0"].translation = "Bonjour {{name}}, bienvenue.";
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

    const fromSource = await runCli(["--input", input, "--catalog", catalogPath]);
    assert.match(fromSource.stdout, /Bonjour Ada, bienvenue\./);

    await runCli(["--input", input, "--localize", "--output", output, "--no-run"]);
    const state = JSON.parse(fs.readFileSync(output, "utf8"));
    assert.equal(state.messages["start.text.0"], "Hello {{name}}, welcome.");
    assert.ok(
      state.programList.some(
        (instruction) =>
          instruction.type === "invoke-function-instruction" && instruction.functionName === "message"
      )
    );

    const fromCompiledSource = await runCli(["--input", output]);
    assert.match(fromCompiledSource.stdout, /Hello Ada, welcome\./);

    const fromCompiledFrench = await runCli(["--input", output, "--catalog", catalogPath]);
    assert.match(fromCompiledFrench.stdout, /Bonjour Ada, bienvenue\./);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

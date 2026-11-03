#!/usr/bin/env node

import fs from "fs";
import { program } from "commander";
import { parseMarkdown } from "./parseMarkdown.js";
import { Choice, QuestVM } from "./QuestVM.js";
import { Catalog, extractCatalog, validateCatalog } from "./localization.js";
import { TzoVMState } from "tzo";

interface CliOptions {
  clear?: boolean;
  input?: string;
  output?: string;
  run?: boolean;
  localize?: boolean;
  catalog?: string;
  extractCatalog?: string;
  locale?: string;
}

program
  .version('0.0.37')
  .option('-c, --clear', 'Clear console on each state')
  .option('--input <path>', "Load source .md or .json file from path. Path can be either from local filesystem, or via HTTP(S) URL")
  .option('--output <path>', "Emit VMState .json file")
  .option('--localize', "Compile source text to runtime message references")
  .option('--catalog <path>', "Set a runtime localization catalog (for source or compiled input)")
  .option('--extract-catalog <path>', "Write a localization catalog for the source document and exit")
  .option('--locale <code>', "Locale metadata for --extract-catalog", "en")
  .option('--no-run', "Do not actually load and run the VM; just parse input and (optionally) emit output")
  .parse(process.argv);

const options = program.opts<CliOptions>();

if (!options.input) {
  console.log("Missing input! Please specify an input file via --input");
  process.exit(1);
}

if (options.extractCatalog && (options.localize || options.catalog)) {
  console.error("--extract-catalog cannot be combined with --localize or --catalog");
  process.exit(1);
}

function isSourcePath(path: string) {
  return path.endsWith(".qmd") || path.endsWith(".qmd.html") || path.endsWith(".md") || path.endsWith(".md.html");
}

function readCatalog(path: string): Catalog {
  try {
    const catalog = JSON.parse(fs.readFileSync(path, "utf8")) as Catalog;
    validateCatalog(catalog);
    return catalog;
  } catch (error) {
    throw new Error(`Could not read catalog ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function load() {
  let input_file;
  if (options.input.startsWith("http://") || options.input.startsWith("https://")) {
    const res = await fetch(options.input);
    input_file = await res.text();
  } else {
    const input_file_buf = await fs.promises.readFile(options.input);
    input_file = input_file_buf.toString();
  }
  return input_file
}

(async () => {
  const input_file = await load();

  if (options.extractCatalog) {
    if (!isSourcePath(options.input)) {
      throw new Error("--extract-catalog requires a .md / .qmd source document, not a compiled .json file");
    }
    const catalog = extractCatalog(input_file, options.locale || "en");
    fs.writeFileSync(options.extractCatalog, JSON.stringify(catalog, null, 2));
    console.log(`Extracted ${Object.keys(catalog.messages).length} message(s) to ${options.extractCatalog}`);
    return;
  }

  const catalog = options.catalog ? readCatalog(options.catalog) : undefined;
  let vmState: TzoVMState = undefined;

  if (options.input.endsWith(".json")) {
    if (options.localize) {
      throw new Error("--localize applies to source documents; a compiled VMState is already localized by construction");
    }
    vmState = JSON.parse(input_file) as TzoVMState;
  } else if (isSourcePath(options.input)) {
    vmState = parseMarkdown(input_file, {
      localize: options.localize === true || catalog !== undefined,
    }).qvmState;
  } else {
    throw new Error("Program input file needs to have .json or .qmd / .qmd.html / .md / .md.html extension!")
  }

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(vmState, null, 2));
  }

  if (options.run) {
    const vm = new QuestVM(body => {
      process.stdout.write(`${body}`)
    }, async (choices: Choice[]) => {
      process.stdout.write("\n"); // add newline to make inquirer not overwrie any previously emitted text
      const inquirer = (await import("inquirer")).default;
      return inquirer.prompt([{
        type: "select",
        name: "selectedChoice",
        message: " ",
        choices: choices.map(c => ({ name: c.title, value: c.id }))
      }]).then(answers => {
        return answers.selectedChoice;
      });
    }, {});

    if (catalog) {
      vm.setCatalog(catalog);
    }
    vm.loadVMState(vmState);
    vm.run();
  }
})();

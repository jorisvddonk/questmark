#!/usr/bin/env node

import fs from "fs";
import { program } from "commander";
import { parseMarkdown } from "./parseMarkdown.js";
import { Choice, QuestVM } from "./QuestVM.js";
import { TzoVMState } from "tzo";

interface CliOptions {
  clear?: boolean;
  input?: string;
  output?: string;
  run?: boolean;
}

program
  .version('0.0.37')
  .option('-c, --clear', 'Clear console on each state')
  .option('--input <path>', "Load source .md or .json file from path. Path can be either from local filesystem, or via HTTP(S) URL")
  .option('--output <path>', "Emit VMState .json file")
  .option('--no-run', "Do not actually load and run the VM; just parse input and (optionally) emit output")
  .parse(process.argv);

const options = program.opts<CliOptions>();

if (!options.input) {
  console.log("Missing input! Please specify an input file via --input");
  process.exit(1);
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

  let vmState: TzoVMState = undefined;

  if (options.input.endsWith(".json")) {
    vmState = JSON.parse(input_file) as TzoVMState;
  } else if (options.input.endsWith(".qmd") || options.input.endsWith(".qmd.html") || options.input.endsWith(".md") || options.input.endsWith(".md.html")) {
    vmState = parseMarkdown(input_file).qvmState;
  } else {
    throw new Error("Program input file needs to have .json or .qmd / .qmd.html / .md / .md.html extension!")
  }

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(vmState, null, 2));
  }

  if (options.run) {
    vm.loadVMState(vmState);
    vm.run();
  }
})();

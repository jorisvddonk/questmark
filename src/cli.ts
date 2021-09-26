#!/usr/bin/env node

import fs from "fs";
import program from "commander";
import { parseMarkdown } from "./parseMarkdown";
import { Choice, QuestVM } from "./QuestVM";
import inquirer from "inquirer";
import { TzoVMState } from "tzo";
import fetch from "node-fetch";

program
  .version('0.0.12')
  .option('-c, --clear', 'Clear console on each state')
  .option('--input <path>', "Load source .md or .json file from path. Path can be either from local filesystem, or via HTTP(S) URL")
  .option('--output <path>', "Emit VMState .json file")
  .option('--no-run', "Do not actually load and run the VM; just parse input and (optionally) emit output")
  .parse(process.argv);

if (!program.input) {
  console.log("Missing input! Please specify an input file via --input");
  process.exit(1);
}

async function load() {
  let input_file;
  if (program.input.startsWith("http://") || program.input.startsWith("https://")) {
    const res = await fetch(program.input);
    input_file = await res.text();
  } else {
    const input_file_buf = await fs.promises.readFile(program.input);
    input_file = input_file_buf.toString();
  }
  return input_file
}

(async () => {
  const input_file = await load();
  const vm = new QuestVM(body => {
    process.stdout.write(`${body}`)
  }, (choices: Choice[]) => {
    process.stdout.write("\n"); // add newline to make inquirer not overwrie any previously emitted text
    return inquirer.prompt([{
      type: "list",
      name: "selectedChoice",
      message: " ",
      choices: choices.map(c => ({ name: c.title, value: c.id }))
    }]).then(answers => {
      return answers.selectedChoice;
    });
  }, {});

  let vmState: TzoVMState = undefined;

  if (program.input.endsWith(".json")) {
    vmState = JSON.parse(input_file) as TzoVMState;
  } else if (program.input.endsWith(".qmd") || program.input.endsWith(".qmd.html") || program.input.endsWith(".md") || program.input.endsWith(".md.html")) {
    vmState = parseMarkdown(input_file).qvmState;
  } else {
    throw new Error("Program input file needs to have .json or .qmd / .qmd.html / .md / .md.html extension!")
  }

  if (program.output) {
    fs.writeFileSync(program.output, JSON.stringify(vmState, null, 2));
  }

  if (program.run) {
    vm.loadVMState(vmState);
    vm.run();
  }
})();

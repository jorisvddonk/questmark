import fs from "fs";
import program from "commander";
import { parseMarkdown } from "./parseMarkdown";
import { Choice, QuestVM } from "./QuestVM";
import inquirer from "inquirer";
import { TzoVMState } from "tzo";

program
  .version('0.0.1')
  .option('-c, --clear', 'Clear console on each state')
  .option('--input <path>', "Load source .md or .json file", "examples/cookieStore.md")
  .option('--output <path>', "Emit VMState .json file", "out.json")
  .option('--no-run', "Do not actually load and run the VM; just parse input and (optionally) emit output")
  .parse(process.argv);

const input_file = fs.readFileSync(program.input).toString();
const vm = new QuestVM(body => process.stdout.write(`${body}`), (choices: Choice[]) => {
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
} else if (program.input.endsWith(".md")) {
  vmState = parseMarkdown(input_file).qvmState;
}

if (program.output) {
  fs.writeFileSync(program.output, JSON.stringify(vmState, null, 2));
}

if (program.run) {
  vm.loadVMState(vmState);
  vm.run();
}

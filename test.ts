import { VM, Stack, getStackParams } from "./vm";
import { Context } from "vm";
import fs from "fs";
import program from "commander";
import { parseMarkdown } from "./parseMarkdown";
import InputPrompt from "inquirer/lib/prompts/input";

program
  .version('0.0.1')
  .option('-c, --clear', 'Clear console on each state')
  .option('-d, --debugging', 'Show debug info on console')
  .option('--input <path>', "Load source .md or .json file", "examples/cookieStore.md")
  .parse(process.argv);

const input_file = fs.readFileSync(program.input).toString();
if (program.input.endsWith(".json")) {
  const vm = buildVM();
  vm.loadVMState(JSON.parse(input_file as any));
  vm.run();
} else if (program.input.endsWith(".md")) {
  const vm = buildVM();
  vm.loadVMState(parseMarkdown(input_file).qvmState);
  vm.run();
}

function buildVM() {
  const responses = [];
  return new VM({}, {
    "emit": (stack: Stack) => {
      const [str1] = getStackParams("emit", ["string | number"], stack) as [string | number];
      process.stdout.write(`${str1}`);
      return null;
    },
    "response": (stack: Stack, context: Context, vm: VM) => {
      const [num1, str1] = getStackParams("response", ["number", "string"], stack) as [number, string];
      responses.push({ response: str1, pc: num1 });
      return null;
    },
    "getResponse": (stack: Stack, context: Context, vm: VM) => {
      const inquirer = require('inquirer');
      vm.pause = true;
      process.stdout.write("\n"); // add newline to make inquirer not overwrie any previously emitted text
      inquirer.prompt([{
        type: "list",
        name: "selection",
        message: " ",
        choices: responses.map(resp => { return { name: resp.response, value: resp.pc } })
      }]).then(answers => {
        vm.programCounter = (answers.selection);
        vm.run();
      });
      while (responses.length > 0) { // clear responses, so that current responses won't appear again next time
        responses.pop();
      }
      return null;
    },
    "test": (stack: Stack, context: Context, vm: VM) => {
      console.log("TEST function invoked!");
      return null;
    }
  });
}


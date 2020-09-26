import { VM, Stack, getStackParams } from "tzo";
import { Context } from "tzo";

export class QuestVM extends VM {
  responses = [];

  constructor() {
    super({}, {
      "emit": (stack: Stack) => {
        const [str1] = getStackParams("emit", ["string | number"], stack) as [string | number];
        process.stdout.write(`${str1}`);
        return null;
      },
      "response": (stack: Stack, context: Context, vm: VM) => {
        const [num1, str1] = getStackParams("response", ["number", "string"], stack) as [number, string];
        this.responses.push({ response: str1, pc: num1 });
        return null;
      },
      "getResponse": (stack: Stack, context: Context, vm: VM) => {
        const inquirer = require('inquirer');
        vm.suspend();
        process.stdout.write("\n"); // add newline to make inquirer not overwrie any previously emitted text
        inquirer.prompt([{
          type: "list",
          name: "selection",
          message: " ",
          choices: this.responses.map(resp => { return { name: resp.response, value: resp.pc }; })
        }]).then(answers => {
          vm.stack.push(answers.selection);
          vm.run();
        });
        while (this.responses.length > 0) { // clear responses, so that current responses won't appear again next time
          this.responses.pop();
        }
        return null;
      },
      "optionEnabled": (stack: Stack, context: Context, vm: VM) => {
        const [str1] = getStackParams("optionEnabled", ["string"], stack) as [string];
        const optstr = `optionEnabled_${str1}`;
        let retval = null;
        if (vm.context[optstr] === undefined) {
          vm.context[optstr] = 1;
          retval = 1;
        } else {
          retval = vm.context[optstr];
        }
        stack.push(retval);
        return retval;
      },
      "optionDisabled": (stack: Stack, context: Context, vm: VM) => {
        const [str1] = getStackParams("optionDisabled", ["string"], stack) as [string];
        const optstr = `optionEnabled_${str1}`;
        let retval = null;
        if (vm.context[optstr] === undefined) {
          vm.context[optstr] = 1;
          retval = 0;
        } else {
          retval = vm.context[optstr] === 1 ? 0 : 1;
        }
        stack.push(retval);
        return retval;
      },
      "disableOption": (stack: Stack, context: Context, vm: VM) => {
        const [str1] = getStackParams("disableOption", ["string"], stack) as [string];
        const optstr = `optionEnabled_${str1}`;
        vm.context[optstr] = 0;
        return null;
      },
      "enableOption": (stack: Stack, context: Context, vm: VM) => {
        const [str1] = getStackParams("enableOption", ["string"], stack) as [string];
        const optstr = `optionEnabled_${str1}`;
        vm.context[optstr] = 1;
        return null;
      },
    });
  }
}

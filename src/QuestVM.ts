import { VM, Stack, getStackParams, Functions } from "tzo";
import { Context } from "tzo";

export interface Choice {
  title: string,
  id: number
}

export class QuestVM extends VM {
  responses = [];

  constructor(emitFunction: (body: string | number) => void, getResponseFunction: (choices: Choice[]) => Promise<number>, additionalFunctions?: Functions) {
    super({}, {
      ...(additionalFunctions || {}), ...{
        "emit": (stack: Stack) => {
          const [str1] = getStackParams("emit", ["string | number"], stack) as [string | number];
          emitFunction(str1);
          return null;
        },
        "response": (stack: Stack, context: Context, vm: VM) => {
          const [num1, str1] = getStackParams("response", ["number", "string"], stack) as [number, string];
          this.responses.push({ response: str1, pc: num1 });
          return null;
        },
        "getResponse": (stack: Stack, context: Context, vm: VM) => {
          vm.suspend();
          const choices = this.responses.map((resp, index) => { return { title: resp.response, programCounter: resp.pc, id: index }; })
          const sChoices: Choice[] = choices.map(c => ({ title: c.title, id: c.id }));
          while (this.responses.length > 0) { // clear responses, so that current responses won't appear again next time
            this.responses.pop();
          }
          getResponseFunction(sChoices).then(choiceID => {
            const choice = choices.find(c => c.id === choiceID);
            if (choice === undefined) {
              throw new Error(`Unknown choice ID: ${choiceID}!`);
            }
            vm.stack.push(choice.programCounter);
            vm.run();
          });
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
      }
    });
  }
}

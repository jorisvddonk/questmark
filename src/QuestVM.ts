import { EventEmitter } from "events";
import { Stack, Functions } from "tzo";
import { Context } from "tzo";
import { VM, getStackParams } from "tzo";

export interface Choice {
  title: string,
  id: number
}

export class QuestVM extends VM {
  responses = [];
  eventBus = new EventEmitter();

  constructor(emitFunction: (body: string | number) => void, getResponseFunction: (choices: Choice[]) => Promise<number>, additionalFunctions?: Functions) {
    super({}, {
      ...(additionalFunctions || {}), ...{
        "emit": (stack: Stack) => {
          const [str1] = getStackParams("emit", ["string | number"], stack) as [string | number];
          this.eventBus.emit('emit', str1);
          emitFunction(str1);
        },
        "response": (stack: Stack, context: Context, vm: VM) => {
          const [num1, str1] = getStackParams("response", ["number", "string"], stack) as [number, string];
          const response = { response: str1, pc: num1 };
          this.eventBus.emit('response', response);
          this.responses.push(response);
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
          }).catch(e => {
            this.eventBus.emit('error', e);
            this.quit();
          });
        },
        "optionEnabled": (stack: Stack, context: Context, vm: VM) => {
          // DEPRECATED - do not use!
          console.warn("optionEnabled opcode is deprecated! - do not use!");
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
        },
        "optionDisabled": (stack: Stack, context: Context, vm: VM) => {
          // DEPRECATED - do not use!
          console.warn("optionDisabled opcode is deprecated! - do not use!");
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
        },
        "disableOption": (stack: Stack, context: Context, vm: VM) => {
          // DEPRECATED - do not use!
          console.warn("disableOption opcode is deprecated! - do not use!");
          const [str1] = getStackParams("disableOption", ["string"], stack) as [string];
          const optstr = `optionEnabled_${str1}`;
          vm.context[optstr] = 0;
        },
        "enableOption": (stack: Stack, context: Context, vm: VM) => {
          // DEPRECATED - do not use!
          console.warn("enableOption opcode is deprecated! - do not use!");
          const [str1] = getStackParams("enableOption", ["string"], stack) as [string];
          const optstr = `optionEnabled_${str1}`;
          vm.context[optstr] = 1;
        },
      }
    });
  }
}

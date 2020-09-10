import debug from "debug";
import { Tokenizer, InstructionNode } from "./tokenizer";
import visit from "unist-util-visit";
import { QuestMarkVMState } from "./parseMarkdown";

export type instructiontype = "push-number-instruction" | "push-string-instruction" | "invoke-function-instruction";
export type BaseInstruction<T extends instructiontype> = {
  type: T
}
export type PushNumberInstruction = BaseInstruction<"push-number-instruction"> & {
  value: number;
}
export type PushStringInstruction = BaseInstruction<"push-string-instruction"> & {
  value: number;
}
export type InvokeFunctionInstruction = BaseInstruction<"invoke-function-instruction"> & {
  functionName: number;
}
export type Instruction = PushNumberInstruction | PushStringInstruction | InvokeFunctionInstruction;


export type NumberPushOperation = (stack: Stack, context?: Context) => number;
export type StringPushOperation = (stack: Stack, context?: Context) => string;
export type FunctionInvocationOperation = (stack: Stack, context: Context, vm?: VM) => string | number | Array<string | number> | null;

export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
export type InstructionOperation = NumberPushOperation | StringPushOperation | FunctionInvocationOperation;

export type Stack = Array<string | number>;
export type Context = { [key: string]: string | number | null }
export type Instructions = Array<InstructionOperation>;
export type LabelMap = { [key: string]: number };
export type Functions = { [key: string]: FunctionInvocationOperation };

const logger = debug("questmark-vm");

export const getStackParams = (functionName: string, paramTypes: Array<"string" | "number" | "string | number">, stack: Stack) => {
  /**
   * Convenience function. Gets params from the stack and throws an error if there's an issue.
   */
  return paramTypes.map((paramType, i) => {
    const val = stack.pop();
    if (paramType === "string | number") {
      if (typeof val !== "number" && typeof val !== "string") {
        throw new Error(`${functionName}: stack param ${i + 1} is not a string or number!`);
      }
    } else {
      if (typeof val !== paramType) {
        throw new Error(`${functionName}: stack param ${i + 1} is not a ${paramType}! Value: ${val}`);
      }
    }
    return val;
  });
}

export const std_functions: Functions = {
  "randInt": (stack: Stack) => {
    const [max] = getStackParams("randInt", ["number"], stack) as [number];
    const retval = Math.floor(Math.random() * max);
    stack.push(retval);
    return retval;
  },
  "charCode": (stack: Stack) => {
    const [num] = getStackParams("charCode", ["number"], stack) as [number];
    const retval = String.fromCharCode(num);
    stack.push(retval);
    return retval;
  },
  "+": (stack: Stack) => {
    const [num1, num2] = getStackParams("+", ["number", "number"], stack) as [number, number];
    const retval = num1 + num2;
    stack.push(retval);
    return retval;
  },
  "-": (stack: Stack) => {
    const [num1, num2] = getStackParams("-", ["number", "number"], stack) as [number, number];
    const retval = num1 - num2;
    stack.push(retval);
    return retval;
  },
  "*": (stack: Stack) => {
    const [num1, num2] = getStackParams("*", ["number", "number"], stack) as [number, number];
    const retval = num1 * num2;
    stack.push(retval);
    return retval;
  },
  "concat": (stack: Stack) => {
    const [str1, str2] = getStackParams("concat", ["string", "string"], stack) as [string, string];
    const retval = `${str1}${str2}`;
    stack.push(retval);
    return retval;
  },
  "rconcat": (stack: Stack) => {
    const [str1, str2] = getStackParams("rconcat", ["string", "string"], stack) as [string, string];
    const retval = `${str2}${str1}`;
    stack.push(retval);
    return retval;
  },
  "getContext": (stack: Stack, context: Context) => {
    const [str1] = getStackParams("getContext", ["string"], stack) as [string];
    const retval = context[str1];
    if (retval === null || retval === undefined) {
      throw new Error(`getContext: null/undefined can not be pushed to the context! StackParam: ${str1}`);
    }
    stack.push(retval);
    return retval;
  },
  "setContext": (stack: Stack, context: Context) => {
    const [str1, arg2] = getStackParams("setContext", ["string", "string | number"], stack) as [string, string | number];
    context[str1] = arg2;
    return null;
  },
  "gt": (stack: Stack, context: Context) => {
    const [num1, num2] = getStackParams("gt", ["number", "number"], stack) as [number, number];
    const retval = num1 > num2 ? 1 : 0;
    stack.push(retval);
    return retval;
  },
  "lt": (stack: Stack, context: Context) => {
    const [num1, num2] = getStackParams("lt", ["number", "number"], stack) as [number, number];
    const retval = num1 < num2 ? 1 : 0;
    stack.push(retval);
    return retval;
  },
  "eq": (stack: Stack, context: Context) => {
    const [num1, num2] = getStackParams("eq", ["number", "number"], stack) as [number, number];
    const retval = num1 === num2 ? 1 : 0;
    stack.push(retval);
    return retval;
  },
}

export class VM {
  stack: Stack = [];
  context: Context = {};
  programList: InstructionOperation[] = [];
  labelMap: LabelMap = {};
  functions: Functions;

  programCounter: number = 0;
  exit: boolean = false;
  pause: boolean = false;

  constructor(initialContext: Context, additionalFunctions: Functions = {}) {
    this.context = initialContext;
    const openBraceFunction = (stack: Stack, context: Context, vm: VM) => { // jump to matching brace (source): push current programCounter plus one to stack, then jump to matching brace
      vm.stack.push(vm.programCounter + 1);
      let i = 0;
      let pc = vm.programCounter + 1;
      while (true) {
        if (vm.programList[pc] === openBraceFunction) {
          i += 1;
        }
        if (vm.programList[pc] === closeBraceFunction) {
          i -= 1;
          if (i === -1) {
            vm.programCounter = pc + 1;
            break;
          }
        }
        pc += 1;
      }
      return null;
    };
    const closeBraceFunction = (stack: Stack) => { // jump to matching brace (target))
      throw new Error("Cannot invoke `}` as function!");
    }
    this.functions = {
      ...std_functions, ...additionalFunctions, ...{
        "goto": (stack: Stack) => {
          const [str1] = getStackParams("goto", ["string"], stack) as [string];
          const newPC = this.labelMap[str1];
          if (newPC === undefined) {
            throw new Error(`goto: attempting to jump to undefined label ${str1}`);
          }
          logger(`goto: setting pC to ${newPC} `);
          this.programCounter = newPC;
          return null;
        },
        "exit": (stack: Stack) => {
          this.exit = true;
          return null;
        },
        "{": openBraceFunction,
        "}": closeBraceFunction
      }
    };
  }

  invoke(instructions: Instructions) {
    logger("invoking!");
    let retval: ReturnType<InstructionOperation> = undefined;
    instructions.forEach(instruction => {
      logger(`stack (json): ${JSON.stringify(this.stack)}`);
      retval = instruction(this.stack, this.context, this);
    });
    logger(`done! return value: ${retval}, final stack: ${JSON.stringify(this.stack)}, final context: ${JSON.stringify(this.context)}`);
    return retval;
  }

  getVMInstructions(instructions: InstructionNode<instructiontype>[]) {
    const vmInstructions: InstructionOperation[] = instructions.map(instruction => {
      switch (instruction.type) {
        case "invoke-function-instruction":
          const functionNameToPush = (instruction as InvokeFunctionInstruction).functionName;
          const functionToPush = this.functions[functionNameToPush];
          if (functionToPush === undefined) {
            throw new Error(`Cannot find function in function table: ${functionNameToPush}`);
          }
          return functionToPush;
          // debug wrapper:
          // NOTE: breaks { and } due to the way { checks for the } function!
          /*
          function c() {
            logger(`invoke: ${functionNameToPush}`);
            functionToPush.apply(this, arguments);
          }
          return c as any;
          */
          break;
        case "push-number-instruction":
          return ((stack) => {
            const v = (instruction as PushNumberInstruction).value;
            logger(`pushNumber: ${v}`);
            stack.push(v);
            return instruction.value;
          }) as NumberPushOperation;
          break;
        case "push-string-instruction":
          return ((stack) => {
            const v = (instruction as PushStringInstruction).value;
            logger(`pushString: ${v}`);
            stack.push(v);
            return instruction.value;
          }) as StringPushOperation;
          break;
        default:
          throw new Error(`Unsupported instruction type: ${instruction.type}`);
      }
    });
    return vmInstructions;
  }

  parseCodeBlock(codeBlock: string, loadIntoProgramList?: boolean) {
    /**
     * Parse a codeBlock into instructions
     * if loadIntoProgramList is true, this may have a side effect!
     */
    const tokenizer = new Tokenizer();
    const tokens = tokenizer.tokenize(codeBlock);
    const { instructions, labelMap } = tokenizer.transform(tokens);
    const vmInstructions = this.getVMInstructions(instructions);
    if (loadIntoProgramList) {
      this.programList = vmInstructions;
      this.labelMap = labelMap;
    } else {
      if (Object.entries(labelMap).length > 0) {
        throw new Error("Label found, but label definitions are not allowed here!");
      }
    }
    return vmInstructions;
  }

  eval(codeBlock: string) {
    /**
     * Execute a bit of code, without pushing it to the program list
     */
    const parsedBlock = this.parseCodeBlock(codeBlock, false);
    return this.invoke(parsedBlock);
  }

  load(codeBlock: string) {
    const parsedBlock = this.parseCodeBlock(codeBlock, true);
    return parsedBlock;
  }

  loadVMState(questmarkVMState: QuestMarkVMState) {
    this.programList = this.getVMInstructions(questmarkVMState.programList);
    this.labelMap = questmarkVMState.labelMap;
    this.stack = questmarkVMState.stack;
    this.context = questmarkVMState.context;
    this.programCounter = questmarkVMState.programCounter;
    this.pause = questmarkVMState.pause;
    this.exit = questmarkVMState.exit;
  }

  setProgramCounter(c: number) {
    this.programCounter = c;
  }

  tick() {
    /**
     * Execute one instruction from program list
     */
    const instruction = this.programList[this.programCounter];
    if (instruction === undefined) {
      this.exit = true;
      return null;
    }
    const oldPC = this.programCounter;
    const retVal = instruction(this.stack, this.context, this);
    if (this.programCounter === oldPC) { // if the program counter did not change, increment by one!
      this.programCounter += 1;
    }
    return retVal;
  }

  run() {
    this.pause = false;
    while (this.exit !== true && this.pause as any !== true) {
      this.tick();
    }
  }
}

/*
// Invocation examples:
const vm = new VM({ "captainName": "Zelnick", "have_minerals": 200 }, {
  "emit": (stack: Stack) => {
    const [str1] = getStackParams("emit", ["string | number"], stack) as [string | number];
    process.stdout.write(`${str1}`);
    return null;
  },
  "response": (stack: Stack, context: Context, vm: VM) => {
    const [num1, str1] = getStackParams("response", ["number", "string"], stack) as [number, string];
    if (this.responses === undefined) {
      this.responses = [];
    }
    this.responses.push({ response: str1, pc: num1 });
    return null;
  },
  "getResponse": (stack: Stack, context: Context, vm: VM) => {
    const inquirer = require('inquirer');
    vm.pause = true;
    inquirer.prompt([{
      type: "list",
      name: "selection",
      message: " ",
      choices: this.responses.map(resp => { return { name: resp.response, value: resp.pc } })
    }]).then(answers => {
      vm.programCounter = (answers.selection);
      vm.run();
    });
    this.responses = []; // clear responses, so that current responses won't appear again next time
    return null;
  }
});
vm.eval(`"captainName" getContext`);
vm.eval(`0 "have_minerals" getContext gt`);
vm.load(`1 "cookies" setContext "main" goto
#NORMAL_HELLO_A
"HELLO A" emit
"Buy cookie"
{
"Buying cookie..."
emit
"cookies"
getContext
1
+
"cookies"
setContext
"You now have "
emit
"cookies"
getContext
emit
" cookies!"
emit
"main"
goto
}
response
"Leave the store"
{
"exit"
goto
}
response
getResponse
#NORMAL_HELLO_B
"Sorry, we have no cookies anymore!" emit exit
#main
"NORMAL_HELLO_" 2 randInt 65 + charCode rconcat goto
#exit
"See you again!"
emit
exit`);
vm.run();
*/
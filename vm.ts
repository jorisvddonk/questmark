export type NumberPushOperation = (stack: Stack, context?: Context) => number;
export type StringPushOperation = (stack: Stack, context?: Context) => string;
export type FunctionInvocationOperation = (stack: Stack, context: Context, vm?: VM) => string | number | Array<string | number> | null;

export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
export type Instruction = NumberPushOperation | StringPushOperation | FunctionInvocationOperation;

export type Stack = Array<string | number>;
export type Context = { [key: string]: string | number | null }
export type Instructions = Array<Instruction>;
export type LabelMap = { [key: string]: number };
export type Functions = { [key: string]: FunctionInvocationOperation };

const stringPushOperationRegexp = /^\"(.+)\"$/;
const numberPushOperationRegexp = /^([0-9]+)$/;
const functionInvocationOperationRegexp = /^(\S+)$/;
const labelInstructionRegexp = /^\#(\S+)$/;

const getStackParams = (functionName: string, paramTypes: Array<"string" | "number" | "string | number">, stack: Stack) => {
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
  programList: Instruction[] = [];
  labelMap: LabelMap = {};
  functions: Functions;

  programCounter: number = 0;
  exit: boolean = false;
  pause: boolean = false;

  constructor(initialContext: Context, additionalFunctions: Functions = {}) {
    this.context = initialContext;
    const openBraceFunction = (stack: Stack) => { // jump to matching brace (source): push current programCounter plus one to stack, then jump to matching brace
      this.stack.push(this.programCounter + 1);
      let i = 0;
      let pc = this.programCounter + 1;
      while (true) {
        if (this.programList[pc] === openBraceFunction) {
          i += 1;
        }
        if (this.programList[pc] === closeBraceFunction) {
          i -= 1;
          if (i === -1) {
            this.programCounter = pc + 1;
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
          console.log(`goto: setting pC to ${newPC} `);
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
    console.log("invoking!");
    let retval: ReturnType<Instruction> = undefined;
    instructions.forEach(instruction => {
      console.log(`stack (json): ${JSON.stringify(this.stack)}`);
      retval = instruction(this.stack, this.context, this);
    });
    console.log(`done! return value: ${retval}, final stack: ${JSON.stringify(this.stack)}, final context: ${JSON.stringify(this.context)}`);
    return retval;
  }

  tokenize(codeBlock: string) {
    let parsing: "string" | null = null;
    let partial_parse = "";
    let i = 0;
    const tokens = [];

    function addTokenMaybe() {
      if (partial_parse.length > 0) {
        tokens.push(partial_parse);
        partial_parse = "";
      }
    }

    while (true) {
      const c = codeBlock[i];
      if (c === '"') { // todo: add escape support ( \" )
        if (parsing === "string") {
          parsing = null;
          partial_parse = `${partial_parse}${c}`;
          i += 1;
          addTokenMaybe();
          continue;
        } else if (parsing === null) {
          parsing = "string";
          partial_parse = `${partial_parse}${c}`;
          i += 1;
          continue;
        }
      }

      if (parsing === "string") {
        partial_parse = `${partial_parse}${c}`;
        i += 1;
        continue;
      }

      if (c === undefined) {
        addTokenMaybe();
        break;
      }

      if (c.match(/\s/) !== null) {
        addTokenMaybe();
        i += 1;
        continue;
      }

      partial_parse = `${partial_parse}${c}`;
      i += 1;
    }

    return tokens;
  }

  parseCodeBlock(codeBlock: string, loadIntoProgramList?: boolean) {
    /**
     * Parse a code block
     * if loadIntoProgramList is true, this may have a side effect!
     */
    const tokens = this.tokenize(codeBlock);
    const labelMap: LabelMap = {};
    let i = 0;
    const instructions: Instructions = tokens.map(token => {
      const matchLabelInstruction = token.match(labelInstructionRegexp);
      if (matchLabelInstruction !== null) {
        const label = matchLabelInstruction[1];
        if (loadIntoProgramList === false) {
          throw new Error("Label found, but label definitions are not allowed here!");
        }
        labelMap[label] = i;
        return undefined;
      }

      i += 1;

      const matchStringPushOp = token.match(stringPushOperationRegexp);
      if (matchStringPushOp !== null) {
        const stringToPush = matchStringPushOp[1];
        return ((stack) => {
          stack.push(stringToPush);
          return stringToPush;
        }) as StringPushOperation;
      }

      const matchNumberPushOp = token.match(numberPushOperationRegexp);
      if (matchNumberPushOp !== null) {
        const numberToPush = parseInt(matchNumberPushOp[1]);
        return ((stack) => {
          stack.push(numberToPush);
          return numberToPush;
        }) as NumberPushOperation;
      }

      const matchFunctionInvocationOp = token.match(functionInvocationOperationRegexp);
      if (matchFunctionInvocationOp !== null) {
        const functionNameToPush = matchFunctionInvocationOp[1];
        const functionToPush = this.functions[functionNameToPush];
        if (functionToPush === undefined) {
          throw new Error(`Cannot find function in function table: ${functionNameToPush}`);
        }
        return functionToPush;
      }

      throw new Error(`Could not parse token: \`${token}\``);
    }).filter(instr => instr !== undefined);

    if (loadIntoProgramList) {
      this.programList = instructions;
      this.labelMap = labelMap;
    }

    return instructions;
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
    console.log(`emit: ${str1}`);
    return null;
  },
  "response": (stack: Stack, context: Context, vm: VM) => {
    const [num1, str1] = getStackParams("response", ["number", "string"], stack) as [number, string];
    console.log(`response: ${str1} ${num1}`);
    if (this.responses === undefined) {
      this.responses = [];
    }
    this.responses.push({ response: str1, pc: num1 });
    return null;
  },
  "getResponse": (stack: Stack, context: Context, vm: VM) => {
    const inquirer = require('inquirer');
    vm.pause = true;
    console.log(`getResponse: ${JSON.stringify(this.responses)}`);
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
type NumberPushOperation = (stack: Stack, context?: Context) => number;
type StringPushOperation = (stack: Stack, context?: Context) => string;
type FunctionInvocationOperation = (stack: Stack, context: Context) => string | number | Array<string | number> | null;

type Instruction = NumberPushOperation | StringPushOperation | FunctionInvocationOperation;

type Stack = Array<string | number>;
type Context = { [key: string]: string | number | null }
type Instructions = Array<Instruction>;
type Functions = { [key: string]: FunctionInvocationOperation };

const stringPushOperationRegexp = /^\"(\S+)\"$/;
const numberPushOperationRegexp = /^([0-9]+)$/;
const functionInvocationOperationRegexp = /^(\S+)$/;

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
        throw new Error(`${functionName}: stack param ${i + 1} is not a ${paramType}!`);
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
      throw new Error("getContext: null/undefined can not be pushed to the context!");
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
  functions: Functions;

  constructor(initialContext: Context, additionalFunctions: Functions = {}) {
    this.context = initialContext;
    this.functions = Object.assign({}, std_functions, additionalFunctions);
  }

  invoke(instructions: Instructions) {
    console.log("invoking!");
    let retval = undefined;
    instructions.forEach(instruction => {
      console.log(`stack (json): ${JSON.stringify(this.stack)}`);
      retval = instruction(this.stack, this.context);
    });
    console.log(`done! return value: ${retval}, final stack: ${JSON.stringify(this.stack)}`);
  }

  parseCodeBlock(codeBlock: string) {
    const tokens = codeBlock.split(/\s+/);
    const instructions: Instructions = tokens.map(token => {
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
    });
    return instructions;
  }

  exec(codeBlock: string) {
    const parsedBlock = this.parseCodeBlock(codeBlock);
    this.invoke(parsedBlock);
  }
}

/*
// Invocation examples:
const vm = new VM({ "captainName": "Zelnick", "have_minerals": 200 }, {
  "goto": (stack: Stack) => {
    const [str1] = getStackParams("goto", ["string"], stack) as [string];
    console.log(`TODO: implement goto(${str1})`);
    return null;
  },
});
vm.exec(`"NORMAL_HELLO_" 8 randInt 64 + charCode rconcat goto`);
vm.exec(`"captainName" getContext`);
vm.exec(`0 "have_minerals" getContext gt`);
*/

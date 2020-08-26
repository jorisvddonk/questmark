type NumberPushOperation = (stack: Stack) => number;
type StringPushOperation = (stack: Stack) => string;
type FunctionInvocationOperation = (stack: Stack) => string | number | Array<string | number> | null;

type Instruction = NumberPushOperation | StringPushOperation | FunctionInvocationOperation;

type Stack = Array<string | number>;
type Instructions = Array<Instruction>;

const stringPushOperationRegexp = /^\"(\S+)\"$/;
const numberPushOperationRegexp = /^([0-9]+)$/;
const functionInvocationOperationRegexp = /^(\S+)$/;

export const functions: { [key: string]: FunctionInvocationOperation } = {
  "randInt": (stack: Stack) => {
    const max = stack.pop();
    if (typeof max !== "number") {
      throw new Error("randInt: stack param is not a number!");
    }
    const retval = Math.floor(Math.random() * max);
    stack.push(retval);
    return retval;
  },
  "charCode": (stack: Stack) => {
    const num = stack.pop();
    if (typeof num !== "number") {
      throw new Error("charCode: stack param is not a number!");
    }
    const retval = String.fromCharCode(num);
    stack.push(retval);
    return retval;
  },
  "+": (stack: Stack) => {
    const num1 = stack.pop();
    const num2 = stack.pop();
    if (typeof num1 !== "number") {
      throw new Error("+: stack param 1 is not a number!");
    }
    if (typeof num2 !== "number") {
      throw new Error("+: stack param 2 is not a number!");
    }
    const retval = num1 + num2;
    stack.push(retval);
    return retval;
  },
  "concat": (stack: Stack) => {
    const str1 = stack.pop();
    const str2 = stack.pop();
    if (typeof str1 !== "string") {
      throw new Error("concat: stack param 1 is not a string!");
    }
    if (typeof str2 !== "string") {
      throw new Error("concat: stack param 2 is not a string!");
    }
    const retval = `${str1}${str2}`;
    stack.push(retval);
    return retval;
  },
  "rconcat": (stack: Stack) => {
    const str1 = stack.pop();
    const str2 = stack.pop();
    if (typeof str1 !== "string") {
      throw new Error("rconcat: stack param 1 is not a string!");
    }
    if (typeof str2 !== "string") {
      throw new Error("rconcat: stack param 2 is not a string!");
    }
    const retval = `${str2}${str1}`;
    stack.push(retval);
    return retval;
  },
  "goto": (stack: Stack) => {
    const str1 = stack.pop();
    if (typeof str1 !== "string") {
      throw new Error("goto: stack param 1 is not a string!");
    }
    console.log(`TODO: implement goto(${str1})`);
    return null;
  }
}

export class VM {
  stack: Stack = [];

  constructor() { }

  invoke(instructions: Instructions) {
    console.log("invoking!");
    instructions.forEach(instruction => {
      console.log(`stack (json): ${JSON.stringify(this.stack)}`);
      instruction(this.stack);
    });
    console.log("done!");
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
        const functionToPush = functions[functionNameToPush];
        if (functionToPush === undefined) {
          throw new Error(`Cannot find function in function table: ${functionNameToPush}`);
        }
        return functionToPush;
      }
    });
    return instructions;
  }
}

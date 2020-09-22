import { LabelMap, Instructions, StringPushOperation, NumberPushOperation, instructiontype, PushNumberInstruction, PushStringInstruction, InvokeFunctionInstruction } from "./vm";
import { Node } from "unist";
import u from "unist-builder";

const stringPushOperationRegexp = /^\"(.+)\"$/;
const numberPushOperationRegexp = /^([0-9]+)$/;
const functionInvocationOperationRegexp = /^(\S+)$/;
const labelInstructionRegexp = /^\#(\S+)$/;

export type InstructionNode<T extends instructiontype> = Node & {
  type: T
};
export type PushInstructionNode<T extends instructiontype, V> = Node & { value: V } & {
  type: T
};

export const pushNumber: (val: number) => PushInstructionNode<PushNumberInstruction["type"], number> = val => {
  return u("push-number-instruction", { value: val });
};
export const pushString: (val: string) => PushInstructionNode<PushStringInstruction["type"], string> = val => {
  return u("push-string-instruction", { value: val });
};
export const invokeFunction: (name: string) => InstructionNode<InvokeFunctionInstruction["type"]> & { functionName: string } = name => {
  return u("invoke-function-instruction", { functionName: name });
};

export class Tokenizer {

  tokenize(codeBlock: string) {
    let parsing: "string" | null = null;
    let partial_parse = "";
    let i = 0;
    const tokens: string[] = [];

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

  transform(tokens: string[]) {
    /**
     * Parse a list of tokens into a list of Instructions and a LabelMap
     */
    const labelMap: LabelMap = {};
    let i = 0;
    const instructions: InstructionNode<instructiontype>[] = tokens.map(token => {
      const matchLabelInstruction = token.match(labelInstructionRegexp);
      if (matchLabelInstruction !== null) {
        const label = matchLabelInstruction[1];
        labelMap[label] = i;
        return undefined;
      }

      i += 1;

      const matchStringPushOp = token.match(stringPushOperationRegexp);
      if (matchStringPushOp !== null) {
        const stringToPush = matchStringPushOp[1];
        return pushString(stringToPush);
      }

      const matchNumberPushOp = token.match(numberPushOperationRegexp);
      if (matchNumberPushOp !== null) {
        const numberToPush = parseInt(matchNumberPushOp[1]);
        return pushNumber(numberToPush);
      }

      const matchFunctionInvocationOp = token.match(functionInvocationOperationRegexp);
      if (matchFunctionInvocationOp !== null) {
        const functionNameToPush = matchFunctionInvocationOp[1];
        return invokeFunction(functionNameToPush);
      }

      throw new Error(`Could not parse token: \`${token}\``);
    }).filter(instr => instr !== undefined);

    return { instructions, labelMap };
  }
}
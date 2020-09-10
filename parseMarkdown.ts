import mdast, { Parent, Literal } from "mdast";
import fs from "fs";
import fromMarkdown from "mdast-util-from-markdown";
import { TestFunction } from "unist-util-is";
import findAfter from "unist-util-find-after";
import removePosition from "unist-util-remove-position";
import findAllAfter from "unist-util-find-all-after";
import findAllBefore from "unist-util-find-all-before";
import findAllBetween from "unist-util-find-all-between";
import map from "unist-util-map";
import flatFilter from "unist-util-flat-filter";
import { Node } from "unist";
import visitParents from "unist-util-visit-parents";
import visit, { Visitor } from "unist-util-visit";
import u from "unist-builder";
import 'array-flat-polyfill';
import { Stack, Context, InstructionOperation, LabelMap, Functions, Instruction, PushNumberInstruction, instructiontype, PushStringInstruction, InvokeFunctionInstruction } from "./vm";
import { Tokenizer, pushString, pushNumber, invokeFunction } from "./tokenizer";

export type OptionNode = Node & {
  type: "option",
  precondition: null | string,
  effect: null | string,
  text: null | string,
  link: null | string,
}

export type questmarkVMStateOptions = {
  stack: Stack;
  context: Context;
  programList: Instruction[];
  labelMap: LabelMap;
  programCounter: number;
  exit: boolean;
  pause: boolean;
}

export type QuestMarkVMState = Node & questmarkVMStateOptions;

export function parseMarkdown(file_contents: string) {
  const tree = fromMarkdown(file_contents);
  const tokenizer = new Tokenizer();
  const root = u('questmarkDocument', { options: {} }, []);
  visitParents(tree, 'heading', (x, ancestors) => {
    if (ancestors.length > 1) {
      return;
    }

    // capture name
    let name = "";
    visitParents(x, 'text', t => {
      name = `${name} ${(t as any).value}`
    });
    name = name.trim();

    // capture children belonging to this heading group
    const nextHeading = findAfter(tree, x, 'heading');
    const children = nextHeading !== null ? findAllBetween(tree, x, nextHeading) : findAllAfter(tree, x);

    if (name === "QUESTMARK-OPTIONS-HEADER") {
      root.options = getQuestmarkOptions(x, children);
    } else {
      root.children.push(createStateNode(x, name, children));
    }
  });

  function getQuestmarkOptions(x: Node, children: Node[]) {
    let code = '';
    visit(u('bla', children), 'code', n => {
      code = `${code} ${n.value}`;
    });
    return JSON.parse(code.trim());
  }

  function createStateNode(x: Node, name: string, children: Node[]) {
    // create new state node
    const stateNode = u('state', { name, options: [] }, []);

    // capture children
    // children are all nodes until either the next heading, or end of tree,
    //  but nodes of a type other than 'list' with ordered === false.
    stateNode.children = children.filter(n => {
      if (n.type !== 'list') {
        return true;
      } else {
        return n.ordered === true;
      }
    });

    // capture options
    const listItemTest: TestFunction<Node> = (z: Node): z is Node => {
      return z.type === "listItem"
    };
    const paragraphTest: TestFunction<Node> = (z: Node): z is Node => {
      return z.type === "paragraph"
    };
    const linkOrText: TestFunction<Node> = (z: Node): z is Node => {
      return z.type === "link" || z.type === 'text';
    };

    const listItemsAsParagraphs: Node[] = children.filter(n => {
      if (n.type === 'list') {
        return n.ordered === false;
      } else {
        return false;
      }
    }).map(l => flatFilter(l, listItemTest)).map(l => flatFilter(l, paragraphTest)).flatMap(l => l.children) as Node[];
    const options: Node[] = listItemsAsParagraphs.map((li: Parent) => {
      // li's `link` / `text` children are the main links / options
      // li's `inlineCode` children are either precondition or effect code blocks
      const optionNode: OptionNode = u("option", { precondition: null, effect: null, text: null, link: null });
      const preconditionBound = li.children.find(x => x.type === "text" || x.type === "link");
      const effectBound = li.children.reduceRight((memo, child) => {
        if (memo) {
          return memo;
        }
        if (child.type !== "inlineCode") {
          return child;
        }
      }, undefined);
      const preconditions = preconditionBound !== undefined ? li.children.slice(0, li.children.indexOf(preconditionBound)) : [];
      const linkTexts = li.children.slice(li.children.indexOf(preconditionBound), li.children.indexOf(effectBound));
      const effects = effectBound !== undefined ? li.children.slice(li.children.indexOf(effectBound) + 1) : [];
      optionNode.precondition = preconditions.map(p => p.value).join(" ");
      optionNode.effect = effects.map(p => p.value).join(" ");
      let text = [];
      visit(li, 'text', n => {
        if (n.value) {
          text.push(n.value);
        }
      });
      let link = [];
      visit(li, 'link', n => {
        if (n.url) {
          link.push(n.url);
        }
      });
      optionNode.text = text.join(" ").trim();
      optionNode.link = link.join(" ");
      if (optionNode.precondition.length === 0) {
        optionNode.precondition = null;
      }
      if (optionNode.effect.length === 0) {
        optionNode.effect = null;
      }
      if (optionNode.link.length === 0) {
        optionNode.link = null;
      }
      if (optionNode.text.length === 0) {
        optionNode.text = null;
      }
      return optionNode;
    });
    stateNode.options = options;
    return stateNode;
  }

  const qvmState = u("questmarkVMState", {
    stack: [],
    context: {},
    programList: [],
    labelMap: {},
    programCounter: 0,
    exit: false,
    pause: false
  } as questmarkVMStateOptions, []);

  const q = (a) => {
    qvmState.programList.push(a);
  }
  const visitorFunc: Visitor<Node> = (node, index, parent) => {
    if (parent === undefined && node.type !== "questmarkDocument") {
      return;
    }
    switch (node.type) {
      case "questmarkDocument":
        if (node.options) {
          if (node.options["initial-context"]) {
            Object.entries(node.options["initial-context"]).forEach(entry => {
              if (typeof entry[1] === "string") {
                q(pushString(entry[1]));
              } else if (typeof entry[1] === "number") {
                q(pushNumber(entry[1]));
              }
              q(pushString(entry[0]));
              q(invokeFunction("setContext"));
            })
          }
          if (node.options["initial-state"]) {
            q(pushString(node.options["initial-state"]));
            q(invokeFunction("goto"));
          }
        }
        break;
      case "state":
        qvmState.labelMap[node.name as string] = qvmState.programList.length;
        visit(node, visitorFunc); // parse children immediately, before we parse the node's options
        (node.options as OptionNode[]).forEach(option => {
          if (option.precondition !== null) {
            tokenizer.transform(tokenizer.tokenize(option.precondition)).instructions.forEach(i => q(i));
            q(invokeFunction("jgz"));
            q(invokeFunction("{")); // precondition block start
            console.warn("Option contains a precondition. This is currently not supported!");
          }
          if (option.text !== null) {
            if (option.text.includes("`")) {
              // TODO: support inlineCode in options. Can do via `concat`.
              console.warn("Option text contains a backtick. Inline code elements in option blocks is currently not supported!");
            }
            q(pushString(option.text))
          }
          q(invokeFunction("{")); // effect body start
          if (option.effect !== null) {
            tokenizer.transform(tokenizer.tokenize(option.effect)).instructions.forEach(i => q(i));
          }
          if (option.link !== null) {
            q(pushString(option.link.substr(1)));
            q(invokeFunction("goto"));
          }
          q(invokeFunction("exit")); // ensure that options with no effect or link cause the VM to exit
          q(invokeFunction("}")); // effect body end
          q(invokeFunction("response"));
          if (option.precondition !== null) {
            // when there was a precondition, ensure we close the precondition block
            q(invokeFunction("}")); // precondition block end
          }
        });
        q(invokeFunction("getResponse"));
        return "skip";
        // children have been parsed earlier
        break;
      case "inlineCode":
      case "code":
        if (node.lang === "comment") {
          break;
        }
        const tokens = tokenizer.tokenize(node.value as string);
        const { instructions, labelMap } = tokenizer.transform(tokens);
        qvmState.labelMap = Object.assign({}, qvmState.labelMap, labelMap);
        instructions.forEach(i => q(i));
        break;
      case "text":
        q(pushString(node.value as string));
        q(invokeFunction("emit"));
        break;
      default:
        break;
    }
  };
  visit(root, visitorFunc);
  q(invokeFunction("exit")); // ensure we always exit at the end

  return {
    parsedMDFile: removePosition(root, true),
    qvmState
  }
}
import { Parent } from "mdast";
import fromMarkdown from "mdast-util-from-markdown";
import findAfter from "unist-util-find-after";
import removePosition from "unist-util-remove-position";
import findAllAfter from "unist-util-find-all-after";
import findAllBetween from "unist-util-find-all-between";
import { Node } from "unist";
import visitParents from "unist-util-visit-parents";
import visit, { Visitor } from "unist-util-visit";
import u from "unist-builder";
import 'array-flat-polyfill';
import { TzoVMState } from "tzo";
import { Tokenizer, pushString, pushNumber, invokeFunction } from "tzo";

export type OptionNode = Node & {
  type: "option",
  preconditionChildren: null | Node[],
  effectChildren: null | Node[],
  text: null | string,
  link: null | string,
}

export type QuestMarkVMState = Node & TzoVMState;

export enum NoLinkBehaviour {
  EXIT = 0, // Exit the quest if no link is found for an option. NOT RECOMMENDED - Prefer using explicit exits instead by calling the `exit` instruction!
  LOOPBACK_TO_OPTIONS = 1 // DEFAULT: Loopback to the options section if no link is found for an option and an option does not explicitly call an `exit` or `goto` effect.
}

export function parseMarkdown(file_contents: string) {
  const tree = fromMarkdown(file_contents);
  const tokenizer = new Tokenizer();
  const root = u('questmarkDocument', { options: {} }, []);
  let noLinkBehaviour = NoLinkBehaviour.LOOPBACK_TO_OPTIONS;
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
      root.options = getQuestmarkOptions(children);
    } else {
      root.children.push(createStateNode(name, children));
    }
  });

  function getQuestmarkOptions(children: Node[]) {
    let code = '';
    visit(u('bla', children), 'code', n => {
      code = `${code} ${n.value}`;
    });
    return JSON.parse(code.trim());
  }

  function createStateNode(name: string, children: Node[]) {
    // create new state node
    const stateNode = u('state', { name, options: [] }, []);


    let found = false;
    let stateChildren = [];
    let remainingChildren = [];
    // phase 0: split children into stateChildren and remaining children.
    children.forEach(child => {
      if (child.type === 'list' && child.ordered === false) {
        found = true;
      }
      if (found) {
        remainingChildren.push(child);
      } else {
        stateChildren.push(child);
      }
    });
    stateNode.children = stateChildren;

    // phase 1: replace list nodes with their children, then flatten the list
    remainingChildren = remainingChildren.map(child => {
      if (child.type === 'list' && child.ordered === false) {
        return child.children;
      }
      return child;
    }).flat(1);

    // phase 2: reparent non-listItem nodes to the last-seen listItem.
    let lastSeenListItem = null;
    remainingChildren = remainingChildren.map(child => {
      if (child.type === 'listItem') {
        lastSeenListItem = child;
        return child;
      } else {
        lastSeenListItem.children.push(child);
      }
    }).filter(x => x !== undefined);

    // phase 3: build the options from the remainingChildren (now all listItems)
    const options: Node[] = remainingChildren.map((li: Parent) => {
      // li's `link` / `text` children are the main links / options, but only the first item is considered (the others are effect nodes)
      // li's `inlineCode` children are either precondition or effect code blocks
      const optionNode: OptionNode = u("option", { preconditionChildren: null, effectChildren: null, text: null, link: null });
      let effectNodes = [];
      let preconditionNodes = [];
      let text = [];
      let link = [];
      visit(li, n => {
        if (text.length > 0 && n.type !== "paragraph") {
          if (n.type === "text" && n.value && (n.value as string).trim().length === 0) {
            // skip this one; whitespace only node!
          } else {
            effectNodes.push(n);
          }
        }

        if (n.type === "text") {
          if (n.value && (n.value as string).trim().length > 0 && text.length === 0) {
            text.push(n.value);
          }
        }
        if (n.type === "link") {
          if (n.url && link.length === 0) {
            link.push(n.url);
          }
        }

        if (text.length === 0 && n.type === "inlineCode") {
          preconditionNodes.push(n);
        }
      });
      optionNode.preconditionChildren = preconditionNodes;
      optionNode.effectChildren = effectNodes;
      optionNode.text = text.join(" ").trim();
      optionNode.link = link.join(" ");
      if (optionNode.link.length === 0) {
        optionNode.link = null;
      }
      if (optionNode.text.length === 0) {
        optionNode.text = null;
      }
      if (optionNode.preconditionChildren.length === 0) {
        optionNode.preconditionChildren = null;
      }
      if (optionNode.effectChildren.length === 0) {
        optionNode.effectChildren = null;
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
  } as TzoVMState, []);

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
          if (node.options["options"]) {
            if (node.options["options"]["no_link_behaviour"]) {
              if (node.options["options"]["no_link_behaviour"] === "exit") {
                noLinkBehaviour = NoLinkBehaviour.EXIT
              } else if (node.options["options"]["no_link_behaviour"] === "loopback_to_options") {
                noLinkBehaviour = NoLinkBehaviour.LOOPBACK_TO_OPTIONS
              } else {
                throw new Error(`Unknown 'options.no_link_behaviour': ${node.options["options"]["no_link_behaviour"]}`);
              }
            }
          }
        }
        break;
      case "state":
        const nodeLabel = node.name as string;
        const nodeOptionsLabel = node.name + "__options" as string;
        qvmState.labelMap[nodeLabel] = qvmState.programList.length;
        visit(node, visitorFunc); // parse children immediately, before we parse the node's options
        qvmState.labelMap[nodeOptionsLabel] = qvmState.programList.length; // add a label immediately after the node's options to be able to shortcut jump to in certain cases
        (node.options as OptionNode[]).forEach(option => {
          if (option.preconditionChildren !== null) {
            option.preconditionChildren.forEach(child => {
              if (child.type === "inlineCode") {
                tokenizer.transform(tokenizer.tokenize(child.value as string)).forEach(i => q(i));
              } else {
                throw new Error("preconditionChildren contain non-inlineCode elements. Aborting!");
              }
            })

            q(invokeFunction("jgz"));
            q(invokeFunction("{")); // precondition block start
          }
          if (option.text !== null) {
            if (option.text.includes("`")) {
              // TODO: support inlineCode in options. Can do via `concat`.
              console.warn("Option text contains a backtick. Inline code elements in option blocks is currently not supported!");
            }
            q(pushString(option.text))
          }
          q(invokeFunction("ppc")); // push address of effect body to stack
          q(pushNumber(4));
          q(invokeFunction("+"));
          q(invokeFunction("{")); // effect body start
          if (option.effectChildren !== null) {
            option.effectChildren.forEach(child => {
              if (child.type === "inlineCode") {
                tokenizer.transform(tokenizer.tokenize(child.value as string)).forEach(i => q(i));
              } else {
                q(pushString(child.value as string));
                q(invokeFunction("emit"));
              }
            })
          }
          if (option.link !== null) {
            q(pushString(option.link.substr(1)));
            q(invokeFunction("goto"));
          }
          if (noLinkBehaviour === NoLinkBehaviour.LOOPBACK_TO_OPTIONS) {
            q(pushString(nodeOptionsLabel)); // ensure that options with no link or "goto" effect loop back to the options
            q(invokeFunction("goto"));
          } else if (noLinkBehaviour === NoLinkBehaviour.EXIT) {
            q(invokeFunction("exit")); // ensure that options with no effect or link cause the VM to exit
          }
          q(invokeFunction("}")); // effect body end
          q(invokeFunction("response"));
          if (option.preconditionChildren !== null) {
            // when there was a precondition, ensure we close the precondition block
            q(invokeFunction("}")); // precondition block end
          }
        });
        q(invokeFunction("getResponse")); // getResponse is expected to pause the VM and push the relevant programlist index onto the stack
        q(invokeFunction("goto")); // goto whatever was pushed onto the stack by getResponse
        return "skip";
        // children have been parsed earlier
        break;
      case "inlineCode":
      case "code":
        if (node.lang === "comment") {
          break;
        }
        const tokens = tokenizer.tokenize(node.value as string);
        const instructions = tokenizer.transform(tokens);
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
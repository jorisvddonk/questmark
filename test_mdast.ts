import mdast, { Parent } from "mdast";
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
import visit from "unist-util-visit";
import u from "unist-builder";
import 'array-flat-polyfill';
const doc = fs.readFileSync("./examples/cookieStore.md");
const tree = fromMarkdown(doc);


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
    const optionNode = u("option", { precondition: null, effect: null, text: null, link: null });
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



fs.writeFileSync('bla.json', JSON.stringify(removePosition(root, true), null, 2));
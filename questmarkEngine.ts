import MarkdownIt from 'markdown-it'
import fs from "fs";
import _ from 'lodash';
import dot from 'dot';
import inquirer from 'inquirer';
import colors from 'colors';
import Token from 'markdown-it/lib/token';
import { VM, Functions, Stack, Context } from './vm';

const markdownIt = new MarkdownIt();
dot.templateSettings.varname = 'context';
dot.templateSettings.strip = false;

type ExecCodeFn = (data: string, previousErrors: Error[]) => any;


export class QuestmarkEngine {
  markdownSource: string;
  X: Token[];
  questmarkOptions = {};
  allHeaders = [];
  vm: VM;


  constructor(markdownSource: string, clear?: boolean, debugging?: boolean, additionalFunctions?: Functions) {
    const extraFunctions: Functions = {
      ...(additionalFunctions || {}), ...{}
    };
    this.markdownSource = markdownSource;
    this.X = this.parseMD(this.markdownSource);
    fs.writeFileSync("full.json", JSON.stringify(this.X, null, 2));
    fs.writeFileSync("flat.json", JSON.stringify(this.smartFlat(this.X), null, 2));
    this.questmarkOptions = this.getQuestmarkOptions(this.X);
    const initState = (this.questmarkOptions.hasOwnProperty('initial-state') ? this.questmarkOptions['initial-state'] : "InitialState");
    const context = this.questmarkOptions.hasOwnProperty('initial-context') ? this.questmarkOptions['initial-context'] : {};
    let code = ``;
    Object.entries(context).forEach(pair => {
      code += ` ${pair[1]} "${pair[0]}" setContext`;
    });
    code += ` "${initState}" goto`;


    const headers = this.getHeaders(this.X);
    const headerI = 5;

    code += `\n#${headers[headerI]}\n`; // TODO: postfix newline? normalize header name?
    const state_tokens: Token[] = this.getTokensInHeader(this.X, headers[headerI]);
    fs.writeFileSync("st.json", JSON.stringify(state_tokens, null, 2));
    let flatTokens = state_tokens;
    let cont = true;
    while (cont) {
      flatTokens = _.flatten(flatTokens.map(f => {
        if (f.children !== null) {
          return f.children;
        }
        return f;
      }));
      cont = flatTokens.reduce((memo, val) => memo && (val.children !== null), true);
    }
    flatTokens = flatTokens.filter(f => f.type !== "paragraph_open" && f.type !== "paragraph_close" && f.type !== "bullet_list_open" && f.type !== "bullet_list_close");
    flatTokens = flatTokens.reduce((memo, val) => {
      if (memo.parsing === "list_item" && !val.type.startsWith("list_item")) {
        (val as any).metaType = "option";
        memo.items.push(val);
      }
      if (val.type === "list_item_open") {
        memo.parsing = "list_item";
      }
      if (memo.parsing === null) {
        memo.items.push(val);
      }
      if (val.type === "list_item_close") {
        memo.parsing = null;
      }
      return memo;
    }, { items: [], parsing: null }).items;
    fs.writeFileSync("temp.json", JSON.stringify(flatTokens, null, 2));

    state_tokens.forEach(token => {
      if (token.type === "inline") {
        code += ` ${token.content}`; // TODO: escape doublequotes?
      } else if (token.type === "paragraph_open") {
        code += ` "`
      } else if (token.type === "paragraph_close") {
        code += `" emit\n`
      } else {
        console.log(token);
      }
    });
    const tos = _.flatten(this.getBlocksBetween(state_tokens, 'paragraph_open', 'paragraph_close')).filter(x => x.level === 1);
    //console.log(tos);
    console.log(code);
    this.vm = new VM(({}), extraFunctions);
  }

  parseMD(text: string) {
    return markdownIt.parse(text, {});
  }

  smartFlat(tokens: Token[]) {
    const retval: Token[] = [];
    let lastBullet: Token = null;

    tokens.forEach(t => {
      if (lastBullet === null) {
        retval.push(t);
      }
      if (t.type === "bullet_list_open") {
        lastBullet = t;
        lastBullet.children = lastBullet.children || [];
      } else if (t.type === "bullet_list_close") {
        lastBullet = null;
      } else if (lastBullet !== null) {
        lastBullet.children.push(t);
      }
    });
    return retval;
  }

  getTokensInHeader(tokens: Token[], headerToSearch: string) {
    return _.reduce(tokens, (memo, token, index) => {
      if (token.type === 'heading_open') {
        memo.isParsingHeader = true;
        memo.foundHeader = false;
      }

      if (memo.foundHeader && !memo.isParsingHeader) {
        memo.tokensInHeader.push(token);
      }

      if (token.type === 'heading_close') {
        memo.isParsingHeader = false;
      }

      if (memo.isParsingHeader && token.type === 'inline') {
        if (token.content === headerToSearch) {
          memo.foundHeader = true;
        }
      }

      return memo;
    }, { isParsingHeader: false, foundHeader: false, tokensInHeader: [] }).tokensInHeader;
  }

  getHeaders(tokens: Token[]): Token["content"][] {
    let parsingHeader = false;
    return tokens.reduce((memo, token, index) => {
      if (parsingHeader && token.type === 'inline') {
        memo[memo.length - 1].push(token.content);
      }

      if (token.type === 'heading_open') {
        parsingHeader = true;
        memo.push([]);
      }

      if (token.type === 'heading_close') {
        parsingHeader = false;
      }

      return memo;
    }, [] as Token["content"][][]).map(strarr => strarr.join(" "));
  };

  getQuestmarkOptions(tokens: Token[]): Object {
    const getTokensInInfoHeader = (tokens: Token[]) => {
      return this.getTokensInHeader(tokens, 'QUESTMARK-OPTIONS-HEADER');
    };
    const defaultQuestmarkOptions = {};
    const codeBlockInlineTokens = _.filter(_.flatten(_.map(_.filter(getTokensInInfoHeader(tokens), token => token.type === 'inline'), 'children')), (inline_token) => { return inline_token.type === 'code_inline' });
    const codeBlockTokens = _.filter(getTokensInInfoHeader(tokens), function (token) {
      return token.type === 'code_block';
    });
    const allCodeblockTokens = codeBlockInlineTokens.concat(codeBlockTokens);
    const codeJSONs = _.map(allCodeblockTokens, (codeBlockToken) => {
      let retval = {};
      try {
        retval = JSON.parse(codeBlockToken.content);
      } catch (e) { }
      return retval;
    });
    return _.reduce(codeJSONs, (memo, codeJSON) => {
      return _.extend(memo, codeJSON);
    }, defaultQuestmarkOptions);
  };

  getBlocksBetween(tokens: Token[], beginTokenType: Token["type"], endTokenType: Token["type"], truthFunc?: (token?: Token) => boolean) {
    if (truthFunc === undefined) {
      truthFunc = () => true;
    }
    const beginIndexes = tokens.reduce((memo, token, index) => {
      if (token.type === beginTokenType && truthFunc(token)) {
        memo.push(index);
      }
      return memo;
    }, [] as number[]);
    const endIndexes = tokens.reduce((memo, token, index) => {
      if (token.type === endTokenType && truthFunc(token)) {
        memo.push(index);
      }
      return memo;
    }, [] as number[]);
    const blockIndexes = _.zip(beginIndexes, endIndexes);
    return blockIndexes.reduce((memo, blockIndex) => {
      memo.push(tokens.slice(blockIndex[0] + 1, blockIndex[1]));
      return memo;
    }, [] as Token[][]);
  };

  filterBlocks(blocks: Token[][], tokenType: Token["type"]) {
    return _.map(blocks, (block) => block.filter((token: Token) => token.type === tokenType))
  };

  getListItemContents(tokens: Token[]) {
    return this.filterBlocks(this.getBlocksBetween(tokens, 'list_item_open', 'list_item_close', function (token) { return token.markup === "*" }), 'inline');
  };

  getOptionsForTokens(tokens: Token[], availableHeaders) {
    const listItems = this.getListItemContents(tokens);
    return listItems.map(listItem => {
      const content = _.trim(_.map(_.filter(listItem[0].children, function (c) { return c.type === 'text' }), 'content').join(" "));
      const linkOpenTag = _.filter(listItem[0].children, function (c) { return c.type === 'link_open' }).pop();
      let href;
      let tostate;
      if (linkOpenTag !== undefined) {
        href = _.fromPairs(linkOpenTag.attrs).href;
      }
      if (href !== undefined) {
        if (!_.startsWith(href, "#")) {
          tostate = undefined;
        } else if (!_.includes(availableHeaders, href.substr(1))) {
          tostate = undefined;
        } else {
          tostate = href.substr(1);
        }
      }

      return {
        "href": href,
        "tostate": tostate,
        "content": content,
        "tokens": listItem[0].children
      };
    });
  };

  getRawTextInHeader(orig_md_text, tokens: Token[], header) {
    const headers = this.getHeaders(tokens);
    const thisHeader = header;
    const thisHeaderIndex = _.indexOf(headers, header);

    if (thisHeaderIndex === undefined) {
      throw new Error("Header not found in input tokens!");
    }
    const thisHeaderTokens = this.getTokensInHeader(tokens, thisHeader);

    const lineData = _.reduce(_.map(thisHeaderTokens, 'map'), function (memo, mapVal) {
      if (_.isArray(mapVal)) {
        if (mapVal[0] < memo.begin) {
          memo.begin = mapVal[0];
        }
        if (mapVal[1] > memo.end) {
          memo.end = mapVal[1];
        }
      }
      return memo;
    }, { 'begin': Infinity, 'end': -Infinity });
    if (lineData.begin !== Infinity && lineData.end !== Infinity) {
      return orig_md_text.split('\n').slice(lineData.begin - 1, lineData.end).join('\n');
    } else {
      throw new Error("Header did not have any line data: " + header);
    }
  }

  processTokens(tokens: Token[]) {
    return _.compact(_.map(tokens, (x) => {
      if (x.type === 'code_inline') {
        const retval = this.execCode(x.content);
        if (retval === undefined) {
          return undefined;
        } else {
          x.content = "" + (retval !== null && retval !== undefined ? "" + retval : "");
          return x;
        }
      } else {
        x.children = this.processTokens(x.children);
        if (x.children.length > 0) {
          x.content = _.reduce(x.children, function (memo, child) {
            const ncontent = child.type === 'softbreak' ? '\n' : child.content;
            return memo + ncontent;
          }, "");
        }
        return x;
      }
    }));
  }

  execCode(data: string) {
    return this.vm.eval(data);
  }

}

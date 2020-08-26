import MarkdownIt from 'markdown-it'
import fs from "fs";
import _ from 'lodash';
import dot from 'dot';
import inquirer from 'inquirer';
import colors from 'colors';
import program from "commander";
import Token from 'markdown-it/lib/token';

const markdownIt = new MarkdownIt();
dot.templateSettings.varname = 'context';
dot.templateSettings.strip = false;

program
  .version('0.0.1')
  .option('-c, --clear', 'Clear console on each state')
  .option('-d, --debugging', 'Show debug info on console')
  .parse(process.argv);

function parseMD(text: string) {
  return markdownIt.parse(text, {});
}

const md_src = fs.readFileSync('readme.md').toString();
const X = parseMD(md_src);

function getTokensInHeader(tokens: Token[], headerToSearch: string) {
  return _.reduce(tokens, function (memo, token, index) {
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

function getHeaders(tokens: Token[]): Token["content"][] {
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

function getQuestmarkOptions(tokens: Token[]): Object {
  function getTokensInInfoHeader(tokens: Token[]) {
    return getTokensInHeader(tokens, 'QUESTMARK-OPTIONS-HEADER');
  };
  const defaultQuestmarkOptions = {};
  const codeBlockInlineTokens = _.filter(_.flatten(_.map(_.filter(getTokensInInfoHeader(tokens), function (token) {
    return token.type === 'inline';
  }), 'children')), (inline_token) => { return inline_token.type === 'code_inline' });
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

function getBlocksBetween(tokens: Token[], beginTokenType: Token["type"], endTokenType: Token["type"], truthFunc?: (token?: Token) => boolean) {
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

function filterBlocks(blocks: Token[][], tokenType: Token["type"]) {
  return _.map(blocks, (block) => { return _.filter(block, function (token: Token) { return token.type === tokenType; }); });
};

function getListItemContents(tokens: Token[]) {
  return filterBlocks(getBlocksBetween(tokens, 'list_item_open', 'list_item_close', function (token) { return token.markup === "*" }), 'inline');
};

function getOptionsForTokens(tokens: Token[], availableHeaders) {
  const listItems = getListItemContents(tokens);
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

function getRawTextInHeader(orig_md_text, tokens: Token[], header) {
  const headers = getHeaders(tokens);
  const thisHeader = header;
  const thisHeaderIndex = _.indexOf(headers, header);

  if (thisHeaderIndex === undefined) {
    throw new Error("Header not found in input tokens!");
  }
  const thisHeaderTokens = getTokensInHeader(tokens, thisHeader);

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

const questmarkOptions = getQuestmarkOptions(X);
const context = (questmarkOptions.hasOwnProperty('initial-context') ? questmarkOptions['initial-context'] : {});
let currentState = (questmarkOptions.hasOwnProperty('initial-state') ? questmarkOptions['initial-state'] : "InitialState");
const allHeaders = getHeaders(X);
const previousErrors: Error[] = [];

type ExecCodeFn = (data: string, previousErrors: Error[]) => any;

function processTokens(tokens: Token[], previousErrors: Error[], execCode: ExecCodeFn) {
  return _.compact(_.map(tokens, function (x) {
    if (x.type === 'code_inline') {
      const retval = execCode(x.content, previousErrors);
      if (retval === undefined) {
        return undefined;
      } else {
        x.content = retval;
        return x;
      }
    } else {
      x.children = processTokens(x.children, previousErrors, execCode);
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

function parseState(execCode?: ExecCodeFn) {
  if (execCode === undefined) {
    execCode = (data: string, previousErrors: Error[]) => {
      try {
        return eval(data);
      } catch (e) {
        previousErrors.push(e);
        return undefined;
      }
    }
  }


  if (program.clear) {
    process.stdout.write('\x1Bc\n');
  }
  if (previousErrors.length > 0) {
    _.each(previousErrors, function (previousError) {
      console.log(colors.red.bold("Warning: error occurred: " + previousError.toString()));
    })
  }
  while (previousErrors.length > 0) {
    previousErrors.pop();
  }
  const textInHeader = getRawTextInHeader(md_src, X, currentState);
  const templateFunc = dot.template(textInHeader);
  const state_markdown = templateFunc(context);
  const state_tokens = parseMD(state_markdown);
  const paragraphsData = processTokens(_.filter(_.flatten(getBlocksBetween(state_tokens, 'paragraph_open', 'paragraph_close')), function (x) { return x.level === 1 }), previousErrors, execCode);
  console.log(colors.bold.blue(_.reduce(paragraphsData, function (memo, val) {
    memo = memo + '\n\n' + val.content;
    return memo;
  }, "")));
  const options = getOptionsForTokens(state_tokens, allHeaders);
  if (program.debugging) {
    console.log(options);
  }
  if (options.length > 0) {
    inquirer.prompt([{
      type: "list",
      name: "selection",
      message: " ",
      choices: options.map(o => o.content)
    }]).then(function (answers) {
      const selectedOption = options.find(x => x.content === answers.selection);
      const codeTokens = selectedOption.tokens.filter(x => x.type === 'code_inline');
      codeTokens.forEach((codeToken) => {
        execCode(codeToken.content, previousErrors);
      });
      if (selectedOption.tostate !== undefined) {
        currentState = selectedOption.tostate;
        parseState(execCode);
      }
    });
  } else {
    console.log("No more options - terminating!".red);
  }
}

parseState();

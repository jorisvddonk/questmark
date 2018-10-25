var MarkdownIt = require('markdown-it');
var markdownIt = new MarkdownIt();
var fs = require('fs');
var util = require('util');
var _ = require('lodash');
var repl = require('repl');
var dot = require('dot');
var inquirer = require('inquirer');
var colors = require('colors');
dot.templateSettings.varname = 'context';
dot.templateSettings.strip = false;

var program = require('commander');

program
  .version('0.0.1')
  .option('-r, --repl', 'Spawn REPL')
  .option('-c, --clear', 'Clear console on each state')
  .option('-d, --debugging', 'Show debug info on console')
  .parse(process.argv);

var parseMD = function(text) {
  var tokens = markdownIt.parse(text);
  return tokens;
}

var md_src = fs.readFileSync('readme.md').toString();
var X = parseMD(md_src);

var getTokensInHeader = function(tokens, headerToSearch) {
  return _.reduce(tokens, function(memo, token, index){
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
  }, {isParsingHeader: false, foundHeader: false, tokensInHeader: []}).tokensInHeader;
}
var getTokensInInfoHeader = function(tokens) {
  return getTokensInHeader(tokens, 'QUESTMARK-OPTIONS-HEADER');
};

var getHeaders = function(tokens) {
  var parsingHeader = false;
  return _.reduce(tokens, function(memo, token, index){
    if (parsingHeader && token.type === 'inline') {
      memo[memo.length - 1].push(token.content);
    }

    if (token.type === 'heading_open') {
      parsingHeader = true;
      memo.push([]);
    }

    if (token.type === 'heading_close') {
      memo[memo.length - 1] = memo[memo.length - 1].join(" ");
      parsingHeader = false;
    }

    return memo;
  }, []);
};

var getQuestmarkOptions = function(tokens){
  var defaultQuestmarkOptions = {'hamster': 'kaasbal'};
  var codeBlockInlineTokens = _.filter(_.flatten(_.map(_.filter(getTokensInInfoHeader(tokens), function(token) {
    return token.type === 'inline';
  }), 'children')), function(inline_token) {return inline_token.type === 'code_inline'});
  var codeBlockTokens = _.filter(getTokensInInfoHeader(tokens), function(token) {
    return token.type === 'code_block';
  });
  var allCodeblockTokens = codeBlockInlineTokens.concat(codeBlockTokens);
  var codeJSONs = _.map(allCodeblockTokens, function(codeBlockToken){
    var retval = {};
    try {
      retval = JSON.parse(codeBlockToken.content);
    } catch (e) {}
    return retval;
  });
  return _.reduce(codeJSONs, function(memo, codeJSON) {
    return _.extend(memo, codeJSON);
  }, defaultQuestmarkOptions);
};

var getBlocksBetween = function(tokens, beginTokenType, endTokenType, truthFunc) {
  if (truthFunc === undefined) {
    truthFunc = function(){return true;};
  }
  var beginIndexes = _.reduce(tokens, function(memo, token, index){
    if (token.type === beginTokenType && truthFunc(token)) {
      memo.push(index);
    }
    return memo;
  }, []);
  var endIndexes = _.reduce(tokens, function(memo, token, index){
    if (token.type === endTokenType && truthFunc(token)) {
      memo.push(index);
    }
    return memo;
  }, []);
  var blockIndexes = _.zip(beginIndexes, endIndexes);
  return _.reduce(blockIndexes, function(memo, blockIndex){
    memo.push(tokens.slice(blockIndex[0]+1, blockIndex[1]));
    return memo;
  }, []);
};

var filterBlocks = function(blocks, tokenType) {
  return _.map(blocks, function(block){return _.filter(block, function(token){return token.type === tokenType;});});
};

var getListItemContents = function(tokens) {
  return filterBlocks(getBlocksBetween(tokens, 'list_item_open', 'list_item_close', function(token){return token.markup === "*"}), 'inline');
};

var getOptionsForTokens = function(tokens, availableHeaders) {
  var listItems = getListItemContents(tokens);
  return _.map(listItems, function(listItem){
    var content = _.trim(_.map(_.filter(listItem[0].children, function(c){return c.type === 'text'}), 'content').join(" "));
    var linkOpenTag = _.filter(listItem[0].children, function(c){return c.type === 'link_open'}).pop();
    var href;
    var tostate;
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

var getRawTextInHeader = function(orig_md_text, tokens, header) {
  var headers = getHeaders(tokens);
  var thisHeader = header;
  var thisHeaderIndex = _.indexOf(headers, header);

  if (thisHeaderIndex === undefined) {
    throw new Error("Header not found in input tokens!");
  }
  var thisHeaderTokens = getTokensInHeader(tokens, thisHeader);

  var lineData = _.reduce(_.map(thisHeaderTokens, 'map'), function(memo, mapVal) {
    if (_.isArray(mapVal)) {
      if (mapVal[0] < memo.begin) {
        memo.begin = mapVal[0];
      }
      if (mapVal[1] > memo.end) {
        memo.end = mapVal[1];
      }
    }
    return memo;
  }, {'begin': Infinity, 'end': -Infinity});
  if (lineData.begin !== Infinity && lineData.end !== Infinity) {
    return orig_md_text.split('\n').slice(lineData.begin-1, lineData.end).join('\n');
  } else {
    throw new Error("Header did not have any line data: " + header);
  }
}

var questmarkOptions = getQuestmarkOptions(X);
var context = (questmarkOptions.hasOwnProperty('initial-context') ? questmarkOptions['initial-context'] : {});
var currentState = (questmarkOptions.hasOwnProperty('initial-state') ? questmarkOptions['initial-state'] : "InitialState");
var allHeaders = getHeaders(X);
var previousErrors = [];

var execCode = function(data, previousErrors) {
  try {
    return eval(data);
  } catch (e) {
    previousErrors.push(e);
    return undefined;
  }
}

var processTokens = function(tokens, previousErrors) {
  return _.compact(_.map(tokens, function(x) {
    if (x.type === 'code_inline') {
      var retval = execCode(x.content, previousErrors);
      if (retval === undefined) {
        return undefined;        
      } else {
        x.content = retval;
        return x;
      }
    } else {
      x.children = processTokens(x.children, previousErrors);
      if (x.children.length > 0) {
        x.content = _.reduce(x.children, function(memo, child){
          var ncontent = child.content;
          if (child.type === 'softbreak') {
            ncontent = '\n';
          }
          return memo + ncontent;
        }, "");        
      }
      return x;      
    }
  }));
}

var parseState = function() {
  if (program.clear) {
    process.stdout.write('\033c\n');  
  }
  if (previousErrors.length > 0) {
    _.each(previousErrors, function(previousError) {
      console.log(("Warning: error occurred: " + previousError.toString()).bold.red);
    })
  }
  previousErrors = [];
  var textInHeader = getRawTextInHeader(md_src, X, currentState);
  var templateFunc = dot.template(textInHeader);
  var state_markdown = templateFunc(context);
  var state_tokens = parseMD(state_markdown);
  var paragraphsData = processTokens(_.filter(_.flatten(getBlocksBetween(state_tokens, 'paragraph_open', 'paragraph_close')), function(x){return x.level === 1}), previousErrors);
  console.log(_.reduce(paragraphsData, function(memo, val){
    memo = memo + '\n\n' + val.content;
    return memo;
  }, "").bold.blue);
  var options = getOptionsForTokens(state_tokens, allHeaders);
  if (program.debugging) {
    console.log(options);
  }
  if (options.length > 0) {
    inquirer.prompt([{
      type: "list",
      name: "selection",
      message: " ",
      choices: _.map(options, 'content')
    }]).then(function(answers) {
      var selectedOption = _.find(options, function(x){return x.content === answers.selection});
      var codeTokens = _.filter(selectedOption.tokens, function(x){return x.type === 'code_inline'});
      _.each(codeTokens, function(codeToken){
        execCode(codeToken.content, previousErrors);
      });
      if (selectedOption.tostate !== undefined) {
        currentState = selectedOption.tostate;
        parseState();
      }        
    });
  } else {
    console.log("No more options - terminating!".red);
  }
}

if (program.repl) {
  var REPL = repl.start({
    "useGlobal": true,
    "useColors": true
  });
  REPL.context.parseMD = parseMD;
  REPL.context.getTokensInInfoHeader = getTokensInInfoHeader;
  REPL.context.getTokensInHeader = getTokensInHeader;
  REPL.context.getOptionsForHeaderBlock = getOptionsForHeaderBlock;
  REPL.context.getListItemContents = getListItemContents;
  REPL.context.lodash = _;
  REPL.context.markdownIt = markdownIt;
}


parseState();

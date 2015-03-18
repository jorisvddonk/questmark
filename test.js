var MarkdownIt = require('markdown-it');
var markdownIt = new MarkdownIt();
var fs = require('fs');
var util = require('util');
var _ = require('lodash');
var repl = require('repl');

var program = require('commander');

program
  .version('0.0.1')
  .option('-r, --repl', 'Spawn REPL')
  .parse(process.argv);

var parseMD = function(text) {
  var tokens = markdownIt.parse(text);
  return tokens;
}

var md_src = fs.readFileSync('spec.md').toString();
var X = parseMD(md_src);
console.log(util.inspect(X));

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
}

var getQuestmarkOptions = function(tokens){
  var defaultQuestmarkOptions = {'hamster': 'kaasbal'};
  var codeBlockInlineTokens = _.filter(_.flatten(_.pluck(_.filter(getTokensInInfoHeader(tokens), function(token) {
    return token.type === 'inline';
  }), 'children')), function(inline_token) {return inline_token.type === 'code_inline'});
  console.log("XXX")
  console.log(codeBlockInlineTokens)
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
}

console.log(getQuestmarkOptions(X));

if (program.repl) {
  var REPL = repl.start({
    "useGlobal": true,
    "useColors": true
  });
  REPL.context.parseMD = parseMD;
  REPL.context.getTokensInInfoHeader = getTokensInInfoHeader;
  REPL.context.getTokensInHeader = getTokensInHeader;
  REPL.context.lodash = _;
  REPL.context.X = X;
}

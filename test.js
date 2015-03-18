var marked = require('marked');
var MarkdownIt = require('markdown-it');
var markdownIt = new MarkdownIt();
var fs = require('fs');
var util = require('util');
var _ = require('lodash');

var ill = new marked.InlineLexer();

var parseMD = function(text) {
  var lexer = new marked.Lexer();
  var tokens = lexer.lex(text);
  return tokens;
}

var md_src = fs.readFileSync('spec.md').toString();
var tokens = console.log(util.inspect(parseMD(md_src)));
console.log(util.inspect(ill.lex(tokens)));


var getTokensInHeader = function(tokens, headerToSearch) {
  return _.reduce(tokens, function(memo, token){
    if (token.type === 'heading') {
      if (token.text !== headerToSearch) {
        memo.foundInfoHeader = false;
      }
    }

    if (memo.foundInfoHeader) {
      memo.tokensInHeader.push(token);
    }

    if (token.type === 'heading') {
      if (token.text === headerToSearch) {
        memo.foundInfoHeader = true;
      }
    }
    return memo;
  }, {foundInfoheader: false, tokensInHeader: []}).tokensInHeader;
}
var getTokensInInfoHeader = function(tokens) {
  return getTokensInHeader(tokens, 'QUESTMARK-OPTIONS-HEADER');
}

var getQuestmarkOptions = function(tokens){
  var defaultQuestmarkOptions = {'hamster': 'kaasbal'};
  var codeBlockTokens = _.filter(getTokensInInfoHeader(tokens), function(token) {
    return token.type === 'code';
  });
  var codeJSONs = _.map(codeBlockTokens, function(codeBlockToken){
    var retval = {};
    try {
      retval = JSON.parse(codeBlockToken.text);
    } catch (e) {}
    return retval;
  });
  return _.reduce(codeJSONs, function(memo, codeJSON) {
    return _.extend(memo, codeJSON);
  }, defaultQuestmarkOptions);
}


console.log(getQuestmarkOptions(tokens));

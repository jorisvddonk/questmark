import MarkdownIt from 'markdown-it'
import fs from "fs";
import _ from 'lodash';
import dot from 'dot';
import inquirer from 'inquirer';
import colors from 'colors';
import program from "commander";
import Token from 'markdown-it/lib/token';
import { QuestmarkEngine } from './questmarkEngine';

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
const engine = new QuestmarkEngine(md_src, program.clear, program.debugging, {
  "test": () => {
    console.log("TEST FUNCTION INVOKED!!");
    return null;
  }
});
engine.parseState();
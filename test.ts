import fs from "fs";
import program from "commander";
import { QuestmarkEngine } from './questmarkEngine';

program
  .version('0.0.1')
  .option('-c, --clear', 'Clear console on each state')
  .option('-d, --debugging', 'Show debug info on console')
  .option('--input <path>', "Load source .md file", "readme.md")
  .parse(process.argv);

const md_src = fs.readFileSync(program.input).toString();
const engine = new QuestmarkEngine(md_src, program.clear, program.debugging, {
  "test": () => {
    console.log("TEST FUNCTION INVOKED!!");
    return null;
  }
});
engine.parseState();
import fs from "fs";
import program from "commander";
import { parseMarkdown } from "./parseMarkdown";
import { QuestVM } from "./QuestVM";

program
  .version('0.0.1')
  .option('-c, --clear', 'Clear console on each state')
  .option('-d, --debugging', 'Show debug info on console')
  .option('--input <path>', "Load source .md or .json file", "examples/cookieStore.md")
  .option('--output <path>', "Emit VMState .json file", "out.json")
  .parse(process.argv);

const input_file = fs.readFileSync(program.input).toString();
const vm = new QuestVM();
if (program.input.endsWith(".json")) {
  vm.loadVMState(JSON.parse(input_file as any));
  vm.run();
} else if (program.input.endsWith(".md")) {
  const vmState = parseMarkdown(input_file).qvmState;
  if (program.out) {
    fs.writeFileSync(program.out, JSON.stringify(vmState, null, 2));
  }
  vm.loadVMState(vmState);
  vm.run();
}

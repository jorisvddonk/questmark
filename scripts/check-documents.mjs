#!/usr/bin/env node

/**
 * Validate Questmark documents without playing them.
 *
 * Usage:
 *   node scripts/check-documents.mjs <directory-or-file> [...]
 *
 * Checks performed:
 *   - every document compiles
 *   - state names are unique
 *   - initial-state points at a real state
 *   - option links point at real states
 *   - the compiled program can be loaded by a VM (catches unknown opcodes)
 *
 * This is deliberately a static/structural check. It does not prove that every
 * route is playable; run the document or use the conformance tooling for that.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseMarkdown, QuestVM } from "questmark";

const EXTENSIONS = [".md", ".qmd", ".md.html", ".qmd.html"];
const SKIP_DIRECTORIES = new Set(["node_modules", ".git", "dist", ".vitepress", ".temp", "_temp"]);

function isDocument(file) {
  return EXTENSIONS.some((extension) => file.endsWith(extension));
}

function walk(target) {
  const stats = fs.statSync(target);
  if (stats.isFile()) {
    return isDocument(target) ? [target] : [];
  }

  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      return SKIP_DIRECTORIES.has(entry.name) ? [] : walk(full);
    }
    return isDocument(entry.name) ? [full] : [];
  });
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("usage: node scripts/check-documents.mjs <directory-or-file> [...]");
  process.exit(2);
}

const files = targets.flatMap((target) => (fs.existsSync(target) ? walk(target) : []));
if (files.length === 0) {
  console.error("no Questmark documents found in the given paths");
  process.exit(2);
}

const failures = [];
let stateCount = 0;

for (const file of files.sort()) {
  const source = fs.readFileSync(file, "utf8");
  const display = path.relative(process.cwd(), file);

  let compiled;
  try {
    compiled = parseMarkdown(source);
  } catch (error) {
    failures.push(`${display}: compile error: ${error.message}`);
    continue;
  }

  const { parsedMDFile, qvmState } = compiled;
  const states = parsedMDFile.children.filter((node) => node.type === "state");
  stateCount += states.length;

  const names = new Set();
  for (const state of states) {
    if (names.has(state.name)) {
      failures.push(`${display}: duplicate state name "${state.name}"`);
    }
    names.add(state.name);
  }

  const initial = parsedMDFile.options?.["initial-state"];
  if (typeof initial === "string" && !names.has(initial)) {
    failures.push(`${display}: initial-state "${initial}" does not exist`);
  }

  for (const state of states) {
    for (const option of state.options ?? []) {
      if (typeof option.link !== "string" || !option.link.startsWith("#")) {
        continue;
      }
      const target = option.link.slice(1);
      if (!names.has(target)) {
        const label = option.text ?? "(no label)";
        failures.push(`${display}: option "${label}" in state "${state.name}" links to missing state "${target}"`);
      }
    }
  }

  try {
    const vm = new QuestVM(
      () => {},
      async () => 0,
      {},
    );
    vm.loadVMState(qvmState);
  } catch (error) {
    failures.push(`${display}: load error: ${error.message}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length} problem(s) found in ${files.length} document(s)`);
  process.exit(1);
}

console.log(`checked ${files.length} document(s), ${stateCount} state(s): ok`);

import { parseMarkdown } from "./parseMarkdown.js";

export interface StructuralDifference {
  path: string;
  message: string;
}

type AnyNode = {
  type?: string;
  value?: string;
  lang?: string;
  children?: AnyNode[];
  name?: string;
  options?: any[];
  link?: string | null;
  text?: string | null;
  directives?: string[] | null;
  preconditionChildren?: AnyNode[] | null;
  effectChildren?: AnyNode[] | null;
};

function collectCode(nodes: AnyNode[] | null | undefined): string[] {
  const result: string[] = [];
  for (const node of nodes || []) {
    if (node.type === "inlineCode") {
      result.push(`inline:${node.value}`);
    } else if (node.type === "code") {
      if (node.lang !== "comment") {
        result.push(`block:${node.value}`);
      }
    } else if (node.children) {
      result.push(...collectCode(node.children));
    }
  }
  return result;
}

function sameArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatArray(values: string[]): string {
  return JSON.stringify(values);
}

/**
 * Compare the parts of two documents that must not be translated: the state
 * graph, option links/directives, code spans, and behavioural header flags.
 * Prose, labels, and post-option text are allowed to differ.
 */
export function compareDocumentStructure(
  sourceMarkdown: string,
  translatedMarkdown: string,
): StructuralDifference[] {
  const source = parseMarkdown(sourceMarkdown).parsedMDFile as AnyNode;
  const translated = parseMarkdown(translatedMarkdown).parsedMDFile as AnyNode;
  const differences: StructuralDifference[] = [];

  const report = (path: string, message: string) => {
    differences.push({ path, message });
  };

  const sourceOptions = (source.options || {}) as Record<string, any>;
  const translatedOptions = (translated.options || {}) as Record<string, any>;

  if (sourceOptions["questmark-spec"] !== translatedOptions["questmark-spec"]) {
    report("header.questmark-spec", "spec versions differ");
  }
  if (sourceOptions["initial-state"] !== translatedOptions["initial-state"]) {
    report(
      "header.initial-state",
      `initial-state differs: ${JSON.stringify(sourceOptions["initial-state"])} vs ${JSON.stringify(translatedOptions["initial-state"])}`,
    );
  }

  const flagShape = (options: Record<string, any>) => ({
    no_link_behaviour: options.options?.no_link_behaviour === "exit" ? "exit" : "loopback_to_options",
    whitespace: options.options?.whitespace === "retain" ? "retain" : null,
    emit_on: options.options?.emit_on === "end_of_line" ? "end_of_line" : null,
    strip_leading_newlines: options.options?.strip_leading_newlines === true,
  });
  const sourceFlags = flagShape(sourceOptions);
  const translatedFlags = flagShape(translatedOptions);
  for (const key of Object.keys(sourceFlags) as Array<keyof typeof sourceFlags>) {
    if (sourceFlags[key] !== translatedFlags[key]) {
      report(`header.options.${key}`, `${String(sourceFlags[key])} vs ${String(translatedFlags[key])}`);
    }
  }

  const sourceContext = (sourceOptions["initial-context"] || {}) as Record<string, string | number>;
  const translatedContext = (translatedOptions["initial-context"] || {}) as Record<string, string | number>;
  const contextKeys = new Set([...Object.keys(sourceContext), ...Object.keys(translatedContext)]);
  for (const key of contextKeys) {
    const inSource = Object.prototype.hasOwnProperty.call(sourceContext, key);
    const inTranslated = Object.prototype.hasOwnProperty.call(translatedContext, key);
    if (!inSource || !inTranslated) {
      report(`header.initial-context.${key}`, inSource ? "missing in translation" : "only in translation");
      continue;
    }
    const left = sourceContext[key];
    const right = translatedContext[key];
    if (typeof left !== typeof right) {
      report(`header.initial-context.${key}`, `type differs: ${typeof left} vs ${typeof right}`);
    } else if (typeof left === "number" && left !== right) {
      report(`header.initial-context.${key}`, `number differs: ${left} vs ${right}`);
    }
    // String values are allowed to differ: they are often translated.
  }

  const sourceStates = (source.children || []) as AnyNode[];
  const translatedStates = (translated.children || []) as AnyNode[];
  if (sourceStates.length !== translatedStates.length) {
    report("states", `state count differs: ${sourceStates.length} vs ${translatedStates.length}`);
  }

  const stateCount = Math.min(sourceStates.length, translatedStates.length);
  for (let stateIndex = 0; stateIndex < stateCount; stateIndex += 1) {
    const sourceState = sourceStates[stateIndex];
    const translatedState = translatedStates[stateIndex];
    const statePath = `state[${stateIndex}]`;

    if (sourceState.name !== translatedState.name) {
      report(`${statePath}.name`, `${JSON.stringify(sourceState.name)} vs ${JSON.stringify(translatedState.name)}`);
    }

    const sourceStateCode = collectCode(sourceState.children);
    const translatedStateCode = collectCode(translatedState.children);
    if (!sameArray(sourceStateCode, translatedStateCode)) {
      report(
        `${statePath}.code`,
        `state text code differs: ${formatArray(sourceStateCode)} vs ${formatArray(translatedStateCode)}`,
      );
    }

    const sourceOptionsList = (sourceState.options || []) as AnyNode[];
    const translatedOptionsList = (translatedState.options || []) as AnyNode[];
    if (sourceOptionsList.length !== translatedOptionsList.length) {
      report(
        `${statePath}.options`,
        `option count differs: ${sourceOptionsList.length} vs ${translatedOptionsList.length}`,
      );
    }

    const optionCount = Math.min(sourceOptionsList.length, translatedOptionsList.length);
    for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1) {
      const sourceOption = sourceOptionsList[optionIndex];
      const translatedOption = translatedOptionsList[optionIndex];
      const optionPath = `${statePath}.option[${optionIndex}]`;

      if (sourceOption.link !== translatedOption.link) {
        report(
          `${optionPath}.link`,
          `${JSON.stringify(sourceOption.link)} vs ${JSON.stringify(translatedOption.link)}`,
        );
      }
      if ((sourceOption.text === null) !== (translatedOption.text === null)) {
        report(`${optionPath}.label`, "one option has a label and the other does not");
      }

      const sourceDirectives = [...(sourceOption.directives || [])].sort();
      const translatedDirectives = [...(translatedOption.directives || [])].sort();
      if (!sameArray(sourceDirectives, translatedDirectives)) {
        report(
          `${optionPath}.directives`,
          `${formatArray(sourceDirectives)} vs ${formatArray(translatedDirectives)}`,
        );
      }

      const sourcePreconditions = collectCode(sourceOption.preconditionChildren);
      const translatedPreconditions = collectCode(translatedOption.preconditionChildren);
      if (!sameArray(sourcePreconditions, translatedPreconditions)) {
        report(
          `${optionPath}.preconditions`,
          `${formatArray(sourcePreconditions)} vs ${formatArray(translatedPreconditions)}`,
        );
      }

      const sourceEffects = collectCode(sourceOption.effectChildren);
      const translatedEffects = collectCode(translatedOption.effectChildren);
      if (!sameArray(sourceEffects, translatedEffects)) {
        report(
          `${optionPath}.effects`,
          `${formatArray(sourceEffects)} vs ${formatArray(translatedEffects)}`,
        );
      }
    }
  }

  return differences;
}

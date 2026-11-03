export const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/g;

export type TemplatePart =
  | { type: "text"; value: string }
  | { type: "placeholder"; key: string };

export function splitTemplate(text: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    parts.push({ type: "placeholder", key: match[1] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

export function placeholdersIn(text: string): Set<string> {
  const names = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    names.add(match[1]);
  }
  return names;
}

export function validatePlaceholders(
  id: string,
  source: string,
  translation: string,
): void {
  const sourceNames = placeholdersIn(source);
  const translationNames = placeholdersIn(translation);

  for (const name of translationNames) {
    if (!sourceNames.has(name)) {
      throw new Error(
        `Translation for "${id}" uses unknown placeholder "{{${name}}}"`,
      );
    }
  }
  for (const name of sourceNames) {
    if (!translationNames.has(name)) {
      throw new Error(
        `Translation for "${id}" is missing placeholder "{{${name}}}"`,
      );
    }
  }
}

/**
 * Replace {{key}} placeholders with context values. Missing keys throw; the
 * caller decides whether to recover.
 */
export function formatTemplate(
  template: string,
  context: Record<string, string | number>,
): string {
  return template.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const value = context[key];
    if (value === undefined || value === null) {
      throw new Error(`message: missing context key "${key}"`);
    }
    return String(value);
  });
}

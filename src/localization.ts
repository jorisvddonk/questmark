import { parseMarkdown } from "./parseMarkdown.js";
import { validatePlaceholders } from "./messageTemplate.js";

export interface CatalogMessage {
  /** The source text this translation belongs to. */
  source: string;
  /** The translated template. Empty means "not translated yet". */
  translation: string;
}

export interface Catalog {
  version: 1;
  locale: string;
  messages: Record<string, CatalogMessage>;
}

export function validateCatalog(catalog: Catalog): void {
  if (catalog === null || typeof catalog !== "object") {
    throw new Error("Invalid catalog: expected an object");
  }
  if (catalog.version !== 1) {
    throw new Error(`Unsupported catalog version: ${String((catalog as Catalog).version)}`);
  }
  if (typeof catalog.locale !== "string" || catalog.locale.length === 0) {
    throw new Error("Invalid catalog: missing locale");
  }
  if (catalog.messages === null || typeof catalog.messages !== "object" || Array.isArray(catalog.messages)) {
    throw new Error("Invalid catalog: messages must be an object keyed by message id");
  }
}

/**
 * Extract every translatable message from a document as an empty catalog.
 * The source templates are the same strings a runtime formats.
 */
export function extractCatalog(markdown: string, locale = "en"): Catalog {
  const { messages } = parseMarkdown(markdown);
  const entries: Record<string, CatalogMessage> = {};
  for (const message of messages) {
    entries[message.id] = { source: message.source, translation: "" };
  }
  return {
    version: 1,
    locale,
    messages: entries,
  };
}

/**
 * Check a catalog against a document without compiling or running it: unknown
 * IDs, changed source text, and placeholder mismatches are returned as error
 * strings. Useful in CI for runtime-localized builds.
 */
export function validateCatalogForDocument(markdown: string, catalog: Catalog): string[] {
  validateCatalog(catalog);
  const { messages } = parseMarkdown(markdown);
  const byId = new Map(messages.map((message) => [message.id, message]));
  const errors: string[] = [];

  for (const [id, entry] of Object.entries(catalog.messages)) {
    const message = byId.get(id);
    if (message === undefined) {
      errors.push(`unknown message id "${id}"`);
      continue;
    }
    if (entry.source !== message.source) {
      errors.push(
        `source mismatch for "${id}": catalog has ${JSON.stringify(entry.source)}, document has ${JSON.stringify(message.source)}`,
      );
      continue;
    }
    if (entry.translation.trim().length === 0) {
      continue;
    }
    try {
      validatePlaceholders(id, message.source, entry.translation);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return errors;
}

/**
 * Return the message IDs present in the document but missing (or empty) in the
 * catalog. Useful in CI before shipping a locale.
 */
export function missingTranslations(markdown: string, catalog: Catalog): string[] {
  const { messages } = parseMarkdown(markdown);
  return messages
    .filter((message) => {
      const entry = catalog.messages[message.id];
      return entry === undefined || entry.translation.trim().length === 0;
    })
    .map((message) => message.id);
}

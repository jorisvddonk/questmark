import { parseMarkdown, type LocalizableMessage, type ParseOptions } from "./parseMarkdown.js";

export interface CatalogMessage {
  /** The source text this translation belongs to. */
  source: string;
  /** The translated text. Empty means "not translated yet". */
  translation: string;
}

export interface Catalog {
  version: 1;
  locale: string;
  messages: Record<string, CatalogMessage>;
}

export interface CatalogTranslatorOptions {
  /**
   * Throw when a catalog entry exists for an ID but its source text no longer
   * matches the document. Default: true.
   */
  failOnStaleSource?: boolean;
}

function assertCatalog(catalog: Catalog) {
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
 * Build a translator for parseMarkdown from a compile-time catalog.
 *
 * Entries are looked up by message id. A non-empty translation wins; an empty
 * translation falls back to the source text. By default a changed source text
 * is an error, so a stale catalog cannot silently put the wrong translation in
 * the wrong place.
 */
export function createCatalogTranslator(catalog: Catalog, options: CatalogTranslatorOptions = {}) {
  assertCatalog(catalog);
  const failOnStaleSource = options.failOnStaleSource !== false;

  return (message: LocalizableMessage): string | undefined => {
    const entry = catalog.messages[message.id];
    if (entry === undefined) {
      return undefined;
    }
    if (failOnStaleSource && entry.source !== message.source) {
      throw new Error(
        `Catalog source mismatch for "${message.id}": expected ${JSON.stringify(entry.source)}, got ${JSON.stringify(message.source)}. Re-extract the catalog.`,
      );
    }
    if (typeof entry.translation !== "string" || entry.translation.trim().length === 0) {
      return undefined;
    }
    return entry.translation;
  };
}

/** Compile a document with a locale catalog. */
export function parseMarkdownForLocale(
  markdown: string,
  catalog: Catalog,
  options: Omit<ParseOptions, "translate"> = {},
) {
  return parseMarkdown(markdown, {
    ...options,
    translate: createCatalogTranslator(catalog),
  });
}

/**
 * Extract every translatable message from a document as an empty catalog.
 * The result can be committed and handed to a translator.
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

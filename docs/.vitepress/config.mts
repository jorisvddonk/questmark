import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Questmark",
  description:
    "A Markdown-based dialogue tree and hypertext fiction language, compiler, interpreter, and TypeScript library.",
  base: "/questmark/",
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    config(md) {
      const fence = md.renderer.rules.fence;
      if (!fence) {
        return;
      }

      // Code fences marked with {playground} get two tabs: the highlighted
      // code, and an inline player that runs that code. The marker itself is
      // not rendered.
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx];
        const info = token.info;
        const hasPlaygroundAttribute = (token.attrs ?? []).some(([name]) => name === "playground");
        const rendered = fence(tokens, idx, options, env, self);
        if (!hasPlaygroundAttribute && !/\bplayground\b/.test(info)) {
          return rendered;
        }

        return `<PlayableCode>${rendered}</PlayableCode>`;
      };
    },
  },
  themeConfig: {
    nav: [
      { text: "Tutorials", link: "/tutorials/first-conversation" },
      { text: "How-to", link: "/how-to/play-a-document" },
      { text: "Reference", link: "/reference/language" },
      { text: "Explanation", link: "/explanation/why-questmark" },
      { text: "Playground", link: "/playground" },
    ],
    sidebar: [
      {
        text: "Tutorials",
        collapsed: false,
        items: [
          { text: "Playground", link: "/playground" },
          { text: "Your first conversation", link: "/tutorials/first-conversation" },
          { text: "Context and state", link: "/tutorials/context-and-state" },
          { text: "Choices with consequences", link: "/tutorials/choices-with-consequences" },
          { text: "Numbers, strings, and randomness", link: "/tutorials/numbers-strings-and-randomness" },
          { text: "Control how text is emitted", link: "/tutorials/control-text-output" },
          { text: "Write a branching dialogue", link: "/tutorials/branching-dialogue" },
          { text: "Build a text adventure", link: "/tutorials/text-adventure" },
        ],
      },
      {
        text: "How-to guides",
        collapsed: false,
        items: [
          { text: "Play a document", link: "/how-to/play-a-document" },
          { text: "Compile to bytecode", link: "/how-to/compile-to-bytecode" },
          { text: "Translate with parallel documents", link: "/how-to/translate-with-parallel-documents" },
          { text: "Debug a document", link: "/how-to/debug-a-document" },
          { text: "Organize a larger document", link: "/how-to/organize-a-document" },
          { text: "Validate documents in CI", link: "/how-to/validate-in-ci" },
          { text: "Cookbook: common patterns", link: "/how-to/recipes" },
          { text: "Design patterns for quests and dialogue", link: "/how-to/quest-patterns" },
          { text: "Embed in an application", link: "/how-to/use-the-library" },
          { text: "Save and load progress", link: "/how-to/save-and-load" },
          { text: "Run untrusted documents safely", link: "/how-to/run-untrusted-documents" },
          { text: "Implement a runtime", link: "/how-to/implement-a-runtime" },
        ],
      },
      {
        text: "Reference",
        collapsed: false,
        items: [
          { text: "Cheat sheet", link: "/reference/cheatsheet" },
          { text: "Language reference", link: "/reference/language" },
          { text: "Document tree and VMState", link: "/reference/document-tree" },
          { text: "Translation parity", link: "/reference/translation-parity" },
          { text: "CLI reference", link: "/reference/cli" },
          { text: "API reference", link: "/reference/api" },
          { text: "Limitations and compatibility", link: "/reference/limitations" },
        ],
      },
      {
        text: "Explanation",
        collapsed: false,
        items: [
          { text: "Why Questmark?", link: "/explanation/why-questmark" },
          { text: "How Questmark works", link: "/explanation/how-questmark-works" },
          { text: "Design principles", link: "/explanation/design-principles" },
          { text: "The Questmark mental model", link: "/explanation/mental-model" },
          { text: "Why a stack machine?", link: "/explanation/why-a-stack-machine" },
          { text: "The text contract", link: "/explanation/text-contract" },
          { text: "The trust model", link: "/explanation/trust-model" },
          { text: "How Questmark is tested", link: "/explanation/how-questmark-is-tested" },
          { text: "Open design problems", link: "/explanation/open-design-problems" },
          { text: "Parallel-documents design", link: "/explanation/localization-parallel-design" },
          { text: "Questmark and Tzo ecosystem", link: "/explanation/ecosystem" },
          { text: "FAQ and comparisons", link: "/explanation/faq" },
        ],
      },
    ],
    editLink: {
      pattern: "https://github.com/jorisvddonk/questmark/edit/master/docs/:path",
      text: "Edit this page on GitHub",
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/jorisvddonk/questmark" },
    ],
    footer: {
      message: "Questmark — released under the MIT license.",
    },
  },
});
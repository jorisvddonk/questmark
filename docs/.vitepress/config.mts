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
          { text: "Embed in an application", link: "/how-to/use-the-library" },
          { text: "Debug a document", link: "/how-to/debug-a-document" },
          { text: "Organize a larger document", link: "/how-to/organize-a-document" },
          { text: "Cookbook: common patterns", link: "/how-to/recipes" },
        ],
      },
      {
        text: "Reference",
        collapsed: false,
        items: [
          { text: "Cheat sheet", link: "/reference/cheatsheet" },
          { text: "Language reference", link: "/reference/language" },
          { text: "CLI reference", link: "/reference/cli" },
          { text: "API reference", link: "/reference/api" },
        ],
      },
      {
        text: "Explanation",
        collapsed: false,
        items: [
          { text: "Why Questmark?", link: "/explanation/why-questmark" },
          { text: "How Questmark works", link: "/explanation/how-questmark-works" },
          { text: "Questmark and Tzo ecosystem", link: "/explanation/ecosystem" },
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
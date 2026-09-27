import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Questmark",
  description:
    "A Markdown-based dialogue tree and hypertext fiction language, compiler, interpreter, and TypeScript library.",
  base: "/questmark/",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "Tutorials", link: "/tutorials/first-conversation" },
      { text: "How-to", link: "/how-to/play-a-document" },
      { text: "Reference", link: "/reference/language" },
      { text: "Explanation", link: "/explanation/why-questmark" },
    ],
    sidebar: [
      {
        text: "Tutorials",
        collapsed: false,
        items: [
          { text: "Your first conversation", link: "/tutorials/first-conversation" },
        ],
      },
      {
        text: "How-to guides",
        collapsed: false,
        items: [
          { text: "Play a document", link: "/how-to/play-a-document" },
          { text: "Compile to bytecode", link: "/how-to/compile-to-bytecode" },
          { text: "Embed in an application", link: "/how-to/use-the-library" },
        ],
      },
      {
        text: "Reference",
        collapsed: false,
        items: [
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
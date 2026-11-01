import DefaultTheme from "vitepress/theme";
import Playground from "./components/Playground.vue";
import { openInPlayground } from "./runtime";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: import("vue").App }) {
    app.component("Playground", Playground);

    if (typeof document === "undefined") {
      return;
    }

    const marker = "__questmarkPlayButtonListener";
    const globalWindow = window as unknown as Record<string, boolean>;
    if (globalWindow[marker]) {
      return;
    }
    globalWindow[marker] = true;

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest(".qm-play-button");
      if (!(button instanceof HTMLElement)) {
        return;
      }

      const block = button.closest(".qm-playable");
      const document = block?.querySelector("pre code")?.textContent;
      if (!document) {
        return;
      }

      event.preventDefault();
      openInPlayground(document);
    });
  },
};

import DefaultTheme from "vitepress/theme";
import Playground from "./components/Playground.vue";
import PlayableCode from "./components/PlayableCode.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: import("vue").App }) {
    app.component("Playground", Playground);
    app.component("PlayableCode", PlayableCode);
  },
};

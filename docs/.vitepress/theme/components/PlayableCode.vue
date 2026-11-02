<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { loadQuestmark } from "../runtime";
import { useQuestmarkPlayer } from "../player";
import InspectorPanel from "./InspectorPanel.vue";

const tab = ref<"code" | "play">("code");
const codeHost = ref<HTMLElement | null>(null);
const outputEl = ref<HTMLElement | null>(null);
const started = ref(false);

const { transcript, choices, error, status, statusLabel, stack, context, run, choose } =
  useQuestmarkPlayer(() => outputEl.value);

function sourceText(): string {
  const code = codeHost.value?.querySelector("pre code");
  return code?.textContent ?? "";
}

function restart() {
  started.value = true;
  run(sourceText());
}

function selectTab(next: "code" | "play") {
  tab.value = next;
  if (next === "play" && !started.value) {
    started.value = true;
    // The panel is rendered in this click, so wait for it to exist.
    nextTick(() => run(sourceText()));
  }
}

onMounted(() => {
  loadQuestmark().catch(() => undefined);
});
</script>

<template>
  <div class="qm-code">
    <div class="qm-code__tabs" role="tablist" aria-label="Questmark code example">
      <button
        type="button"
        role="tab"
        class="qm-tab"
        :class="{ 'qm-tab--active': tab === 'code' }"
        :aria-selected="tab === 'code'"
        @click="selectTab('code')"
      >
        Code
      </button>
      <button
        type="button"
        role="tab"
        class="qm-tab"
        :class="{ 'qm-tab--active': tab === 'play' }"
        :aria-selected="tab === 'play'"
        @click="selectTab('play')"
      >
        ▶ Play
      </button>

      <span v-if="tab === 'play'" class="qm-code__status" :data-status="status">{{ statusLabel }}</span>
      <button v-if="tab === 'play'" type="button" class="qm-code__restart" @click="restart">
        ↻ Restart
      </button>
    </div>

    <div v-show="tab === 'code'" ref="codeHost" class="qm-code__panel qm-code__code" role="tabpanel">
      <slot />
    </div>

    <div
      v-show="tab === 'play'"
      class="qm-code__panel qm-code__play"
      role="tabpanel"
      aria-live="polite"
    >
      <div ref="outputEl" class="qm-player">
        <p v-if="transcript.length === 0 && !error" class="qm-empty">Starting the document…</p>

        <p v-for="(block, index) in transcript" :key="index" class="qm-text">{{ block.text }}</p>

        <p v-if="error" class="qm-error">{{ error }}</p>

        <div v-if="choices.length > 0" class="qm-choices">
          <button
            v-for="choice in choices"
            :key="choice.id"
            type="button"
            class="qm-choice"
            @click="choose(choice)"
          >
            {{ choice.title }}
          </button>
        </div>

        <p v-if="status === 'ended'" class="qm-ended">— The end —</p>
      </div>
    </div>

    <InspectorPanel v-show="tab === 'play'" :stack="stack" :context="context" />
  </div>
</template>

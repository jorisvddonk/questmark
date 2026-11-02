<script setup lang="ts">
import { onMounted, ref } from "vue";
import { loadQuestmark } from "../runtime";
import { DEFAULT_DOCUMENT, EXAMPLES } from "../examples";
import { useQuestmarkPlayer } from "../player";
import InspectorPanel from "./InspectorPanel.vue";

const source = ref(DEFAULT_DOCUMENT);
const selectedExample = ref(EXAMPLES[0].name);
const outputEl = ref<HTMLElement | null>(null);

const { transcript, choices, error, status, statusLabel, stack, context, run, choose, reset } =
  useQuestmarkPlayer(() => outputEl.value);

function runSource() {
  run(source.value);
}

function loadExample() {
  const example = EXAMPLES.find((candidate) => candidate.name === selectedExample.value);
  if (!example) {
    return;
  }

  reset();
  source.value = example.source;
}

onMounted(() => {
  // Warm up the runtime in the background so the first Run feels instant.
  loadQuestmark().catch(() => undefined);
});
</script>

<template>
  <div class="qm-playground">
    <div class="qm-toolbar">
      <label class="qm-field">
        <span class="qm-field__label">Example</span>
        <select v-model="selectedExample" class="qm-select" @change="loadExample">
          <option v-for="example in EXAMPLES" :key="example.name" :value="example.name">
            {{ example.name }}
          </option>
          <option value="__custom__" disabled>Custom document</option>
        </select>
      </label>

      <button type="button" class="qm-run" :disabled="status === 'loading'" @click="runSource">
        {{ status === "idle" ? "▶ Run" : "▶ Run again" }}
      </button>

      <span class="qm-hint">⌘/Ctrl + Enter</span>
    </div>

    <div class="qm-panes">
      <section class="qm-pane">
        <header class="qm-pane__header">
          <span>Document</span>
          <span class="qm-pane__meta">Questmark source</span>
        </header>
        <textarea
          v-model="source"
          class="qm-editor"
          spellcheck="false"
          aria-label="Questmark document source"
          @keydown.meta.enter.prevent="runSource"
          @keydown.ctrl.enter.prevent="runSource"
        />
      </section>

      <section class="qm-pane">
        <header class="qm-pane__header">
          <span>Story</span>
          <span class="qm-pane__meta" :data-status="status">{{ statusLabel }}</span>
        </header>
        <div ref="outputEl" class="qm-story" aria-live="polite">
          <p v-if="transcript.length === 0 && !error" class="qm-empty">
            Press <strong>Run</strong> to play this document. Everything happens in your browser —
            nothing is sent to a server.
          </p>

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

        <InspectorPanel :stack="stack" :context="context" />
      </section>
    </div>
  </div>
</template>

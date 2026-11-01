<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { loadQuestmark, SHARED_DOCUMENT_KEY } from "../runtime";
import { DEFAULT_DOCUMENT, EXAMPLES } from "../examples";

interface Choice {
  id: number;
  title: string;
}

interface TextBlock {
  type: "text";
  text: string;
}

type Status = "idle" | "loading" | "running" | "waiting" | "ended" | "error";

const source = ref(DEFAULT_DOCUMENT);
const selectedExample = ref(EXAMPLES[0].name);
const transcript = ref<TextBlock[]>([]);
const choices = ref<Choice[]>([]);
const error = ref("");
const status = ref<Status>("idle");
const outputEl = ref<HTMLElement | null>(null);

let currentVm: any = null;
let pendingResolve: ((id: number) => void) | null = null;
let openBlock = false;

const statusLabel = computed(() => {
  switch (status.value) {
    case "loading":
      return "Loading runtime…";
    case "running":
      return "Running…";
    case "waiting":
      return "Waiting for a choice";
    case "ended":
      return "Ended";
    case "error":
      return "Error";
    default:
      return "Ready";
  }
});

function scrollToBottom() {
  nextTick(() => {
    if (outputEl.value) {
      outputEl.value.scrollTop = outputEl.value.scrollHeight;
    }
  });
}

function resetStory() {
  transcript.value = [];
  choices.value = [];
  error.value = "";
  openBlock = false;
}

function stop() {
  if (currentVm) {
    currentVm.exit = true;
    currentVm = null;
  }
  pendingResolve = null;
  choices.value = [];
}

function fail(cause: unknown) {
  error.value = cause instanceof Error ? cause.message : String(cause);
  pendingResolve = null;
  choices.value = [];
  status.value = "error";
  scrollToBottom();
}

function emit(body: string | number) {
  const text = String(body);
  if (!text) {
    return;
  }

  if (openBlock && transcript.value.length > 0) {
    transcript.value[transcript.value.length - 1].text += text;
  } else {
    transcript.value.push({ type: "text", text });
    openBlock = true;
  }

  scrollToBottom();
}

function settle(vm: unknown) {
  if (vm !== currentVm) {
    return;
  }
  if (currentVm.exit) {
    status.value = "ended";
    pendingResolve = null;
    choices.value = [];
  } else if (pendingResolve) {
    status.value = "waiting";
  }
}

async function run() {
  stop();
  resetStory();
  status.value = "loading";

  let runtime: Awaited<ReturnType<typeof loadQuestmark>>;
  try {
    runtime = await loadQuestmark();
  } catch (cause) {
    fail(cause);
    return;
  }

  let state: unknown;
  try {
    state = runtime.parseMarkdown(source.value).qvmState;
  } catch (cause) {
    fail(cause);
    return;
  }

  const vm = new runtime.QuestVM(
    (body) => emit(body),
    (available) =>
      new Promise<number>((resolve) => {
        pendingResolve = resolve;
        choices.value = available.map((choice) => ({ id: choice.id, title: choice.title }));
        openBlock = false;
        status.value = "waiting";
        scrollToBottom();
      }),
  );

  vm.eventBus?.on("error", (cause) => fail(cause));
  currentVm = vm;

  try {
    vm.loadVMState(state);
    status.value = "running";
    vm.run();
  } catch (cause) {
    fail(cause);
    return;
  }

  settle(vm);
}

function choose(choice: Choice) {
  const resolve = pendingResolve;
  if (!resolve) {
    return;
  }

  pendingResolve = null;
  choices.value = [];
  openBlock = false;
  status.value = "running";

  const vm = currentVm;
  resolve(choice.id);
  // QuestVM resumes the VM in a promise callback, so let that run first.
  setTimeout(() => settle(vm), 0);
}

function loadExample() {
  const example = EXAMPLES.find((candidate) => candidate.name === selectedExample.value);
  if (!example) {
    return;
  }

  stop();
  resetStory();
  source.value = example.source;
  status.value = "idle";
}

onMounted(() => {
  const shared = sessionStorage.getItem(SHARED_DOCUMENT_KEY);
  if (shared) {
    sessionStorage.removeItem(SHARED_DOCUMENT_KEY);
    source.value = shared;
    selectedExample.value = "__custom__";
  }

  // Warm up the runtime in the background so the first Run feels instant.
  loadQuestmark().catch(() => undefined);
});

onUnmounted(stop);
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

      <button type="button" class="qm-run" :disabled="status === 'loading'" @click="run">
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
          @keydown.meta.enter.prevent="run"
          @keydown.ctrl.enter.prevent="run"
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
      </section>
    </div>
  </div>
</template>

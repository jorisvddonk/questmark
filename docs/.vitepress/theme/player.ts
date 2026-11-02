import { computed, nextTick, onUnmounted, ref } from "vue";
import { loadQuestmark } from "./runtime";

export interface Choice {
  id: number;
  title: string;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export type PlayStatus = "idle" | "loading" | "running" | "waiting" | "ended" | "error";

/**
 * Shared player logic for the inline code players and the full playground.
 * A player owns one VM at a time; `run(source)` compiles and starts it.
 */
export function useQuestmarkPlayer(getOutputEl?: () => HTMLElement | null) {
  const transcript = ref<TextBlock[]>([]);
  const choices = ref<Choice[]>([]);
  const error = ref("");
  const status = ref<PlayStatus>("idle");
  const stack = ref<unknown[]>([]);
  const context = ref<Record<string, string | number>>({});

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
      const element = getOutputEl?.();
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  function resetStory() {
    transcript.value = [];
    choices.value = [];
    error.value = "";
    stack.value = [];
    context.value = {};
    openBlock = false;
  }

  /** Freeze the interpreter state for the inspector. */
  function snapshotState() {
    if (currentVm) {
      stack.value = currentVm.stack.slice();
      context.value = { ...currentVm.context };
    } else {
      stack.value = [];
      context.value = {};
    }
  }

  function stop() {
    if (currentVm) {
      currentVm.exit = true;
      currentVm = null;
    }
    pendingResolve = null;
    choices.value = [];
  }

  function reset() {
    stop();
    resetStory();
    status.value = "idle";
  }

  function fail(cause: unknown) {
    error.value = cause instanceof Error ? cause.message : String(cause);
    pendingResolve = null;
    choices.value = [];
    status.value = "error";
    snapshotState();
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
    snapshotState();
  }

  async function run(source: string) {
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
      state = runtime.parseMarkdown(source).qvmState;
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
          snapshotState();
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

  onUnmounted(stop);

  return {
    transcript,
    choices,
    error,
    status,
    statusLabel,
    stack,
    context,
    run,
    choose,
    reset,
  };
}

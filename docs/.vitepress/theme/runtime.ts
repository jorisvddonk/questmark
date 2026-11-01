import bundleUrl from "../../../dist/browser/bundle.js?url";

export interface QuestmarkRuntime {
  parseMarkdown: (source: string) => { qvmState: unknown };
  QuestVM: new (
    emit: (body: string | number) => void,
    getResponse: (choices: Array<{ id: number; title: string }>) => Promise<number>,
    additionalFunctions?: Record<string, unknown>,
  ) => {
    exit: boolean;
    eventBus?: { on: (event: string, handler: (error: unknown) => void) => void };
    loadVMState: (state: unknown) => void;
    run: () => void;
  };
}

let runtimePromise: Promise<QuestmarkRuntime> | null = null;

/**
 * The browser bundle touches `document` while it initializes, so it cannot be
 * imported (or server-side rendered) directly. Load it with a script tag the
 * first time a player actually needs it.
 */
export function loadQuestmark(): Promise<QuestmarkRuntime> {
  const existing = (window as unknown as { Questmark?: QuestmarkRuntime }).Questmark;
  if (existing) {
    return Promise.resolve(existing);
  }

  if (!runtimePromise) {
    runtimePromise = new Promise<QuestmarkRuntime>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = bundleUrl;
      script.async = true;
      script.onload = () => {
        const runtime = (window as unknown as { Questmark?: QuestmarkRuntime }).Questmark;
        if (runtime) {
          resolve(runtime);
        } else {
          runtimePromise = null;
          reject(new Error("The Questmark runtime loaded, but did not expose a global."));
        }
      };
      script.onerror = () => {
        runtimePromise = null;
        reject(new Error("Could not load the Questmark browser runtime."));
      };
      document.head.appendChild(script);
    });
  }

  return runtimePromise;
}

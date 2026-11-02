<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  stack: unknown[];
  context: Record<string, string | number>;
}>();

const open = ref(false);

const contextEntries = computed(() =>
  Object.entries(props.context).sort(([left], [right]) => left.localeCompare(right)),
);

const stackJson = computed(() => JSON.stringify(props.stack, null, 2));

function display(value: string | number): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function isInternal(key: string): boolean {
  return key.startsWith("__");
}
</script>

<template>
  <div class="qm-inspector">
    <button
      type="button"
      class="qm-inspector__toggle"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="qm-inspector__chevron">{{ open ? "▾" : "▸" }}</span>
      <span>Inspect state</span>
      <span class="qm-inspector__summary">
        stack {{ stack.length }} · context {{ contextEntries.length }}
      </span>
    </button>

    <div v-if="open" class="qm-inspector__body">
      <section class="qm-inspector__section">
        <h4>Stack</h4>
        <pre v-if="stack.length" class="qm-inspector__json">{{ stackJson }}</pre>
        <p v-else class="qm-inspector__empty">empty</p>
      </section>

      <section class="qm-inspector__section">
        <h4>Context</h4>
        <div v-if="contextEntries.length" class="qm-inspector__table-wrap">
          <table class="qm-inspector__table">
            <tbody>
              <tr v-for="[key, value] in contextEntries" :key="key">
                <th scope="row">
                  <code>{{ key }}</code>
                  <span v-if="isInternal(key)" class="qm-inspector__internal">internal</span>
                </th>
                <td>
                  <code>{{ display(value) }}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="qm-inspector__empty">empty</p>
      </section>
    </div>
  </div>
</template>

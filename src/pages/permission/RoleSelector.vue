<script setup lang="ts">
import { computed, ref } from 'vue';
import { ROLES } from './data';
import { IconCheck } from './permIcons';

const props = defineProps<{ initial: string[] }>();
const emit = defineEmits<{ (e: 'change', ids: string[]): void }>();

const sel = ref<Set<string>>(new Set(props.initial));
const groups = computed(() => [...new Set(ROLES.map((r) => r.group))]);

const toggle = (id: string, checked: boolean) => {
  const next = new Set(sel.value);
  if (checked) next.add(id);
  else next.delete(id);
  sel.value = next;
  emit('change', [...next]);
};
</script>

<template>
  <div>
    <div v-for="g in groups" :key="g" :style="{ marginBottom: '14px' }">
      <div :style="{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px' }">{{ g }}</div>
      <div :style="{ display: 'flex', flexWrap: 'wrap', gap: '8px' }">
        <label
          v-for="r in ROLES.filter((x) => x.group === g)"
          :key="r.id"
          class="checkbox"
          :style="{ border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px' }"
        >
          <input type="checkbox" :checked="sel.has(r.id)" @change="toggle(r.id, ($event.target as HTMLInputElement).checked)" />
          <span class="box"><IconCheck /></span>
          <span class="tag" :class="r.color" :style="{ margin: 0 }">{{ r.name }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

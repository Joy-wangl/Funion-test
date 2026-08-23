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
    <div v-for="g in groups" :key="g" class="rs-group">
      <div class="rs-group-name">{{ g }}</div>
      <div class="rs-list">
        <label
          v-for="r in ROLES.filter((x) => x.group === g)"
          :key="r.id"
          class="checkbox rs-item"
        >
          <input type="checkbox" :checked="sel.has(r.id)" @change="toggle(r.id, ($event.target as HTMLInputElement).checked)" />
          <span class="box"><IconCheck /></span>
          <span class="tag mt0" :class="r.color">{{ r.name }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

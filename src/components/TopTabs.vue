<script setup lang="ts">
import type { TabConfig } from '../config/navigation';
import '../components/TopTabs.css';

defineProps<{
  tabs: TabConfig[];
  activeKey: string;
  onChange: (key: string) => void;
}>();
</script>

<template>
  <div class="top-tabs">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="top-tabs-item"
      :class="{ 'is-active': tab.key === activeKey }"
      @click="onChange(tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

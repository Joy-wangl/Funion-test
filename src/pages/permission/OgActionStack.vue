<script setup lang="ts">
import MoreActions from '../../components/MoreActions.vue';
import type { MoreActionItem } from '../../components/MoreActions.vue';

/* 操作列规范：竖排直出最多两个，超出收进「更多」气泡 */
defineProps<{ items: MoreActionItem[] }>();
</script>

<template>
  <div class="og-act-stack">
    <button
      v-for="it in items.slice(0, 2)"
      :key="it.label"
      type="button"
      :class="it.danger ? 'text-link danger' : 'text-link'"
      @click="it.onClick()"
    >{{ it.label }}</button>
    <MoreActions v-if="items.length > 2" :items="items.slice(2)" />
  </div>
</template>

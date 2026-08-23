<script setup lang="ts">
/* ---------- 品控状态标签 ---------- */
import { computed } from 'vue';
import { JUNK_TEXT, type JunkStatus } from './data';

const props = defineProps<{ status: JunkStatus }>();
const cls = computed(() => (props.status === 'junk' ? 'red' : props.status === 'suspect' ? 'orange' : 'green'));
</script>

<template>
  <span class="tag" :class="cls">{{ JUNK_TEXT[status] }}</span>
</template>

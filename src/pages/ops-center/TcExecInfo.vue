<script setup lang="ts">
import { computed } from 'vue';
import type { SubTask } from './data';

/** 执行信息单元格：任务成功/任务失败/执行中 三行计数（标签定宽对齐、数值黑色） */
const props = defineProps<{ sub: SubTask }>();
const nOk = computed(() => props.sub.shops.filter((x) => x.status === 'success').length);
const nFail = computed(() => props.sub.shops.filter((x) => x.status === 'failed').length);
const nRun = computed(() => props.sub.shops.filter((x) => x.status === 'running').length);
</script>

<template>
  <div class="tc-exec">
    <div><span class="k">任务成功</span>：<b>{{ nOk }}</b></div>
    <div><span class="k">任务失败</span>：<b>{{ nFail }}</b></div>
    <div><span class="k">执行中</span>：<b>{{ nRun }}</b></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SubTask } from './data';

/** 发布结果占比条：成功/执行中/失败 分段 + 条数（队列中不计入分段，仅文字提示） */
const props = defineProps<{ sub: SubTask }>();
const total = computed(() => props.sub.shops.length || 1);
const nOk = computed(() => props.sub.shops.filter((x) => x.status === 'success').length);
const nRun = computed(() => props.sub.shops.filter((x) => x.status === 'running').length);
const nFail = computed(() => props.sub.shops.filter((x) => x.status === 'failed').length);
const nWait = computed(() => props.sub.shops.filter((x) => x.status === 'queued').length);
const pct = (n: number) => `${(n / total.value) * 100}%`;
</script>

<template>
  <div class="tc-ratio">
    <span class="tc-ratio-bar">
      <i class="ok" :style="{ width: pct(nOk) }" />
      <i class="run" :style="{ width: pct(nRun) }" />
      <i class="fail" :style="{ width: pct(nFail) }" />
    </span>
    <span class="tc-ratio-text">
      <b class="ok">成功{{ nOk }}</b>
      <b v-if="nRun" class="run">执行中{{ nRun }}</b>
      <b v-if="nFail" class="fail">失败{{ nFail }}</b>
      <b v-if="nWait && !nOk && !nRun && !nFail" class="wait">队列中{{ nWait }}</b>
    </span>
  </div>
</template>

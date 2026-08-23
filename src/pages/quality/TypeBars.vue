<script setup lang="ts">
/* ---------- 售后类型命中条（类型 + 次数 + 占比条） ---------- */
import { pct } from './data';

defineProps<{ types: [string, number][]; total: number }>();
</script>

<template>
  <div class="type-bars">
    <div v-for="[t, n] in types" :key="t" class="tb-row">
      <span class="tag" :class="t === '质量问题' ? 'red' : t === '描述不符' ? 'orange' : ''">{{ t }}</span>
      <div class="tb-bar"><i :style="{ width: total ? `${Math.round((n / total) * 100)}%` : 0 }" /></div>
      <span class="tb-cnt">{{ n }} 次</span>
      <span class="tb-pct">{{ total ? pct(n / total) : '0%' }}</span>
    </div>
  </div>
</template>

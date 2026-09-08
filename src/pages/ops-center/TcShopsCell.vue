<script setup lang="ts">
import { computed } from 'vue';
import type { SubTask } from './data';
import TcRatioBar from './TcRatioBar.vue';

/** 发布店铺单元格：平台徽章 + 共N店 + 成功/失败占比条 */
const props = defineProps<{ sub: SubTask }>();
const platforms = computed(() => [...new Set(props.sub.shops.map((x) => x.platform))]);
</script>

<template>
  <div class="tc-pf">
    <span class="tc-pf-badges">
      <i v-for="p in platforms" :key="p" class="tc-pf-badge">{{ p.charAt(0) }}</i>
      <span class="tc-pf-count">共{{ sub.shops.length }}店</span>
    </span>
    <TcRatioBar :sub="sub" />
  </div>
</template>

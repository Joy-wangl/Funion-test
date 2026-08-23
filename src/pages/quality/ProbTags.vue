<script setup lang="ts">
/* ---------- 命中问题类型：全量标签，内容多时换行展示（只增行高、不产生横向滚动） ---------- */
import { computed } from 'vue';

const props = defineProps<{ hits: [string, number][] }>();
const tagCls = (t: string) => `tag ${t === '质量问题' ? 'red' : t === '描述不符' ? 'orange' : ''}`;
/* 默认展示最多的三个，超出折叠为 +N，悬浮气泡展示全部 */
const shown = computed(() => props.hits.slice(0, 3));
const rest = computed(() => props.hits.slice(3));
</script>

<template>
  <div class="prob-tags">
    <span v-for="[t, n] in shown" :key="t" :class="tagCls(t)">{{ t }} {{ n }}</span>
    <span v-if="rest.length > 0" class="tag prob-more">
      +{{ rest.length }}
      <span class="prob-bubble">
        <span v-for="[t, n] in hits" :key="t" :class="tagCls(t)">{{ t }} {{ n }}</span>
      </span>
    </span>
  </div>
</template>

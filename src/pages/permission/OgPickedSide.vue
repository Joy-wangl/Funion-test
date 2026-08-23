<script setup lang="ts">
import { avaColor } from './data';
import type { Member } from './data';
import { IconXsm } from './permIcons';

/* 已选侧栏：与「选择成员」弹窗同款 */
defineProps<{
  picked: Member[];
  max: number;
  onRemove: (id: string) => void;
}>();
</script>

<template>
  <div class="member-transfer-right">
    <div class="mtr-head">已选择({{ picked.length }}/{{ max }})</div>
    <div class="mtr-body">
      <template v-if="picked.length === 0">
        <div class="mtr-empty">暂未选择成员</div>
      </template>
      <template v-else>
        <div v-for="m in picked" :key="m.id" class="mtr-selected">
          <span class="og-ava" :style="{ background: avaColor(m.name) }">{{ m.name.slice(0, 1) }}</span>
          <span class="mtr-name">{{ m.name }}</span>
          <span class="mtr-rm" @click="onRemove(m.id)"><IconXsm /></span>
        </div>
      </template>
    </div>
  </div>
</template>

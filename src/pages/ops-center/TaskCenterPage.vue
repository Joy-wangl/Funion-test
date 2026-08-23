<script setup lang="ts">
import { ref } from 'vue';
import type { ParentTask } from './data';
import TaskParentList from './TaskParentList.vue';
import TaskSubDetail from './TaskSubDetail.vue';
import TaskSubFlatList from './TaskSubFlatList.vue';

/** 任务中心页：按任务批次 / 按任务详情 两种视角可切换 */
const mode = ref<'batch' | 'detail'>('batch');
const detail = ref<ParentTask | null>(null);
</script>

<template>
  <div class="tc-page">
    <div class="tc-mode">
      <button
        :class="mode === 'batch' ? 'active' : ''"
        @click="mode = 'batch'; detail = null"
      >
        按任务批次
      </button>
      <button :class="mode === 'detail' ? 'active' : ''" @click="mode = 'detail'">
        按任务详情
      </button>
    </div>
    <template v-if="mode === 'batch'">
      <template v-if="detail">
        <button class="tc-back" @click="detail = null">
          ‹ 返回
        </button>
        <TaskSubDetail :parent="detail" />
      </template>
      <TaskParentList v-else @detail="(p: ParentTask) => (detail = p)" />
    </template>
    <TaskSubFlatList v-else />
  </div>
</template>

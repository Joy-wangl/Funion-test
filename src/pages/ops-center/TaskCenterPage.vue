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
    <!-- 头部行：返回（详情态显示，← 图标钮与全局统一）居左、视角切换随后 -->
    <div class="tc-head">
      <button v-if="mode === 'batch' && detail" class="tc-back" title="返回" @click="detail = null">←</button>
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
    </div>
    <template v-if="mode === 'batch'">
      <TaskSubDetail v-if="detail" :parent="detail" />
      <TaskParentList v-else @detail="(p: ParentTask) => (detail = p)" />
    </template>
    <TaskSubFlatList v-else />
  </div>
</template>

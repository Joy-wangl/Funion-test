<script setup lang="ts">
import { ref } from 'vue';
import { typeColor, type ParentTask } from './data';
import TaskParentList from './TaskParentList.vue';
import TaskSubDetail from './TaskSubDetail.vue';
import TaskSubFlatList from './TaskSubFlatList.vue';

/** 任务中心页：按任务批次 / 按任务详情 两种视角可切换 */
const mode = ref<'batch' | 'detail'>('batch');
const detail = ref<ParentTask | null>(null);
/* 单钮切换：钮上展示目标视角名，点击后切换列表模式 */
const toggleMode = () => {
  mode.value = mode.value === 'batch' ? 'detail' : 'batch';
  detail.value = null;
};
</script>

<template>
  <div class="tc-page">
    <!-- 头部行：返回（详情态显示，← 图标钮与全局统一）居左、视角切换钮居右（切换图标 + 目标视角名）；批次进入详情态隐藏切换钮 -->
    <div class="tc-head">
      <button v-if="mode === 'batch' && detail" class="tc-back" title="返回按任务批次" @click="detail = null">← 返回</button>
      <!-- 钻入态头部带出批次信息：创建人/创建时间/任务类型，与批次列表同源 -->
      <div v-if="detail" class="tc-head-meta">
        <span class="tm-name">{{ detail.creator }}</span>
        <span class="tm-time">{{ detail.createTime }}</span>
        <span class="tc-type-tag" :style="{ background: `${typeColor(detail.type)}1a`, color: typeColor(detail.type) }">{{ detail.type }}</span>
      </div>
      <button
        v-if="!detail"
        class="tc-mode-toggle"
        :title="`切换为${mode === 'batch' ? '按任务详情' : '按任务批次'}`"
        @click="toggleMode"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 5.6h9.2M9.3 3.3l2.4 2.3-2.4 2.3M13.5 10.4H4.3M6.7 8.1l-2.4 2.3 2.4 2.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ mode === 'batch' ? '按任务详情' : '按任务批次' }}
      </button>
    </div>
    <template v-if="mode === 'batch'">
      <TaskSubDetail v-if="detail" :parent="detail" />
      <TaskParentList v-else @detail="(p: ParentTask) => (detail = p)" />
    </template>
    <TaskSubFlatList v-else />
  </div>
</template>

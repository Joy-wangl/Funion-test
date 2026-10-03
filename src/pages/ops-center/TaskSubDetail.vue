<script setup lang="ts">
import type { ParentTask } from './data';
import TaskSubFlatList from './TaskSubFlatList.vue';

/* 批次钻入：复用按任务详情列表（parent 收敛数据范围），类型/状态/操作与样式两视角天然一致 */
defineProps<{ parent: ParentTask }>();
</script>

<template>
  <TaskSubFlatList :parent="parent" />
</template>

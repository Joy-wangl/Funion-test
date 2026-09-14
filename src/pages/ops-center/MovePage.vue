<script setup lang="ts">
import { ref } from 'vue';
import './Move.css';
import MoveTasks from './MoveTasks.vue';
import MoveTaskDrawer from './MoveTaskDrawer.vue';
import { mvTasks, type MvTask } from './moveData';
import { pushToast } from '../../components/toast';

/** 自动化中心-自动化任务：纯任务维度清单 + 配置抽屉 */
const tasks = ref<MvTask[]>(mvTasks);

/* 配置抽屉：editing 空=新建 */
const drawer = ref<{ open: boolean; editing: MvTask | null }>({ open: false, editing: null });
const openCreate = () => { drawer.value = { open: true, editing: null }; };
const openEdit = (t: MvTask) => { drawer.value = { open: true, editing: t }; };
const saveTask = (t: MvTask) => {
  const i = tasks.value.findIndex((x) => x.id === t.id);
  if (i >= 0) { tasks.value.splice(i, 1, t); pushToast(`已保存：任务「${t.name}」配置更新`); }
  else { tasks.value.unshift(t); pushToast(`已创建：任务「${t.name}」，启动后按配置执行`); }
  drawer.value = { open: false, editing: null };
};
</script>

<template>
  <div class="sg-page mv-page">
    <MoveTasks :tasks="tasks" @create="openCreate" @edit="openEdit" />

    <MoveTaskDrawer
      v-if="drawer.open"
      :key="drawer.editing?.id ?? 'new'"
      :model="drawer.editing"
      :tasks="tasks"
      @close="drawer = { open: false, editing: null }"
      @save="saveTask"
    />
  </div>
</template>

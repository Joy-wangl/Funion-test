<script setup lang="ts">
import { ref } from 'vue';
import './Move.css';
import MoveTasks from './MoveTasks.vue';
import MoveShops from './MoveShops.vue';
import MoveTaskDrawer from './MoveTaskDrawer.vue';
import { mvTasks, type MvTask } from './moveData';
import { pushToast } from '../../components/toast';

/** 自动化中心-视频号全店搬家：双 tab（搬家任务/店铺关联）+ 配置抽屉 */
const tab = ref<'tasks' | 'shops'>('tasks');
const tasks = ref<MvTask[]>(mvTasks);

/* 配置抽屉：editing 空=新建；presetShopId=店铺关联一键配置预填 */
const drawer = ref<{ open: boolean; editing: MvTask | null; presetShopId?: string }>({ open: false, editing: null });
const openCreate = (presetShopId?: string) => { drawer.value = { open: true, editing: null, presetShopId }; };
const openEdit = (t: MvTask) => { drawer.value = { open: true, editing: t }; };
const saveTask = (t: MvTask) => {
  const i = tasks.value.findIndex((x) => x.id === t.id);
  if (i >= 0) { tasks.value.splice(i, 1, t); pushToast(`已保存：搬家任务「${t.name}」配置更新`); }
  else { tasks.value.unshift(t); pushToast(`已创建：搬家任务「${t.name}」，启动后按配置执行`); }
  drawer.value = { open: false, editing: null };
};

/* 跨 tab 联动：店铺→任务（名称过滤）；ts 令牌保证同值二次跳转也触发 */
const taskKw = ref({ kw: '', ts: 0 });
const goTasks = (kw: string) => { taskKw.value = { kw, ts: Date.now() }; tab.value = 'tasks'; };
</script>

<template>
  <div class="sg-page mv-page">
    <div class="sg-tabs">
      <button class="sg-tab" :class="tab === 'tasks' ? 'active' : ''" @click="tab = 'tasks'">搬家任务</button>
      <button class="sg-tab" :class="tab === 'shops' ? 'active' : ''" @click="tab = 'shops'">店铺关联</button>
    </div>

    <MoveTasks v-show="tab === 'tasks'" :tasks="tasks" :kw="taskKw" @create="openCreate()" @edit="openEdit" />
    <MoveShops v-show="tab === 'shops'" :tasks="tasks" @configure="openCreate" @view-task="goTasks" />

    <MoveTaskDrawer
      v-if="drawer.open"
      :key="`${drawer.editing?.id ?? 'new'}-${drawer.presetShopId ?? ''}`"
      :model="drawer.editing"
      :preset-shop-id="drawer.presetShopId"
      :tasks="tasks"
      @close="drawer = { open: false, editing: null }"
      @save="saveTask"
    />
  </div>
</template>

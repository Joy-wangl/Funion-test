<script setup lang="ts">
/* ---------- 顶栏「执行中」状态：当前账号存在在途竞店抓取任务时展示，无在途任务不渲染不占位；
   悬浮提示保持淘宝账号登录（任务依赖该账号在设备侧执行） ---------- */
import { PLATFORM_LOGO } from './data';
import { smRunningTasks } from '../shunmai/data';
</script>

<template>
  <span
    v-if="smRunningTasks.length"
    class="ops-run-badge"
    title="竞店任务执行中，请保持淘宝账号正常登录，否则任务可能无法正常执行"
  >
    <img class="ops-run-logo" :src="PLATFORM_LOGO.淘宝" alt="淘宝">
    <i class="ops-run-dot" aria-hidden="true" />
    <span>执行中</span>
    <span v-if="smRunningTasks.length > 1" class="ops-run-n">·{{ smRunningTasks.length }}</span>
  </span>
</template>

<script setup lang="ts">
/* 独立展示页外壳：复用主应用 .app-layout/.app-body/.app-content 布局环境，
   仅渲染智能运营中心（侧边栏 + 全部子页），不含应用顶栏与同级顶部 tab */
import OpsCenter from '../src/pages/ops-center/OpsCenter.vue';
import ToastWrap from '../src/components/ToastWrap.vue';
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <main class="app-content">
        <OpsCenter />
      </main>
    </div>
    <!-- 全局标准提示（横幅式 banner）统一挂载点，与主应用 App.vue 保持一致 -->
    <ToastWrap />
  </div>
</template>

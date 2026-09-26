<script setup lang="ts">
/* 独立展示页外壳：复用主应用 .app-layout/.app-body/.app-content 布局环境，
   仅渲染聚合接待（左侧菜单 + 全部视图），不含应用顶栏与同级顶部 tab */
import ReceptionCenter from '../src/pages/reception/ReceptionCenter.vue';
import ToastWrap from '../src/components/ToastWrap.vue';
</script>

<template>
  <div class="app-layout">
    <div class="app-body">
      <main class="app-content ac-standalone">
        <ReceptionCenter :sidebar-collapsed="false" />
      </main>
    </div>
    <!-- 全局标准提示（横幅式 banner）统一挂载点，与主应用 App.vue 保持一致 -->
    <ToastWrap />
  </div>
</template>

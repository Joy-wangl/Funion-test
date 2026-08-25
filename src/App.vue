<script setup lang="ts">
import { ref } from 'vue';
import { navigation } from './config/navigation';
import TopTabs from './components/TopTabs.vue';
import ReceptionCenter from './pages/reception/ReceptionCenter.vue';
import QualityCenter from './pages/quality/QualityCenter.vue';
import AppCenter from './pages/app-center/AppCenter.vue';
import OpsCenter from './pages/ops-center/OpsCenter.vue';
import './App.css';

const readCollapsed = () => {
  try { return localStorage.getItem('funion:sidebarCollapsed') === 'true'; }
  catch { return false; }
};

const activeTabKey = ref('ops-center');
const sidebarCollapsed = ref(readCollapsed());

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  try { localStorage.setItem('funion:sidebarCollapsed', String(sidebarCollapsed.value)); } catch { /* 忽略隐私模式异常 */ }
};

const handleTabChange = (key: string) => {
  const tab = navigation.find((t) => t.key === key);
  if (!tab) return;
  activeTabKey.value = tab.key;
};

defineExpose({ toggleSidebar });
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="app-logo">Funion</div>
      <TopTabs
        :tabs="navigation"
        :active-key="activeTabKey"
        :on-change="handleTabChange"
      />
      <div class="app-header-right">
        <span class="app-avatar" />
        <span class="app-username">七妮妮</span>
        <div class="app-window-dots">
          <button type="button" class="app-dot minimize">
            −
          </button>
          <button type="button" class="app-dot maximize">
            +
          </button>
          <button type="button" class="app-dot close">
            ×
          </button>
        </div>
      </div>
    </header>
    <div class="app-body">
      <!-- 四个顶部 tab 均已完成 Vue 移植（原 .vue-pending 占位分支已移除） -->
      <template v-if="activeTabKey === 'reception-center'">
        <main class="app-content ac-standalone">
          <ReceptionCenter :sidebar-collapsed="sidebarCollapsed" />
        </main>
      </template>
      <template v-else-if="activeTabKey === 'qc-center'">
        <main class="app-content qc-standalone">
          <QualityCenter :sidebar-collapsed="sidebarCollapsed" />
        </main>
      </template>
      <template v-else-if="activeTabKey === 'app-center'">
        <main class="app-content ac-standalone">
          <AppCenter />
        </main>
      </template>
      <template v-else-if="activeTabKey === 'ops-center'">
        <main class="app-content">
          <OpsCenter />
        </main>
      </template>
    </div>
  </div>
</template>

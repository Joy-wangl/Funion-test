<script setup lang="ts">
import { provide, ref } from 'vue';
import { navigation } from './config/navigation';
import TopTabs from './components/TopTabs.vue';
import ReceptionCenter from './pages/reception/ReceptionCenter.vue';
import BeePlugin from './pages/bee-plugin/BeePlugin.vue';
import FunionS from './pages/funion-s/FunionS.vue';
import TokenManage from './pages/token-manage/TokenManage.vue';
import ShunMai from './pages/shunmai/ShunMai.vue';
import KnowledgeBase from './pages/knowledge/KnowledgeBase.vue';
import QualityCenter from './pages/quality/QualityCenter.vue';
import AppCenter from './pages/app-center/AppCenter.vue';
import OpsCenter from './pages/ops-center/OpsCenter.vue';
import PublishProgress from './pages/ops-center/PublishProgress.vue';
import GlobalMsgBell from './components/GlobalMsgBell.vue';
import ToastWrap from './components/ToastWrap.vue';
import './App.css';

const readCollapsed = () => {
  try { return localStorage.getItem('funion:sidebarCollapsed') === 'true'; }
  catch { return false; }
};

/* 深链：location.hash 首段命中顶部 tab 则落地该 tab（分享 HTML 直落指定页），否则默认运维中心 */
const readInitialTab = () => {
  const key = location.hash.replace(/^#/, '').split('/')[0];
  return navigation.some((t) => t.key === key) ? key : 'ops-center';
};

const activeTabKey = ref(readInitialTab());
const sidebarCollapsed = ref(readCollapsed());

/* 蜜蜂插件为弹窗态交互：离开该 tab 前若存在脏态（编辑中/生成中）需二次确认，避免误丢失 */
const beeRef = ref<InstanceType<typeof BeePlugin> | null>(null);
const tabPending = ref<{ hint: { title: string; msg: string; ok: string; cancel?: string }; run: () => void } | null>(null);
const applyTab = (key: string) => { activeTabKey.value = key; };
const confirmTabLeave = () => { const p = tabPending.value; tabPending.value = null; p?.run(); };

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  try { localStorage.setItem('funion:sidebarCollapsed', String(sidebarCollapsed.value)); } catch { /* 忽略隐私模式异常 */ }
};

const handleTabChange = (key: string) => {
  const tab = navigation.find((t) => t.key === key);
  if (!tab) return;
  if (activeTabKey.value === 'bee-plugin' && key !== 'bee-plugin') {
    const hint = beeRef.value?.leaveHint?.() ?? null;
    if (hint) { tabPending.value = { hint, run: () => applyTab(key) }; return; }
  }
  applyTab(key);
};

/* 跨应用跳转（如智能运营中心市场商机「前往顺买商机应用」）：子应用注入后切换顶层 tab */
provide('goApp', (key: string) => handleTabChange(key));

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
        <GlobalMsgBell />
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
          <QualityCenter key="qc-center" :sidebar-collapsed="sidebarCollapsed" />
        </main>
      </template>
      <!-- 品控-线上：还原线上版壳（品控中心标题 · 三菜单 · 无模式页签） -->
      <template v-else-if="activeTabKey === 'qc-online'">
        <main class="app-content qc-standalone">
          <QualityCenter key="qc-online" :sidebar-collapsed="sidebarCollapsed" online />
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
      <template v-else-if="activeTabKey === 'bee-plugin'">
        <main class="app-content">
          <BeePlugin ref="beeRef" />
        </main>
      </template>
      <template v-else-if="activeTabKey === 'funion-s'">
        <main class="app-content">
          <FunionS />
        </main>
      </template>
      <template v-else-if="activeTabKey === 'token-manage'">
        <main class="app-content">
          <TokenManage />
        </main>
      </template>
      <template v-else-if="activeTabKey === 'shunmai'">
        <main class="app-content">
          <ShunMai />
        </main>
      </template>
      <template v-else-if="activeTabKey === 'knowledge'">
        <main class="app-content">
          <KnowledgeBase />
        </main>
      </template>
    </div>
    <!-- 发布进度面板/悬浮球：全局单例（store 驱动），跨顶部 tab 持久可见 -->
    <PublishProgress />
    <!-- 全局标准提示（横幅式 banner）统一挂载点 -->
    <ToastWrap />
    <!-- 离开蜜蜂插件（脏态）二次确认 -->
    <div v-if="tabPending" class="app-confirm" @click.self="tabPending = null">
      <div class="app-confirm-card">
        <b>{{ tabPending.hint.title }}</b>
        <p>{{ tabPending.hint.msg }}</p>
        <div class="app-confirm-foot">
          <button type="button" @click="tabPending = null">{{ tabPending.hint.cancel || '取消' }}</button>
          <button type="button" class="danger" @click="confirmTabLeave">{{ tabPending.hint.ok }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

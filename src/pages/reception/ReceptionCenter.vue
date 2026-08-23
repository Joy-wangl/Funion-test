<script setup lang="ts">
/* =========================================================
   聚合接待（宝妈接待）· 模块外壳
   左侧菜单 + 两个视图：
   ① 宝妈接待表格页（基础数据 › 客服管理）
   ② 智能分流策略页（分流设置 › 智能分流）
   ========================================================= */
import { ref } from 'vue';
import AgentTable from './AgentTable.vue';
import StrategyBoard from './StrategyBoard.vue';
import LiveReception from './LiveReception.vue';
import { RC_AGENTS, type RcAgent } from './data';
import { pushToast } from '../../components/toast';
import ToastWrap from '../../components/ToastWrap.vue';
import '../quality/style.css';
import './rc.css';

type View = 'table' | 'strategy' | 'live';

defineProps<{ sidebarCollapsed: boolean }>();

/** 左侧一级菜单（未开放模块点击 toast 文案口径与线上一致） */
const SIDE_TOP = ['概况', '基础数据', '智能回复'];
const SIDE_BOTTOM = ['监控中心', '平台数据', '记录查询', '远程登录器', '系统配置', '绩效相关统计'];
const JUHE_CHILDREN = ['绩效统计', '接待排名', '实时客服接待', '店铺分流统计'];

const view = ref<View>('table');
const groupsOpen = ref<Record<string, boolean>>({ 聚合接待: true, 分流设置: false });
const agents = ref<RcAgent[]>(RC_AGENTS);
/** 表格页关联策略跳转：打开对应策略卡抽屉 */
const jump = ref<{ id: number | null; seq: number }>({ id: null, seq: 0 });

const goStrategy = (cardId: number) => {
  jump.value = { id: cardId, seq: jump.value.seq + 1 };
  groupsOpen.value = { ...groupsOpen.value, 分流设置: true };
  view.value = 'strategy';
};

const toggleAgentStrategy = (id: number) => {
  const agent = agents.value.find((a) => a.id === id);
  if (!agent) return;
  const next = !agent.strategy;
  agents.value = agents.value.map((a) => (a.id === id ? { ...a, strategy: next } : a));
  pushToast(`已${next ? '启用' : '禁用'}「${agent.name}」的策略，组内客服已同步`);
};
</script>

<template>
  <div class="pm-page qc-page rc-page">
    <!-- ---------- 左侧菜单 ---------- -->
    <aside class="qc-side rc-side" :class="{ collapsed: sidebarCollapsed }">
      <div class="rc-side-brand">
        <span class="rc-logo">聚</span>
        <b>聚合接待</b>
      </div>
      <div class="rc-menu">
        <div v-for="m in SIDE_TOP" :key="m" class="rc-menu-item" @click="pushToast(`演示原型：「${m}」模块暂未开放`)">
          <span class="rc-menu-ico">▦</span>
          <span class="rc-menu-text">{{ m }}</span>
        </div>

        <!-- 聚合接待（默认展开） -->
        <div class="rc-menu-item grp" @click="groupsOpen = { ...groupsOpen, 聚合接待: !groupsOpen['聚合接待'] }">
          <span class="rc-menu-ico">◈</span>
          <span class="rc-menu-text">聚合接待</span>
          <span class="rc-menu-arrow" :class="{ open: groupsOpen['聚合接待'] }">∨</span>
        </div>
        <template v-if="groupsOpen['聚合接待']">
          <template v-for="m in JUHE_CHILDREN" :key="m">
            <div
              v-if="m === '实时客服接待'"
              class="rc-menu-item child"
              :class="{ active: view === 'live' }"
              @click="view = 'live'"
            >
              <span class="rc-menu-text">{{ m }}</span>
            </div>
            <div v-else class="rc-menu-item child" @click="pushToast(`演示原型：「${m}」页面暂未开放`)">
              <span class="rc-menu-text">{{ m }}</span>
            </div>
          </template>
          <div class="rc-menu-item child" :class="{ active: view === 'table' }" @click="view = 'table'">
            <span class="rc-menu-text">宝妈接待</span>
          </div>
        </template>

        <!-- 分流设置（默认收起） -->
        <div class="rc-menu-item grp" @click="groupsOpen = { ...groupsOpen, 分流设置: !groupsOpen['分流设置'] }">
          <span class="rc-menu-ico">⇄</span>
          <span class="rc-menu-text">分流设置</span>
          <span class="rc-menu-arrow" :class="{ open: groupsOpen['分流设置'] }">∨</span>
        </div>
        <div
          v-if="groupsOpen['分流设置']"
          class="rc-menu-item child"
          :class="{ active: view === 'strategy' }"
          @click="() => { jump = { id: null, seq: 0 }; view = 'strategy'; }"
        >
          <span class="rc-menu-text">智能分流</span>
        </div>

        <div v-for="m in SIDE_BOTTOM" :key="m" class="rc-menu-item" @click="pushToast(`演示原型：「${m}」模块暂未开放`)">
          <span class="rc-menu-ico">▦</span>
          <span class="rc-menu-text">{{ m }}</span>
        </div>
      </div>
    </aside>

    <!-- ---------- 主区 ---------- -->
    <div class="qc-main rc-main">
      <AgentTable
        v-if="view === 'table'"
        :agents="agents"
        :set-agents="(v: RcAgent[]) => (agents = v)"
        :toggle-agent-strategy="toggleAgentStrategy"
        :push-toast="pushToast"
        :on-go-strategy="goStrategy"
      />
      <StrategyBoard v-else-if="view === 'strategy'" :push-toast="pushToast" :open-group-id="jump.id" :jump-seq="jump.seq" />
      <LiveReception v-else />
    </div>

    <ToastWrap />
  </div>
</template>

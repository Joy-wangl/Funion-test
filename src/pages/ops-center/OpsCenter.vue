<script setup lang="ts">
import { ref, watch } from 'vue';
import './OpsCenter.css';
import DashboardPage from './DashboardPage.vue';
import InternalPage from './InternalPage.vue';
import MarketPage from './MarketPage.vue';
import SearchPage from './SearchPage.vue';
import OperationManagePage from './OperationManagePage.vue';
import ShopGoodsPage from './ShopGoodsPage.vue';
import CreateProductPage from './CreateProductPage.vue';
import TaskCenterPage from './TaskCenterPage.vue';
import AiAssistantPage from './AiAssistantPage.vue';
import MemberManagement from '../permission/MemberManagement.vue';
import DepartmentManagement from '../permission/DepartmentManagement.vue';
import RolePermission from '../permission/RolePermission.vue';
import OpsGroupManagement from '../permission/OpsGroupManagement.vue';

type PageKey =
  | 'dashboard'
  | 'internal'
  | 'market'
  | 'search'
  | 'operationManage'
  | 'shopGoods'
  | 'createTaobao'
  | 'createVideo'
  | 'taskCenter'
  | 'permMember'
  | 'permDept'
  | 'permRole'
  | 'permOpsGroup'
  | 'aiAssistant';

/** 智能运营中心外壳：侧边栏 + 页面切换（与 preview.html 行为一致） */
/* 收起状态仅本模块内生效并独立持久化，不影响其他顶部 tab 的侧边栏 */
const readOpsCollapsed = () => {
  try { return localStorage.getItem('funion:opsSidebarCollapsed') === 'true'; }
  catch { return false; }
};
const collapsed = ref(readOpsCollapsed());
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
  try { localStorage.setItem('funion:opsSidebarCollapsed', String(collapsed.value)); } catch { /* 忽略隐私模式异常 */ }
};

/* 默认展示内部商机（原版末尾 showPage('internal')） */
const page = ref<PageKey>('internal');
/* 高亮：顶栏 nav 与子级 subnav 共用，全局唯一 */
const active = ref<string>('internal');
/* 三组可展开菜单的展开状态（商机中心默认展开） */
const productOpen = ref(true);
const createOpen = ref(false);
const permissionOpen = ref(false);

/* 切到商品创建子页时自动展开菜单（原版 showCreateTaobao / showCreateVideo） */
const showCreate = (key: 'createTaobao' | 'createVideo') => {
  page.value = key;
  createOpen.value = true;
};

const onSubnav = (key: string, target?: PageKey) => {
  active.value = key;
  if (target) page.value = target;
};

/* 商品创建子项：高亮 + 切页 + 展开菜单（原版 setActive + showCreate） */
const clickCreate = (key: 'createTaobao' | 'createVideo') => {
  active.value = key;
  showCreate(key);
};

const navCls = (key: PageKey) => `nav ${active.value === key ? 'active' : ''}`;
const pageCls = (key: PageKey) => `page ${page.value === key ? 'show' : ''}`;

/* 收起态点击分组：展开侧边栏并打开该组；展开态：正常收合切换 */
const toggleGroup = (key: 'product' | 'create' | 'permission') => {
  const open = key === 'product' ? productOpen : key === 'create' ? createOpen : permissionOpen;
  if (collapsed.value) {
    open.value = true;
    toggleCollapsed();
  } else {
    open.value = !open.value;
  }
};

const permItems: { name: string; target?: PageKey }[] = [
  { name: '店铺管理' },
  { name: '账号管理' },
  { name: '成员管理', target: 'permMember' },
  { name: '部门管理', target: 'permDept' },
  { name: '角色管理', target: 'permRole' },
  { name: '运营组管理', target: 'permOpsGroup' },
];

/* 收起态路由图标悬浮气泡：展示路由名称，有二级路由则展示，点击跳转对应页面 */
interface RailSub { name: string; target?: PageKey; create?: 'createTaobao' | 'createVideo' }
const railMenus: Record<string, { title: string; subs: RailSub[] }> = {
  dashboard: { title: '运营驾驶舱', subs: [{ name: '运营驾驶舱', target: 'dashboard' }] },
  operationManage: { title: '运营管理', subs: [{ name: '运营管理', target: 'operationManage' }] },
  product: { title: '商机中心', subs: [{ name: '全网搜索', target: 'search' }, { name: '内部商机', target: 'internal' }, { name: '市场商机', target: 'market' }] },
  shopGoods: { title: '店铺商品', subs: [{ name: '店铺商品', target: 'shopGoods' }] },
  create: { title: '商品创建', subs: [{ name: '淘宝', create: 'createTaobao' }, { name: '视频号', create: 'createVideo' }] },
  taskCenter: { title: '任务中心', subs: [{ name: '任务中心', target: 'taskCenter' }] },
  strategy: { title: '商品策略', subs: [] },
  aiAssistant: { title: 'AI助手', subs: [{ name: 'AI助手', target: 'aiAssistant' }] },
  automation: { title: '自动化中心', subs: [] },
  permission: { title: '权限设置', subs: permItems.map((p) => ({ name: p.name, target: p.target })) },
};
const railPop = ref<{ key: string; x: number; y: number } | null>(null);
let railTimer: number | undefined;
const railStay = () => { if (railTimer) { window.clearTimeout(railTimer); railTimer = undefined; } };
const railLeave = () => { railStay(); railTimer = window.setTimeout(() => { railPop.value = null; }, 150); };
const railEnter = (key: string, e: MouseEvent) => {
  if (!collapsed.value) return;
  railStay();
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  railPop.value = { key, x: r.right + 6, y: Math.min(r.top, window.innerHeight - 200) };
};
const railGo = (sub: RailSub) => {
  railPop.value = null;
  if (sub.create) clickCreate(sub.create);
  else if (sub.target) onSubnav(sub.name, sub.target);
  else onSubnav(sub.name);
};
watch(collapsed, () => { railPop.value = null; });
</script>

<template>
  <div class="ops-center app" :class="collapsed ? 'side-collapsed' : ''">
    <div class="ops-body">
      <aside class="side" :class="collapsed ? 'collapsed' : ''">
        <div class="side-head">
          <div class="ops-brand">
            <img class="ops-brand-logo" src="/logos/ops-logo.png" alt="" />
            <span class="ops-brand-name">智能运营中心</span>
          </div>
        </div>
        <div class="side-scroll">
          <div :class="navCls('dashboard')" @click="onSubnav('dashboard', 'dashboard')" @mouseenter="railEnter('dashboard', $event)" @mouseleave="railLeave()">
            <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg></span>
            <span class="nav-text">运营驾驶舱</span>
          </div>
          <div :class="navCls('operationManage')" @click="onSubnav('operationManage', 'operationManage')" @mouseenter="railEnter('operationManage', $event)" @mouseleave="railLeave()">
            <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></svg></span>
            <span class="nav-text">运营管理</span>
          </div>
          <div class="nav nav-parent" :class="productOpen ? 'open' : ''" @click.stop="toggleGroup('product')" @mouseenter="railEnter('product', $event)" @mouseleave="railLeave()">
            <div class="nav-left">
              <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.5" fill="currentColor" /></svg></span>
              <span class="nav-text">商机中心</span>
            </div>
            <span class="nav-arrow">▶</span>
          </div>
          <div class="subnav-wrap" :class="productOpen ? 'show' : ''">
            <div class="subnav" :class="active === 'search' ? 'active' : ''" @click.stop="onSubnav('search', 'search')">
              全网搜索
            </div>
            <div class="subnav" :class="active === 'internal' ? 'active' : ''" @click.stop="onSubnav('internal', 'internal')">
              内部商机
            </div>
            <div class="subnav" :class="active === 'market' ? 'active' : ''" @click.stop="onSubnav('market', 'market')">
              市场商机
            </div>
          </div>
          <div :class="navCls('shopGoods')" @click="onSubnav('shopGoods', 'shopGoods')" @mouseenter="railEnter('shopGoods', $event)" @mouseleave="railLeave()">
            <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg></span>
            <span class="nav-text">店铺商品</span>
          </div>
          <div class="nav nav-parent" :class="createOpen ? 'open' : ''" @click.stop="toggleGroup('create')" @mouseenter="railEnter('create', $event)" @mouseleave="railLeave()">
            <div class="nav-left">
              <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v8" /><path d="M8 12h8" /></svg></span>
              <span class="nav-text">商品创建</span>
            </div>
            <span class="nav-arrow">▶</span>
          </div>
          <div class="subnav-wrap" :class="createOpen ? 'show' : ''">
            <div
              class="subnav"
              :class="active === 'createTaobao' ? 'active' : ''"
              @click.stop="clickCreate('createTaobao')"
            >
              淘宝
            </div>
            <div
              class="subnav"
              :class="active === 'createVideo' ? 'active' : ''"
              @click.stop="clickCreate('createVideo')"
            >
              视频号
            </div>
          </div>
          <div :class="navCls('taskCenter')" @click="onSubnav('taskCenter', 'taskCenter')" @mouseenter="railEnter('taskCenter', $event)" @mouseleave="railLeave()">
            <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 13 2 2 4-4" /></svg></span>
            <span class="nav-text">任务中心</span>
          </div>
          <div class="nav" @mouseenter="railEnter('strategy', $event)" @mouseleave="railLeave()">
            <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg></span>
            <span class="nav-text">商品策略</span>
          </div>
          <div :class="navCls('aiAssistant')" @click="onSubnav('aiAssistant', 'aiAssistant')" @mouseenter="railEnter('aiAssistant', $event)" @mouseleave="railLeave()">
            <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l1.8 4.7 4.7 1.8-4.7 1.8L12 17l-1.8-4.7-4.7-1.8 4.7-1.8Z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" /></svg></span>
            <span class="nav-text">AI助手</span>
          </div>
          <div class="nav" @mouseenter="railEnter('automation', $event)" @mouseleave="railLeave()">
            <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg></span>
            <span class="nav-text">自动化中心</span>
          </div>
          <div class="nav nav-parent" :class="permissionOpen ? 'open' : ''" @click.stop="toggleGroup('permission')" @mouseenter="railEnter('permission', $event)" @mouseleave="railLeave()">
            <div class="nav-left">
              <span class="nav-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V6Z" /><path d="m9.3 11.8 2 2 3.4-3.6" /></svg></span>
              <span class="nav-text">权限设置</span>
            </div>
            <span class="nav-arrow">▶</span>
          </div>
          <div class="subnav-wrap" :class="permissionOpen ? 'show' : ''">
            <div
              v-for="item in permItems"
              :key="item.name"
              class="subnav"
              :class="active === item.name ? 'active' : ''"
              @click.stop="onSubnav(item.name, item.target)"
            >
              {{ item.name }}
            </div>
          </div>
        </div>
        <div class="side-foot">
          <button
            type="button"
            class="ops-side-toggle"
            :class="collapsed ? 'is-collapsed' : ''"
            :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
            @click="toggleCollapsed()"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div class="side-version">客户端 v1.0.1</div>
        </div>
      </aside>

      <div class="ops-right">
        <main class="main">
        <div class="content">
          <section :class="pageCls('dashboard')">
            <DashboardPage />
          </section>
          <section :class="pageCls('internal')">
            <InternalPage />
          </section>
          <section :class="pageCls('market')">
            <MarketPage />
          </section>
          <section :class="pageCls('search')">
            <SearchPage />
          </section>
          <section :class="pageCls('operationManage')">
            <OperationManagePage />
          </section>
          <section :class="pageCls('shopGoods')">
            <ShopGoodsPage />
          </section>
          <section :class="pageCls('createTaobao')">
            <CreateProductPage />
          </section>
          <section :class="pageCls('createVideo')">
            <CreateProductPage />
          </section>
          <section :class="pageCls('aiAssistant')">
            <AiAssistantPage />
          </section>
          <section :class="pageCls('taskCenter')">
            <TaskCenterPage />
          </section>
          <section :class="pageCls('permMember')">
            <div class="page-header">
              <div class="page-title">
                <p>组织成员 · 角色与账号状态</p>
              </div>
            </div>
            <div class="pm-page pm-embed">
              <MemberManagement />
            </div>
          </section>
          <section :class="pageCls('permDept')">
            <div class="pm-page pm-embed">
              <DepartmentManagement />
            </div>
          </section>
          <section :class="pageCls('permRole')">
            <div class="page-header">
              <div class="page-title">
                <p>角色分组与功能权限配置</p>
              </div>
            </div>
            <div class="pm-page pm-embed">
              <RolePermission />
            </div>
          </section>
          <section :class="pageCls('permOpsGroup')">
            <div class="pm-page pm-embed">
              <OpsGroupManagement />
            </div>
          </section>
        </div>
        </main>
      </div>
    </div>

    <!-- 收起态路由图标悬浮气泡：路由名 + 二级路由（有则展示），点击跳转 -->
    <Teleport to="body">
      <div
        v-if="railPop && collapsed && railMenus[railPop.key]"
        class="ops-rail-pop"
        :style="{ left: `${railPop.x}px`, top: `${railPop.y}px` }"
        @mouseenter="railStay()"
        @mouseleave="railLeave()"
      >
        <div v-if="railMenus[railPop.key].subs.length !== 1" class="rp-title">{{ railMenus[railPop.key].title }}</div>
        <button
          v-for="s in railMenus[railPop.key].subs"
          :key="s.name"
          type="button"
          class="rp-item"
          :class="active === s.name ? 'on' : ''"
          @click="railGo(s)"
        >
          {{ s.name }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

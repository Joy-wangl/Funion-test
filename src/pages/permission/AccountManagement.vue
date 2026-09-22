<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from '../ops-center/data';
import { shopAcctReq } from '../../components/globalMsgData';
import { amRows, type AmRow } from './accountData';
import './style.css';

/* =========================================================
   权限设置 › 账号管理（账号与店铺管理分离后的账号清单）
   状态 tab（全部/在线/离线，计数随行动态）+ 筛选（平台/关键词/账号类型）
   + 账号表（账号信息/账号ID/账号类型/在线状态/账号更新时间/操作）+ 分页
   账号含卖家/买家：卖家账号有店铺归属（ID 二行账号ID+店铺ID）；买家账号无店铺ID
   无可用成员维度：账号仅本人可见，列表与抽屉均不展示成员
   操作：在线→管理账号/前往；离线→管理账号/前往登录
   添加买家账号入口：主按钮 + 平台气泡菜单（官方图标），点选平台即直达对应添加流程
   ========================================================= */

/* 账号清单与离线计数同源 accountData（侧边栏未读徽标共用） */
const rows = amRows;

/* ---------- 状态 tab（计数随行动态聚合） ---------- */
const tab = ref<'all' | 'online' | 'offline'>('all');
const TABS = computed(() => [
  { key: 'all' as const, label: '全部', count: rows.value.length },
  { key: 'online' as const, label: '在线', count: rows.value.filter((r) => r.status === 'online').length },
  { key: 'offline' as const, label: '离线', count: rows.value.filter((r) => r.status === 'offline').length },
]);

/* ---------- 筛选（即效，无查询按钮） ---------- */
const fPlatform = ref('');
const fKw = ref('');
const fAcctType = ref('');
const PLATFORM_OPTS = ['淘宝', '京东', '拼多多', '1688', '抖音'];
const ACCT_OPTS = ['买家账号', '卖家账号'];

const filtered = computed(() => rows.value.filter((r) => {
  if (tab.value !== 'all' && r.status !== tab.value) return false;
  if (fPlatform.value && r.platform !== fPlatform.value) return false;
  if (fAcctType.value && r.acctType !== fAcctType.value) return false;
  const kw = fKw.value.trim().toLowerCase();
  if (kw && ![r.name, r.login, r.acctId, r.shopId].some((v) => v.toLowerCase().includes(kw))) return false;
  return true;
}));

/* ---------- 添加买家账号：主按钮 + 平台气泡菜单；点选平台即直达添加流程（一步完成） ---------- */
const menuOpen = ref(false);
const addWrapRef = ref<HTMLDivElement | null>(null);
/* 无官方图标资产的平台用品牌色字标兜底（品牌色取值同全网搜索平台色口径） */
const PLAT_BRAND: Record<string, string> = { 1688: '#ff6a00' };
const goAdd = (p: string) => {
  menuOpen.value = false;
  pushToast(`前往${p}添加买家账号`);
};
const onDocDown = (e: MouseEvent) => { if (!addWrapRef.value?.contains(e.target as Node)) menuOpen.value = false; };
watch(menuOpen, (v) => {
  if (v) document.addEventListener('mousedown', onDocDown);
  else document.removeEventListener('mousedown', onDocDown);
});

/* ---------- 管理账号抽屉：账号信息只读（账号仅本人可见，无成员维度） ---------- */
const acctId = ref<string | null>(null);
const acctRow = computed(() => rows.value.find((r) => r.acctId === acctId.value) ?? null);
const openAccount = (r: AmRow) => { acctId.value = r.acctId; };
/* 掉店提醒「前往」：打开对应账号的管理账号抽屉（同名多行时优先离线行） */
watch(shopAcctReq, (v) => {
  if (!v) return;
  const list = rows.value.filter((r) => r.acctId === v.acct);
  const row = list.find((r) => r.status === 'offline') ?? list[0];
  if (row) openAccount(row);
});

/* ---------- 行操作（原型演示交互） ---------- */
const goEnter = (r: AmRow) => pushToast(`前往：${r.name}`);
/* 离线账号：操作列改「前往登录」，引导重新登录恢复在线 */
const goLogin = (r: AmRow) => pushToast(`前往登录：${r.name}`);

/* ---------- ESC 逐层关闭（内层优先；抽屉遮罩点击亦可关） ---------- */
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (acctId.value) acctId.value = null;
  else if (menuOpen.value) menuOpen.value = false;
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.removeEventListener('mousedown', onDocDown);
});
</script>

<template>
  <div class="sg-page am-page">
    <!-- 状态 tab：全部/在线/离线（下划线式页级 tab） -->
    <div class="sg-tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        class="sg-tab"
        :class="tab === t.key ? 'active' : ''"
        @click="tab = t.key"
      >
        {{ t.label }}({{ t.count }})
      </button>
    </div>

    <!-- 筛选卡：条件与添加买家账号入口同排右对齐（条件即效） -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>平台</label>
          <BubbleSelect class-name="sg-select" :value="fPlatform || '平台'" :options="PLATFORM_OPTS" @change="(v: string) => (fPlatform = v)" />
        </div>
        <div class="sg-field">
          <label>关键词</label>
          <input v-model="fKw" class="sg-input" placeholder="账号名称、登录账号、账号ID" />
        </div>
        <div class="sg-field">
          <label>账号类型</label>
          <BubbleSelect class-name="sg-select" :value="fAcctType || '账号类型'" :options="ACCT_OPTS" @change="(v: string) => (fAcctType = v)" />
        </div>
        <div class="sg-actions">
          <!-- 添加买家账号：主按钮展开平台气泡菜单（官方图标），点选平台直达添加流程 -->
          <div ref="addWrapRef" class="am-addwrap" :class="{ open: menuOpen }">
            <button type="button" class="sg-btn primary am-addbtn" @click="menuOpen = !menuOpen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>添加买家账号</span>
              <svg class="am-addbtn-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div v-if="menuOpen" class="am-addmenu">
              <button v-for="p in PLATFORM_OPTS" :key="p" type="button" class="am-addmenu-item" @click="goAdd(p)">
                <img v-if="PLATFORM_LOGO[p]" class="am-addmenu-logo" :src="PLATFORM_LOGO[p]" :alt="p" />
                <span v-else class="am-addmenu-logo am-addmenu-word" :style="{ background: PLAT_BRAND[p] }">{{ p }}</span>
                <span class="am-addmenu-name">{{ p }}</span>
                <svg class="am-addmenu-go" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 账号列表 -->
    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table smg-table am-table">
          <thead>
            <tr>
              <th>账号信息</th>
              <th :style="{ width: '200px' }">账号ID</th>
              <th :style="{ width: '110px' }">账号类型</th>
              <th :style="{ width: '110px' }">在线状态</th>
              <th :style="{ width: '170px' }">账号更新时间</th>
              <th :style="{ width: '120px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.acctId">
              <td>
                <div class="smg-shop">
                  <span class="store-logo"><img :src="PLATFORM_LOGO[r.platform]" alt="" /></span>
                  <div class="smg-shop-info">
                    <span class="smg-shop-name">{{ r.name }}</span>
                    <span class="smg-shop-login">登录账号：{{ r.login }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="smg-idcell">
                  <span>账号ID：{{ r.acctId }}</span>
                  <!-- 买家账号无店铺归属：不展示店铺ID行 -->
                  <span v-if="r.shopId">店铺ID：{{ r.shopId }}</span>
                </div>
              </td>
              <td>{{ r.acctType }}</td>
              <td>
                <!-- 在线状态：在线绿点/离线灰点（同搬家店铺列表状态语言） -->
                <span class="sg-status">
                  <span class="sg-dot" :style="{ background: r.status === 'online' ? '#1eaf72' : '#c3cad4' }" />
                  <span>{{ r.status === 'online' ? '在线' : '离线' }}</span>
                </span>
              </td>
              <td>{{ r.updatedAt }}</td>
              <td>
                <div class="sg-acts">
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="openAccount(r)">管理账号</a>
                  <a v-if="r.status === 'online'" class="sg-link" href="javascript:void(0)" @click.prevent="goEnter(r)">前往</a>
                  <a v-else class="sg-link" href="javascript:void(0)" @click.prevent="goLogin(r)">前往登录</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filtered.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
      <!-- 分页（静态呈现，同店铺商品列表口径） -->
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ rows.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '200条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <!-- 管理账号抽屉：账号信息只读（账号仅本人可见，无成员维度） -->
    <div v-if="acctRow" class="smg-drawer-mask" @click.self="acctId = null">
      <div class="smg-drawer">
        <div class="smg-dr-head">
          <span class="smg-dr-title">管理账号</span>
          <button type="button" class="smg-dr-x" @click="acctId = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="smg-dr-body">
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>平台：</div>
            <input class="smg-dr-input" :value="acctRow.platform" disabled />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>账号类型：</div>
            <input class="smg-dr-input" :value="acctRow.acctType" disabled />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>账号名称：</div>
            <input class="smg-dr-input" :value="acctRow.name" disabled />
          </div>
          <div class="smg-dr-field">
            <div class="smg-dr-label"><i class="smg-req">*</i>登录账号：</div>
            <input class="smg-dr-input" :value="acctRow.login" disabled />
          </div>
        </div>
        <div class="smg-dr-foot">
          <!-- 离线账号：抽屉内直达前往登录（发布到抽屉「前往登录」桥接落到此处闭环） -->
          <button v-if="acctRow.status === 'offline'" type="button" class="sg-btn primary" @click="goLogin(acctRow)">前往登录</button>
          <button type="button" class="sg-btn" @click="acctId = null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

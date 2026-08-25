<script setup lang="ts">
/* =========================================================
   聚合接待 · 实时客服接待（平台账号接待监控）
   8 平台 tab + 筛选统计 + 店铺卡/账号卡
   样式已按项目 token 重构，功能与截图版一致
   ========================================================= */
import { computed, ref } from 'vue';
import { LIVE_PLATFORMS, liveStoresOf, type LivePlatform, type LiveStore } from './liveData';
import { RC_COMPANY, RC_GROUPS } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** 每店默认展示账号卡数，其余收在「查看更多(N个)」 */
const PAGE = 6;

const platform = ref<LivePlatform>('拼多多');
const stores = ref<LiveStore[]>(liveStoresOf('拼多多'));
const expanded = ref<Record<string, boolean>>({});
const nameDraft = ref('');
const nameApplied = ref('');
const updatedAt = ref('2026-08-23 10:52:51');

const shown = computed(() =>
  nameApplied.value
    ? stores.value.filter((s) => s.name.includes(nameApplied.value) || s.accounts.some((a) => a.name.includes(nameApplied.value)))
    : stores.value,
);

const stats = computed(() => {
  const all = stores.value.flatMap((s) => s.accounts);
  return {
    online: all.filter((a) => a.pc).length,
    recv: stores.value.reduce((n, s) => n + s.recv, 0),
    unreplied: stores.value.reduce((n, s) => n + s.unreplied, 0),
    chat: all.filter((a) => a.unreplied > 0).length,
  };
});

/* ── 视图层：异常驱动的监控视图（全部/仅异常/仅在线/仅离线） ── */
type ViewMode = 'all' | 'alert' | 'online' | 'offline';
const view = ref<ViewMode>('all');
const matchView = (a: LiveStore['accounts'][number]) =>
  view.value === 'alert' ? a.unreplied > 0
    : view.value === 'online' ? a.pc
      : view.value === 'offline' ? !a.pc
        : true;
const viewCounts = computed(() => {
  const all = stores.value.flatMap((s) => s.accounts);
  return {
    all: all.length,
    alert: all.filter((a) => a.unreplied > 0).length,
    online: all.filter((a) => a.pc).length,
    offline: all.filter((a) => !a.pc).length,
  };
});
/* 非全部视图：不分页直出命中行，零命中店铺整组隐藏 */
const shownStores = computed(() => shown.value
  .map((s) => ({ ...s, rows: view.value === 'all' ? (expanded.value[s.name] ? s.accounts : s.accounts.slice(0, PAGE)) : s.accounts.filter(matchView) }))
  .filter((s) => view.value === 'all' || s.rows.length > 0));
const emptyViewText = computed(() => (view.value === 'alert' ? '暂无异常账号（未回复）'
  : view.value === 'online' ? '暂无在线账号'
    : view.value === 'offline' ? '暂无离线账号' : '暂无数据'));
/* 顶栏统计可点：再点还原全部 */
const statView = (v: ViewMode) => { view.value = view.value === v ? 'all' : v; };

const switchPlatform = (p: LivePlatform) => {
  platform.value = p;
  stores.value = liveStoresOf(p);
  expanded.value = {};
};

const toggleSwitch = (storeName: string, accId: number, key: 'recvSwitch' | 'loginSwitch') => {
  stores.value = stores.value.map((s) =>
    s.name !== storeName
      ? s
      : { ...s, accounts: s.accounts.map((a) => (a.id === accId ? { ...a, [key]: !a[key] } : a)) },
  );
};

const query = () => {
  nameApplied.value = nameDraft.value.trim();
  updatedAt.value = nowStr();
};
</script>

<template>
  <div class="rc-view rc-live">
    <!-- ---------- 顶栏：平台 tab + 实时统计 ---------- -->
    <div class="qc-body rc-live-top">
      <div class="rc-live-tabs">
        <span
          v-for="p in LIVE_PLATFORMS"
          :key="p"
          class="rc-live-tab"
          :class="{ cur: p === platform }"
          @click="switchPlatform(p)"
        >
          {{ p }}
        </span>
      </div>
      <div class="rc-live-stats">
        <span class="rc-live-stat green click" :class="{ on: view === 'online' }" title="点击筛选在线账号" @click="statView('online')">在线： {{ stats.online }}</span>
        <span class="rc-live-stat green">接待： {{ stats.recv }}</span>
        <span class="rc-live-stat yellow click" :class="{ on: view === 'alert' }" title="点击筛选异常（未回复）账号" @click="statView('alert')">未回复： {{ stats.unreplied }}</span>
        <span class="rc-live-stat yellow click" :class="{ on: view === 'alert' }" title="点击筛选异常（未回复）账号" @click="statView('alert')">聊天服务账号未回复： {{ stats.chat }}</span>
        <span class="rc-live-stat red">紧急： 0</span>
        <span class="rc-live-stat red">严重： 0</span>
      </div>
    </div>

    <!-- ---------- 工具栏：筛选 + 操作 ---------- -->
    <div class="qc-body rc-live-toolbar">
      <div class="rc-live-filters">
        <BubbleSelect class-name="select rc-bs" default-value="公司" :options="[RC_COMPANY]" />
        <BubbleSelect class-name="select rc-bs" default-value="分组" :options="[...RC_GROUPS]" />
        <input
          v-model="nameDraft"
          class="input rc-input"
          placeholder="店铺名称/登录账号"
          @keydown.enter="query"
        />
        <span class="rc-toolbar-div" />
        <BubbleSelect class-name="select rc-bs" default-value="未回复筛选" :options="[]" />
        <BubbleSelect class-name="select rc-bs" default-value="警告状态" :options="[]" />
        <BubbleSelect class-name="select rc-bs" default-value="接待开关" :options="[]" />
      </div>
      <div class="rc-live-actions">
        <button class="btn primary" @click="query">查询数据</button>
        <button class="btn" @click="updatedAt = nowStr()">拉取全部未回复</button>
        <span class="rc-warn-tip">友情提醒：频繁刷新可能会导致账号异常</span>
        <span class="rc-updated">最近更新： {{ updatedAt }}</span>
      </div>
    </div>

    <!-- ---------- 视图切换：异常驱动分段器 ---------- -->
    <div v-if="shown.length > 0" class="rc-live-viewbar">
      <div class="rc-viewseg">
        <button type="button" :class="{ on: view === 'all' }" @click="view = 'all'">全部<i>{{ viewCounts.all }}</i></button>
        <button type="button" :class="{ on: view === 'alert' }" @click="view = 'alert'">仅异常<i :class="{ hot: viewCounts.alert > 0 }">{{ viewCounts.alert }}</i></button>
        <button type="button" :class="{ on: view === 'online' }" @click="view = 'online'">仅在线<i>{{ viewCounts.online }}</i></button>
        <button type="button" :class="{ on: view === 'offline' }" @click="view = 'offline'">仅离线<i>{{ viewCounts.offline }}</i></button>
      </div>
      <span class="rc-view-tip">{{ view === 'all' ? '监控视图：按店铺浏览全部账号' : view === 'alert' ? '异常视图：仅展示未回复账号' : view === 'online' ? '在线视图：仅展示 PC 在线账号' : '离线视图：仅展示 PC 离线账号' }}</span>
    </div>

    <!-- ---------- 店铺流：单列全宽卡 ---------- -->
    <div v-if="shown.length === 0" class="qc-body rc-live-empty">暂无数据</div>
    <div v-else-if="shownStores.length === 0" class="qc-body rc-live-empty">{{ emptyViewText }}</div>
    <div v-else class="rc-live-stores">
      <section v-for="s in shownStores" :key="s.name" class="qc-body rc-store">
        <header class="rc-store-head">
          <b class="rc-store-name">{{ s.name }}</b>
          <span class="rc-store-m"><b>{{ s.recv }}</b> 接待</span>
          <span class="rc-store-m"><b :class="{ red: s.unreplied > 0 }">{{ s.unreplied }}</b> 未回复</span>
          <span class="rc-store-m"><b>{{ s.rate }}</b> 回复率</span>
          <a class="rc-link">平台订单分流</a>
          <span class="rc-store-sp" />
          <span class="rc-store-m">总数 {{ s.total }}</span>
          <button class="btn sm" @click="updatedAt = nowStr()">刷新店铺数据</button>
        </header>

        <div class="rc-noroute">
          <b>不分流 {{ s.noRoute.length }}</b>
          <span class="rc-noroute-txt" :title="s.noRoute.join('、')">{{ s.noRoute.join('、') }}</span>
          <a class="rc-link">修改</a>
        </div>

        <table class="rc-acc-table">
          <thead>
            <tr>
              <th>账号</th>
              <th>在线状态</th>
              <th>接待</th>
              <th>未回复</th>
              <th>接待开关</th>
              <th>登录开关</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="a in s.rows"
              :key="a.id"
              :class="{ alert: a.unreplied > 0 }"
            >
              <td>
                <div class="rc-td-name">
                  <span class="rc-acc-name">{{ a.name }}</span>
                  <span v-if="a.transfer" class="rc-transfer">转移</span>
                </div>
                <div class="rc-acc-id">ID: {{ a.id }}</div>
              </td>
              <td>
                <span class="rc-td-net">
                  <span class="rc-net" :class="{ on: a.pc }" :title="`PC ${a.pc ? '在线' : '离线'}`"><i />PC</span>
                  <span class="rc-net" :class="{ on: a.mobile }" :title="`移动 ${a.mobile ? '在线' : '离线'}`"><i />移动</span>
                </span>
              </td>
              <td class="rc-td-num">{{ a.recv }}</td>
              <td class="rc-td-num"><b :class="{ red: a.unreplied > 0 }">{{ a.unreplied }}</b></td>
              <td>
                <span
                  v-if="a.full"
                  class="rc-switch"
                  :class="{ on: a.recvSwitch }"
                  @click="toggleSwitch(s.name, a.id, 'recvSwitch')"
                ><i /></span>
                <span v-else class="rc-td-dash">—</span>
              </td>
              <td>
                <span
                  v-if="a.full"
                  class="rc-switch"
                  :class="{ on: a.loginSwitch }"
                  @click="toggleSwitch(s.name, a.id, 'loginSwitch')"
                ><i /></span>
                <span v-else class="rc-td-dash">—</span>
              </td>
              <td>
                <button v-if="a.pull" class="rc-pull" title="拉取未回复">拉取</button>
                <span v-else class="rc-td-dash">—</span>
              </td>
            </tr>
            <tr v-if="s.accounts.length === 0">
              <td colspan="7" class="rc-td-empty">暂无账号</td>
            </tr>
          </tbody>
        </table>

        <div v-if="view === 'all' && s.total > PAGE" class="rc-more" @click="expanded = { ...expanded, [s.name]: !expanded[s.name] }">
          {{ expanded[s.name] ? '收起' : `查看更多(${s.total - PAGE}个)` }}
        </div>
      </section>
    </div>
  </div>
</template>

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
    <!-- ---------- 平台 tab ---------- -->
    <div class="qc-body rc-live-tabs">
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

    <!-- ---------- 筛选 + 统计 ---------- -->
    <div class="qc-body rc-live-filter">
      <div class="rc-live-filter-left">
        <div class="rc-filter-row">
          <BubbleSelect class-name="select rc-bs" default-value="公司" :options="[RC_COMPANY]" />
          <BubbleSelect class-name="select rc-bs" default-value="分组" :options="[...RC_GROUPS]" />
          <input
            v-model="nameDraft"
            class="input rc-input"
            placeholder="店铺名称/登录账号"
            @keydown.enter="query"
          />
        </div>
        <div class="rc-filter-row">
          <BubbleSelect class-name="select rc-bs" default-value="未回复筛选" :options="[]" />
          <BubbleSelect class-name="select rc-bs" default-value="警告状态" :options="[]" />
          <BubbleSelect class-name="select rc-bs" default-value="接待开关" :options="[]" />
        </div>
      </div>
      <div class="rc-live-right">
        <div class="rc-live-stats">
          <span class="rc-live-stat green">在线： {{ stats.online }}</span>
          <span class="rc-live-stat green">接待： {{ stats.recv }}</span>
          <span class="rc-live-stat yellow">未回复： {{ stats.unreplied }}</span>
          <span class="rc-live-stat yellow">聊天服务账号未回复： {{ stats.chat }}</span>
          <span class="rc-live-stat red">紧急： 0</span>
          <span class="rc-live-stat red">严重： 0</span>
        </div>
        <div class="rc-live-actions">
          <button class="btn primary" @click="query">查询数据</button>
          <span class="rc-warn-tip">
            友情提醒：频繁刷新
            <br />
            可能会导致账号异常
          </span>
          <button class="btn" @click="updatedAt = nowStr()">拉取全部未回复</button>
          <span class="rc-updated">最近更新： {{ updatedAt }}</span>
        </div>
      </div>
    </div>

    <!-- ---------- 店铺卡 ---------- -->
    <div v-if="shown.length === 0" class="qc-body rc-live-empty">暂无数据</div>
    <div v-else class="rc-live-stores">
      <div v-for="s in shown" :key="s.name" class="qc-body rc-store">
        <div class="rc-store-head">
          <b class="rc-store-name">{{ s.name }}</b>
          <span class="rc-store-m">接待： <b>{{ s.recv }}</b></span>
          <span class="rc-store-m">未回复： <b :class="{ red: s.unreplied > 0 }">{{ s.unreplied }}</b></span>
          <span class="rc-store-m">回复率： <b>{{ s.rate }}</b></span>
          <a class="rc-link">平台订单分流</a>
          <span class="rc-store-sp" />
          <button class="btn sm" @click="updatedAt = nowStr()">刷新店铺数据</button>
          <span class="rc-store-m">总数： {{ s.total }}</span>
        </div>

        <div class="rc-noroute">
          <b>不分流账号：</b>
          <span class="rc-noroute-txt">{{ s.noRoute.join('、') }}</span>
          <a class="rc-link">修改</a>
        </div>

        <div class="rc-accs">
          <div v-for="a in (expanded[s.name] ? s.accounts : s.accounts.slice(0, PAGE))" :key="a.id" class="rc-acc" :class="{ hot: a.pc }">
            <div class="rc-acc-head">
              <span class="rc-acc-name">{{ a.name }}</span>
              <span class="rc-acc-id">ID: {{ a.id }}</span>
            </div>
            <div class="rc-acc-chips">
              <span class="rc-live-chip" :class="{ on: a.pc }">PC: {{ a.pc ? '在线' : '离线' }}</span>
              <span class="rc-live-chip" :class="{ on: a.mobile }">移动: {{ a.mobile ? '在线' : '离线' }}</span>
              <button v-if="a.pull" class="rc-pull">拉取未回复</button>
              <span v-if="a.transfer" class="rc-transfer">转移</span>
            </div>
            <div class="rc-acc-stats">
              <span>接待： <b>{{ a.recv }}</b></span>
              <span>未回复： <b :class="{ red: a.unreplied > 0 }">{{ a.unreplied }}</b></span>
            </div>
            <div v-if="a.full" class="rc-acc-sw">
              <span class="rc-sw-pair">
                接待开关：
                <span class="rc-switch" :class="{ on: a.recvSwitch }" @click="toggleSwitch(s.name, a.id, 'recvSwitch')">
                  <i />
                </span>
              </span>
              <span class="rc-sw-pair">
                登录开关：
                <span class="rc-switch" :class="{ on: a.loginSwitch }" @click="toggleSwitch(s.name, a.id, 'loginSwitch')">
                  <i />
                </span>
              </span>
              <span>在线</span>
            </div>
          </div>
        </div>

        <div v-if="s.total > PAGE" class="rc-more" @click="expanded = { ...expanded, [s.name]: !expanded[s.name] }">
          {{ expanded[s.name] ? '收起' : `查看更多(${s.total - PAGE}个)` }}
        </div>
      </div>
    </div>
  </div>
</template>

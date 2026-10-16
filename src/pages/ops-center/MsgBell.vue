<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { msgs, unreadCount } from './msgData';
import type { MsgKind, OpsMsg } from './msgData';
import { SG_WARN_TYPES } from './shopGoodsData';
import { PLATFORM_LOGO } from './data';

/** 消息通知入口：铃铛+未读角标；面板两层 tab（消息类型→预警类型）+ 商品/店铺/账号集成展示 + 点击跳转定位 */
const emit = defineEmits<{ (e: 'jump', id: string): void }>();

const open = ref(false);
/* 第一层：消息类型（商品下架预警/店铺预警/账号掉线通知）；第二层：预警类型（仅商品类展示全量五类） */
const TABS: { key: 'all' | MsgKind; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'goods', label: '商品信息' },
  { key: 'shop', label: '店铺预警' },
  { key: 'acct', label: '账号掉线通知' },
];
const tab = ref<'all' | MsgKind>('all');
const warn = ref<'all' | string>('all');
const rootRef = ref<HTMLDivElement | null>(null);

const countOfTab = (k: 'all' | MsgKind) => (k === 'all' ? msgs.value.length : msgs.value.filter((m) => m.kind === k).length);
const l1List = computed(() => (tab.value === 'all' ? msgs.value : msgs.value.filter((m) => m.kind === tab.value)));
const showL2 = computed(() => tab.value === 'all' || tab.value === 'goods');
const l2Types = computed(() => SG_WARN_TYPES);
const shown = computed(() => l1List.value.filter((m) => warn.value === 'all' || m.warnType === warn.value));
const pickTab = (t: 'all' | MsgKind) => { tab.value = t; warn.value = 'all'; };

const markAll = () => { msgs.value.forEach((m) => { m.read = true; }); };
const onMsg = (m: OpsMsg) => {
  m.read = true;
  open.value = false;
  if (m.kind === 'goods' && m.p) emit('jump', m.p.id);
};

/* 点击面板外关闭 */
const onDocDown = (e: MouseEvent) => { if (!rootRef.value?.contains(e.target as Node)) open.value = false; };
watch(open, (v) => {
  if (v) document.addEventListener('mousedown', onDocDown);
  else document.removeEventListener('mousedown', onDocDown);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown));
</script>

<template>
  <div ref="rootRef" class="msg-bell">
    <button type="button" class="msg-bell-btn" :title="unreadCount ? `消息通知（${unreadCount} 条未读）` : '消息通知'" @click="open = !open">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      <span v-if="unreadCount" class="msg-badge">{{ unreadCount }}</span>
    </button>
    <div v-if="open" class="msg-panel">
      <div class="msg-head">
        <b>消息通知</b>
        <a :class="{ disabled: !unreadCount }" @click="markAll">全部已读</a>
      </div>
      <!-- 第一层：消息类型（商品下架预警/店铺预警/账号掉线通知） -->
      <div class="msg-tabs l1">
        <span v-for="t in TABS" :key="t.key" :class="{ active: tab === t.key }" @click="pickTab(t.key)">{{ t.label }}({{ countOfTab(t.key) }})</span>
      </div>
      <!-- 第二层：预警类型（仅商品类展示） -->
      <div v-if="showL2" class="msg-tabs l2">
        <span :class="{ active: warn === 'all' }" @click="warn = 'all'">全部({{ l1List.length }})</span>
        <span v-for="w in l2Types" :key="w" :class="{ active: warn === w }" @click="warn = w">{{ w }}({{ l1List.filter((m) => m.warnType === w).length }})</span>
      </div>
      <div class="msg-list">
        <div v-for="m in shown" :key="m.id" class="msg-item" :class="{ unread: !m.read }" @click="onMsg(m)">
          <div class="msg-meta">
            <span v-if="m.tag" class="msg-tag" :class="{ red: m.kind === 'acct' }">{{ m.tag }}</span>
            <span v-else>下架</span>
            <span class="msg-time">{{ m.time }}</span>
          </div>
          <div class="msg-title-row" :class="{ warn: m.kind !== 'goods' }">
            <svg v-if="m.kind !== 'goods'" class="msg-warn-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
            <b>{{ m.warnType }}</b>
            <span class="msg-dot" />
          </div>
          <!-- 商品下架预警：商品集成展示 -->
          <template v-if="m.kind === 'goods' && m.p">
            <div class="msg-goods">
              <img :src="m.p.img" alt="" />
              <div class="msg-ginfo">
                <div class="msg-name">{{ m.p.title }}</div>
                <div class="msg-reason">{{ m.p.offReason }}</div>
              </div>
            </div>
            <div class="msg-kvs">
              <div class="msg-kv"><span class="k">商品ID：</span><span class="v">{{ m.p.id }}</span></div>
              <div class="msg-kv"><span class="k">店铺：</span><span class="v"><span class="store-logo"><img :src="PLATFORM_LOGO[m.p.storePlatform]" alt="" /></span>{{ m.p.store }}</span></div>
            </div>
          </template>
          <!-- 店铺预警 / 账号掉线通知：归属 + 正文 -->
          <template v-else>
            <div class="msg-kvs">
              <template v-if="m.kind === 'shop'">
                <div class="msg-kv"><span class="k">店铺：</span><span class="v">{{ m.shopName }}</span></div>
              </template>
              <template v-else>
                <div class="msg-kv"><span class="k">账号：</span><span class="v">{{ m.acctName }}</span></div>
                <div class="msg-kv"><span class="k">平台：</span><span class="v">{{ m.platform }}</span></div>
                <div class="msg-kv"><span class="k">登录名：</span><span class="v">{{ m.login }}</span></div>
              </template>
            </div>
            <div class="msg-body">{{ m.reason }}</div>
          </template>
        </div>
        <div v-if="!shown.length" class="msg-empty">暂无消息</div>
      </div>
    </div>
  </div>
</template>

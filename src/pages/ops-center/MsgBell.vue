<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { msgs, unreadCount, MSG_GROUPS, warnTypesOf } from './msgData';
import type { OpsMsg } from './msgData';
import { SG_WARN_TYPES } from './shopGoodsData';
import { PLATFORM_LOGO } from './data';

/** 消息通知入口：铃铛+未读角标；面板两层 tab（下架运营组→预警类型）+ 商品集成展示 + 点击跳转定位 */
const emit = defineEmits<{ (e: 'jump', id: string): void }>();

const open = ref(false);
/* 第一层：下架运营组；第二层：预警类型 */
const group = ref<'all' | string>('all');
const warn = ref<'all' | string>('all');
const rootRef = ref<HTMLDivElement | null>(null);

const countOfGroup = (g: string) => msgs.value.filter((m) => m.group === g).length;
const l1List = computed(() => msgs.value.filter((m) => group.value === 'all' || m.group === group.value));
const l2Types = computed(() => (group.value === 'all' ? SG_WARN_TYPES : warnTypesOf(group.value)));
const shown = computed(() => l1List.value.filter((m) => warn.value === 'all' || m.warnType === warn.value));
const pickGroup = (g: 'all' | string) => { group.value = g; warn.value = 'all'; };

const markAll = () => { msgs.value.forEach((m) => { m.read = true; }); };
const onMsg = (m: OpsMsg) => {
  m.read = true;
  open.value = false;
  emit('jump', m.p.id);
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
      <!-- 第一层：下架运营 -->
      <div class="msg-tabs l1">
        <span :class="{ active: group === 'all' }" @click="pickGroup('all')">全部({{ msgs.length }})</span>
        <span v-for="g in MSG_GROUPS" :key="g" :class="{ active: group === g }" @click="pickGroup(g)">{{ g }}({{ countOfGroup(g) }})</span>
      </div>
      <!-- 第二层：预警类型 -->
      <div class="msg-tabs l2">
        <span :class="{ active: warn === 'all' }" @click="warn = 'all'">全部({{ l1List.length }})</span>
        <span v-for="w in l2Types" :key="w" :class="{ active: warn === w }" @click="warn = w">{{ w }}({{ l1List.filter((m) => m.warnType === w).length }})</span>
      </div>
      <div class="msg-list">
        <div v-for="m in shown" :key="m.id" class="msg-item" :class="{ unread: !m.read }" @click="onMsg(m)">
          <div class="msg-meta">
            <span>{{ m.group }}</span>
            <span class="msg-time">{{ m.time }}</span>
          </div>
          <div class="msg-title-row">
            <b>{{ m.warnType }}</b>
            <span class="msg-dot" />
          </div>
          <div class="msg-goods">
            <img :src="m.p.img" alt="" />
            <div class="msg-ginfo">
              <div class="msg-name">{{ m.p.title }}</div>
              <div class="msg-reason">{{ m.p.offReason }}</div>
            </div>
          </div>
          <div class="msg-kvs">
            <div class="msg-kv"><span class="k">商品ID</span><span class="v">{{ m.p.id }}</span></div>
            <div class="msg-kv"><span class="k">店铺</span><span class="v"><span class="store-logo"><img :src="PLATFORM_LOGO[m.p.storePlatform]" alt="" /></span>{{ m.p.store }}</span></div>
          </div>
        </div>
        <div v-if="!shown.length" class="msg-empty">暂无消息</div>
      </div>
    </div>
  </div>
</template>

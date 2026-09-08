<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { gmsgs, gUnreadCount, gMarkAll, GMSG_APPS, GMSG_KINDS, type GlobalMsg } from './globalMsgData';

/** 全局站内信入口（顶栏七妮妮侧）：铃铛+未读角标；面板两层 tab（应用→消息类别），点击已读并跳转对应应用 */
const goApp = inject<(key: string) => void>('goApp', () => {});

const open = ref(false);
/* 第一层：来源应用；第二层：消息类别 */
const app = ref<'全部' | string>('全部');
const kind = ref<'全部' | string>('全部');
const rootRef = ref<HTMLDivElement | null>(null);

const countOfApp = (a: string) => gmsgs.value.filter((m) => m.app === a).length;
const l1List = computed(() => gmsgs.value.filter((m) => app.value === '全部' || m.app === app.value));
const countOfKind = (k: string) => l1List.value.filter((m) => m.kind === k).length;
const shown = computed(() => l1List.value.filter((m) => kind.value === '全部' || m.kind === kind.value));
const pickApp = (a: '全部' | string) => { app.value = a; kind.value = '全部'; };

const onMsg = (m: GlobalMsg) => {
  m.read = true;
  open.value = false;
  goApp(m.target);
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
  <div ref="rootRef" class="gmsg-bell">
    <button type="button" class="gmsg-bell-btn" :title="gUnreadCount ? `站内信（${gUnreadCount} 条未读）` : '站内信'" @click="open = !open">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      <span v-if="gUnreadCount" class="gmsg-badge">{{ gUnreadCount }}</span>
    </button>
    <div v-if="open" class="gmsg-panel">
      <div class="gmsg-head">
        <b>站内信</b>
        <a :class="{ disabled: !gUnreadCount }" @click="gMarkAll()">全部已读</a>
      </div>
      <!-- 第一层：来源应用 -->
      <div class="gmsg-tabs l1">
        <span :class="{ active: app === '全部' }" @click="pickApp('全部')">全部({{ gmsgs.length }})</span>
        <span v-for="a in GMSG_APPS" :key="a" :class="{ active: app === a }" @click="pickApp(a)">{{ a }}({{ countOfApp(a) }})</span>
      </div>
      <!-- 第二层：消息类别 -->
      <div class="gmsg-tabs l2">
        <span :class="{ active: kind === '全部' }" @click="kind = '全部'">全部({{ l1List.length }})</span>
        <span v-for="k in GMSG_KINDS" :key="k" :class="{ active: kind === k }" @click="kind = k">{{ k }}({{ countOfKind(k) }})</span>
      </div>
      <div class="gmsg-list">
        <div v-for="m in shown" :key="m.id" class="gmsg-item" :class="{ unread: !m.read }" @click="onMsg(m)">
          <div class="gmsg-meta">
            <span>{{ m.app }}</span>
            <span class="gmsg-time">{{ m.time }}</span>
          </div>
          <div class="gmsg-title-row">
            <b>{{ m.title }}</b>
            <span class="gmsg-dot" />
          </div>
          <div class="gmsg-desc">{{ m.desc }}</div>
          <div v-if="m.kvs?.length" class="gmsg-kvs">
            <div v-for="kv in m.kvs" :key="kv.k" class="gmsg-kv"><span class="k">{{ kv.k }}</span><span class="v">{{ kv.v }}</span></div>
          </div>
        </div>
        <div v-if="!shown.length" class="gmsg-empty">暂无消息</div>
      </div>
    </div>
  </div>
</template>

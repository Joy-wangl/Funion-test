<script setup lang="ts">
/* ---------- 第三方账号登录状态入口：集合式 icon + 悬浮面板逐平台展示登录态；
   存在未登录平台时 icon 挂红点提示（与消息铃铛未读角标同位同语言） ---------- */
import { computed, onBeforeUnmount, ref } from 'vue';
import { PLATFORM_LOGO } from './data';

const PLATS = ['淘宝', '京东', '拼多多', '抖音'] as const;
type Plat = (typeof PLATS)[number];
/* 会话态登录状态：默认淘宝/京东已登录，拼多多/抖音待登录 */
const logged = ref<Record<Plat, boolean>>({ 淘宝: true, 京东: true, 拼多多: false, 抖音: false });
const unlogged = computed(() => PLATS.filter((p) => !logged.value[p]));

/* 悬浮展开/收起：移出后短暂延迟再收，避免指针斜穿面板边缘误关 */
const open = ref(false);
let timer: number | undefined;
const show = () => { window.clearTimeout(timer); open.value = true; };
const hide = () => { timer = window.setTimeout(() => { open.value = false; }, 120); };
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div class="plat-login" @mouseenter="show" @mouseleave="hide">
    <button
      type="button"
      class="plat-login-btn"
      :title="unlogged.length ? `第三方账号（${unlogged.length} 个平台未登录）` : '第三方账号（全部已登录）'"
    >
      <!-- 集合式 icon：2×2 圆角方块，代表多平台账号集合 -->
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="2.4" />
        <rect x="13" y="3" width="8" height="8" rx="2.4" />
        <rect x="3" y="13" width="8" height="8" rx="2.4" />
        <rect x="13" y="13" width="8" height="8" rx="2.4" />
      </svg>
      <span v-if="unlogged.length" class="plat-login-dot" />
    </button>
    <div v-if="open" class="plat-login-panel">
      <div v-for="p in PLATS" :key="p" class="plat-login-row">
        <img class="plat-login-logo" :src="PLATFORM_LOGO[p]" :alt="p">
        <span class="plat-login-name">{{ p }}</span>
        <span class="plat-login-st" :class="logged[p] ? 'on' : 'off'">{{ logged[p] ? '已登录' : '未登录' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/* ---------- 第三方账号登录状态：顶栏左侧平铺展示各平台登录态；
   已登录仅平台 logo + 已登录标签（不展示平台名称），未登录展示平台名称 + 未登录标签与闪烁状态点 ---------- */
import { ref } from 'vue';
import { PLATFORM_LOGO } from './data';

const PLATS = ['淘宝', '京东', '拼多多', '抖音'] as const;
type Plat = (typeof PLATS)[number];
/* 会话态登录状态：默认淘宝/京东已登录，拼多多/抖音待登录 */
const logged = ref<Record<Plat, boolean>>({ 淘宝: true, 京东: true, 拼多多: false, 抖音: false });
</script>

<template>
  <div class="plat-login">
    <!-- 已登录仅展示平台 logo；未登录展示 logo + 未登录标签（闪烁状态点）；平台名称收进 hover title -->
    <span
      v-for="p in PLATS" :key="p"
      class="plat-login-item" :class="logged[p] ? 'on' : 'off'"
      :title="`${p} · ${logged[p] ? '已登录' : '未登录'}`"
    >
      <img class="plat-login-logo" :src="PLATFORM_LOGO[p]" :alt="p">
      <span v-if="!logged[p]" class="plat-login-st off">
        <i class="plat-login-blink" aria-hidden="true" />
        未登录
      </span>
    </span>
  </div>
</template>

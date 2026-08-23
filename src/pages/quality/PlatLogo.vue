<script lang="ts">
import type { Platform } from './data';

/* ---------- 平台官方图标（品控中心平台展示统一入口） ---------- */
export const PLATFORM_LOGO: Record<Platform, string> = {
  抖音: '/logos/douyin.png',
  快手: '/logos/kuaishou.png',
  拼多多: '/logos/pinduoduo.png',
  淘宝: '/logos/taobao.png',
  天猫: '/logos/tmall.png',
  京东: '/logos/jd.png',
};
</script>

<script setup lang="ts">
/** 平台官方图标（替代彩色圆点，自身即具辨识度）；off = 未覆盖/无数据时置灰 */
defineProps<{ platform: Platform; off?: boolean }>();
</script>

<template>
  <img class="plat-logo" :class="{ off }" :src="PLATFORM_LOGO[platform]" :alt="platform">
</template>

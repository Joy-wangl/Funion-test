<script setup lang="ts">
import { computed, ref } from 'vue';
import { pushToast } from '../../components/toast';
import { BEE_PLATFORM_LOGO, SHOP_LOGIN_META, beeShops } from './data';
import type { BeeShop } from './data';

const emit = defineEmits<{ (e: 'close'): void }>();

const rows = ref<BeeShop[]>([...beeShops]);
const chip = ref<'all' | 'ok' | 'no'>('all');

const filtered = computed(() => rows.value.filter((s) => {
  if (chip.value === 'ok') return s.login === 'ok';
  if (chip.value === 'no') return s.login !== 'ok';
  return true;
}));
const countOf = (k: 'all' | 'ok' | 'no') =>
  k === 'all' ? rows.value.length
    : k === 'ok' ? rows.value.filter((s) => s.login === 'ok').length
      : rows.value.filter((s) => s.login !== 'ok').length;

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
  pushToast('店铺ID已复制');
};
</script>

<template>
  <div class="bs-page">
    <div class="bp-head">
      <span class="bee-logo">🐝</span>
      <span class="bp-title">蜜蜂搬家 · 店铺管理</span>
      <div class="bp-head-r">
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="bp-body">
      <div class="bs-chips">
        <button v-for="c in (['all', 'ok', 'no'] as const)" :key="c" :class="chip === c ? 'active' : ''" @click="chip = c">
          {{ c === 'all' ? '全部' : c === 'ok' ? '已登录' : '未登录' }} ({{ countOf(c) }})
        </button>
      </div>

      <div class="bp-card">
        <table class="bp-table">
          <thead>
            <tr>
              <th style="width: 110px">平台</th>
              <th>店铺名称</th>
              <th style="width: 160px">店铺ID</th>
              <th style="width: 180px">账号名称</th>
              <th style="width: 110px">登录状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filtered" :key="s.id">
              <td>
                <span class="bp-plat">
                  <img :src="BEE_PLATFORM_LOGO[s.platform]" alt="" />
                  {{ s.platform }}
                </span>
              </td>
              <td><div class="bp-name">{{ s.name }}</div></td>
              <td>
                <span class="bs-id">{{ s.id }}</span>
                <button class="bs-copy" title="复制" @click="copy(s.id)">⧉</button>
              </td>
              <td class="bs-account">{{ s.account }}</td>
              <td>
                <span class="bs-status">
                  <i :style="{ background: SHOP_LOGIN_META[s.login].color }" />
                  {{ SHOP_LOGIN_META[s.login].label }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filtered.length === 0" class="bp-empty">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8L12 3z" /></svg>
          <div class="bp-empty-t">暂无店铺数据</div>
          <div class="bp-empty-s">暂无已绑定店铺</div>
        </div>
      </div>
    </div>
  </div>
</template>

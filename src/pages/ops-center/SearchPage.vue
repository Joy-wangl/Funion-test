<script setup lang="ts">
import { ref } from 'vue';
import Ellipsis from '../../components/Ellipsis.vue';

const PLATFORMS = [
  { name: '淘宝', color: '#ff7700' },
  { name: '京东', color: '#e1251b' },
  { name: '拼多多', color: '#e02e24' },
  { name: '1688', color: '#ff6a00' },
  { name: '抖音', color: '#111111' },
];

interface SsResult {
  platform: string;
  color: string;
  name: string;
  price: string;
  sales: number;
}

const NAME_POOL = [
  '便携水果刀削皮刀家用去皮神器创意款',
  '玻尿酸修护精华液补水保湿舒缓敏感肌',
  '立体拼图儿童益智拼装玩具恐龙款',
  '厨房置物架台面调料收纳架免打孔',
  '指甲刀套装全套耳勺指甲钳斜口修剪',
  '多功能料理机家用小型便携果汁杯',
];

/** 全网搜索（集成式竞品搜索） */
const kw = ref('');
const checked = ref<Record<string, boolean>>({});
const searched = ref(false);
const results = ref<SsResult[]>([]);

const doSearch = () => {
  const key = kw.value.trim();
  if (!key) return;
  const plats = PLATFORMS.filter((p) => checked.value[p.name]);
  const use = plats.length ? plats : PLATFORMS;
  const list: SsResult[] = [];
  use.forEach((p, pi) => {
    for (let i = 0; i < 3; i++) {
      list.push({
        platform: p.name,
        color: p.color,
        name: `${key} ${NAME_POOL[(pi + i) % NAME_POOL.length]}`,
        price: (19.9 + ((pi + i) * 37) % 180).toFixed(2),
        sales: 1200 + ((pi * 7 + i * 13) % 40) * 337,
      });
    }
  });
  results.value = list;
  searched.value = true;
};

const clear = () => {
  searched.value = false;
  results.value = [];
};
</script>

<template>
  <div class="ss-page">
    <div class="ss-card">
      <div class="ss-row1">
        <span class="ss-title">集成式竞品搜索</span>
        <input
          v-model="kw"
          class="ss-input"
          placeholder="输入竞品关键词，回车或点击全网搜索"
          @keydown.enter="doSearch"
        />
        <button class="sg-btn primary" @click="doSearch">全网搜索</button>
        <button class="sg-btn" @click="clear">清空结果</button>
      </div>
      <div class="ss-row2">
        <span class="ss-label">搜索平台：</span>
        <label v-for="p in PLATFORMS" :key="p.name" class="ss-plat">
          <input
            type="checkbox"
            :checked="!!checked[p.name]"
            @change="checked = { ...checked, [p.name]: ($event.target as HTMLInputElement).checked }"
          />
          <span class="ss-dot" :style="{ background: p.color }" />
          {{ p.name }}
        </label>
      </div>
    </div>

    <div class="ss-result">
      <div v-if="!searched" class="ss-empty">
        <svg class="ss-empty-icon" viewBox="0 0 48 48" width="56" height="56">
          <circle cx="21" cy="21" r="13" fill="none" stroke="#9aa2b1" stroke-width="3" />
          <line x1="31" y1="31" x2="42" y2="42" stroke="#9aa2b1" stroke-width="3" stroke-linecap="round" />
        </svg>
        <div class="ss-empty-text">输入关键词，一键在多个电商平台搜索竞品</div>
        <div class="ss-empty-sub">支持： 淘宝 / 京东 / 拼多多 / 1688 / 抖音</div>
      </div>
      <div v-else class="ss-list">
        <div v-for="(r, i) in results" :key="i" class="ss-item">
          <span class="ss-item-plat">
            <span class="ss-dot" :style="{ background: r.color }" />
            {{ r.platform }}
          </span>
          <span class="ss-item-name"><Ellipsis :text="r.name" /></span>
          <span class="ss-item-price">¥{{ r.price }}</span>
          <span class="ss-item-sales">销量 {{ r.sales.toLocaleString() }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

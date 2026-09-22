<script setup lang="ts">
import { computed, ref } from 'vue';
import { IconCheck } from './permIcons';
import { PERM_PLAT_SHOPS } from './permScope';

/* ---------- 可见/可管理平台、店铺配置抽屉（店铺为最小粒度，平台级勾选=全选其店铺） ---------- */
const props = defineProps<{ title: string; sub: string; sel: string[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', shops: string[]): void }>();

const picked = ref<Set<string>>(new Set(props.sel));

const platSelCount = (shops: string[]) => shops.filter((s) => picked.value.has(s)).length;
const toggleShop = (shop: string, checked: boolean) => {
  const next = new Set(picked.value);
  if (checked) next.add(shop);
  else next.delete(shop);
  picked.value = next;
};
const togglePlat = (shops: string[], checked: boolean) => {
  const next = new Set(picked.value);
  shops.forEach((s) => {
    if (checked) next.add(s);
    else next.delete(s);
  });
  picked.value = next;
};

const platCount = computed(() => PERM_PLAT_SHOPS.filter((p) => platSelCount(p.shops) > 0).length);
</script>

<template>
  <!-- 抽屉形式：右侧滑出；平台分组卡片＋整行可点，平台头带已选计数，便于选平台与单店 -->
  <div class="psp-mask" @click="emit('close')"></div>
  <div class="psp-drawer">
    <div class="psp-head">
      <div>
        <div class="psp-title">{{ title }}</div>
        <div class="psp-sub">{{ sub }}</div>
      </div>
      <button type="button" class="psp-x" title="关闭" @click="emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
    <div class="psp-body">
      <div class="psp-sum">已选 <b>{{ platCount }}</b> 个平台 · <b>{{ picked.size }}</b> 个店铺</div>
      <div v-for="p in PERM_PLAT_SHOPS" :key="p.platform" class="psp-plat">
        <label class="checkbox psp-row psp-plat-head">
          <input
            type="checkbox"
            :checked="platSelCount(p.shops) === p.shops.length"
            :indeterminate="platSelCount(p.shops) > 0 && platSelCount(p.shops) < p.shops.length"
            @change="togglePlat(p.shops, ($event.target as HTMLInputElement).checked)"
          />
          <span class="box"><IconCheck /></span>
          <span class="psp-name">{{ p.platform }}</span>
          <span class="psp-count">{{ platSelCount(p.shops) }}/{{ p.shops.length }} 店</span>
        </label>
        <div class="psp-shops">
          <label v-for="s in p.shops" :key="s" class="checkbox psp-row psp-shop" :class="picked.has(s) ? 'on' : ''">
            <input type="checkbox" :checked="picked.has(s)" @change="toggleShop(s, ($event.target as HTMLInputElement).checked)" />
            <span class="box"><IconCheck /></span>
            <span class="psp-name">{{ s }}</span>
          </label>
        </div>
      </div>
    </div>
    <div class="psp-foot">
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="emit('confirm', [...picked])">确定</button>
    </div>
  </div>
</template>

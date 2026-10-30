<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { sgProducts } from '../ops-center/shopGoodsData';
import { PLATFORM_LOGO } from '../ops-center/data';
import type { Picked } from './data';

const emit = defineEmits<{ (e: 'close'): void; (e: 'pick', p: Picked): void }>();

/* 商品源：复用智能运营中心「店铺商品」数据（后续两模块合并时同源） */
const kw = ref('');
const plat = ref('全部');
/* sgProducts 按平台分组且多组共用同源数据：拍平并按 id 去重 */
const all = computed(() => {
  const seen = new Set<string>();
  return Object.values(sgProducts).flat().filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
});
const platforms = computed(() => ['全部', ...Array.from(new Set(all.value.map((p) => p.storePlatform)))]);
const list = computed(() => all.value.filter((p) =>
  (plat.value === '全部' || p.storePlatform === plat.value)
  && (!kw.value || p.title.includes(kw.value) || p.linkId.includes(kw.value) || p.id.includes(kw.value))));
const sel = ref<string | null>(null);
const confirm = () => {
  const p = all.value.find((x) => x.id === sel.value);
  if (!p) return;
  emit('pick', { title: p.title, img: p.img, id: p.linkId });
};
</script>

<template>
  <Modal title="选择店铺商品" sub="数据来源：智能运营中心 · 店铺商品" size="xl" @close="emit('close')">
    <div class="as-pick-bar">
      <input v-model="kw" class="as-pick-kw" type="text" placeholder="搜索商品名称 / 商品ID" />
      <div class="as-pick-plats">
        <button v-for="p in platforms" :key="p" type="button" class="as-chip" :class="{ on: plat === p }" @click="plat = p">{{ p }}</button>
      </div>
    </div>
    <div v-if="list.length" class="as-pick-grid">
      <button
        v-for="p in list"
        :key="p.id"
        type="button"
        class="as-pick-card"
        :class="{ on: sel === p.id }"
        @click="sel = p.id"
      >
        <img class="as-pick-img" :src="p.img" alt="" />
        <div class="as-pick-info">
          <div class="as-pick-title">{{ p.title }}</div>
          <div class="as-pick-meta">
            <span class="as-pick-plat"><img :src="PLATFORM_LOGO[p.storePlatform]" alt="" />{{ p.storePlatform }}</span>
            <span>{{ p.store }}</span>
          </div>
          <div class="as-pick-id">ID {{ p.linkId }}</div>
        </div>
        <span v-if="sel === p.id" class="as-pick-check">✓</span>
      </button>
    </div>
    <div v-else class="as-empty small">
      <p>未匹配到商品</p>
      <span>调整关键词或平台筛选后重试</span>
    </div>
    <template #foot>
      <span class="as-pick-count">已选 {{ sel ? 1 : 0 }} 个商品</span>
      <button type="button" class="as-btn" @click="emit('close')">取消</button>
      <button type="button" class="as-btn primary" :disabled="!sel" @click="confirm">确认选择</button>
    </template>
  </Modal>
</template>

<style scoped>
.as-pick-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 14px; }
.as-pick-kw { height: 34px; padding: 0 12px; border: 1px solid var(--color-border, #e6e9ef); border-radius: var(--radius-md, 8px); font-size: 13px; outline: none; min-width: 240px; background: #fff; }
.as-pick-kw:focus { border-color: var(--color-primary, #4f7cff); }
.as-pick-plats { display: flex; flex-wrap: wrap; gap: 8px; }
.as-chip { padding: 5px 12px; border: 1px solid var(--color-border, #e6e9ef); border-radius: var(--radius-md, 8px); background: #fff; font-size: 12px; cursor: pointer; }
.as-chip.on { border-color: var(--color-primary, #4f7cff); background: #eef2ff; color: var(--color-primary, #4f7cff); }
.as-pick-count { margin-right: auto; font-size: 12px; color: var(--color-text-3, #98a0b3); }
.as-pick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; max-height: 56vh; overflow: auto; }
.as-pick-card { position: relative; display: flex; flex-direction: column; text-align: left; border: 1px solid var(--color-border, #e6e9ef); border-radius: 10px; overflow: hidden; background: #fff; cursor: pointer; padding: 0; transition: border-color .15s, box-shadow .15s; }
.as-pick-card:hover { border-color: #c9d8ff; }
.as-pick-card.on { border-color: var(--color-primary, #4f7cff); box-shadow: 0 0 0 2px rgba(79, 124, 255, .16); }
.as-pick-img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; background: var(--color-fill, #f4f6fa); }
.as-pick-info { padding: 8px 10px; }
.as-pick-title { font-size: 12px; color: var(--color-text, #1f2733); line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 34px; }
.as-pick-meta { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 11px; color: var(--color-text-3, #98a0b3); }
.as-pick-plat { display: inline-flex; align-items: center; gap: 3px; }
.as-pick-plat img { width: 12px; height: 12px; border-radius: 2px; }
.as-pick-id { font-size: 11px; color: var(--color-text-3, #98a0b3); margin-top: 2px; }
.as-pick-check { position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary, #4f7cff); color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.as-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 48px 20px; color: var(--color-text-3, #98a0b3); text-align: center; background: #fff; border: 1px dashed var(--color-border, #e6e9ef); border-radius: var(--radius-lg, 12px); }
.as-empty p { margin: 0; font-size: 14px; color: var(--color-text-2, #5d6678); font-weight: 600; }
.as-empty span { font-size: 12px; max-width: 320px; line-height: 1.5; }
.as-empty.small { padding: 24px 16px; border: 0; background: transparent; }
.as-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 14px; border: 1px solid var(--color-border, #e6e9ef); background: #fff; color: var(--color-text, #1f2733); border-radius: var(--radius-md, 8px); font-size: 13px; cursor: pointer; white-space: nowrap; transition: border-color .15s, color .15s; }
.as-btn:hover:not(:disabled) { border-color: #c9d8ff; color: var(--color-primary, #4f7cff); }
.as-btn.primary { background: var(--color-primary, #4f7cff); border-color: var(--color-primary, #4f7cff); color: #fff; }
.as-btn.primary:hover:not(:disabled) { background: #3a68ef; border-color: #3a68ef; color: #fff; }
.as-btn:disabled { opacity: .5; cursor: not-allowed; }
</style>

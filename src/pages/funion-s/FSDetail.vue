<script setup lang="ts">
import { computed, ref } from 'vue';
import type { BeeProduct } from '../bee-plugin/data';
import { sgDetail } from '../ops-center/shopGoodsData';

const props = defineProps<{ product: BeeProduct }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'beautify', p: BeeProduct): void }>();

/* 纯图片画廊：主图/SKU图/详情图/白底图/场景图 五类分好，不放表单与铺货内容 */
const mains = computed(() => [props.product.img, ...sgDetail.mainImgs].slice(0, 5));
const skuImgs = computed(() => sgDetail.skus.map((s) => ({ ...s, img: props.product.img })));

const CATS = [
  { key: 'main', label: '主图' },
  { key: 'sku', label: 'SKU图' },
  { key: 'desc', label: '详情图' },
  { key: 'white', label: '白底图' },
  { key: 'scene', label: '场景图' },
] as const;
type CatKey = (typeof CATS)[number]['key'];
const countOf = (k: CatKey) =>
  k === 'main' ? mains.value.length
    : k === 'sku' ? skuImgs.value.length
      : k === 'desc' ? sgDetail.detailImgs.length
        : 1;

/* 左侧类目导航：点击跳转对应分区；滚动时联动回导航 active */
const active = ref<CatKey>('main');
const secsRef = ref<HTMLElement | null>(null);
const jump = (k: CatKey) => {
  active.value = k;
  secsRef.value?.querySelector(`[data-sec="${k}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
const onScroll = () => {
  const box = secsRef.value;
  if (!box) return;
  let cur: CatKey = 'main';
  for (const s of Array.from(box.querySelectorAll<HTMLElement>('[data-sec]'))) {
    if (s.getBoundingClientRect().top - box.getBoundingClientRect().top <= 96) cur = s.dataset.sec as CatKey;
  }
  active.value = cur;
};

/* AI 美化：携带当前商品跳转 AI美化工作台（商品与图片带过去预置） */
</script>

<template>
  <div class="bee-dialog wide fsd-page">
    <!-- 顶栏：只留 AI美化 与关闭，无编辑/铺货操作 -->
    <div class="bp-head">
      <span class="bee-logo fs">S</span>
      <span class="bp-title">Funion s · 商品详情</span>
      <div class="bp-head-r">
        <button class="bp-btn ai" @click="emit('beautify', product)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" /></svg>
          AI美化
        </button>
        <span class="bp-tag" :class="product.complete ? 'ok' : 'no'">{{ product.complete ? '已完善' : '未完善' }}</span>
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="fsd-body">
      <!-- 左侧类目导航 -->
      <nav class="fsd-nav">
        <button v-for="c in CATS" :key="c.key" :class="{ on: active === c.key }" @click="jump(c.key)">
          {{ c.label }}<i>{{ countOf(c.key) }}</i>
        </button>
      </nav>

      <!-- 右侧分区画廊 -->
      <div ref="secsRef" class="fsd-secs" @scroll="onScroll">
        <section data-sec="main">
          <div class="fsd-sec-t">主图<span>{{ mains.length }} 张</span></div>
          <div class="fsd-grid">
            <img v-for="(m, i) in mains" :key="i" :src="m" alt="" />
          </div>
        </section>

        <section data-sec="sku">
          <div class="fsd-sec-t">SKU图<span>{{ skuImgs.length }} 张</span></div>
          <div class="fsd-grid sku">
            <figure v-for="(s, i) in skuImgs" :key="i">
              <img :src="s.img" alt="" />
              <figcaption>{{ s.color }} · {{ s.style }}</figcaption>
            </figure>
          </div>
        </section>

        <section data-sec="desc">
          <div class="fsd-sec-t">详情图<span>{{ sgDetail.detailImgs.length }} 张</span></div>
          <div class="fsd-grid desc">
            <img v-for="(m, i) in sgDetail.detailImgs" :key="i" :src="m" alt="" />
          </div>
        </section>

        <section data-sec="white">
          <div class="fsd-sec-t">白底图<span>1 张</span></div>
          <div class="fsd-grid">
            <img :src="sgDetail.whiteImg" alt="" />
          </div>
        </section>

        <section data-sec="scene">
          <div class="fsd-sec-t">场景图<span>1 张</span></div>
          <div class="fsd-grid scene">
            <img :src="sgDetail.sceneImg" alt="" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

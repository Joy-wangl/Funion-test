<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import FSDetail from './FSDetail.vue';
import { beeProducts, BEE_PLATFORM_LOGO, type BeeProduct } from '../bee-plugin/data';

const emit = defineEmits<{ (e: 'close'): void; (e: 'beautify', p: BeeProduct): void }>();

/* 商品详情：复用蜜蜂搬家详情弹窗（fs 品牌、无铺货出口） */
const detailTarget = ref<BeeProduct | null>(null);
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && detailTarget.value) detailTarget.value = null;
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

/* 选品库：与蜜蜂搬家同源数据；只做选品与美化，无任何铺货/发布操作 */
const kw = ref('');
const list = computed(() => {
  const v = kw.value.trim();
  return v ? beeProducts.filter((p) => p.title.includes(v)) : beeProducts;
});
</script>

<template>
  <div class="bp-page">
    <div class="bp-head">
      <span class="bee-logo fs">S</span>
      <span class="bp-title">Funion s · 选品库</span>
      <div class="bp-head-r">
        <input v-model="kw" class="fs-search" placeholder="搜索商品标题" />
        <span class="fs-count">{{ list.length }} 个商品</span>
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="bp-body">
      <div class="bp-card">
        <table class="bp-table">
          <thead>
            <tr>
              <th>商品</th>
              <th style="width: 90px">平台</th>
              <th style="width: 150px">导入时间</th>
              <th style="width: 90px">状态</th>
              <th style="width: 110px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in list" :key="p.id">
              <td>
                <div class="fs-pcell">
                  <img class="bp-thumb" :src="p.img" alt="" />
                  <div class="bp-name">{{ p.title }}</div>
                </div>
              </td>
              <td>
                <span class="bp-plat"><img :src="BEE_PLATFORM_LOGO[p.platform]" alt="" /></span>
              </td>
              <td class="bp-time">{{ p.importTime }}</td>
              <td><span class="bp-tag" :class="p.complete ? 'ok' : 'no'">{{ p.complete ? '已完善' : '未完善' }}</span></td>
              <td>
                <div class="bp-acts">
                  <a href="javascript:void(0)" @click.prevent="detailTarget = p">详情</a>
                  <a href="javascript:void(0)" @click.prevent="emit('beautify', p)">AI美化</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="list.length === 0" class="fs-empty">未找到匹配商品</div>
      </div>
    </div>

    <!-- 商品详情弹窗（宽版）：纯图片画廊，无表单/铺货 -->
    <div v-if="detailTarget" class="bee-mask" @click.self="detailTarget = null">
      <FSDetail :product="detailTarget" @close="detailTarget = null" @beautify="(p) => { detailTarget = null; emit('beautify', p); }" />
    </div>
  </div>
</template>

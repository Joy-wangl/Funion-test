<script setup lang="ts">
import { computed } from 'vue';
import Modal from '../../components/Modal.vue';
import { sgPriceRecords, sgListingRate } from './shopGoodsData';
import type { SgProduct } from './shopGoodsData';

const props = defineProps<{ product: SgProduct }>();
defineEmits<{ (e: 'close'): void }>();

const recs = computed(() => sgPriceRecords(props.product));
const listing = computed(() => sgListingRate(props.product));
</script>

<template>
  <!-- 调价记录：商品上架时利润率 + 每次调价/涨价执行（时间/类型/改价后利润·利润率），倒序展示 -->
  <Modal title="调价记录" :sub="product.title" size="lg" @close="$emit('close')">
    <div class="sgd-price-sum">
      <div class="sgd-price-sum-item">
        <span class="sgd-price-sum-l">商品上架时利润率</span>
        <b>{{ listing }}%</b>
      </div>
      <div class="sgd-price-sum-item">
        <span class="sgd-price-sum-l">调价 / 涨价次数</span>
        <b>{{ recs.length }} 次</b>
      </div>
    </div>
    <table class="sg-table sgd-log-table">
      <thead>
        <tr>
          <th :style="{ width: '190px' }">执行时间</th>
          <th :style="{ width: '100px' }">类型</th>
          <th :style="{ width: '150px' }">改价后利润</th>
          <th>改价后利润率</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in recs" :key="i">
          <td>{{ r.time }}</td>
          <td><span :class="r.type === '涨价' ? 'badge-orange' : 'badge-gray'">{{ r.type }}</span></td>
          <td>¥{{ r.profit.toFixed(2) }}</td>
          <td>{{ r.rate }}%</td>
        </tr>
      </tbody>
    </table>
    <template #foot>
      <button class="btn" @click="$emit('close')">关闭</button>
    </template>
  </Modal>
</template>

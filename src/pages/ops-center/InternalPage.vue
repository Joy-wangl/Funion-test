<script setup lang="ts">
import { ref } from 'vue';
import { internalProducts, toSgProduct } from './data';
import type { ProductRow } from './data';
import ProductTable from './ProductTable.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SgDetailPage from './SgDetailPage.vue';

/** 内部商机页（默认页） */
const detail = ref<ProductRow | null>(null);
</script>

<template>
  <SgDetailPage
    v-if="detail"
    :product="toSgProduct(detail)"
    hide-edit
    :foot="[{ text: '添加到淘宝', cls: 'primary' }, { text: '添加到视频号', cls: 'primary' }]"
    @back="detail = null"
  />
  <template v-else>
    <div class="ib-filters">
      <div class="ib-grid">
        <div class="ib-field">
          <label>平台</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="阿里巴巴"
            :options="['阿里巴巴', '抖音', '京东', '快手', '拼多多', '淘宝', '天猫', '微信视频号小店']"
          />
        </div>
        <div class="ib-field">
          <label>店铺名称</label>
          <input class="ib-input" placeholder="请输入店铺名称" />
        </div>
        <div class="ib-field">
          <label>类目</label>
          <BubbleSelect class-name="ib-select" default-value="全部类目" :options="['全部类目', '居家日用', '运动户外', '母婴用品']" />
        </div>
        <div class="ib-field">
          <label>是否顺买链接</label>
          <BubbleSelect class-name="ib-select" default-value="全部" :options="['全部', '是', '否']" />
        </div>

        <div class="ib-field">
          <label>款式编码（系列编码）</label>
          <input class="ib-input" placeholder="请输入款式编码" />
        </div>
        <div class="ib-field">
          <label>商品ID</label>
          <input class="ib-input" placeholder="请输入商品ID" />
        </div>
        <div class="ib-field">
          <label>商品编码</label>
          <input class="ib-input" placeholder="请输入商品编码" />
        </div>
        <div class="ib-field">
          <label>商品标题</label>
          <input class="ib-input" placeholder="请输入商品标题" />
        </div>

        <div class="ib-field">
          <label>相似图查询</label>
          <div class="ib-inline">
            <input class="ib-input" placeholder="上传图片或输入图片地址" />
            <button class="lightBtn">📷</button>
          </div>
        </div>
        <div class="ib-field">
          <label>云仓占比</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="最小值" />
            <span>至</span>
            <input class="ib-input" placeholder="最大值" />
          </div>
        </div>
        <div class="ib-field">
          <label>发货后退款率</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="最小值" />
            <span>至</span>
            <input class="ib-input" placeholder="最大值" />
          </div>
        </div>
        <div class="ib-field">
          <label>创建时间</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="开始时间" />
            <span>→</span>
            <input class="ib-input" placeholder="结束时间" />
          </div>
        </div>
      </div>

      <div class="ib-actions">
        <div class="ib-lefttips">共 300034 条商机数据，可按近7日销量、退款率、库存等进行综合筛选。</div>
        <div class="ib-rightacts">
          <BubbleSelect class-name="ib-select" :style="{ width: '120px' }" default-value="快速选品" :options="['淘宝C店', '视频号']" />
          <button class="lightBtn">重置</button>
          <button class="primaryBtn">查询</button>
          <button class="lightBtn">⚙</button>
        </div>
      </div>
    </div>

    <ProductTable :rows="internalProducts" :check-width="48" :index-width="52" :on-detail="(row: ProductRow) => (detail = row)" />
  </template>
</template>

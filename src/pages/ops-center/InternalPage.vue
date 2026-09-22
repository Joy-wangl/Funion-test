<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { internalProducts, platformOfStore, toSgProduct } from './data';
import type { ProductRow } from './data';
import ProductTable from './ProductTable.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import SgDetailPage from './SgDetailPage.vue';
import { PERM_PLAT_SHOPS, scopeOf } from '../permission/permScope';
import { pushToast } from '../../components/toast';

/** 内部商机页（默认页） */
const detail = ref<ProductRow | null>(null);
/* 创建时间范围筛选 */
const ibDateFrom = ref('');
const ibDateTo = ref('');

/* 权限控制（角色权限-商机中心/内部商机）：可见范围过滤平台筛选选项与列表行 */
const scope = scopeOf('内部商机');
const viewPlats = computed(() =>
  PERM_PLAT_SHOPS.filter((p) => p.shops.some((s) => scope.view.shops.includes(s))).map((p) => p.platform),
);
const platOpts = computed(() => ['全部', ...viewPlats.value]);
const plat = ref('全部');
watch(viewPlats, (v) => {
  if (plat.value !== '全部' && !v.includes(plat.value)) plat.value = '全部';
});
const rows = computed(() =>
  internalProducts.filter(
    (r) =>
      scope.view.shops.includes(r.storeMeta.text) &&
      (plat.value === '全部' || platformOfStore(r.storeMeta.text) === plat.value),
  ),
);
/* 权限控制：可管理范围之外店铺的行「添加到」置灰，点击提示无权限 */
const manageDenied = (r: ProductRow) => !scope.manage.shops.includes(r.storeMeta.text);
const onAction = (row: ProductRow, action: string) => {
  if (action === '添加到' && manageDenied(row)) {
    pushToast(`当前角色无店铺「${row.storeMeta.text}」的管理权限`, 'warning');
  }
};
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
            :value="plat"
            :options="platOpts"
            @change="(v: string) => (plat = v)"
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
          <DateRangePicker v-model:from="ibDateFrom" v-model:to="ibDateTo" placeholder="请选择日期范围" />
        </div>
        <!-- 按钮组嵌入网格末子项：条件占满整行时独占一行右对齐；列设置 ⚙ 居按钮组最左（规范） -->
        <div class="ib-actions">
          <div class="ib-rightacts">
            <button class="lightBtn">⚙</button>
            <BubbleSelect class-name="ib-select" :style="{ width: '120px' }" default-value="快速选品" :options="['淘宝C店', '视频号']" />
            <button class="lightBtn">重置</button>
            <button class="primaryBtn">查询</button>
          </div>
        </div>
      </div>
    </div>

    <ProductTable
      :rows="rows"
      :check-width="48"
      :index-width="52"
      :on-detail="(row: ProductRow) => (detail = row)"
      :manage-denied="manageDenied"
      @action="onAction"
    />
  </template>
</template>

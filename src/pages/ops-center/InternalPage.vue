<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { internalProducts, platformOfStore, toSgProduct } from './data';
import type { ProductRow } from './data';
import ProductTable from './ProductTable.vue';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import SgDetailPage from './SgDetailPage.vue';
import { PERM_PLAT_SHOPS, effectiveShops, scopeOf } from '../permission/permScope';
import { BL_SHOP_OPTIONS } from '../permission/shopData';
import type { BlShopOption } from '../permission/shopData';
import { addShopBlacklist, shopBlacklistOf } from '../permission/shopBlacklistData';
import { pushToast } from '../../components/toast';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

/** 内部商机页（默认页） */
const detail = ref<ProductRow | null>(null);
/* 创建时间范围筛选 */
const ibDateFrom = ref('');
const ibDateTo = ref('');

/* 权限控制（角色权限-商机中心/内部商机）：可见范围过滤平台筛选选项与列表行（含「全部店铺」平台的新增店铺） */
const scope = scopeOf('内部商机');
const viewShopsEff = computed(() => effectiveShops(scope.view));
const manageShopsEff = computed(() => effectiveShops(scope.manage));
const viewPlats = computed(() =>
  PERM_PLAT_SHOPS.filter((p) => p.shops.some((s) => viewShopsEff.value.includes(s))).map((p) => p.platform),
);
const platOpts = computed(() => ['全部', ...viewPlats.value]);
const plat = ref('全部');
watch(viewPlats, (v) => {
  if (plat.value !== '全部' && !v.includes(plat.value)) plat.value = '全部';
});
const rows = computed(() =>
  internalProducts.filter(
    (r) =>
      viewShopsEff.value.includes(r.storeMeta.text) &&
      (plat.value === '全部' || platformOfStore(r.storeMeta.text) === plat.value),
  ),
);
/* 权限控制：可管理范围之外店铺的行「添加到」置灰，点击提示无权限 */
const manageDenied = (r: ProductRow) => !manageShopsEff.value.includes(r.storeMeta.text);
const onAction = (row: ProductRow, action: string) => {
  if (action === '添加到' && manageDenied(row)) {
    pushToast(`当前角色无店铺「${row.storeMeta.text}」的管理权限`, 'warning');
  }
};

/* 黑品库（店铺级限制）：弹窗展示该商品已添加到的店铺，并按 全部店铺/指定店铺 选择范围写入各店铺黑品限制 */
const blTarget = ref<ProductRow | null>(null);
const blScope = ref<'all' | 'some'>('some');
const blSel = ref<Set<string>>(new Set());
const openBlTarget = (row: ProductRow) => {
  blTarget.value = row;
  blScope.value = 'some';
  blSel.value = new Set();
};
const blAddedShops = computed(() => {
  const r = blTarget.value;
  if (!r) return [] as BlShopOption[];
  return BL_SHOP_OPTIONS.filter((s) => shopBlacklistOf(s.shopId).some((e) => e.dim === '商品ID' && e.value === r.pid));
});
const blPickableShops = computed(() => {
  const added = new Set(blAddedShops.value.map((s) => s.shopId));
  return BL_SHOP_OPTIONS.filter((s) => !added.has(s.shopId));
});
const toggleBlShop = (shopId: string) => {
  const next = new Set(blSel.value);
  if (next.has(shopId)) next.delete(shopId);
  else next.add(shopId);
  blSel.value = next;
};
const submitBlAdd = () => {
  const r = blTarget.value;
  if (!r) return;
  const targets = blScope.value === 'all'
    ? blPickableShops.value
    : blPickableShops.value.filter((s) => blSel.value.has(s.shopId));
  if (!targets.length) {
    pushToast(blScope.value === 'all' ? '该商品已在全部店铺黑品限制中' : '请选择要添加的店铺', 'warning');
    return;
  }
  targets.forEach((s) => addShopBlacklist(s.shopId, '商品ID', r.pid, { name: r.pname, goodsId: r.pid }));
  pushToast(`已添加到黑品库（${targets.length} 家店铺）`);
  blTarget.value = null;
};

/* 列表字段管理：▦ 气泡勾选显隐＋拖拽排序＋左/右钉住（ProductTable 列驱动同步） */
const cf = useColField('internal', {
  fixedLeft: [{ key: 'check', width: 48 }, { key: 'index', width: 52 }, { key: 'product', label: '商品信息', width: 320 }],
  fields: [
    { key: 'category', label: '商品类目', width: 140 },
    { key: 'trend', label: '近30天销量趋势', width: 140 },
    { key: 'yesterday', label: '昨日销量', width: 140 },
    { key: 'week7', label: '近7日销量', width: 140 },
    { key: 'refund', label: '退款率', width: 140 },
    { key: 'refundAfter', label: '发货后退款率', width: 140 },
    { key: 'publisher', label: '发布人', width: 140 },
    { key: 'created', label: '创建时间', width: 140 },
    { key: 'status', label: '状态', width: 140 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', width: 120 }],
});
/* 顶层解构：模板自动解包 ref 后传给 ProductTable */
const { hidden: cfHidden, midCols: cfMidCols, pinL: cfPinL, pinR: cfPinR } = cf;

/* 数值/时间列表头排序（点击循环 降序→升序→取消，与运营管理页一致） */
const SORT_KEYS = ['yesterday', 'week7', 'refund', 'refundAfter', 'created'];
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: string) => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else { sortKey.value = null; sortDir.value = 'desc'; }
};
const sortState = computed(() => (sortKey.value ? { key: sortKey.value, dir: sortDir.value } : null));
/* 比较：销量数字相减、退款率 parseFloat、创建时间 localeCompare；无数据（NaN）排最后 */
const numVal = (row: ProductRow, key: string): number => {
  const s = key === 'yesterday' ? row.yesterday
    : key === 'week7' ? row.week7
      : key === 'refund' ? row.refundRate
        : row.refundAfter;
  const n = Number(String(s).replace(/[%,\s]/g, ''));
  return Number.isFinite(n) ? n : -Infinity;
};
const cmpVal = (a: ProductRow, b: ProductRow, key: string): number => {
  if (key === 'created') return a.created.localeCompare(b.created);
  return numVal(a, key) - numVal(b, key);
};
const sortedRows = computed(() => {
  const k = sortKey.value;
  if (!k) return rows.value;
  const d = sortDir.value === 'desc' ? -1 : 1;
  return [...rows.value].sort((a, b) => d * cmpVal(a, b, k));
});
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
        <!-- 按钮组嵌入网格末子项：条件占满整行时独占一行右对齐；列表字段管理 ▦ 居按钮组最左（规范） -->
        <div class="ib-actions">
          <div class="ib-rightacts">
            <ColFieldPop :st="cf" />
            <BubbleSelect class-name="ib-select" :style="{ width: '120px' }" default-value="快速选品" :options="['淘宝C店', '视频号']" />
            <button class="lightBtn">重置</button>
            <button class="primaryBtn">查询</button>
          </div>
        </div>
      </div>
    </div>

    <ProductTable
      :rows="sortedRows"
      :check-width="48"
      :index-width="52"
      :hidden="cfHidden"
      :col-order="cfMidCols"
      :pinned="cfPinL"
      :pinned-right="cfPinR"
      :sort-keys="SORT_KEYS"
      :sort-state="sortState"
      :on-detail="(row: ProductRow) => (detail = row)"
      :manage-denied="manageDenied"
      :on-blacklist="openBlTarget"
      @sort="toggleSort"
      @action="onAction"
    />
  </template>

  <!-- 黑品库（店铺级限制）：已添加店铺回显＋添加范围 全部店铺/指定店铺；Modal 基础样式挂 .pm-page 作用域，需 pm-host 宿主层 -->
  <div v-if="blTarget" class="pm-page pm-host">
    <Modal title="添加到黑品库" size="lg" sub="黑品限制为店铺级：命中限制的商品发布到对应店铺时，发布任务将自动失败" @close="blTarget = null">
    <div class="ib-bl-prod">
      <div class="ib-bl-pname">{{ blTarget.pname }}</div>
      <div class="ib-bl-pid">母链接：{{ blTarget.pid }}</div>
    </div>
    <div class="ib-bl-field">
      <div class="ib-bl-label">已添加店铺</div>
      <div v-if="blAddedShops.length" class="ib-bl-shops static">
        <span v-for="s in blAddedShops" :key="s.shopId" class="ib-bl-shop added">{{ s.name }}</span>
      </div>
      <div v-else class="ib-bl-none">未添加到任何店铺</div>
    </div>
    <div class="ib-bl-field">
      <div class="ib-bl-label">添加范围</div>
      <div class="ib-bl-seg">
        <button type="button" :class="{ on: blScope === 'all' }" @click="blScope = 'all'">全部店铺</button>
        <button type="button" :class="{ on: blScope === 'some' }" @click="blScope = 'some'">指定店铺</button>
      </div>
    </div>
    <div v-if="blScope === 'some'" class="ib-bl-field">
      <div class="ib-bl-label">选择店铺</div>
      <div v-if="blPickableShops.length" class="ib-bl-shops">
        <button v-for="s in blPickableShops" :key="s.shopId" type="button" class="ib-bl-shop" :class="{ on: blSel.has(s.shopId) }" @click="toggleBlShop(s.shopId)">{{ s.name }}</button>
      </div>
      <div v-else class="ib-bl-none">该商品已在全部店铺黑品限制中</div>
    </div>
      <template #foot>
        <button class="lightBtn" @click="blTarget = null">取消</button>
        <button class="primaryBtn" @click="submitBlAdd">确认添加</button>
      </template>
    </Modal>
  </div>
</template>

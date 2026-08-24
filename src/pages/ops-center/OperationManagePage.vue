<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { omProducts } from './data';
import ProductTable from './ProductTable.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';

/** 通用选项 */
const PROFIT_OPTIONS = ['全部', '盈利', '亏损'];
const YES_NO_OPTIONS = ['全部', '是', '否'];
const RATE_OPTIONS = ['全部', '≥10%', '≥20%', '≥30%'];
const SHOP_OPTIONS = [...new Set(omProducts.map((r) => r.storeMeta.text))];
const CAT1_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[0]))];
const CAT2_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[1]).filter(Boolean))];

/** ID数据筛选器字段：标题仅作占位展示，不作为选择项 */
const idSelectFields = [
  { label: '选择平台', options: ['抖音', '快手', '拼多多', '淘宝', '天猫', '京东'] },
  { label: '店铺', options: SHOP_OPTIONS },
  { label: '采购', options: ['陈晓', '刘洋', '周敏'] },
  { label: '运营组', options: ['运营一组', '运营二组', '运营三组'] },
  { label: '运营专员', options: ['王芳', '李娜', '赵磊'] },
  { label: '运营助理', options: ['孙悦', '吴倩'] },
  { label: '发生毛利2', options: PROFIT_OPTIONS },
  { label: '发生毛利3', options: PROFIT_OPTIONS },
  { label: '发生毛利4', options: PROFIT_OPTIONS },
  { label: '发生净利润', options: PROFIT_OPTIONS },
  { label: '星星', options: ['全部', '1星', '2星', '3星', '4星', '5星'] },
  { label: '旗帜', options: ['全部', '红旗', '黄旗', '蓝旗', '绿旗', '紫旗'] },
];

const idSelectFields2 = [
  { label: '出仓利润', options: PROFIT_OPTIONS },
  { label: '禁用仓', options: YES_NO_OPTIONS },
  { label: '查看全仓', options: YES_NO_OPTIONS },
  { label: '请选择项目', options: ['全部项目', '新品项目', '爆品项目', '清仓项目'] },
  { label: '请选择爆品', options: YES_NO_OPTIONS },
];

const idSelectFields3 = [
  { label: '毛二利润率', options: RATE_OPTIONS },
  { label: '毛四利润率', options: RATE_OPTIONS },
  { label: '毛五利润率', options: RATE_OPTIONS },
  { label: '毛六利润率', options: RATE_OPTIONS },
  { label: '运营毛五利', options: RATE_OPTIONS },
  { label: '运营毛六利', options: RATE_OPTIONS },
  { label: '运营毛三（减税）', options: RATE_OPTIONS },
  { label: '运营毛四（减税）', options: RATE_OPTIONS },
  { label: '运营毛五（减税）', options: RATE_OPTIONS },
  { label: '运营毛六（减税）', options: RATE_OPTIONS },
];

/** 运营管理页：仅保留 ID数据模块 */
const checked = ref<boolean[]>(omProducts.map(() => false));

/* ---------- 列表字段管理：▦ 气泡勾选列显隐（商品信息/操作列固定不可隐藏） ---------- */
const COL_FIELDS = [
  { key: 'store', label: '上架店铺' },
  { key: 'category', label: '商品类目' },
  { key: 'trend', label: '近30天销量趋势' },
  { key: 'cloud', label: '云仓占比' },
  { key: 'yesterday', label: '昨日销量' },
  { key: 'week7', label: '近7日销量' },
  { key: 'refund', label: '退款率' },
  { key: 'refundAfter', label: '发货后退款率' },
  { key: 'stock', label: '库存数' },
  { key: 'created', label: '创建时间' },
  { key: 'status', label: '状态' },
];
const hiddenCols = ref<string[]>([]);
const colPop = ref<{ x: number; y: number } | null>(null);
const closeColPop = () => { colPop.value = null; };
watch(colPop, (v) => {
  if (v) document.addEventListener('mousedown', closeColPop);
  else document.removeEventListener('mousedown', closeColPop);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', closeColPop));
const openColPop = (e: MouseEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  // 气泡高约 352px，底部越界时上收，保证整泡在视口内
  colPop.value = { x: Math.max(8, r.left), y: Math.min(r.bottom + 6, window.innerHeight - 352) };
};
const toggleCol = (key: string) => {
  hiddenCols.value = hiddenCols.value.includes(key)
    ? hiddenCols.value.filter((k) => k !== key)
    : [...hiddenCols.value, key];
};

const onLog = () => {
  alert('操作日志功能入口（演示）');
};
</script>

<template>
  <div class="om-page">
    <div class="id-page">
      <div class="id-filter-card">
        <div class="id-grid">
          <div class="id-field">
            <label>明细</label>
            <BubbleSelect class-name="id-select" default-value="明细" :options="['明细', '汇总']" />
          </div>
          <div class="id-field">
            <label>商品ID</label>
            <input class="id-input" placeholder="商品ID" />
          </div>
          <div class="id-field">
            <label>商品名称</label>
            <input class="id-input" placeholder="商品名称" />
          </div>
          <div class="id-field">
            <label>系列编码</label>
            <input class="id-input" placeholder="系列编码" />
          </div>
          <div class="id-field">
            <label>日期</label>
            <div class="id-range">
              <input class="id-input" value="2026-08-12" />
              <span>至</span>
              <input class="id-input" value="2026-08-12" />
            </div>
          </div>
          <div class="id-field">
            <label>上架天数最小</label>
            <input class="id-input" placeholder="上架天数最小" />
          </div>
          <div class="id-field">
            <label>上架天数最大</label>
            <input class="id-input" placeholder="上架天数最大" />
          </div>
          <div v-for="f in idSelectFields" :key="f.label" class="id-field">
            <label>{{ f.label }}</label>
            <BubbleSelect class-name="id-select" :default-value="f.label" :options="f.options" />
          </div>

          <div class="id-field">
            <label>连续</label>
            <div class="id-compact">
              <input class="id-input" placeholder="连续" />
              <span>日</span>
              <BubbleSelect class-name="id-select" default-value="请选择" :options="['大于', '等于', '小于']" />
            </div>
          </div>
          <div v-for="f in idSelectFields2" :key="f.label" class="id-field">
            <label>{{ f.label }}</label>
            <BubbleSelect class-name="id-select" :default-value="f.label" :options="f.options" />
          </div>
          <div class="id-field">
            <label>请输入备注</label>
            <input class="id-input" placeholder="请输入备注" />
          </div>
          <div v-for="f in idSelectFields3" :key="f.label" class="id-field">
            <label>{{ f.label }}</label>
            <BubbleSelect class-name="id-select" :default-value="f.label" :options="f.options" />
          </div>
          <div class="id-field">
            <label>总广告费 -</label>
            <input class="id-input" placeholder="-" />
          </div>
          <div class="id-field">
            <label>总广告费 +</label>
            <input class="id-input" placeholder="+" />
          </div>
          <div class="id-field">
            <label>经营大类</label>
            <BubbleSelect class-name="id-select" default-value="经营大类" :options="CAT1_OPTIONS" />
          </div>

          <div class="id-field">
            <label>一级类目</label>
            <BubbleSelect class-name="id-select" default-value="一级类目" :options="CAT1_OPTIONS" />
          </div>
          <div class="id-field">
            <label>二级类目</label>
            <BubbleSelect class-name="id-select" default-value="二级类目" :options="CAT2_OPTIONS" />
          </div>
          <div class="id-field">
            <label>外仓率最小值 %</label>
            <input class="id-input" placeholder="外仓率最小值 %" />
          </div>
          <div class="id-field">
            <label>外仓率最大值 %</label>
            <input class="id-input" placeholder="外仓率最大值 %" />
          </div>
          <div class="id-field">
            <label>自动化标签</label>
            <BubbleSelect class-name="id-select" default-value="自动化标签" :options="['全部', '爆款', '滞销', '清仓', '新品']" />
          </div>

          <!-- 按钮组作为筛选网格末位子项：列设置▦最左，业务操作居中，重置/查询居右（查询最右） -->
          <div class="id-actions">
            <button class="id-btn icon" :class="{ on: hiddenCols.length > 0 }" title="管理列表字段" @click="openColPop">▦</button>
            <BubbleSelect class-name="om-select" default-value="批量操作" :options="['批量涨价', '批量降价']" />
            <button class="om-log-btn" @click="onLog">
              操作日志
            </button>
            <button class="id-btn">重置</button>
            <button class="id-btn primary">查询</button>
          </div>
        </div>

        <ProductTable
          :rows="omProducts"
          :check-width="42"
          :index-width="60"
          :checked="checked"
          :hidden="hiddenCols"
          @check-change="(i: number, v: boolean) => checked[i] = v"
        />
      </div>
    </div>

    <!-- 列表字段管理气泡 -->
    <Teleport to="body">
      <div v-if="colPop" class="om-col-pop" :style="{ left: `${colPop.x}px`, top: `${colPop.y}px` }" @mousedown.stop>
        <div class="om-col-head">列表字段管理</div>
        <label v-for="c in COL_FIELDS" :key="c.key" class="om-col-item">
          <input type="checkbox" :checked="!hiddenCols.includes(c.key)" @change="toggleCol(c.key)">
          {{ c.label }}
        </label>
      </div>
    </Teleport>
  </div>
</template>

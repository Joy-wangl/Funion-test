<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { ProductRow, OmProduct } from './data';
import { omProducts, toSgProduct } from './data';
import ProductTable from './ProductTable.vue';
import SgDetailPage from './SgDetailPage.vue';
import SgBatchPriceModal from './SgBatchPriceModal.vue';
import { sgRowActions, SG_CHIPS } from './shopGoodsData';
import BubbleSelect from '../../components/BubbleSelect.vue';
import type { BubbleOption } from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';

/** 通用选项 */
const PROFIT_OPTIONS = ['全部', '盈利', '亏损'];
const YES_NO_OPTIONS = ['全部', '是', '否'];
const RATE_OPTIONS = ['全部', '≥10%', '≥20%', '≥30%'];
const SHOP_OPTIONS = [...new Set(omProducts.map((r) => r.storeMeta.text))];
const CAT1_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[0]))];
const CAT2_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[1]).filter(Boolean))];

/** ID数据筛选器字段已统一为 FILTER_FIELDS 模型（见平台/状态联动之后），▦ 气泡「查询条件管理」可显隐与拖拽排序 */

/* 条件型字段选项：字段名+低于/高于/等于/介于；选中后切换值输入区（介于=最小值 至 最大值） */
const CONDS = ['低于', '高于', '等于', '介于'];
const condOptions = (label: string) => CONDS.map((c) => `${label}${c}`);
const condSel = ref<Record<string, string>>({});
const isBetween = (label: string) => (condSel.value[label] ?? '').endsWith('介于');
const onCond = (label: string, v: string) => { condSel.value = { ...condSel.value, [label]: v }; };

/** 运营管理页：仅保留 ID数据模块 */
/* 选择平台 + 商品状态查询条件：两平台状态枚举有差别（视频号含「审核待处理」，淘宝无），状态选项随平台联动 */
const platform = ref('全部');
const status = ref('全部');
const STATUS_OPTIONS = ['全部', '销售中', '审核中', '审核待处理', '已下架', '草稿箱'];
const statusOptions = computed(() => (platform.value === '淘宝' ? STATUS_OPTIONS.filter((s) => s !== '审核待处理') : STATUS_OPTIONS));

/** 查询条件字段模型：type=select 气泡选择 / cond 条件型（先选 低于/高于/等于/介于 再输入值）/ input 文本 / range 区间 / compact 销量组合；数组序即展示序 */
interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'cond' | 'input' | 'range' | 'compact';
  options?: (string | BubbleOption)[];
  /** 区间型占位（最小/最大） */
  ph?: [string, string];
  /** 区间型默认值（日期） */
  val?: [string, string];
}
const FILTER_FIELDS: FilterField[] = [
  { key: 'detail', label: '明细', type: 'select', options: ['明细', '汇总'] },
  { key: 'pid', label: '商品ID', type: 'input' },
  { key: 'pname', label: '商品名称', type: 'input' },
  { key: 'series', label: '系列编码', type: 'input' },
  { key: 'date', label: '日期', type: 'range', val: ['2026-08-12', '2026-08-12'] },
  { key: 'platform', label: '选择平台', type: 'select', options: ['全部', '淘宝', '视频号'] },
  { key: 'status', label: '商品状态', type: 'select', options: STATUS_OPTIONS },
  { key: 'shop', label: '店铺', type: 'select', options: SHOP_OPTIONS },
  { key: 'group', label: '运营组', type: 'select', options: ['运营一组', '运营二组', '运营三组'] },
  { key: 'specialist', label: '运营专员', type: 'select', options: ['王芳', '李娜', '赵磊'] },
  { key: 'assistant', label: '运营助理', type: 'select', options: ['孙悦', '吴倩'] },
  { key: 'sales', label: '销量', type: 'compact' },
  { key: 'moving', label: '是否有动销', type: 'select', options: ['全部', '有动销', '无动销'] },
  { key: 'profit', label: '出仓利润', type: 'cond', options: PROFIT_OPTIONS },
  { key: 'fullwh', label: '查看全仓', type: 'select', options: YES_NO_OPTIONS },
  { key: 'project', label: '请选择项目', type: 'select', options: ['全部项目', '新品项目', '爆品项目', '清仓项目'] },
  { key: 'remark', label: '请输入备注', type: 'input' },
  { key: 'rate6', label: '毛六利润率', type: 'cond', options: RATE_OPTIONS },
  { key: 'om6', label: '运营毛六利', type: 'cond', options: RATE_OPTIONS },
  { key: 'om4', label: '运营毛四（减税）', type: 'cond', options: RATE_OPTIONS },
  { key: 'om6t', label: '运营毛六（减税）', type: 'cond', options: RATE_OPTIONS },
  { key: 'adfee', label: '总广告费', type: 'range', ph: ['最小值', '最大值'] },
  { key: 'catbiz', label: '经营大类', type: 'select', options: CAT1_OPTIONS },
  { key: 'cat1', label: '一级类目', type: 'select', options: CAT1_OPTIONS },
  { key: 'cat2', label: '二级类目', type: 'select', options: CAT2_OPTIONS },
  { key: 'cloudrate', label: '外仓率 %', type: 'range', ph: ['外仓率最小值 %', '外仓率最大值 %'] },
];
const onPlatform = (v: string) => {
  platform.value = v;
  /* 切淘宝时若当前状态为淘宝不存在的「审核待处理」则重置 */
  if (v === '淘宝' && status.value === '审核待处理') status.value = '全部';
};
const allRows = ref<OmProduct[]>([...omProducts]);
const rows = computed(() => allRows.value.filter((r) => {
  const okPlat = platform.value === '全部' || r.sg.channel === platform.value;
  const chipDef = SG_CHIPS.find((c) => c.label === status.value);
  const okStatus = !chipDef || chipDef.match(r.sg.status);
  return okPlat && okStatus;
}));

/* 操作列：与店铺商品操作列同步（商品详情 + 状态动作，区分淘宝 / 视频号行状态） */
const detail = ref<OmProduct | null>(null);
const omActions = (r: ProductRow) => sgRowActions((r as OmProduct).sg.status);
const onAction = (r: ProductRow, a: string) => { if (a === '商品详情') detail.value = r as OmProduct; };

/* 数字相关列：表头加排序（点击循环 降序→升序→取消） */
const NUMERIC_KEYS = [
  'yesterday', 'week7', '销售额', 'refund', 'refundAfter',
  '毛六利润率', '运营毛六利', '运营毛四（减税）', '运营毛六（减税）',
  '总广告费', '外仓率最小值 %', '外仓率最大值 %',
];
const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: string) => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else { sortKey.value = null; sortDir.value = 'desc'; }
};
const sortState = computed(() => (sortKey.value ? { key: sortKey.value, dir: sortDir.value } : null));
/* 取值统一剥离 ¥/%/千分位；无数据（-）排最后 */
const numVal = (row: ProductRow, key: string): number => {
  const s = key === 'yesterday' ? row.yesterday
    : key === 'week7' ? row.week7
      : key === 'refund' ? row.refundRate
        : key === 'refundAfter' ? row.refundAfter
          : row.extra?.[key] ?? '-';
  const n = Number(String(s).replace(/[¥%,\s]/g, ''));
  return Number.isFinite(n) ? n : -Infinity;
};
const sortedRows = computed(() => {
  const k = sortKey.value;
  if (!k) return rows.value;
  const d = sortDir.value === 'desc' ? -1 : 1;
  return [...rows.value].sort((a, b) => d * (numVal(a, k) - numVal(b, k)));
});

/* 勾选按 pid 绑定：排序后勾选状态随行不随位置 */
const checkedIds = ref<Set<string>>(new Set());
const checked = computed(() => sortedRows.value.map((r) => checkedIds.value.has(r.pid)));
const onCheck = (i: number, v: boolean) => {
  const pid = sortedRows.value[i].pid;
  const next = new Set(checkedIds.value);
  if (v) next.add(pid); else next.delete(pid);
  checkedIds.value = next;
};

/* 批量操作：批量删除=删除勾选商品；批量调价与店铺商品列表一致（仅出售中可调价，复用 SgBatchPriceModal）；其余演示提示（需先勾选） */
const bpOpen = ref(false);
/* 与店铺商品同口径：仅「出售中」的勾选商品计入调价范围 */
const priceSel = computed(() => sortedRows.value.filter((r) => checkedIds.value.has(r.pid) && r.sg.status === 'selling').length);
const onBatch = (v: string) => {
  if (v === '批量调价') {
    if (!priceSel.value) {
      pushToast('请先勾选出售中的商品', 'error');
      return;
    }
    bpOpen.value = true;
    return;
  }
  if (!checkedIds.value.size) {
    pushToast('请先勾选需要操作的商品', 'error');
    return;
  }
  const n = checkedIds.value.size;
  if (v === '批量删除') {
    allRows.value = allRows.value.filter((r) => !checkedIds.value.has(r.pid));
    checkedIds.value = new Set();
    pushToast(`已删除 ${n} 条商品`);
    return;
  }
  pushToast(`已对 ${n} 件商品执行${v}（演示）`);
};

/* ---------- 列表字段管理：▦ 气泡勾选列显隐（商品信息/操作列固定不可隐藏） ---------- */
const COL_FIELDS = [
  { key: 'category', label: '商品类目' },
  { key: 'trend', label: '近30天销量趋势' },
  { key: 'yesterday', label: '昨日销量' },
  { key: 'week7', label: '近7日销量' },
  { key: '销售额', label: '销售额' },
  { key: 'refund', label: '退款率' },
  { key: 'refundAfter', label: '发货后退款率' },
  { key: 'publisher', label: '发布人' },
  { key: 'created', label: '创建时间' },
  { key: 'status', label: '状态' },
];
const hiddenCols = ref<string[]>([]);

/* 查询条件字段 → 列表扩展列（key 多与筛选标签一致；备注列按标注显示为「备注」；▦ 气泡可控制显隐） */
const QUERY_COLS: { key: string; label: string }[] = [
  '系列编码',
  '运营组', '运营专员', '运营助理',
  '出仓利润', '备注',
  '毛六利润率', '运营毛六利',
  '运营毛四（减税）', '运营毛六（减税）',
  '总广告费', '经营大类', '一级类目', '二级类目',
].map((label) => ({ key: label, label }));
/* 气泡全量字段 = 原有 9 项（结构不变）+ 查询条件扩展列 */
const ALL_COL_FIELDS = [...COL_FIELDS, ...QUERY_COLS];
/* 列表字段排序：▦ 气泡内拖拽条目调整顺序，列表表头同步跟随 */
const colOrder = ref<string[]>(ALL_COL_FIELDS.map((c) => c.key));
const orderedFields = computed(() => colOrder.value.map((k) => ALL_COL_FIELDS.find((c) => c.key === k)!));
const dragKey = ref('');
const onDropCol = (target: string) => {
  const from = colOrder.value.indexOf(dragKey.value);
  const to = colOrder.value.indexOf(target);
  if (from >= 0 && to >= 0 && from !== to) {
    const next = [...colOrder.value];
    next.splice(from, 1);
    next.splice(to, 0, dragKey.value);
    colOrder.value = next;
  }
  dragKey.value = '';
};
/* 气泡开合：absolute 锚定 ▦ 按钮，无需坐标计算 */
const colPop = ref(false);
/* 气泡双 tab：列表字段管理 / 查询条件管理 */
const popTab = ref<'cols' | 'filters'>('cols');
/* 查询条件管理：▦ 气泡「查询条件管理」tab 勾选显隐＋拖拽排序 */
const hiddenFilters = ref<string[]>([]);
const filterOrder = ref<string[]>(FILTER_FIELDS.map((f) => f.key));
const orderedFilters = computed(() => filterOrder.value.map((k) => FILTER_FIELDS.find((f) => f.key === k)!));
const visibleFilters = computed(() => orderedFilters.value.filter((f) => !hiddenFilters.value.includes(f.key)));
const toggleFilter = (key: string) => {
  hiddenFilters.value = hiddenFilters.value.includes(key)
    ? hiddenFilters.value.filter((k) => k !== key)
    : [...hiddenFilters.value, key];
};
const fDragKey = ref('');
const onDropFilter = (target: string) => {
  const from = filterOrder.value.indexOf(fDragKey.value);
  const to = filterOrder.value.indexOf(target);
  if (from >= 0 && to >= 0 && from !== to) {
    const next = [...filterOrder.value];
    next.splice(from, 1);
    next.splice(to, 0, fDragKey.value);
    filterOrder.value = next;
  }
  fDragKey.value = '';
};
/* 钉住：左钉/右钉双 icon 独立开关（互斥）；钉住列按钉住序排列表最左/最右（操作列之左），随横向滚动冻结 */
const pinnedCols = ref<string[]>([]);
const pinnedRightCols = ref<string[]>([]);
/* 钉住即需可见：当前隐藏则同步恢复显示 */
const pinVisible = (key: string) => { hiddenCols.value = hiddenCols.value.filter((k) => k !== key); };
const togglePinLeft = (key: string) => {
  if (pinnedCols.value.includes(key)) {
    pinnedCols.value = pinnedCols.value.filter((k) => k !== key);
  } else {
    pinnedCols.value = [...pinnedCols.value, key];
    pinnedRightCols.value = pinnedRightCols.value.filter((k) => k !== key);
    pinVisible(key);
  }
};
const togglePinRight = (key: string) => {
  if (pinnedRightCols.value.includes(key)) {
    pinnedRightCols.value = pinnedRightCols.value.filter((k) => k !== key);
  } else {
    pinnedRightCols.value = [...pinnedRightCols.value, key];
    pinnedCols.value = pinnedCols.value.filter((k) => k !== key);
    pinVisible(key);
  }
};
const closeColPop = () => { colPop.value = false; };
watch(colPop, (v) => {
  if (v) document.addEventListener('mousedown', closeColPop);
  else document.removeEventListener('mousedown', closeColPop);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', closeColPop));
const toggleCol = (key: string) => {
  const hiding = !hiddenCols.value.includes(key);
  hiddenCols.value = hiding ? [...hiddenCols.value, key] : hiddenCols.value.filter((k) => k !== key);
  /* 隐藏的列不能继续钉住 */
  if (hiding) pinnedCols.value = pinnedCols.value.filter((k) => k !== key);
  if (hiding) pinnedRightCols.value = pinnedRightCols.value.filter((k) => k !== key);
};
/* 列表列序：左钉列置顶（按钉住序），右钉列置尾（按钉住序），其余跟随气泡拖拽序 */
const tableCols = computed(() => [
  ...pinnedCols.value.map((k) => ALL_COL_FIELDS.find((c) => c.key === k)!),
  ...orderedFields.value.filter((c) => !pinnedCols.value.includes(c.key) && !pinnedRightCols.value.includes(c.key)),
  ...pinnedRightCols.value.map((k) => ALL_COL_FIELDS.find((c) => c.key === k)!),
]);

const onLog = () => {
  alert('操作日志功能入口（演示）');
};
</script>

<template>
  <SgDetailPage
    v-if="detail"
    :product="toSgProduct(detail, { status: detail.sg.status })"
    hide-edit
    show-log
    @back="detail = null"
  />
  <div v-else class="om-page">
    <div class="id-page">
      <div class="id-filter-card">
        <div class="id-grid">
          <!-- 查询条件字段统一由 FILTER_FIELDS 驱动：▦ 气泡「查询条件管理」可显隐与拖拽排序 -->
          <div v-for="f in visibleFilters" :key="f.key" class="id-field">
            <label>{{ f.label }}</label>
            <!-- 选择平台/商品状态联动页面状态；其余 select 为演示气泡 -->
            <BubbleSelect v-if="f.type === 'select' && f.key === 'platform'" class-name="id-select" :value="platform" :options="f.options ?? []" @change="(v: string) => onPlatform(v)" />
            <BubbleSelect v-else-if="f.type === 'select' && f.key === 'status'" class-name="id-select" :value="status" :options="statusOptions" @change="(v: string) => (status = v)" />
            <BubbleSelect v-else-if="f.type === 'select'" class-name="id-select" :default-value="f.label" :options="f.options ?? []" />
            <!-- 条件型：先选 低于/高于/等于/介于 再切换值输入区（介于=最小值 至 最大值） -->
            <div v-else-if="f.type === 'cond'" class="id-cond">
              <BubbleSelect class-name="id-select" :default-value="f.label" :options="condOptions(f.label)" @change="(v: string) => onCond(f.label, v)" />
              <template v-if="isBetween(f.label)">
                <input class="id-input" placeholder="最小值" />
                <span>至</span>
                <input class="id-input" placeholder="最大值" />
              </template>
              <input v-else class="id-input" placeholder="请输入值" />
            </div>
            <!-- 区间型：日期带默认值，其余占位输入 -->
            <div v-else-if="f.type === 'range'" class="id-range">
              <input class="id-input" :value="f.val?.[0]" :placeholder="f.ph?.[0] ?? '最小值'" />
              <span>至</span>
              <input class="id-input" :value="f.val?.[1]" :placeholder="f.ph?.[1] ?? '最大值'" />
            </div>
            <!-- 销量：天数 + 日 + 条件 + 值（单列展示） -->
            <div v-else-if="f.type === 'compact'" class="id-compact">
              <input class="id-input" placeholder="销量" />
              <span>日</span>
              <BubbleSelect class-name="id-select" default-value="请选择" :options="['大于', '等于', '小于']" />
              <input class="id-input" placeholder="请输入值" />
            </div>
            <input v-else class="id-input" :placeholder="f.label" />
          </div>
          <!-- 按钮组一列（单排）展示：▦ 最左 + 业务操作 + 重置/查询最右，嵌入网格末位右对齐 -->
          <div class="id-actions">
            <span class="om-col-anchor">
              <button class="id-btn icon" :class="{ on: hiddenCols.length > 0 || hiddenFilters.length > 0 }" title="管理列表字段与查询条件" @mousedown.stop @click="colPop = !colPop">▦</button>
              <!-- 列表字段管理气泡：absolute 锚定 ▦ 按钮（随页面滚动跟随、右缘对齐）；行=勾选(隐藏)＋拖拽柄(排序)＋名称＋左钉/右钉双 icon，图标按钮定宽成列对齐 -->
              <div v-if="colPop" class="om-col-pop" @mousedown.stop>
                <div class="om-col-head">
                  <button class="om-col-tab" :class="{ on: popTab === 'cols' }" @click="popTab = 'cols'">列表字段管理</button>
                  <button class="om-col-tab" :class="{ on: popTab === 'filters' }" @click="popTab = 'filters'">查询条件管理</button>
                </div>
                <template v-if="popTab === 'cols'">
                  <label
                    v-for="c in orderedFields" :key="c.key"
                    class="om-col-item" :class="{ dragging: dragKey === c.key }"
                    draggable="true"
                    @dragstart="dragKey = c.key"
                    @dragover.prevent
                    @drop.prevent="onDropCol(c.key)"
                  >
                    <input type="checkbox" :checked="!hiddenCols.includes(c.key)" @change="toggleCol(c.key)">
                    <svg class="om-col-grip" width="10" height="14" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="3" r="1.3" /><circle cx="7.5" cy="3" r="1.3" /><circle cx="2.5" cy="8" r="1.3" /><circle cx="7.5" cy="8" r="1.3" /><circle cx="2.5" cy="13" r="1.3" /><circle cx="7.5" cy="13" r="1.3" /></svg>
                    <span class="om-col-name">{{ c.label }}</span>
                    <button
                      class="om-col-ico" :class="{ on: pinnedCols.includes(c.key) }"
                      :title="pinnedCols.includes(c.key) ? '取消钉住' : '钉住到列表最左'"
                      @click.prevent.stop="togglePinLeft(c.key)"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" /></svg>
                    </button>
                    <button
                      class="om-col-ico r" :class="{ on: pinnedRightCols.includes(c.key) }"
                      :title="pinnedRightCols.includes(c.key) ? '取消钉住' : '钉住到列表最右'"
                      @click.prevent.stop="togglePinRight(c.key)"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" /></svg>
                    </button>
                  </label>
                </template>
                <template v-else>
                  <label
                    v-for="f in orderedFilters" :key="`f-${f.key}`"
                    class="om-col-item" :class="{ dragging: fDragKey === f.key }"
                    draggable="true"
                    @dragstart="fDragKey = f.key"
                    @dragover.prevent
                    @drop.prevent="onDropFilter(f.key)"
                  >
                    <input type="checkbox" :checked="!hiddenFilters.includes(f.key)" @change="toggleFilter(f.key)">
                    <svg class="om-col-grip" width="10" height="14" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="3" r="1.3" /><circle cx="7.5" cy="3" r="1.3" /><circle cx="2.5" cy="8" r="1.3" /><circle cx="7.5" cy="8" r="1.3" /><circle cx="2.5" cy="13" r="1.3" /><circle cx="7.5" cy="13" r="1.3" /></svg>
                    <span class="om-col-name">{{ f.label }}</span>
                  </label>
                </template>
              </div>
            </span>
            <BubbleSelect class-name="om-select" default-value="批量操作" :options="['批量调价', '批量上架', '批量下架', '批量删除']" @change="onBatch" />
            <button class="om-log-btn" @click="onLog">
              操作日志
            </button>
            <button class="id-btn">重置</button>
            <button class="id-btn primary">查询</button>
          </div>
        </div>

        <ProductTable
          :rows="sortedRows"
          :check-width="42"
          :index-width="60"
          :checked="checked"
          :hidden="hiddenCols"
          :col-order="tableCols"
          :pinned="pinnedCols"
          :pinned-right="pinnedRightCols"
          :sort-keys="NUMERIC_KEYS"
          :sort-state="sortState"
          :actions="omActions"
          @check-change="onCheck"
          @sort="toggleSort"
          @action="onAction"
        />

        <!-- 批量调价：与店铺商品列表一致，复用同一弹窗宿主与 toast 反馈 -->
        <div class="pm-page pm-host">
          <SgBatchPriceModal
            v-if="bpOpen && priceSel > 0"
            :count="priceSel"
            @close="bpOpen = false"
            @ok="pushToast"
          />
        </div>
      </div>
    </div>
  </div>
</template>

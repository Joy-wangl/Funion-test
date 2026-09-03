<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { ProductRow, OmProduct } from './data';
import { omProducts, toSgProduct } from './data';
import ProductTable from './ProductTable.vue';
import SgDetailPage from './SgDetailPage.vue';
import { sgRowActions, SG_CHIPS } from './shopGoodsData';
import BubbleSelect, { COLOR_ENUM } from '../../components/BubbleSelect.vue';
import type { BubbleOption } from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';

/** 通用选项 */
const PROFIT_OPTIONS = ['全部', '盈利', '亏损'];
const YES_NO_OPTIONS = ['全部', '是', '否'];
const RATE_OPTIONS = ['全部', '≥10%', '≥20%', '≥30%'];
const SHOP_OPTIONS = [...new Set(omProducts.map((r) => r.storeMeta.text))];
const CAT1_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[0]))];
const CAT2_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[1]).filter(Boolean))];

/* 星星/旗帜彩色枚举：同色集（灰红橙黄绿蓝靛紫）不同图标（star/flag），旗帜多一项空白 */
const STAR_OPTIONS: BubbleOption[] = COLOR_ENUM.map((c) => ({ value: c.name, label: c.name, icon: 'star', color: c.color }));
const FLAG_OPTIONS: BubbleOption[] = [{ value: '空白', label: '空白' }, ...COLOR_ENUM.map((c) => ({ value: c.name, label: c.name, icon: 'flag' as const, color: c.color }))];

/* 自动化标签枚举：基础 5 项 + 业务全量标签（下拉支持模糊搜索） */
const AUTO_TAG_OPTIONS = [
  '全部', '爆款', '滞销', '清仓', '新品',
  '武汉-多多暴力自动化-单规格-竞品', '武汉-多多暴力自动化-免费-竞品', '武汉-抖音暴力自动化-折扣-竞品',
  '武汉-多多优卓饰品自动化-活动+推广', '武汉-多多暴力自动化-只有推广裂变', '南昌-京东暴力自动化-商品卡成本115',
  '单品5折', '单', '武汉-多多暴力自动化-量化运营-强付费-竞品', '武汉-多多暴力自动化-强付费-竞品',
  '武汉-多多暴力自动化-只有活动', '单品直降', '测试使用', '22', '成本+快递', '暴力', '单品直降4.5折', '个人测试',
  '武汉-暴力自动化-5折', '武汉-多多暴力自动化-全店推广', '允臻精选', '武汉-抖音暴力自动化-竞品',
  '武汉-抖音暴力自动化-4.2折-竞品', 'AI测试', '暴力熊', '暴力-竞品',
  '武汉-多多暴力自动化-单规格-竞品-优卓饰品', '武汉-抖音暴力自动化', '武汉-多多暴力自动化-免费',
  '武汉-抖音暴力自动化-小茶日记', '武汉-多多暴力自动化-单规格', '武汉-抖音暴力自动化-单品直降-竞品',
  '武汉-多多暴力自动化-量化运营-免费', '武汉-多多暴力自动化-只有推广', '杭州-暴力自动化-淘宝-普通',
  '杭州-暴力自动化-淘宝-秒杀', '杭州-暴力自动化-视频号-手', '南昌-快手暴力自动化-商品卡成本115',
  '武汉-多多暴力自动化-活动+强付费推广', '杭州-暴力自动化-淘宝-顺买', '武汉-抖音暴力自动化- 8折-竞品',
  '武汉-抖音暴力自动化-店铺8折-竞品', '武汉-抖音暴力自动化-4.2折', '武汉-多多暴力自动化-活动+推广',
  '武汉-多多暴力自动化-强付费', '快手自动化测试', '武汉-多多暴力自动化-活动+推广-竞品',
  '南昌-抖音暴力自动化-无折扣', '武汉-多多暴力自动化-量化运营-强付费-竞品-优卓饰品',
  '武汉-多多暴力自动化-量化运营-免费-竞品', '武汉自动化-活动+推广', '测试过滤-竞品',
  '武汉-抖音暴力自动化-无折扣', '武汉-抖音暴力自动化-折扣', '南昌-快手暴力自动化-免费（成本*150%后抹零+1.9）',
  '武汉-多多优卓饰品自动化-活动+推广-竞品', '朋意丞瑁家居清洁专卖店', '推广裂变-推广+活动',
  '武汉-多多暴力自动化-只有推广-竞品', '武汉-抖音暴力自动化-单品直降', '推广裂变',
  '武汉-多多暴力自动化-小茶日记', '武汉-多多暴力自动化-只有活动-竞品', '武汉-抖音暴力自动化-无折扣-竞品',
  '22-竞品', '南昌-暴力自动化', '武汉-抖音暴力自动化-店铺8折',
  '武汉-多多暴力自动化-只有活动-竞品-优卓饰品', '武汉-多多暴力自动化-全店推广-竞品',
  '南昌-抖音暴力自动化-单品直降5.5', '武汉-抖音暴力自动化-单品直降4.5折', '武汉-抖音暴力自动化- 8折',
  '杭州-暴力自动化-视频号-快', '测试使用-竞品', '测试过滤', '武汉-暴力自动化',
];

/** ID数据筛选器字段：标题仅作占位展示，不作为选择项；cond=条件型（先选 低于/高于/等于/介于 再输入值）；所有条件统一单列展示 */
interface IdField { label: string; options: (string | BubbleOption)[]; cond?: boolean }
const idSelectFields: IdField[] = [
  { label: '店铺', options: SHOP_OPTIONS },
  { label: '采购', options: ['陈晓', '刘洋', '周敏'] },
  { label: '运营组', options: ['运营一组', '运营二组', '运营三组'] },
  { label: '运营专员', options: ['王芳', '李娜', '赵磊'] },
  { label: '运营助理', options: ['孙悦', '吴倩'] },
  { label: '发生毛利2', options: PROFIT_OPTIONS, cond: true },
  { label: '发生毛利3', options: PROFIT_OPTIONS, cond: true },
  { label: '发生毛利4', options: PROFIT_OPTIONS, cond: true },
  { label: '发生净利润', options: PROFIT_OPTIONS, cond: true },
  { label: '星星', options: STAR_OPTIONS },
  { label: '旗帜', options: FLAG_OPTIONS },
];

const idSelectFields2: IdField[] = [
  { label: '出仓利润', options: PROFIT_OPTIONS, cond: true },
  { label: '禁用仓', options: YES_NO_OPTIONS },
  { label: '查看全仓', options: YES_NO_OPTIONS },
  { label: '请选择项目', options: ['全部项目', '新品项目', '爆品项目', '清仓项目'] },
  { label: '请选择爆品', options: YES_NO_OPTIONS },
];

const idSelectFields3: IdField[] = [
  { label: '毛二利润率', options: RATE_OPTIONS, cond: true },
  { label: '毛四利润率', options: RATE_OPTIONS, cond: true },
  { label: '毛五利润率', options: RATE_OPTIONS, cond: true },
  { label: '毛六利润率', options: RATE_OPTIONS, cond: true },
  { label: '运营毛五利', options: RATE_OPTIONS, cond: true },
  { label: '运营毛六利', options: RATE_OPTIONS, cond: true },
  { label: '运营毛三（减税）', options: RATE_OPTIONS, cond: true },
  { label: '运营毛四（减税）', options: RATE_OPTIONS, cond: true },
  { label: '运营毛五（减税）', options: RATE_OPTIONS, cond: true },
  { label: '运营毛六（减税）', options: RATE_OPTIONS, cond: true },
];

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
  '发生毛利2', '发生毛利3', '发生毛利4', '发生净利润',
  'yesterday', 'week7', 'refund', 'refundAfter',
  '毛二利润率', '毛四利润率', '毛五利润率', '毛六利润率',
  '运营毛五利', '运营毛六利', '运营毛三（减税）', '运营毛四（减税）', '运营毛五（减税）', '运营毛六（减税）',
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

/* 批量操作：批量删除=删除勾选商品；其余演示提示（需先勾选） */
const onBatch = (v: string) => {
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
  '采购', '运营组', '运营专员', '运营助理',
  '发生毛利2', '发生毛利3', '发生毛利4', '发生净利润', '星星', '旗帜',
  '出仓利润', '备注',
  '毛二利润率', '毛四利润率', '毛五利润率', '毛六利润率', '运营毛五利', '运营毛六利',
  '运营毛三（减税）', '运营毛四（减税）', '运营毛五（减税）', '运营毛六（减税）',
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
const colPop = ref<{ x: number; y: number } | null>(null);
const closeColPop = () => { colPop.value = null; };
watch(colPop, (v) => {
  if (v) document.addEventListener('mousedown', closeColPop);
  else document.removeEventListener('mousedown', closeColPop);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', closeColPop));
const openColPop = (e: MouseEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  // 气泡 176x约352：右缘对齐按钮并夹在视口内，底部越界时上收
  const W = 176;
  const H = 352;
  colPop.value = {
    x: Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8),
    y: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - H - 8)),
  };
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
  <SgDetailPage
    v-if="detail"
    :product="toSgProduct(detail, { status: detail.sg.status })"
    hide-edit
    @back="detail = null"
  />
  <div v-else class="om-page">
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
            <label>选择平台</label>
            <BubbleSelect class-name="id-select" :value="platform" :options="['全部', '淘宝', '视频号']" @change="(v: string) => onPlatform(v)" />
          </div>
          <div class="id-field">
            <label>商品状态</label>
            <BubbleSelect class-name="id-select" :value="status" :options="statusOptions" @change="(v: string) => (status = v)" />
          </div>
          <div v-for="f in idSelectFields" :key="f.label" class="id-field">
            <label>{{ f.label }}</label>
            <div v-if="f.cond" class="id-cond">
              <BubbleSelect class-name="id-select" :default-value="f.label" :options="condOptions(f.label)" @change="(v: string) => onCond(f.label, v)" />
              <template v-if="isBetween(f.label)">
                <input class="id-input" placeholder="最小值" />
                <span>至</span>
                <input class="id-input" placeholder="最大值" />
              </template>
              <input v-else class="id-input" placeholder="请输入值" />
            </div>
            <BubbleSelect v-else class-name="id-select" :default-value="f.label" :options="f.options" />
          </div>

          <!-- 销量 XX 日 大于/等于/小于 XXX：天数输入 + 日 + 条件 + 值输入（单列展示） -->
          <div class="id-field">
            <label>销量</label>
            <div class="id-compact">
              <input class="id-input" placeholder="销量" />
              <span>日</span>
              <BubbleSelect class-name="id-select" default-value="请选择" :options="['大于', '等于', '小于']" />
              <input class="id-input" placeholder="请输入值" />
            </div>
          </div>
          <div class="id-field">
            <label>是否有动销</label>
            <BubbleSelect class-name="id-select" default-value="全部" :options="['全部', '有动销', '无动销']" />
          </div>
          <div v-for="f in idSelectFields2" :key="f.label" class="id-field">
            <label>{{ f.label }}</label>
            <div v-if="f.cond" class="id-cond">
              <BubbleSelect class-name="id-select" :default-value="f.label" :options="condOptions(f.label)" @change="(v: string) => onCond(f.label, v)" />
              <template v-if="isBetween(f.label)">
                <input class="id-input" placeholder="最小值" />
                <span>至</span>
                <input class="id-input" placeholder="最大值" />
              </template>
              <input v-else class="id-input" placeholder="请输入值" />
            </div>
            <BubbleSelect v-else class-name="id-select" :default-value="f.label" :options="f.options" />
          </div>
          <div class="id-field">
            <label>请输入备注</label>
            <input class="id-input" placeholder="请输入备注" />
          </div>
          <div v-for="f in idSelectFields3" :key="f.label" class="id-field">
            <label>{{ f.label }}</label>
            <div v-if="f.cond" class="id-cond">
              <BubbleSelect class-name="id-select" :default-value="f.label" :options="condOptions(f.label)" @change="(v: string) => onCond(f.label, v)" />
              <template v-if="isBetween(f.label)">
                <input class="id-input" placeholder="最小值" />
                <span>至</span>
                <input class="id-input" placeholder="最大值" />
              </template>
              <input v-else class="id-input" placeholder="请输入值" />
            </div>
            <BubbleSelect v-else class-name="id-select" :default-value="f.label" :options="f.options" />
          </div>
          <!-- 总广告费：单组件单列，最小值 至 最大值 直接输入 -->
          <div class="id-field">
            <label>总广告费</label>
            <div class="id-range">
              <input class="id-input" placeholder="最小值" />
              <span>至</span>
              <input class="id-input" placeholder="最大值" />
            </div>
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
          <!-- 外仓率最小/最大值：单列区间控件（最小 至 最大），与总广告费同款 -->
          <div class="id-field">
            <label>外仓率 %</label>
            <div class="id-range">
              <input class="id-input" placeholder="外仓率最小值 %" />
              <span>至</span>
              <input class="id-input" placeholder="外仓率最大值 %" />
            </div>
          </div>
          <div class="id-field">
            <label>自动化标签</label>
            <BubbleSelect class-name="id-select" default-value="自动化标签" searchable :options="AUTO_TAG_OPTIONS" />
          </div>

          <!-- 按钮组一列（单排）展示：▦ 最左 + 业务操作 + 重置/查询最右，嵌入网格末位右对齐 -->
          <div class="id-actions">
            <button class="id-btn icon" :class="{ on: hiddenCols.length > 0 }" title="管理列表字段" @click="openColPop">▦</button>
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
          :col-order="orderedFields"
          :sort-keys="NUMERIC_KEYS"
          :sort-state="sortState"
          :actions="omActions"
          @check-change="onCheck"
          @sort="toggleSort"
          @action="onAction"
        />
      </div>
    </div>

    <!-- 列表字段管理气泡 -->
    <Teleport to="body">
      <div v-if="colPop" class="om-col-pop" :style="{ left: `${colPop.x}px`, top: `${colPop.y}px` }" @mousedown.stop>
        <div class="om-col-head">列表字段管理</div>
        <label
          v-for="c in orderedFields" :key="c.key"
          class="om-col-item" :class="{ dragging: dragKey === c.key }"
          draggable="true"
          @dragstart="dragKey = c.key"
          @dragover.prevent
          @drop.prevent="onDropCol(c.key)"
        >
          <input type="checkbox" :checked="!hiddenCols.includes(c.key)" @change="toggleCol(c.key)">
          {{ c.label }}
          <svg class="om-col-grip" width="10" height="14" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="3" r="1.3" /><circle cx="7.5" cy="3" r="1.3" /><circle cx="2.5" cy="8" r="1.3" /><circle cx="7.5" cy="8" r="1.3" /><circle cx="2.5" cy="13" r="1.3" /><circle cx="7.5" cy="13" r="1.3" /></svg>
        </label>
      </div>
    </Teleport>
  </div>
</template>

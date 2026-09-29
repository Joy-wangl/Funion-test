<script setup lang="ts">
/**
 * SKU 商品匹配视图（店铺商品 / 商品创建 详情编辑态「查看」入口共享）：
 * 顶栏 tab 分段胶囊＋返回/保存；默认三 tab（聚水潭匹配 / 竞品匹配 / 条件匹配），
 * merged（京麦入口）时竞品＋条件合并为单个「商品匹配」工作区：源信息行仅一个匹配入口（竞品信息），
 * 结果区按命中报告呈现——左右主从：左命中商品（ID）列表（基本信息＋匹配度，点击切换），右选中商品下 SKU 命中明细（命中度降序、SKU 维度选择）；
 * 聚水潭＝源商品信息＋已选商品＋筛选条＋结果表格；竞品/条件＝源信息＋匹配数量＋已选＋筛选＋卡片栅格（查询前空态）。
 * 数据为静态呈现行，不接后端。
 */
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SortTh from '../../components/SortTh.vue';
import VsEmptyArt from '../code-kb/VsEmptyArt.vue';
import { pushToast } from '../../components/toast';

export interface SkmSku { code: string; series: string; name: string; cost: string; price: string; }
export interface SkmProduct { title: string; thumb: string; category: string; price: string; }

const props = defineProps<{ open: boolean; sku: SkmSku | null; product: SkmProduct; merged?: boolean; skus?: SkmSku[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>();

/* ---------- 左侧 SKU 切换列（一键匹配）：本商品全部 SKU 卡片列列，切换查看各 SKU 匹配状态与结果 ---------- */
const skuList = computed<SkmSku[]>(() => (props.skus && props.skus.length ? props.skus : []));
const showRail = computed(() => skuList.value.length > 1);
const activeSkuCode = ref('');
const activeSku = computed<SkmSku | null>(() => skuList.value.find((s) => s.code === activeSkuCode.value) ?? props.sku);
const skuKey = computed(() => activeSku.value?.code ?? '__single__');
const switchSku = (code: string) => {
  if (code === activeSkuCode.value) return;
  activeSkuCode.value = code;
  activeCode.value = '';
};

type TabKey = 'jst' | 'comp' | 'cond' | 'product';
/* merged（京麦入口）：竞品匹配＋条件匹配合并为一个「商品匹配」工作区；其余入口保持三 tab */
const tabs = computed<{ k: TabKey; label: string }[]>(() => props.merged
  ? [{ k: 'jst', label: '聚水潭匹配' }, { k: 'product', label: '商品匹配' }]
  : [{ k: 'jst', label: '聚水潭匹配' }, { k: 'comp', label: '竞品匹配' }, { k: 'cond', label: '条件匹配' }]);
const tab = ref<TabKey>('jst');

/* ---------- 已选商品 ---------- */
interface Sel { id: string; code: string; skuCode?: string; series: string; cost: string; qty: number; sim: number; thumb: string; }
/* 已选商品按源 SKU 分存：切换 SKU 各看各的已选 */
const selBySku = ref<Record<string, Sel[]>>({});
const selected = computed<Sel[]>(() => selBySku.value[skuKey.value] ?? []);
const qtyExpanded = ref<Set<string>>(new Set());
const toggleQty = (id: string) => {
  const s = qtyExpanded.value;
  s.has(id) ? s.delete(id) : s.add(id);
  qtyExpanded.value = new Set(s);
};
const pick = (o: { id: string; code: string; skuCode?: string; series: string; cost: string; sim: number; thumb: string }) => {
  const list = selBySku.value[skuKey.value] ?? (selBySku.value[skuKey.value] = []);
  const i = list.findIndex((s) => s.id === o.id);
  if (i > -1) list.splice(i, 1);
  else list.push({ ...o, qty: 1 });
};
const picked = (id: string) => selected.value.some((s) => s.id === id);
/* 左列商品卡角标：该 ID 下已选 SKU 数 */
const pickedCountOf = (code: string) => selected.value.filter((s) => s.code === code).length;
const stepQty = (s: Sel, d: number) => { s.qty = Math.max(1, s.qty + d); };
const dropSel = (id: string) => {
  const list = selBySku.value[skuKey.value];
  if (list) selBySku.value[skuKey.value] = list.filter((s) => s.id !== id);
  qtyExpanded.value.delete(id);
};

/* ---------- 聚水潭匹配：筛选＋结果表格（静态行） ---------- */
const jstFilter = ref({ onSale: '全部', name: '', style: '', code: '', combo: '' });
const jstMode = ref('按商品');
const JST_MODES = ['按款式', '按商品', '组合编码'];
const JST_ROWS = [
  { id: 'J1', style: 'SDLJFG', code: 'SMT-296', name: '韩国大蝴蝶结发夹丝绒红色弹簧夹少女后脑勺夹', person: '张玉燕', brand: '优卓饰品', onSale: '在售', cost: '7.5', weight: '0' },
  { id: 'J2', style: 'DS1097', code: '6034-黑', name: '黑丝袜女薄款黑色ins蹦迪袜网红字母渔网袜带', person: '张玉燕', brand: '优卓饰品', onSale: '在售', cost: '0', weight: '0.042' },
  { id: 'J3', style: 'P322', code: 'P322', name: 'S01-1大蝴蝶结很显头-缎面黑色头发抓夹女发', person: '张玉燕', brand: '优卓饰品', onSale: '在售', cost: '0', weight: '0' },
  { id: 'J4', style: 'JYHWAN-002', code: 'JYHWAN-002', name: '加压护腕-黑蓝色-1个（袋装）', person: '陈洛源', brand: '陈洛源', onSale: '在售', cost: '2.30', weight: '0.05' },
];
const jstRows = () => {
  const out = JST_ROWS.filter((r) =>
    (!jstFilter.value.name || r.name.includes(jstFilter.value.name)) &&
    (!jstFilter.value.style || r.style.includes(jstFilter.value.style)) &&
    (!jstFilter.value.code || r.code.includes(jstFilter.value.code)) &&
    (!jstFilter.value.onSale || jstFilter.value.onSale === '全部' || r.onSale === jstFilter.value.onSale));
  /* 成本价 / 重量 列头排序（数值比较） */
  const k = jstSortKey.value;
  if (k && jstSortDir.value !== 'none') {
    const dir = jstSortDir.value === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => (Number(a[k]) - Number(b[k])) * dir);
  }
  return out;
};
const jstReset = () => { jstFilter.value = { onSale: '全部', name: '', style: '', code: '', combo: '' }; };
/* 聚水潭表排序状态：单列激活，点击循环 desc → asc → 取消 */
const jstSortKey = ref<'cost' | 'weight' | ''>('');
const jstSortDir = ref<'none' | 'asc' | 'desc'>('none');
const onJstSort = (k: 'cost' | 'weight') => {
  if (jstSortKey.value !== k) {
    jstSortKey.value = k;
    jstSortDir.value = 'desc';
  } else if (jstSortDir.value === 'desc') {
    jstSortDir.value = 'asc';
  } else if (jstSortDir.value === 'asc') {
    jstSortKey.value = '';
    jstSortDir.value = 'none';
  } else {
    jstSortDir.value = 'desc';
  }
};
const jstSortState = (k: string) => (jstSortKey.value === k ? jstSortDir.value : 'none');

/* ---------- 竞品 / 条件匹配：筛选＋卡片栅格（查询前空态，静态结果行） ---------- */
const carryComp = ref(false);
const matchCount = ref('10');
const compFilter = ref({ series: '', code: '', name: '' });
const condFilter = ref({ series: '', code: '', name: '' });
const compQueried = ref(false);
const condQueried = ref(false);
/* 合并「商品匹配」工作区：竞品/条件共用一套查询态 */
const mQueried = ref(false);
const isProd = computed(() => !!props.merged && tab.value === 'product');
const fRef = computed(() => (tab.value === 'cond' ? condFilter.value : compFilter.value));
const queried = computed(() => (isProd.value ? mQueried.value : tab.value === 'cond' ? condQueried.value : compQueried.value));
const setQueried = (v: boolean) => {
  if (isProd.value) mQueried.value = v;
  else if (tab.value === 'cond') condQueried.value = v;
  else compQueried.value = v;
};
const resetFilters = () => {
  const f = fRef.value;
  f.series = ''; f.code = ''; f.name = '';
  setQueried(false);
};
const CARDS = [
  { id: 'C1', sim: 10, thumb: '/products/serum.png', title: '加压护腕-黑蓝色-1个（袋装）', code: 'JYHWAN-002', series: '加压护腕', brand: '陈洛源', tags: ['内衣名下', '四季款（常年）', '运维'], cost: '2.30' },
  { id: 'C2', sim: 10, thumb: '/products/main.png', title: '加压护腕-黑色-1个（袋装）', code: 'JYHWAN-003', series: '加压护腕', brand: '陈洛源', tags: ['内衣名下', '所有云仓', '四季款（常年）'], cost: '2.30' },
  { id: 'C3', sim: 9, thumb: '/products/serum.png', title: '加压护腕-黑橙色-1个（袋装）', code: 'JYHWAN-001', series: '加压护腕', brand: '陈洛源', tags: ['内衣名下', '所有云仓'], cost: '2.30' },
  { id: 'C4', sim: 9, thumb: '/products/main.png', title: '护腕扭扭伤护手手腕套腱鞘关节套', code: '862596806753', series: '—', brand: '—', tags: [], cost: '—' },
  { id: 'C5', sim: 8, thumb: '/products/serum.png', title: '运动护腕羽毛球网球损伤固定绑带', code: '876712659123', series: '—', brand: '—', tags: [], cost: '—' },
];
const cardsOf = (f: { series: string; code: string; name: string }) => CARDS.filter((c) =>
  (!f.series || c.series.includes(f.series)) &&
  (!f.code || c.code.includes(f.code)) &&
  (!f.name || c.title.includes(f.name)));

/* ---------- 条件匹配：条件图（可移除/重传） ---------- */
const condImg = ref('');
const runComp = () => { activeCode.value = ''; setQueried(true); };
const runCond = () => {
  if (!condImg.value) { pushToast('请先上传条件图', 'warning'); return; }
  setQueried(true);
};

/* ---------- 合并工作区命中报告：左命中商品（ID）列表＋右 SKU 命中明细（命中度降序、SKU 维度选择），静态演示行 ---------- */
interface MatchSkuHit { id: string; sim: number; skuName: string; skuCode: string; series: string; prodTitle: string; prodCode: string; cost: string; sales: string; skuSales: string; thumb: string; }
const SKU_HITS: MatchSkuHit[] = [
  { id: 'H1', sim: 0.9999, skuName: '加压护腕-黑蓝色-1个（袋装）', skuCode: 'JYHWAN-002-B', series: '加压护腕', prodTitle: '加压护腕-黑蓝色-1个（袋装）', prodCode: 'JYHWAN-002', cost: '2.30', sales: '12087', skuSales: '8231', thumb: '/products/serum.png' },
  { id: 'H5', sim: 0.9852, skuName: '加压护腕-黑蓝色-2个（袋装）', skuCode: 'JYHWAN-002-2B', series: '加压护腕', prodTitle: '加压护腕-黑蓝色-1个（袋装）', prodCode: 'JYHWAN-002', cost: '4.50', sales: '12087', skuSales: '3856', thumb: '/products/serum.png' },
  { id: 'H2', sim: 0.9987, skuName: '加压护腕-黑色-1个（袋装）', skuCode: 'JYHWAN-003-B', series: '加压护腕', prodTitle: '加压护腕-黑色-1个（袋装）', prodCode: 'JYHWAN-003', cost: '2.30', sales: '11875', skuSales: '7902', thumb: '/products/main.png' },
  { id: 'H6', sim: 0.9712, skuName: '加压护腕-黑色-2个（袋装）', skuCode: 'JYHWAN-003-2B', series: '加压护腕', prodTitle: '加压护腕-黑色-1个（袋装）', prodCode: 'JYHWAN-003', cost: '4.50', sales: '11875', skuSales: '3973', thumb: '/products/main.png' },
  { id: 'H3', sim: 0.9921, skuName: '加压护腕-黑橙色-1个（袋装）', skuCode: 'JYHWAN-001-B', series: '加压护腕', prodTitle: '加压护腕-黑橙色-1个（袋装）', prodCode: 'JYHWAN-001', cost: '2.30', sales: '10307', skuSales: '10307', thumb: '/products/serum.png' },
  { id: 'H4', sim: 0.9764, skuName: '护腕扭扭伤护手手腕套腱鞘关节套', skuCode: '862596806753-1', series: '—', prodTitle: '护腕扭扭伤护手手腕套腱鞘关节套', prodCode: '862596806753', cost: '—', sales: '9515', skuSales: '9515', thumb: '/products/main.png' },
  { id: 'H7', sim: 0.8840, skuName: '加压护腕-黑蓝色-3个（袋装）', skuCode: 'JYHWAN-005-B', series: '加压护腕', prodTitle: '加压护腕-黑蓝色-3个（袋装）', prodCode: 'JYHWAN-005', cost: '6.80', sales: '8642', skuSales: '5210', thumb: '/products/serum.png' },
  { id: 'H8', sim: 0.8213, skuName: '加压护腕-黑蓝色-4个（袋装）', skuCode: 'JYHWAN-005-2B', series: '加压护腕', prodTitle: '加压护腕-黑蓝色-3个（袋装）', prodCode: 'JYHWAN-005', cost: '8.90', sales: '8642', skuSales: '3432', thumb: '/products/serum.png' },
  { id: 'H9', sim: 0.7462, skuName: '护腕扭扭伤护手手腕套腱鞘关节套升级款', skuCode: 'JYHWAN-006-B', series: '加压护腕', prodTitle: '护腕扭扭伤护手手腕套腱鞘关节套升级款', prodCode: 'JYHWAN-006', cost: '3.60', sales: '6420', skuSales: '4108', thumb: '/products/main.png' },
  { id: 'H10', sim: 0.6685, skuName: '护腕扭扭伤护手手腕套腱鞘关节套-2个', skuCode: 'JYHWAN-006-2B', series: '加压护腕', prodTitle: '护腕扭扭伤护手手腕套腱鞘关节套升级款', prodCode: 'JYHWAN-006', cost: '5.20', sales: '6420', skuSales: '2312', thumb: '/products/main.png' },
  { id: 'H11', sim: 0.6327, skuName: '运动护腕羽毛球网球损伤固定绑带-单只', skuCode: '876712659123-1', series: '—', prodTitle: '运动护腕羽毛球网球损伤固定绑带', prodCode: '876712659123', cost: '—', sales: '5230', skuSales: '5230', thumb: '/products/serum.png' },
  { id: 'H12', sim: 0.5894, skuName: '运动护腕羽毛球网球损伤固定绑带-一对', skuCode: '876712659123-2', series: '—', prodTitle: '运动护腕羽毛球网球损伤固定绑带', prodCode: '876712659123', cost: '4.80', sales: '5230', skuSales: '2146', thumb: '/products/serum.png' },
  { id: 'H13', sim: 0.5236, skuName: '加压护腕-灰色-1个（袋装）', skuCode: 'JYHWAN-007-B', series: '加压护腕', prodTitle: '加压护腕-灰色-1个（袋装）', prodCode: 'JYHWAN-007', cost: '2.60', sales: '3185', skuSales: '3185', thumb: '/products/main.png' },
  { id: 'H14', sim: 0.4572, skuName: '加压护腕-灰色-2个（袋装）', skuCode: 'JYHWAN-007-2B', series: '加压护腕', prodTitle: '加压护腕-灰色-1个（袋装）', prodCode: 'JYHWAN-007', cost: '4.90', sales: '3185', skuSales: '1204', thumb: '/products/main.png' },
];
/* 一键匹配：点一次商品匹配即对全部源 SKU 出结果；命中行按 SKU 序递减演示，末位 SKU 无命中 */
const hitsOf = (code: string): MatchSkuHit[] => {
  const i = skuList.value.findIndex((s) => s.code === code);
  if (i <= 0) return SKU_HITS;
  if (i === 1) return SKU_HITS.slice(2).map((h) => ({ ...h, id: `${h.id}b`, sim: +(h.sim - 0.06).toFixed(4) }));
  if (i === 2) return SKU_HITS.slice(6, 10).map((h) => ({ ...h, id: `${h.id}c`, sim: +(h.sim - 0.15).toFixed(4) }));
  return [];
};
/* 命中商品（ID）分组：匹配度取组内 SKU 最高命中，列表按匹配度降序 */
interface HitGroup { code: string; title: string; thumb: string; sales: string; score: number; skus: MatchSkuHit[]; }
const buildGroups = (hits: MatchSkuHit[]) => {
  const m = new Map<string, HitGroup>();
  for (const h of hits) {
    let g = m.get(h.prodCode);
    if (!g) {
      g = { code: h.prodCode, title: h.prodTitle, thumb: h.thumb, sales: h.sales, score: 0, skus: [] };
      m.set(h.prodCode, g);
    }
    g.skus.push(h);
    g.score = Math.max(g.score, h.sim);
  }
  return [...m.values()].sort((a, b) => b.score - a.score);
};
const groups = computed<HitGroup[]>(() => buildGroups(hitsOf(skuKey.value)));
/* 切换列标签：该源 SKU 命中商品数 / 已选 SKU 数 */
const hitCountOf = (code: string) => buildGroups(hitsOf(code)).length;
const selCountOfSku = (code: string) => (selBySku.value[code] ?? []).length;
const activeCode = ref('');
const activeGroup = computed(() => groups.value.find((g) => g.code === activeCode.value) ?? groups.value[0]);
/* 右侧明细：选中商品下 SKU 按命中度降序，最高命中排最上；选择在 SKU 维度 */
const activeSkus = computed(() => (activeGroup.value ? [...activeGroup.value.skus].sort((a, b) => b.sim - a.sim) : []));
const pickSku = (h: MatchSkuHit) => {
  pick({ id: h.skuCode, code: h.prodCode, skuCode: h.skuCode, series: h.series, cost: h.cost, sim: h.sim * 100, thumb: h.thumb });
};
/* 匹配度色档：>85 绿 / 70-85 蓝 / 60-70 黄 / <60 红 */
const simBand = (v: number) => (v > 85 ? 'g' : v >= 70 ? 'b' : v >= 60 ? 'y' : 'r');

watch(() => props.open, (v) => {
  if (!v) return;
  tab.value = 'jst';
  selBySku.value = {};
  activeSkuCode.value = props.sku?.code ?? skuList.value[0]?.code ?? '';
  compQueried.value = false;
  condQueried.value = false;
  mQueried.value = false;
  activeCode.value = '';
  condImg.value = props.product.thumb;
  jstReset();
  compFilter.value = { series: '', code: '', name: '' };
  condFilter.value = { series: '', code: '', name: '' };
});

const save = () => { pushToast('匹配结果已保存'); emit('saved'); };
</script>

<template>
  <!-- 左侧空白遮罩：点击关闭当前视图 -->
  <div v-if="open" class="skm-mask" @click="emit('close')"></div>
  <div v-if="open" class="skm-view" :class="{ 'skm-merged': merged, 'has-rail': showRail }">
    <!-- 顶栏：左分段胶囊，右保存 -->
    <div class="skm-top">
      <div class="skm-tabs">
        <button v-for="t in tabs" :key="t.k" type="button" class="skm-tab" :class="{ on: tab === t.k }" @click="tab = t.k">{{ t.label }}</button>
      </div>
      <div class="skm-top-acts">
        <button type="button" class="sg-btn primary" @click="save">保存</button>
      </div>
    </div>

    <div class="skm-body" :class="{ 'has-rail': showRail }">
      <!-- 左 SKU 切换列：卡片（缩略图＋名称＋价格＋匹配状态），选中蓝框浅蓝底；切换查看各 SKU 匹配结果 -->
      <aside v-if="showRail" class="skm-skurail">
        <div class="skm-skurail-head">SKU</div>
        <div v-for="s in skuList" :key="s.code" class="skm-skucard" :class="{ on: s.code === activeSkuCode }" @click="switchSku(s.code)">
          <img :src="product.thumb" alt="" />
          <div class="skm-skucard-main">
            <div class="skm-skucard-name">{{ s.name }}</div>
            <div class="skm-skucard-price">价格：{{ s.price ? '¥' + s.price : '—' }}</div>
            <div v-if="queried && hitCountOf(s.code)" class="skm-hititem-tags">
              <i class="skm-tag-hit">命中 {{ hitCountOf(s.code) }}</i>
              <i v-if="selCountOfSku(s.code)" class="skm-tag-sel">已选 {{ selCountOfSku(s.code) }}</i>
            </div>
            <div v-else class="skm-skucard-sub">{{ queried ? '无命中' : '未匹配' }}</div>
          </div>
        </div>
      </aside>
      <div class="skm-body-main">
        <!-- ① 源信息：聚水潭 / 竞品 / 条件 三态 -->
        <div class="sgd-sec">
          <div class="sgd-sec-head">
            <div class="sgd-sec-title">{{ tab === 'jst' ? '聚水潭信息' : tab === 'cond' ? '条件匹配' : '竞品信息' }}</div>
            <div v-if="tab !== 'jst'" class="skm-head-right">
              <span class="skm-lbl">匹配数量：</span>
              <BubbleSelect class-name="skm-select" :value="matchCount" :options="['10', '20', '50']" @change="(v) => (matchCount = v)" />
            </div>
          </div>
          <div class="sgd-sec-body">
            <!-- merged：单行摘要条（标题＋字段化元信息＋匹配入口） -->
            <div v-if="merged" class="skm-srcbar">
              <img class="skm-srcbar-img" :src="product.thumb" alt="" />
              <div class="skm-srcbar-main">
                <div class="skm-srcbar-title">
                  <span>{{ product.title || activeSku?.name }}</span>
                  <i v-if="tab === 'jst'" class="skm-ai">AI分词</i>
                </div>
                <div class="skm-srcbar-meta">
                  <span><i>商品类目</i>{{ product.category }}</span>
                  <span><i>规格</i>{{ activeSku?.name || '—' }}</span>
                  <span><i>售价</i>{{ product.price }}</span>
                </div>
              </div>
              <button v-if="isProd" type="button" class="sg-btn primary skm-go" @click="runComp">商品匹配</button>
            </div>
            <!-- 非 merged：保持原源信息行 -->
            <div v-else class="skm-src">
              <template v-if="tab !== 'cond'">
                <img class="skm-src-img" :src="product.thumb" alt="" />
                <div class="skm-src-info">
                  <div class="skm-src-title">
                    <span>{{ product.title || activeSku?.name }}</span>
                    <i v-if="tab === 'jst'" class="skm-ai">AI分词</i>
                  </div>
                  <div class="skm-kv"><span>标题：</span>{{ product.title || activeSku?.name }}</div>
                  <div class="skm-kv"><span>商品类目：</span>{{ product.category }}</div>
                  <div class="skm-kv"><span>规格：</span>{{ activeSku?.name || '—' }}</div>
                  <div class="skm-kv"><span>售价：</span>{{ product.price }}</div>
                </div>
                <button v-if="tab === 'comp'" type="button" class="sg-btn primary skm-go" @click="runComp">竞品匹配</button>
              </template>
              <template v-else>
                <div v-if="condImg" class="skm-cond-img">
                  <img :src="condImg" alt="" />
                  <i class="skm-cond-del" title="移除图片" @click="condImg = ''">×</i>
                </div>
                <button type="button" class="skm-upload" @click="condImg = product.thumb">
                  上传图片<i>条件图</i>
                </button>
                <button type="button" class="sg-btn primary skm-go" @click="runCond">商品匹配</button>
              </template>
            </div>
          </div>
        </div>

        <!-- ② 已选商品：未匹配且无已选时不占位，空态仅保留结果区一处 -->
        <div v-if="selected.length || queried" class="sgd-sec">
          <div class="sgd-sec-head"><div class="sgd-sec-title">已选商品</div></div>
          <div class="sgd-sec-body skm-selwrap" :class="{ 'is-empty': !selected.length }">
            <div v-if="!selected.length" class="vs-empty skm-sel-empty">
              <div class="vs-empty-art"><VsEmptyArt /></div>
              <div class="vs-empty-t">暂未选择商品</div>
            </div>
            <div v-for="s in selected" :key="s.id" class="skm-sel">
              <div class="skm-sel-thumb">
                <img :src="s.thumb" alt="" />
                <i v-if="!merged || s.sim > 0" class="skm-sim" :class="merged ? 'simf-' + simBand(s.sim) : ''">{{ merged ? s.sim.toFixed(2) : s.sim + ' 相似度' }}</i>
              </div>
              <div class="skm-sel-main">
                <div class="skm-kv"><span>商品编码：</span>{{ s.code }}</div>
                <div class="skm-kv"><span>系列编码：</span>{{ s.series }}</div>
                <div class="skm-kv"><span>总成本价：</span>{{ s.cost }}</div>
                <div class="skm-sel-last">
                  <div class="skm-sel-qty">
                    <span v-if="!qtyExpanded.has(s.id)" class="skm-qty-collapsed" @click="toggleQty(s.id)">×{{ s.qty }}</span>
                    <div v-else class="skm-qty-stepper">
                      <button type="button" class="skm-qty-btn" :disabled="s.qty <= 1" @click.stop="stepQty(s, -1)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14" /></svg>
                      </button>
                      <span class="skm-qty-val" @click.stop="toggleQty(s.id)">{{ s.qty }}</span>
                      <button type="button" class="skm-qty-btn" @click.stop="stepQty(s, 1)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <i class="skm-sel-del" title="移除" @click="dropSel(s.id)">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
              </i>
            </div>
          </div>
        </div>

        <!-- ③ 匹配区：聚水潭=筛选+表格；竞品/条件=筛选+卡片栅格 -->
        <div class="sgd-sec">
          <div class="sgd-sec-head">
            <div class="sgd-sec-title">{{ tab === 'jst' ? '商品列表' : isProd ? '匹配结果' : '商品匹配' }}</div>
            <BubbleSelect v-if="tab === 'jst'" class-name="skm-mode" :value="jstMode" :options="JST_MODES" @change="(v) => (jstMode = v)" />
            <label v-if="tab === 'comp'" class="skm-check"><input v-model="carryComp" type="checkbox" /><span>匹配时携带竞品信息</span></label>
          </div>
          <div class="sgd-sec-body">
            <!-- 聚水潭：筛选条 + 表格 -->
            <template v-if="tab === 'jst'">
              <div class="skm-filter">
                <span class="skm-fitem"><i>是否在售</i><BubbleSelect class-name="skm-select" :value="jstFilter.onSale" :options="['全部', '在售', '已下架']" @change="(v) => (jstFilter.onSale = v)" /></span>
                <span class="skm-fitem"><i>商品名称</i><input v-model="jstFilter.name" class="sg-input" placeholder="请输入商品名称" /></span>
                <span class="skm-fitem"><i>款式编码</i><input v-model="jstFilter.style" class="sg-input" placeholder="请输入款式编码" /></span>
                <span class="skm-fitem"><i>商品编码</i><input v-model="jstFilter.code" class="sg-input" placeholder="请输入商品编码" /></span>
                <span class="skm-fitem"><i>组合编码</i><input v-model="jstFilter.combo" class="sg-input" placeholder="请输入组合编码" /></span>
                <span class="skm-facts">
                  <button type="button" class="sg-btn primary" @click="() => {}">查询</button>
                  <button type="button" class="sg-btn" @click="jstReset">重置</button>
                </span>
              </div>
              <table class="skm-table">
                <thead>
                  <tr><th>序号</th><th>图片</th><th>款式编码</th><th>商品编码</th><th>商品名称</th><th>类目/负责人</th><th>品牌</th><th>是否在售</th><SortTh label="成本价" :state="jstSortState('cost')" @sort="onJstSort('cost')" /><SortTh label="重量" :state="jstSortState('weight')" @sort="onJstSort('weight')" /><th>操作</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in jstRows()" :key="r.id">
                    <td>{{ i + 1 }}</td>
                    <td><img class="skm-td-img" src="/products/main.png" alt="" /></td>
                    <td>{{ r.style }}</td>
                    <td>{{ r.code }}</td>
                    <td class="skm-td-name">{{ r.name }}</td>
                    <td>{{ r.person }}</td>
                    <td>{{ r.brand }}</td>
                    <td>{{ r.onSale }}</td>
                    <td>{{ r.cost }}</td>
                    <td>{{ r.weight }}</td>
                    <td><a class="sg-link" href="javascript:void(0)" @click.prevent="pick({ id: r.id, code: r.code, series: r.style, cost: r.cost, sim: 0, thumb: '/products/main.png' })">{{ picked(r.id) ? '取消' : '选择' }}</a></td>
                  </tr>
                  <tr v-if="!jstRows().length"><td colspan="11" class="skm-empty">暂无商品</td></tr>
                </tbody>
              </table>
            </template>

            <!-- 合并工作区：命中报告（左命中商品列表＋右 SKU 命中明细） -->
            <template v-else-if="isProd">
              <div v-if="!queried" class="vs-empty skm-sel-empty">
                <div class="vs-empty-art"><VsEmptyArt /></div>
                <div class="vs-empty-t">点击商品匹配获取结果</div>
              </div>
              <div v-else-if="!groups.length" class="skm-grid-empty">暂无商品</div>
              <div v-else class="skm-hitwrap">
                <!-- 左：命中商品（ID）列表，基本信息＋匹配度；点击切换右侧明细 -->
                <div class="skm-hitlist">
                  <div v-for="g in groups" :key="g.code" class="skm-hititem" :class="{ on: activeGroup && g.code === activeGroup.code }" @click="activeCode = g.code">
                    <img :src="g.thumb" alt="" />
                    <div class="skm-hititem-main">
                      <div class="skm-hititem-title">{{ g.title }}</div>
                      <div class="skm-hititem-sub">销量 {{ g.sales }}</div>
                      <div class="skm-hititem-tags">
                        <i class="skm-tag-hit">命中 {{ g.skus.length }}</i>
                        <i v-if="pickedCountOf(g.code)" class="skm-tag-sel">已选 {{ pickedCountOf(g.code) }}</i>
                      </div>
                    </div>
                    <div class="skm-hititem-side">
                      <b class="skm-hititem-score" :class="'skm-tone-' + simBand(g.score * 100)">{{ (g.score * 100).toFixed(2) }}</b>
                      <i class="skm-hititem-scorelbl">匹配度</i>
                    </div>
                  </div>
                </div>
                <!-- 右：选中商品下 SKU 命中明细（命中度降序），选择在 SKU 维度 -->
                <div class="skm-hitdetail">
                  <div class="skm-skulist">
                    <div v-for="h in activeSkus" :key="h.id" class="skm-skuitem" :class="{ picked: picked(h.skuCode) }" @click="pickSku(h)">
                      <img :src="h.thumb" alt="" />
                      <div class="skm-skuitem-main">
                        <div class="skm-skuitem-title">{{ h.skuName }}</div>
                        <div class="skm-skuitem-meta">
                          <span><i>编码</i>{{ h.skuCode }}</span>
                          <span><i>匹配度</i><b :class="'skm-tone-' + simBand(h.sim * 100)">{{ (h.sim * 100).toFixed(2) }}</b></span>
                          <span><i>成本价</i>{{ h.cost !== '—' ? '¥' + h.cost : '—' }}</span>
                          <span v-if="h.series !== '—'"><i>系列</i>{{ h.series }}</span>
                        </div>
                      </div>
                      <i v-if="picked(h.skuCode)" class="skm-skuitem-check">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </i>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 竞品 / 条件：筛选条 + 卡片栅格（查询前空态） -->
            <template v-else>
              <div class="skm-filter">
                <span class="skm-fitem"><i>系列编码</i><input v-model="fRef.series" class="sg-input" placeholder="请输入系列编码" /></span>
                <span class="skm-fitem"><i>商品编码</i><input v-model="fRef.code" class="sg-input" placeholder="请输入商品编码" /></span>
                <span class="skm-fitem"><i>商品名称</i><input v-model="fRef.name" class="sg-input" placeholder="请输入商品名称" /></span>
                <span class="skm-facts">
                  <button type="button" class="sg-btn" @click="resetFilters">重置</button>
                  <button type="button" class="sg-btn primary" @click="setQueried(true)">查询</button>
                </span>
              </div>
              <div v-if="!queried" class="vs-empty skm-sel-empty">
                <div class="vs-empty-art"><VsEmptyArt /></div>
                <div class="vs-empty-t">暂无商品</div>
              </div>
              <div v-else class="skm-grid">
                <div v-for="c in cardsOf(fRef)" :key="c.id" class="skm-card" :class="{ on: picked(c.id) }" @click="pick(c)">
                  <div class="skm-card-thumb">
                    <img :src="c.thumb" alt="" />
                    <i class="skm-sim">{{ c.sim }} 相似度</i>
                  </div>
                  <div class="skm-card-body">
                    <div class="skm-card-title">{{ c.title }}</div>
                    <div class="skm-card-codes"><b>{{ c.code }}</b><i v-if="c.series !== '—'">系列：{{ c.series }}</i></div>
                    <div class="skm-kv"><span>品牌：</span>{{ c.brand }}</div>
                    <div v-if="c.tags.length" class="skm-card-tags"><i v-for="t in c.tags.slice(0, 3)" :key="t">{{ t }}</i><i v-if="c.tags.length > 3">+{{ c.tags.length - 3 }}</i></div>
                    <div class="skm-card-cost"><span>成本价：</span><b>{{ c.cost }}</b></div>
                  </div>
                </div>
                <div v-if="!cardsOf(fRef).length" class="skm-grid-empty">暂无商品</div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

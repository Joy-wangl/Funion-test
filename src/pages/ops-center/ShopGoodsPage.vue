<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import MoreActions from '../../components/MoreActions.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from './data';
import { sgProducts, SG_CHIPS, JM_CHIPS, SG_STATUS_META, sgRowActions, SG_OFF_FAIL_TYPES, SG_OFF_GROUP, SG_OFF_GROUPS, sgWarnType } from './shopGoodsData';
import type { SgProduct, SgTab } from './shopGoodsData';
import SgDetailPage from './SgDetailPage.vue';
import JmCreateDetailPage from './JmCreateDetailPage.vue';
import SgBatchPriceModal from './SgBatchPriceModal.vue';
import CwRelDrawer from './CwRelDrawer.vue';

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};

/** 列表行操作：与运营管理操作列共用 sgRowActions，保持同步 */
const rowActions = (p: SgProduct) => sgRowActions(p.status);

/* 删除：危险操作，强提醒二次确认后才允许删除，避免误删 */
const delTarget = ref<SgProduct | null>(null);
const removedIds = ref<Set<string>>(new Set());
const confirmDel = () => {
  const p = delTarget.value;
  if (!p) return;
  const n = new Set(removedIds.value);
  n.add(p.id);
  removedIds.value = n;
  const c = new Set(checked.value);
  c.delete(p.id);
  checked.value = c;
  pushToast(`已删除：商品「${p.title}」已从店铺商品列表移除`);
  delTarget.value = null;
};
/** 操作列：≤3 平铺、超出收「更多」；删除为危险动作固定第 3 位平铺，关联商品溢出时收「更多」 */
type SgOp = { label: string; danger?: boolean; run: () => void };
const sgOps = (p: SgProduct): SgOp[] => {
  const ops: SgOp[] = rowActions(p).map((a) => ({ label: a, run: () => { if (a === '商品详情') detail.value = p; } }));
  ops.push({ label: '删除', danger: true, run: () => { delTarget.value = p; } });
  if (sgWarnType(p)) ops.push({ label: '关联商品', run: () => { relTarget.value = p; } });
  return ops;
};
const flatOps = (p: SgProduct) => sgOps(p).slice(0, 3);
const moreOps = (p: SgProduct) => sgOps(p).slice(3).map((o) => ({ label: o.label, onClick: o.run }));

const tab = ref<SgTab>('视频号');
const chip = ref('all');
/* 已下架 tab 下的下架类型筛选 */
const offType = ref('全部');
const onChip = (k: string) => { chip.value = k; offType.value = '全部'; };
const collapsed = ref(false);
const detail = ref<SgProduct | null>(null);
/* 风险预警：关联商品抽屉 */
const relTarget = ref<SgProduct | null>(null);
/* 京麦商品详情：走京麦接口字段页（SgProduct → CreateRow 适配，字段映射 getProduct/material） */
const jmDetailRow = computed(() => detail.value && detail.value.storePlatform === '京麦'
  ? { thumb: detail.value.img, title: detail.value.title, link: detail.value.linkId, store: detail.value.store, person: detail.value.operator, time: detail.value.createTime ?? detail.value.publishTime, platformBadge: '京麦' }
  : null);
/* 批量调价：勾选 + 弹窗 + toast */
const checked = ref<Set<string>>(new Set());
const bpOpen = ref(false);
/* 京麦详情打开时是否直达编辑态（行操作「修改」） */
const detailEdit = ref(false);

/* 筛选 */
const emptyFilter = { store: '', title: '', goodsId: '', seriesCode: '', tpl: '', linkId: '', source: '全部来源', publisher: '', strategy: '全部策略', publishMode: '全部', hitWarn: '全部' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const patchFilter = (patch: Partial<typeof emptyFilter>) => { filter.value = { ...filter.value, ...patch }; };

/* ---------- 京麦（京东 POP）商品列表：对齐京麦 11.0 商品列表（状态页签/查询/批量改价改库存/状态流转） ---------- */
const jmList = ref<SgProduct[]>(sgProducts['京麦']);
const jmEmpty = { title: '', goodsId: '', skuId: '', itemNo: '', brand: '', cat: '' };
const jmFilter = ref({ ...jmEmpty });
const jmApplied = ref({ ...jmEmpty });
const patchJmFilter = (patch: Partial<typeof jmEmpty>) => { jmFilter.value = { ...jmFilter.value, ...patch }; };
/* 批量快捷修改：京东价/可用库存（仅在售+待售可勾选） */
const jmChecked = ref<Set<string>>(new Set());
const jmCheckable = (p: SgProduct) => p.status === 'jmOnsale' || p.status === 'jmPending';
const jmSel = computed(() => jmList.value.filter((p) => jmChecked.value.has(p.id) && jmCheckable(p)).length);
const jmSelRows = computed(() => rows.value.filter((p) => jmCheckable(p)));
const jmAllChecked = computed(() => jmSelRows.value.length > 0 && jmSelRows.value.every((p) => jmChecked.value.has(p.id)));
const toggleJmCheck = (id: string) => { const n = new Set(jmChecked.value); if (n.has(id)) n.delete(id); else n.add(id); jmChecked.value = n; };
const toggleAllJm = () => {
  const n = new Set(jmChecked.value);
  jmSelRows.value.forEach((p) => { if (jmAllChecked.value) n.delete(p.id); else n.add(p.id); });
  jmChecked.value = n;
};
const jmPriceOpen = ref(false);
const jmStockOpen = ref(false);
const jmPriceVal = ref('');
const jmStockVal = ref('');
const applyJmPrice = () => {
  const v = Number(jmPriceVal.value.trim());
  if (!jmPriceVal.value.trim() || !Number.isFinite(v) || v <= 0) { pushToast('请输入有效的京东价', 'warning'); return; }
  jmList.value.forEach((p) => { if (jmChecked.value.has(p.id)) p.jdPrice = v.toFixed(2); });
  pushToast(`批量改价成功：已对 ${jmChecked.value.size} 件商品生效`);
  jmChecked.value = new Set(); jmPriceVal.value = ''; jmPriceOpen.value = false;
};
const applyJmStock = () => {
  const v = Number(jmStockVal.value.trim());
  if (!jmStockVal.value.trim() || !Number.isInteger(v) || v < 0) { pushToast('请输入有效的可用库存（整数）', 'warning'); return; }
  jmList.value.forEach((p) => { if (jmChecked.value.has(p.id)) p.stockAvail = String(v); });
  pushToast(`批量改库存成功：已对 ${jmChecked.value.size} 件商品生效`);
  jmChecked.value = new Set(); jmStockVal.value = ''; jmStockOpen.value = false;
};
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
/* 状态流转：在售⇄待售、删除→回收站、回收站→还原/彻底删除、复制→新待售商品、审核中→催审 */
const jmDelTarget = ref<SgProduct | null>(null);
const jmAct = (p: SgProduct, a: string) => {
  if (a === '修改') { detailEdit.value = true; detail.value = p; return; }
  if (a === '催审') { pushToast('已催审：审核结果将通过京麦消息通知'); return; }
  if (a === '上架') { p.status = 'jmOnsale'; p.jmSub = undefined; p.shelfTime = nowStr(); pushToast('已上架：商品状态变更为在售'); return; }
  if (a === '下架') { p.status = 'jmPending'; p.jmSub = '自主下架'; p.offTime = nowStr(); pushToast('已下架：商品转入待售商品管理'); return; }
  if (a === '删除') { p.status = 'jmRecycle'; p.jmSub = undefined; p.offTime = nowStr(); pushToast('已删除：移入商品回收站（保留 45 天）'); return; }
  if (a === '还原') { p.status = 'jmPending'; p.jmSub = '自主下架'; pushToast('已还原：商品回到待售'); return; }
  if (a === '彻底删除') { jmDelTarget.value = p; return; }
  if (a === '复制') {
    const nid = String(Number(p.id) + 100);
    jmList.value = [...jmList.value, { ...p, id: nid, linkId: nid, skuId: `${nid}1`, itemNo: `${p.itemNo ?? 'JM'}-C`, status: 'jmPending', jmSub: '未上架', jmReject: undefined }];
    pushToast('复制成功：已生成新的待售商品');
  }
};
const confirmJmDelete = () => {
  const t = jmDelTarget.value;
  if (!t) return;
  jmList.value = jmList.value.filter((x) => x.id !== t.id);
  jmDelTarget.value = null;
  pushToast('已彻底删除：商品无法恢复');
};
const openJmDetail = (p: SgProduct) => { detailEdit.value = false; detail.value = p; };

/* 消息通知跳转定位：收到令牌后回全部态并按商品ID自动查询 */
const props = defineProps<{ locate?: { id: string; ts: number } | null }>();
watch(() => props.locate, (v) => {
  if (!v) return;
  chip.value = 'all';
  filter.value = { ...emptyFilter, goodsId: v.id };
  applied.value = { ...filter.value };
});
/* 预警相关查询条件（发布方式/下架时间）展示状态：全部/销售中/已下架 */
const warnConds = computed(() => ['all', 'selling', 'off'].includes(chip.value));

const isFailOff = (p: SgProduct) => !!p.offType && SG_OFF_FAIL_TYPES.includes(p.offType);

const rows = computed(() => {
  /* 京麦：独立查询口径（状态页签 + 商品名/商品ID/SKU ID/货号/品牌/类目） */
  if (tab.value === '京麦') {
    const jmChip = JM_CHIPS.find((c) => c.key === chip.value) ?? JM_CHIPS[0];
    return jmList.value.filter((p) => {
      if (!jmChip.match(p.status)) return false;
      const a = jmApplied.value;
      if (a.title && !p.title.includes(a.title)) return false;
      if (a.goodsId && !p.id.includes(a.goodsId)) return false;
      if (a.skuId && !(p.skuId ?? '').includes(a.skuId)) return false;
      if (a.itemNo && !(p.itemNo ?? '').includes(a.itemNo)) return false;
      if (a.brand && !(p.brand ?? '').includes(a.brand)) return false;
      if (a.cat && !(p.catPath ?? '').includes(a.cat)) return false;
      return true;
    });
  }
  const chipDef = SG_CHIPS.find((c) => c.key === chip.value) ?? SG_CHIPS[0];
  const list = sgProducts[tab.value].filter((p) => {
    if (removedIds.value.has(p.id)) return false;
    if (!chipDef.match(p.status)) return false;
    if (chip.value === 'off' && offType.value !== '全部' && (!p.offType || SG_OFF_GROUP[p.offType] !== offType.value)) return false;
    if (applied.value.store && !p.store.includes(applied.value.store)) return false;
    if (applied.value.title && !p.title.includes(applied.value.title)) return false;
    if (applied.value.goodsId && !p.id.includes(applied.value.goodsId)) return false;
    if (applied.value.seriesCode && !p.seriesCode.includes(applied.value.seriesCode)) return false;
    if (applied.value.publishMode !== '全部' && p.publishMode !== applied.value.publishMode) return false;
    if (applied.value.hitWarn === '命中预警' && !sgWarnType(p)) return false;
    if (applied.value.hitWarn === '未命中预警' && sgWarnType(p)) return false;
    if (applied.value.linkId && !p.linkId.includes(applied.value.linkId)) return false;
    if (applied.value.publisher && !p.publisher.includes(applied.value.publisher)) return false;
    if (applied.value.source !== '全部来源' && p.source !== applied.value.source) return false;
    if (applied.value.strategy !== '全部策略' && p.strategy !== applied.value.strategy) return false;
    return true;
  });
  const k = sortKey.value;
  if (!k) return list;
  const val = (p: SgProduct): number | string => {
    if (k === 'sold') return numOf(p.sold30);
    const t = p.shelfTime ?? p.publishTime;
    return t === '-' ? '' : t;
  };
  return [...list].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sortDir.value === 'desc' ? -d : d;
  });
});

/* 排序：单列激活，点击循环 降序→升序→取消 */
type SgSortKey = 'sold' | 'pub';
const sortKey = ref<SgSortKey | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: SgSortKey) => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else { sortKey.value = null; sortDir.value = 'desc'; }
};
const sortIco = (k: SgSortKey): 'none' | 'asc' | 'desc' => (sortKey.value === k ? sortDir.value : 'none');
const numOf = (s: string) => Number(s.replace(/,/g, '')) || 0;
/* 销量数据块：无数据展示 0（对齐微信小店经营概览） */
const zero = (v: string) => (v === '-' ? '0' : v);

/* 下架原因悬浮气泡：fixed 定位挂在页面层，不被表格容器裁剪、悬浮不抖动 */
const offPop = reactive({ show: false, x: 0, y: 0, text: '' });
const showOffPop = (e: MouseEvent, text: string) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const h = 76;
  offPop.text = text;
  offPop.x = r.left;
  offPop.y = r.bottom + 6 + h > window.innerHeight ? r.top - 6 - h : r.bottom + 6;
  offPop.show = true;
};
const hideOffPop = () => { offPop.show = false; };

const countOf = (key: string) => {
  const jm = tab.value === '京麦';
  const def = (jm ? JM_CHIPS : SG_CHIPS).find((c) => c.key === key)!;
  return (jm ? jmList.value : sgProducts[tab.value]).filter((p) => def.match(p.status) && (jm || !removedIds.value.has(p.id))).length;
};
/* 状态页签：京麦用商品列表子菜单口径，其余平台用通用口径 */
const chipsDef = computed(() => (tab.value === '京麦' ? JM_CHIPS : SG_CHIPS));

/* 批量调价除淘宝外各 TAB 提供，且仅「销售中」状态商品可勾选调价；京麦走自己的批量改价/改库存 */
const canPrice = computed(() => tab.value !== '淘宝' && tab.value !== '京麦');
const sellingSel = computed(() => sgProducts[tab.value].filter((p) => checked.value.has(p.id) && p.status === 'selling' && !removedIds.value.has(p.id)).length);
const sellRows = computed(() => rows.value.filter((p) => p.status === 'selling'));
const allChecked = computed(() => sellRows.value.length > 0 && sellRows.value.every((p) => checked.value.has(p.id)));
const toggleCheck = (id: string) => {
  const n = new Set(checked.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  checked.value = n;
};
const toggleAll = () => {
  const n = new Set(checked.value);
  sellRows.value.forEach((p) => { if (allChecked.value) n.delete(p.id); else n.add(p.id); });
  checked.value = n;
};

const onTab = (t: SgTab) => {
  tab.value = t; chip.value = 'all'; offType.value = '全部'; checked.value = new Set();
  jmChecked.value = new Set(); jmFilter.value = { ...jmEmpty }; jmApplied.value = { ...jmEmpty };
};
</script>

<template>
  <JmCreateDetailPage v-if="detail && jmDetailRow" :row="jmDetailRow" :start-edit="detailEdit" @back="detail = null; detailEdit = false" @open-pub="pushToast('已关联发布任务')" />
  <SgDetailPage v-else-if="detail" :product="detail" @back="detail = null" />
  <div v-else class="sg-page">
    <div class="sg-tabs">
      <button v-for="t in (['视频号', '淘宝', '京喜', '得物', '京麦'] as SgTab[])" :key="t" class="sg-tab" :class="tab === t ? 'active' : ''" @click="onTab(t)">
        {{ t }}
      </button>
    </div>

    <div class="sg-statusbar">
      <button v-for="c in chipsDef" :key="c.key" class="sg-chip" :class="chip === c.key ? 'active' : ''" @click="onChip(c.key)">
        {{ c.label }}({{ countOf(c.key) }})
      </button>
    </div>

    <!-- 京麦查询：对齐京麦 11.0 商品列表查询设置（商品名/商品ID/SKU ID/货号/品牌/类目）+ 批量快捷改价改库存 -->
    <div v-if="tab === '京麦'" class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>商品名</label>
          <input class="sg-input" placeholder="请输入商品名" :value="jmFilter.title" @input="patchJmFilter({ title: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>商品ID</label>
          <input class="sg-input" placeholder="请输入商品ID" :value="jmFilter.goodsId" @input="patchJmFilter({ goodsId: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>SKU ID</label>
          <input class="sg-input" placeholder="请输入SKU ID" :value="jmFilter.skuId" @input="patchJmFilter({ skuId: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>货号</label>
          <input class="sg-input" placeholder="请输入货号" :value="jmFilter.itemNo" @input="patchJmFilter({ itemNo: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>品牌</label>
          <input class="sg-input" placeholder="请输入品牌" :value="jmFilter.brand" @input="patchJmFilter({ brand: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>类目</label>
          <input class="sg-input" placeholder="请输入类目关键词" :value="jmFilter.cat" @input="patchJmFilter({ cat: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-actions">
          <div v-if="jmSel > 0" class="sg-mini">已选 <b>{{ jmSel }}</b> 件商品</div>
          <button class="sg-btn primary" :disabled="jmSel === 0" :title="jmSel === 0 ? '请先勾选在售/待售商品' : '对勾选商品批量修改京东价'" @click="jmPriceOpen = true">批量改价</button>
          <button class="sg-btn primary" :disabled="jmSel === 0" :title="jmSel === 0 ? '请先勾选在售/待售商品' : '对勾选商品批量修改可用库存'" @click="jmStockOpen = true">批量改库存</button>
          <button class="sg-btn" @click="jmFilter = { ...jmEmpty }; jmApplied = { ...jmEmpty }">重置</button>
          <button class="sg-btn primary" @click="jmApplied = { ...jmFilter }">查询</button>
        </div>
      </div>
    </div>

    <div v-else class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>店铺名</label>
          <input class="sg-input" placeholder="请输入店铺名" :value="filter.store" @input="patchFilter({ store: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>商品名</label>
          <input class="sg-input" placeholder="请输入商品名" :value="filter.title" @input="patchFilter({ title: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>商品ID</label>
          <input class="sg-input" placeholder="请输入商品ID" :value="filter.goodsId" @input="patchFilter({ goodsId: ($event.target as HTMLInputElement).value })" />
        </div>
        <template v-if="!collapsed">
          <div class="sg-field">
            <label>系列编码</label>
            <input class="sg-input" placeholder="请输入系列编码" :value="filter.seriesCode" @input="patchFilter({ seriesCode: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>模板号</label>
            <input class="sg-input" placeholder="请输入模板号" :value="filter.tpl" @input="patchFilter({ tpl: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>链接商品ID</label>
            <input class="sg-input" placeholder="请输入链接商品ID" :value="filter.linkId" @input="patchFilter({ linkId: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>发布商品来源</label>
            <BubbleSelect class-name="sg-select" :value="filter.source" :options="['全部来源', '链接商品库', '内部商机', '市场商机']" @change="(v: string) => patchFilter({ source: v })" />
          </div>
          <div class="sg-field">
            <label>发布人</label>
            <input class="sg-input" placeholder="请输入发布人" :value="filter.publisher" @input="patchFilter({ publisher: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>关联策略</label>
            <BubbleSelect class-name="sg-select" :value="filter.strategy" :options="['全部策略', '未关联', '默认发布策略', '高利润策略']" @change="(v: string) => patchFilter({ strategy: v })" />
          </div>
          <div class="sg-field">
            <label>发布方式</label>
            <BubbleSelect class-name="sg-select" :value="filter.publishMode" :options="['全部', '蜂联', '店铺发布']" @change="(v: string) => patchFilter({ publishMode: v })" />
          </div>
          <div class="sg-field">
            <label>上架开始时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
          <div v-if="chip === 'off'" class="sg-field">
            <label>下架类型</label>
            <BubbleSelect class-name="sg-select" :value="offType" :options="['全部', ...SG_OFF_GROUPS]" @change="(v: string) => offType = v" />
          </div>
          <div v-if="warnConds" class="sg-field">
            <label>下架时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
          <!-- 销量 XX 日 大于/等于/小于 XXX：销量查询（与运营管理同款形式） -->
          <div class="sg-field">
            <label>销量</label>
            <div class="sg-compact">
              <input class="sg-input" placeholder="销量" />
              <span>日</span>
              <BubbleSelect class-name="sg-select" default-value="请选择" :options="['大于', '等于', '小于']" />
              <input class="sg-input" placeholder="请输入值" />
            </div>
          </div>
          <div class="sg-field">
            <label>是否命中预警</label>
            <BubbleSelect class-name="sg-select" :value="filter.hitWarn" :options="['全部', '命中预警', '未命中预警']" @change="(v: string) => patchFilter({ hitWarn: v })" />
          </div>
        </template>
        <div class="sg-actions">
          <div v-if="canPrice && sellingSel > 0" class="sg-mini">已选 <b>{{ sellingSel }}</b> 件出售中商品</div>
          <button
            v-if="canPrice"
            class="sg-btn primary"
            :disabled="sellingSel === 0"
            :title="sellingSel === 0 ? '请先勾选出售中的商品' : '对勾选的出售中商品批量调价'"
            @click="bpOpen = true"
          >
            批量调价
          </button>
          <button class="sg-btn" @click="collapsed = !collapsed">
            {{ collapsed ? '展开 ∨' : '收起 ∧' }}
          </button>
          <button class="sg-btn" @click="filter = { ...emptyFilter }; applied = { ...emptyFilter }">
            重置
          </button>
          <button class="sg-btn primary" @click="applied = { ...filter }">
            查询
          </button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table v-if="tab !== '京麦'" class="sg-table">
          <thead>
            <tr>
              <th v-if="canPrice" :style="{ width: '44px' }"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
              <th :style="{ width: '380px' }">商品信息</th>
              <SortTh label="近20日销量概览" width="140px" :state="sortIco('sold')" @sort="toggleSort('sold')" />
              <th :style="{ width: '150px' }">商品状态</th>
              <th :style="{ width: '120px' }">商品策略</th>
              <th :style="{ width: '150px' }">预警</th>
              <SortTh label="发布信息" width="240px" :state="sortIco('pub')" @sort="toggleSort('pub')" />
              <th :style="{ width: '110px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.id">
              <td v-if="canPrice">
                <input v-if="p.status === 'selling'" type="checkbox" :checked="checked.has(p.id)" @change="toggleCheck(p.id)" />
              </td>
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="p.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle"><Ellipsis :text="p.title" /></div>
                    <div class="sg-gid">
                      链接商品ID：<span>{{ p.linkId }}</span>
                      <button class="sg-copy" title="复制" @click="copy(p.linkId)">⧉</button>
                    </div>
                    <div class="sg-gid">
                      商品ID：<span>{{ p.id }}</span>
                      <button class="sg-copy" title="复制" @click="copy(p.id)">⧉</button>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div class="sg-biz sg-biz-1col">
                  <div><span>销量</span><b>{{ zero(p.sold30) }}</b></div>
                  <div><span>总销量</span><b>{{ zero(p.sales) }}</b></div>
                </div>
              </td>
              <td>
                <div class="sg-status">
                  <span class="sg-dot" :style="{ background: SG_STATUS_META[p.status].dot }" />
                  <span :style="{ color: SG_STATUS_META[p.status].color }">{{ SG_STATUS_META[p.status].label }}</span>
                </div>
                <div v-if="p.status === 'auditFail'" class="sg-failtag" :title="p.rejectReason">
                  审核未通过 <i class="sg-fail-i" :title="p.rejectReason">i</i>
                </div>
                <div v-else-if="p.offType" class="sg-offtag" :class="isFailOff(p) ? 'fail' : 'normal'">
                  {{ SG_OFF_GROUP[p.offType] }}
                </div>
              </td>
              <td>{{ p.strategy }}</td>
              <td>
                <div v-if="p.offType && sgWarnType(p)" class="sg-offtag" :class="isFailOff(p) ? 'fail' : 'normal'" @mouseenter="showOffPop($event, p.offReason ?? '')" @mouseleave="hideOffPop">
                  {{ sgWarnType(p) }} <i class="sg-fail-i">i</i>
                </div>
                <span v-else class="sg-dash">-</span>
              </td>
              <td>
                <div class="sg-kv"><span class="sg-kv-l">发布人：</span><b>{{ p.publisher }}</b></div>
                <div class="sg-kv sg-kv-store">
                  <span class="sg-kv-l">发布店铺：</span>
                  <span class="store-logo"><img :src="PLATFORM_LOGO[p.storePlatform]" alt="" /></span>
                  <b>{{ p.store }}</b>
                </div>
                <div class="sg-kv"><span class="sg-kv-l">发布方式：</span><b>{{ p.publishMode ?? '-' }}</b></div>
                <div class="sg-kv">
                  <span class="sg-kv-l">{{ p.offTime ? '下架时间：' : p.shelfTime ? '上架时间：' : '发布时间：' }}</span>
                  <b>{{ p.offTime ?? p.shelfTime ?? p.publishTime }}</b>
                </div>
              </td>
              <td>
                <div class="sg-acts">
                  <a
                    v-for="o in flatOps(p)"
                    :key="o.label"
                    class="sg-link"
                    :class="{ danger: o.danger }"
                    href="javascript:void(0)"
                    @click.prevent="o.run()"
                  >
                    {{ o.label }}
                  </a>
                  <MoreActions v-if="moreOps(p).length" :items="moreOps(p)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 京麦列表：商品信息（含商品ID/SKU ID/货号）+ 京东价 + 可用库存 + 商品状态（含待售子状态/驳回原因）+ 平铺操作 -->
        <table v-else class="sg-table jm-table">
          <thead>
            <tr>
              <th :style="{ width: '44px' }"><input type="checkbox" :checked="jmAllChecked" @change="toggleAllJm" /></th>
              <th :style="{ width: '420px' }">商品信息</th>
              <th :style="{ width: '110px' }">京东价</th>
              <th :style="{ width: '110px' }">可用库存</th>
              <th :style="{ width: '180px' }">商品状态</th>
              <th :style="{ width: '220px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.id">
              <td>
                <input v-if="jmCheckable(p)" type="checkbox" :checked="jmChecked.has(p.id)" @change="toggleJmCheck(p.id)" />
              </td>
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="p.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle"><Ellipsis :text="p.title" /></div>
                    <div class="sg-gid">
                      商品ID：<span>{{ p.id }}</span>
                      <button class="sg-copy" title="复制" @click="copy(p.id)">⧉</button>
                    </div>
                    <div class="sg-gid">
                      SKU ID：<span>{{ p.skuId }}</span>
                      <button class="sg-copy" title="复制" @click="copy(p.skuId ?? '')">⧉</button>
                    </div>
                    <div class="sg-gid">
                      货号：<span>{{ p.itemNo }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td><b class="jm-price">¥{{ p.jdPrice }}</b></td>
              <td>{{ p.stockAvail }}</td>
              <td>
                <div class="sg-status">
                  <span class="sg-dot" :style="{ background: SG_STATUS_META[p.status].dot }" />
                  <span :style="{ color: SG_STATUS_META[p.status].color }">{{ SG_STATUS_META[p.status].label }}</span>
                </div>
                <div v-if="p.jmReject" class="sg-failtag" :title="p.jmReject">
                  审核驳回 <i class="sg-fail-i" :title="p.jmReject">i</i>
                </div>
                <div v-else-if="p.jmSub" class="sg-offtag normal">{{ p.jmSub }}</div>
              </td>
              <td>
                <div class="jm-acts">
                  <a
                    v-for="a in rowActions(p)"
                    :key="a"
                    class="sg-link"
                    href="javascript:void(0)"
                    @click.prevent="jmAct(p, a)"
                  >{{ a }}</a>
                  <MoreActions :items="[{ label: '商品详情', onClick: () => openJmDetail(p) }]" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="rows.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
    </div>

    <div class="pm-page pm-host">
      <SgBatchPriceModal
        v-if="bpOpen && sellingSel > 0"
        :count="sellingSel"
        @close="bpOpen = false"
        @ok="pushToast"
      />
      <!-- 京麦批量改价：快捷修改京东价（勾选在售/待售商品后批量生效） -->
      <Modal v-if="jmPriceOpen" title="批量改价" :sub="`将对 ${jmSel} 件商品生效`" @close="jmPriceOpen = false">
        <div class="bp-rows">
          <div class="bp-row">
            <span class="bp-label">京东价</span>
            <input v-model="jmPriceVal" class="sg-input bp-input" placeholder="如 39.90" />
            <span class="bp-unit">元</span>
            <span class="bp-hint">批量修改勾选商品的京东价</span>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="jmPriceOpen = false">取消</button>
          <button class="btn primary" @click="applyJmPrice">确定</button>
        </template>
      </Modal>
      <!-- 京麦批量改库存：快捷修改可用库存（勾选在售/待售商品后批量生效） -->
      <Modal v-if="jmStockOpen" title="批量改库存" :sub="`将对 ${jmSel} 件商品生效`" @close="jmStockOpen = false">
        <div class="bp-rows">
          <div class="bp-row">
            <span class="bp-label">可用库存</span>
            <input v-model="jmStockVal" class="sg-input bp-input" placeholder="如 100" />
            <span class="bp-unit">件</span>
            <span class="bp-hint">批量修改勾选商品的可用库存</span>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="jmStockOpen = false">取消</button>
          <button class="btn primary" @click="applyJmStock">确定</button>
        </template>
      </Modal>
      <!-- 京麦彻底删除确认：回收站商品彻底删除后无法恢复 -->
      <Modal v-if="jmDelTarget" title="删除确认" sub="彻底删除后商品无法恢复" @close="jmDelTarget = null">
        <div class="bp-rows">
          <div class="bp-row">
            <span class="bp-label">商品</span>
            <span>{{ jmDelTarget.title }}（{{ jmDelTarget.id }}）</span>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="jmDelTarget = null">取消</button>
          <button class="btn primary" @click="confirmJmDelete">确认删除</button>
        </template>
      </Modal>
      <!-- 店铺商品删除：强提醒二次确认，删除后不可恢复 -->
      <Modal v-if="delTarget" title="删除商品" sub="删除后不可恢复，请谨慎确认" @close="delTarget = null">
        <div class="bp-rows">
          <div class="bp-row">
            <span class="bp-label">商品</span>
            <span>{{ delTarget.title }}（{{ delTarget.id }}）</span>
          </div>
          <div class="bp-row">
            <span class="bp-label">当前状态</span>
            <span>{{ SG_STATUS_META[delTarget.status].label }}</span>
          </div>
          <div class="bp-row">
            <span class="bp-label">影响</span>
            <span>该商品将从店铺商品列表移除，销量统计与预警同步清除，且无法恢复</span>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="delTarget = null">取消</button>
          <button class="btn danger" @click="confirmDel">确认删除</button>
        </template>
      </Modal>
    </div>

    <div v-if="offPop.show" class="sg-fail-pop" :style="{ left: offPop.x + 'px', top: offPop.y + 'px' }">
      <p>{{ offPop.text }}</p>
    </div>

    <CwRelDrawer :product="relTarget" @close="relTarget = null" />
  </div>
</template>

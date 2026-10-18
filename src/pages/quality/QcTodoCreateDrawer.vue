<script setup lang="ts">
/* ---------- 发起待办抽屉（品控-线上 待办任务）----------
   字段：标题(30字内) / 优先级(普通·特急分段) / 文字内容(200字内) / 上传文件·图片·视频 /
   关联商品(商品列表多选) / 发送人(多选，通讯录选人) / 最迟处理时间(日历+时分，超出即逾期)。
   必填未齐「发起」置灰；提交后 toast 反馈并关闭（列表侧展示口径后续再定）。 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Modal from '../../components/Modal.vue';
import Checkbox from '../permission/Checkbox.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import { pushToast } from '../../components/toast';
import { avaColor, INITIAL_MEMBERS, type Member } from '../permission/data';
import { qcShopGoods, qcShops, seriesGoodsOf, onlineSeries, SHOP_LOGO, type ShopGood, type ShopPlat, type OnlineShop } from './qcOnlineData';
import type { QcCenterSeries } from './qcCenterData';
import { OPT_PLANS, TODO_PRIORITIES, todoFileMetaOf, todoSizeTxt, type TodoFile, type TodoOptEnd, type TodoPriority, type TodoShop } from './qcTodoData';
import BubbleSelect from '../../components/BubbleSelect.vue';
import QcAssignModal from './QcAssignModal.vue';

export type { TodoPriority, TodoFile };
export interface TodoCreatePayload {
  title: string;
  priority: TodoPriority;
  body: string;
  files: TodoFile[];
  goods: ShopGood[];
  senders: Member[];
  deadline: string;
  /** 待办类型（商品优化等）；缺省为普通类型 */
  type?: string;
  /** 优化方案（优化类型下级）；放宽售后走接待段自动请求，无需处理人 */
  optPlan?: string;
  /** 放宽售后结束方式配置（查看态展示） */
  optEnd?: TodoOptEnd;
  /** 优化任务周期（开始-结束）；提交后写回关联商品（周期内挂标签＋趋势色带）；openEnd＝放宽售后·达到指标后结束 */
  optCycle?: { start: string; end: string; openEnd?: boolean };
  /** 店铺优化关联店铺（卡面范围行展示店铺芯片，店铺优化不展示商品卡） */
  shops?: TodoShop[];
}

const emit = defineEmits<{ (e: 'close'): void; (e: 'created', p: TodoCreatePayload): void }>();
/* 重新提交回填：initial 带入上次发起的标题/优先级/内容/附件/发送人/最迟时间；
   presetType/presetGoods：店铺商品「优化任务」入口带入类型（商品优化）与关联商品；
   presetSeries/presetType：编码监控-监控列表「优化任务」入口带入系列（编码优化，范围默认全系列可切指定商品编码）；
   presetShop/presetType：店铺分监控-店铺列表「优化任务」入口带入店铺（店铺优化，覆盖店铺旗下全部商品）。
   表单本体与待办任务「发起待办」完全一致：入口仅预选优化类型/系列/商品/店铺，其余字段同构 */
const props = defineProps<{
  initial?: Partial<TodoCreatePayload>;
  presetType?: string;
  presetGoods?: ShopGood | null;
  presetSeries?: QcCenterSeries | null;
  presetShop?: OnlineShop | null;
}>();

const TITLE_MAX = 30;
const BODY_MAX = 200;
const title = ref(props.initial?.title ?? '');
const priority = ref<TodoPriority>(props.initial?.priority ?? '普通');
const body = ref(props.initial?.body ?? '');
const files = ref<TodoFile[]>(props.initial?.files ? props.initial.files.map((f) => ({ ...f })) : []);
const goods = ref<ShopGood[]>(props.presetGoods ? [props.presetGoods] : props.initial?.goods ? [...props.initial.goods] : []);
const senders = ref<Member[]>(props.initial?.senders ? [...props.initial.senders] : []);
const dlDate = ref(props.initial?.deadline ? props.initial.deadline.slice(0, 10) : '');
const dlTime = ref(props.initial?.deadline ? props.initial.deadline.slice(11) : '');
const deadline = computed(() => (dlDate.value && dlTime.value ? `${dlDate.value} ${dlTime.value}` : ''));
/* ---------- 优化类型：商品优化 / 编码优化 / 店铺优化（下拉，全入口同一套表单） ---------- */
const OPT_KINDS = ['商品优化', '编码优化', '店铺优化'];
/* 入口预设的类型串回落到下拉档位：编码优化（含历史串 系列编码优化/商品编码优化）＝编码优化；店铺优化＝店铺优化 */
const presetKindOf = (t?: string) =>
  t === '商品优化' ? '商品优化'
    : t === '店铺优化' ? '店铺优化'
      : t === '编码优化' || t === '系列编码优化' || t === '商品编码优化' ? '编码优化'
        : '';
const optKind = ref(presetKindOf(props.presetType));
const codeScope = ref(props.presetType === '商品编码优化' ? '指定商品编码' : '全系列');
const isCodeOpt = computed(() => optKind.value === '编码优化');
const isShopOpt = computed(() => optKind.value === '店铺优化');
/* ---------- 优化方案：优化类型下级（商品下架/放宽售后/商品整改…）；店铺优化仅放宽售后，默认带入 ---------- */
const optPlan = ref(presetKindOf(props.presetType) === '店铺优化' ? '放宽售后' : '');
const planOpts = computed(() => (optKind.value ? OPT_PLANS[optKind.value] ?? [] : []));
const isLoose = computed(() => optPlan.value === '放宽售后');
watch(optKind, (k) => {
  const opts = k ? OPT_PLANS[k] ?? [] : [];
  if (!opts.includes(optPlan.value)) optPlan.value = opts.length === 1 ? opts[0] : '';
});
/* ---------- 放宽售后结束方式：达到指标后结束（目标体验分＋分值）／周期整改（自定义天数或自定义日期） ---------- */
const END_METRICS = ['商品体验分', '店铺体验分'];
const END_MODES = ['达到指标后结束', '周期整改'];
const DAYS_MODES = ['自定义天数', '自定义日期'];
const endMode = ref<'达到指标后结束' | '周期整改'>('达到指标后结束');
const endMetric = ref<'商品体验分' | '店铺体验分'>('商品体验分');
const endScore = ref<number | null>(null);
const daysMode = ref<'自定义天数' | '自定义日期'>('自定义天数');
const endDays = ref(7);
const endFrom = ref('');
const endTo = ref('');
/* 分值 0~5 一位小数；天数 1~365 整数（清空回落 0 触发必填拦截） */
const setScore = (raw: string) => {
  const d = raw.replace(/[^\d.]/g, '');
  if (d === '' || d === '.') { endScore.value = null; return; }
  const n = Number(d);
  endScore.value = Number.isFinite(n) ? Math.round(Math.min(5, Math.max(0, n)) * 10) / 10 : null;
};
const setDays = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  endDays.value = d === '' ? 0 : Math.min(365, Number(d));
};
const looseOk = computed(() => {
  if (!isLoose.value) return true;
  if (endMode.value === '达到指标后结束') return endScore.value !== null && endScore.value > 0;
  return daysMode.value === '自定义天数' ? endDays.value > 0 : !!endFrom.value && !!endTo.value && endFrom.value <= endTo.value;
});
/* 非放宽方案须配置优化任务周期（起止齐备且不倒挂）＋选定优化目标；放宽售后以结束方式替代周期 */
const cycleNeeded = computed(() => !!optKind.value && !isLoose.value);
const cycFrom = ref('');
const cycTo = ref('');
const cycOk = computed(() => !!cycFrom.value && !!cycTo.value && cycFrom.value <= cycTo.value);

/* 编码优化：系列编码改输入模糊查询（系列量大，下拉不可用）——输入后展开候选，选中收拢并展示商品编码芯片；
   芯片首位「全部」＝该系列全部编码，点单个编码即取消「全部」 */
const seriesList = computed(() => onlineSeries());
const seriesSel = ref<QcCenterSeries | null>(props.presetSeries ?? null);
const seriesQ = ref(props.presetSeries?.name ?? '');
const seriesOpen = ref(false);
const seriesBox = ref<HTMLDivElement | null>(null);
const SERIES_HIT_MAX = 30;
const seriesAll = computed(() => {
  const q = seriesQ.value.trim();
  if (!q) return [] as QcCenterSeries[];
  return seriesList.value.filter((s) => s.name.includes(q) || s.seriesCode.includes(q));
});
const seriesHits = computed(() => seriesAll.value.slice(0, SERIES_HIT_MAX));
const seriesMore = computed(() => seriesAll.value.length - seriesHits.value.length);
const seriesCodes = computed(() => seriesSel.value?.codes ?? []);
const checkedCodes = ref<Set<string>>(new Set((props.presetSeries?.codes ?? []).map((c) => c.code)));
/* 「全部」芯片＝全系列范围；点单个编码即切到指定范围并取消「全部」 */
const pickAllCodes = () => {
  checkedCodes.value = new Set(seriesCodes.value.map((c) => c.code));
  codeScope.value = '全系列';
};
const pickCode = (code: string) => {
  const n = new Set(checkedCodes.value);
  if (n.has(code)) n.delete(code);
  else n.add(code);
  checkedCodes.value = n;
  codeScope.value = '指定商品编码';
};
const pickSeries = (s: QcCenterSeries) => {
  seriesSel.value = s;
  seriesQ.value = s.name;
  seriesOpen.value = false;
  checkedCodes.value = new Set(s.codes.map((c) => c.code));
  codeScope.value = '全系列';
};
const onSeriesFocus = (e: FocusEvent) => {
  seriesOpen.value = true;
  if (seriesSel.value) (e.target as HTMLInputElement).select();
};
const clearSeries = () => {
  seriesQ.value = '';
  seriesSel.value = null;
  seriesOpen.value = false;
  checkedCodes.value = new Set();
};
/* 已选后改输入＝放弃原选择（优化范围随之收起）；有输入才展开候选（选中回写同名文本不重开） */
watch(seriesQ, (v) => {
  if (seriesSel.value && v !== seriesSel.value.name) {
    seriesSel.value = null;
    checkedCodes.value = new Set();
  }
  if (v.trim() && v !== seriesSel.value?.name) seriesOpen.value = true;
});
const onSeriesDoc = (e: MouseEvent) => {
  if (seriesOpen.value && seriesBox.value && !seriesBox.value.contains(e.target as Node)) seriesOpen.value = false;
};
watch(seriesOpen, (v) => {
  if (v) document.addEventListener('mousedown', onSeriesDoc);
  else document.removeEventListener('mousedown', onSeriesDoc);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', onSeriesDoc));
/* 优化目标齐备：商品优化须选商品；编码优化须定系列，且指定范围下至少勾选一个编码；店铺优化须选店铺 */
const targetOk = computed(() => {
  if (optKind.value === '商品优化') return goods.value.length > 0;
  if (isCodeOpt.value) return !!seriesSel.value && (codeScope.value === '全系列' || checkedCodes.value.size > 0);
  if (isShopOpt.value) return selShops.value.length > 0;
  return true;
});

/* 放宽售后由接待段自动承接：无需处理人；其余口径不变 */
const canSubmit = computed(() => !!title.value.trim() && !!body.value.trim() && (isLoose.value || senders.value.length > 0) && !!deadline.value && (!cycleNeeded.value || cycOk.value) && (!optKind.value || !!optPlan.value) && looseOk.value && targetOk.value);

/* ---------- 上传：真实文件选择，按 mime 归类 图/视/文 ---------- */
const fileInput = ref<HTMLInputElement | null>(null);
const onFiles = (e: Event) => {
  const input = e.target as HTMLInputElement;
  [...(input.files ?? [])].forEach((f, i) => {
    const kind: TodoFile['kind'] = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file';
    files.value.push({ id: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, kind, url: URL.createObjectURL(f) });
  });
  input.value = '';
};
const dropFile = (id: string) => {
  const f = files.value.find((x) => x.id === id);
  if (f) URL.revokeObjectURL(f.url);
  files.value = files.value.filter((x) => x.id !== id);
};

/* ---------- 关联商品：弹窗内商品列表多选（搜索＋勾选） ---------- */
const goodsOpen = ref(false);
const goodsQ = ref('');
const goodsPick = ref<Set<string>>(new Set());
const openGoods = () => {
  goodsQ.value = '';
  goodsPick.value = new Set(goods.value.map((g) => g.id));
  goodsOpen.value = true;
};
const goodsRows = computed(() => {
  const q = goodsQ.value.trim();
  return qcShopGoods.value.filter((g) => !q || g.name.includes(q) || g.id.includes(q));
});
/* 行内商品信息复用店铺商品列表复合格：主图（/products 素材按商品ID取模轮转，同页口径）＋商品名＋商品ID＋平台官方图标店铺名 */
const GOOD_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const thumbOf = (id: string) => GOOD_THUMBS[Number(id) % GOOD_THUMBS.length];
const shopOf = (id: string) => qcShops.value.find((s) => s.id === id);
const shopName = (id: string) => shopOf(id)?.name ?? id;
const shopPlat = (id: string): ShopPlat => shopOf(id)?.platform ?? '淘宝';
const confirmGoods = () => {
  goods.value = qcShopGoods.value.filter((g) => goodsPick.value.has(g.id));
  goodsOpen.value = false;
};

/* ---------- 关联店铺：弹窗内店铺列表多选（搜索＋勾选），语言同关联商品 ---------- */
const shopsOpen = ref(false);
const shopsQ = ref('');
const shopsPick = ref<Set<string>>(new Set());
const selShops = ref<OnlineShop[]>(props.presetShop ? [props.presetShop] : (props.initial?.shops ?? []).map((s) => qcShops.value.find((x) => x.id === s.id)).filter((s): s is OnlineShop => !!s));
const openShops = () => {
  shopsQ.value = '';
  shopsPick.value = new Set(selShops.value.map((s) => s.id));
  shopsOpen.value = true;
};
const shopRows = computed(() => {
  const q = shopsQ.value.trim();
  return qcShops.value.filter((s) => !q || s.name.includes(q) || s.id.includes(q));
});
/* 店铺行图＝旗下首个商品主图（同商品选择器口径），无商品时回落首张素材 */
const shopThumb = (id: string) => thumbOf(qcShopGoods.value.find((g) => g.shopId === id)?.id ?? '0');
const confirmShops = () => {
  selShops.value = qcShops.value.filter((s) => shopsPick.value.has(s.id));
  shopsOpen.value = false;
};

/* ---------- 发送人：通讯录选人弹窗（MemberPickPanel 单一出口） ---------- */
const senderOpen = ref(false);
const senderIds = computed(() => new Set(senders.value.map((m) => m.id)));

/* ---------- 最迟处理时间：月历单日＋时/分双列滚选 ---------- */
const dlOpen = ref(false);
const dlBox = ref<HTMLDivElement | null>(null);
const pad = (n: number) => String(n).padStart(2, '0');
const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
const viewY = ref(Number(todayIso.slice(0, 4)));
const viewM = ref(Number(todayIso.slice(5, 7)) - 1);
const viewLabel = computed(() => `${viewY.value} 年 ${viewM.value + 1} 月`);
const navMonth = (d: number) => {
  let m = viewM.value + d;
  let y = viewY.value;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  viewM.value = m;
  viewY.value = y;
};
const WEEK_HEAD = ['日', '一', '二', '三', '四', '五', '六'];
const calCells = computed((): (string | null)[] => {
  const lead = new Date(viewY.value, viewM.value, 1).getDay();
  const days = new Date(viewY.value, viewM.value + 1, 0).getDate();
  const out: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) out.push(`${viewY.value}-${pad(viewM.value + 1)}-${pad(d)}`);
  return out;
});
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINS = Array.from({ length: 60 }, (_, i) => pad(i));
const onDoc = (e: MouseEvent) => {
  if (dlOpen.value && dlBox.value && !dlBox.value.contains(e.target as Node)) dlOpen.value = false;
};
watch(dlOpen, (v) => {
  if (v) {
    const base = dlDate.value || todayIso;
    viewY.value = Number(base.slice(0, 4));
    viewM.value = Number(base.slice(5, 7)) - 1;
  }
});
onBeforeUnmount(() => document.removeEventListener('mousedown', onDoc));
watch(dlOpen, (v) => {
  if (v) document.addEventListener('mousedown', onDoc);
  else document.removeEventListener('mousedown', onDoc);
});

/* 提交类型串（与待办页签/店铺商品闭环同口径）：商品优化＝商品优化；店铺优化＝店铺优化；编码优化按范围拆分——全系列＝系列编码优化，指定（非全系列）＝商品编码优化 */
const outType = computed(() => {
  if (!optKind.value) return '';
  if (optKind.value === '商品优化') return '商品优化';
  if (isShopOpt.value) return '店铺优化';
  return codeScope.value === '全系列' ? '系列编码优化' : '商品编码优化';
});
/* 编码优化：范围对应的商品编码（全系列＝该系列全部编码）经 seriesGoodsOf 解析为店铺商品，复用挂标签/色带闭环 */
const targetCodes = computed(() =>
  (codeScope.value === '全系列' ? seriesCodes.value.map((c) => c.code) : [...checkedCodes.value]));
/* 店铺优化：所选店铺旗下全部商品，复用商品维度挂标签/色带闭环（店铺级态由 shopOptOf 从旗下商品派生） */
const shopGoods = computed(() =>
  qcShopGoods.value.filter((g) => selShops.value.some((s) => s.id === g.shopId)));

/* 放宽售后结束方式落载荷：指标态开放式（start=今天、无结束日）；周期态天数折算起止区间 */
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const optEndOut = computed<TodoOptEnd | undefined>(() => {
  if (!isLoose.value) return undefined;
  if (endMode.value === '达到指标后结束') return { mode: endMode.value, metric: endMetric.value, score: endScore.value ?? undefined, start: todayIso, openEnd: true };
  if (daysMode.value === '自定义天数') return { mode: endMode.value, days: endDays.value, start: todayIso, end: addDays(todayIso, endDays.value - 1) };
  return { mode: endMode.value, start: endFrom.value, end: endTo.value };
});
/* 趋势色带区间：非放宽＝优化任务周期；放宽售后＝结束方式折算区间（指标态开放式） */
const outCycle = computed(() => {
  if (cycleNeeded.value && cycOk.value) return { start: cycFrom.value, end: cycTo.value };
  const e = optEndOut.value;
  if (e?.start && (e.openEnd || e.end)) return { start: e.start, end: e.end ?? '', openEnd: e.openEnd };
  return undefined;
});

/* ---------- 提交 ---------- */
const submit = () => {
  if (!canSubmit.value) return;
  const resolvedGoods = isCodeOpt.value ? seriesGoodsOf(targetCodes.value) : isShopOpt.value ? shopGoods.value : goods.value;
  emit('created', {
    title: title.value.trim(),
    priority: priority.value,
    body: body.value.trim(),
    files: files.value,
    goods: resolvedGoods,
    senders: senders.value,
    deadline: deadline.value,
    type: outType.value || undefined,
    optPlan: optPlan.value || undefined,
    optEnd: optEndOut.value,
    optCycle: outCycle.value,
    shops: isShopOpt.value ? selShops.value.map((s) => ({ id: s.id, name: s.name, platform: s.platform })) : undefined,
  });
  pushToast(isLoose.value ? '待办已发起，已向接待段发起放宽售后请求' : '待办已发起');
  emit('close');
};
</script>

<template>
  <div class="drawer-mask" @click="emit('close')" />
  <div class="drawer qc-todo-create">
    <div class="drawer-head">
      <div class="d-title">发起待办</div>
      <span class="x" @click="emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </span>
    </div>
    <div class="drawer-body">
      <div class="sg-field">
        <label>优化类型</label>
        <BubbleSelect
          class-name="sg-select"
          :value="optKind || '选择优化类型（可不选）'"
          :options="OPT_KINDS"
          clearable
          reset-value="选择优化类型（可不选）"
          @change="(v: string) => (optKind = OPT_KINDS.includes(v) ? v : '')"
        />
      </div>
      <div v-if="optKind" class="sg-field">
        <label>优化方案<span class="qc-tc-req">*</span></label>
        <!-- 与优化类型同一 BubbleSelect 下拉语言；选项随类型联动（商品/编码/店铺三套方案全保留） -->
        <BubbleSelect
          class-name="sg-select"
          :value="optPlan || '选择优化方案'"
          :options="planOpts"
          @change="(v: string) => (optPlan = v)"
        />
      </div>
      <div class="sg-field">
        <label>标题<span class="qc-tc-req">*</span><span class="qc-tc-count">{{ title.length }}/{{ TITLE_MAX }}</span></label>
        <input v-model="title" class="sg-input" :maxlength="TITLE_MAX" placeholder="请输入待办标题">
      </div>
      <div class="sg-field">
        <label>优先级</label>
        <div class="qc-tc-prio">
          <button v-for="p in TODO_PRIORITIES" :key="p" type="button" :class="[p, { on: priority === p }]" @click="priority = p">
            <i v-if="p === '特急'">🔥</i>{{ p }}
          </button>
        </div>
      </div>
      <div v-if="isCodeOpt" class="sg-field">
        <label>系列编码<span class="qc-tc-req">*</span></label>
        <div ref="seriesBox" class="qc-tc-sbox">
          <span class="sg-inputwrap">
            <input v-model="seriesQ" class="sg-input" placeholder="输入系列简称模糊查询" @focus="onSeriesFocus">
            <button v-if="seriesQ" type="button" class="sg-clear" title="清除" @click="clearSeries">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
          <!-- 模糊候选：输入后展开；选中收拢并展示优化范围 -->
          <div v-if="seriesOpen" class="qc-date-pop qc-tc-spop">
            <button v-for="s in seriesHits" :key="s.seriesCode" type="button" class="qc-tc-srow" :title="s.name" @click="pickSeries(s)">{{ s.name }}</button>
            <div v-if="!seriesHits.length" class="qc-tc-sempty">无匹配系列</div>
            <div v-else-if="seriesMore > 0" class="qc-tc-sempty">还有 {{ seriesMore }} 个匹配，继续输入收窄</div>
          </div>
        </div>
      </div>
      <div v-if="isCodeOpt && seriesSel" class="sg-field">
        <label>商品编码<span class="qc-tc-req">*</span></label>
        <div class="qc-tc-codechips">
          <!-- 选中态仅靠 .on 描边/着色表达（用户红框否决芯片内×关闭钮） -->
          <button type="button" class="qc-tc-codechip" :class="{ on: codeScope === '全系列' }" @click="pickAllCodes">
            全部
          </button>
          <button v-for="c in seriesCodes" :key="c.code" type="button" class="qc-tc-codechip" :class="{ on: checkedCodes.has(c.code) }" :title="c.name" @click="pickCode(c.code)">
            {{ c.code }}
          </button>
        </div>
      </div>
      <div v-if="isLoose" class="sg-field">
        <label>结束方式<span class="qc-tc-req">*</span></label>
        <!-- 单行复合：结束方式下拉＋子档下拉＋分值/天数盒或日期区间同排，避免多行竖堆的割裂感 -->
        <div class="qc-tc-endrow">
          <BubbleSelect
            class-name="sg-select"
            :value="endMode"
            :options="END_MODES"
            @change="(v: string) => (endMode = v as '达到指标后结束' | '周期整改')"
          />
          <template v-if="endMode === '达到指标后结束'">
            <BubbleSelect
              class-name="sg-select"
              :value="endMetric"
              :options="END_METRICS"
              @change="(v: string) => (endMetric = v as '商品体验分' | '店铺体验分')"
            />
            <div class="qc-tc-score">
              <input :value="endScore === null ? '' : String(endScore)" inputmode="decimal" placeholder="目标分值" @input="setScore(($event.target as HTMLInputElement).value)">
              <span class="qc-tc-sunit">分</span>
            </div>
          </template>
          <template v-else>
            <BubbleSelect
              class-name="sg-select"
              :value="daysMode"
              :options="DAYS_MODES"
              @change="(v: string) => (daysMode = v as '自定义天数' | '自定义日期')"
            />
            <div v-if="daysMode === '自定义天数'" class="qc-tc-score">
              <input :value="endDays ? String(endDays) : ''" inputmode="numeric" placeholder="整改天数" @input="setDays(($event.target as HTMLInputElement).value)">
              <span class="qc-tc-sunit">天</span>
            </div>
            <DateRangePicker v-else v-model:from="endFrom" v-model:to="endTo" placeholder="选择整改开始-结束日期" />
          </template>
        </div>
      </div>
      <div v-if="cycleNeeded" class="sg-field">
        <label>优化任务周期<span class="qc-tc-req">*</span></label>
        <DateRangePicker v-model:from="cycFrom" v-model:to="cycTo" placeholder="选择优化任务开始-结束日期" />
      </div>
      <div class="sg-field">
        <label>文字内容<span class="qc-tc-req">*</span><span class="qc-tc-count">{{ body.length }}/{{ BODY_MAX }}</span></label>
        <textarea v-model="body" class="sg-input qc-tc-textarea" :maxlength="BODY_MAX" placeholder="请输入待办内容" />
      </div>
      <div class="sg-field">
        <label>上传文件/图片/视频</label>
        <input ref="fileInput" type="file" multiple hidden @change="onFiles">
        <button type="button" class="qc-tc-up" @click="fileInput?.click()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V4m0 0 4 4m-4-4-4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          点击上传
        </button>
        <div v-if="files.length" class="qc-tc-files">
          <div v-for="f in files" :key="f.id" class="qc-tc-file">
            <img v-if="f.kind === 'image'" class="th" :src="f.url" :alt="f.name">
            <span v-else-if="f.kind === 'video'" class="th kind video">视</span>
            <svg v-else class="tf-ic" :style="{ color: todoFileMetaOf(f.name).color }" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
            <span class="nm" :title="f.name">{{ f.name }}</span>
            <span class="sz">{{ f.kind === 'file' ? `${todoFileMetaOf(f.name).lab} ${todoSizeTxt(f.size)}` : todoSizeTxt(f.size) }}</span>
            <button type="button" class="rm" title="移除" @click="dropFile(f.id)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>
      <div v-if="!isCodeOpt && !isShopOpt" class="sg-field">
        <label>关联商品<span v-if="optKind === '商品优化'" class="qc-tc-req">*</span></label>
        <div class="qc-tc-pickbox" @click="openGoods">
          <template v-if="goods.length">
            <span v-for="g in goods.slice(0, 3)" :key="g.id" class="qc-tc-chip">{{ g.name }}</span>
            <span v-if="goods.length > 3" class="qc-tc-chip more">+{{ goods.length - 3 }}</span>
          </template>
          <span v-else class="qc-tc-ph">选择商品</span>
          <span class="qc-tc-n">{{ goods.length ? `${goods.length} 件` : '' }}</span>
        </div>
      </div>
      <div v-if="isShopOpt" class="sg-field">
        <label>关联店铺<span class="qc-tc-req">*</span></label>
        <div class="qc-tc-pickbox" @click="openShops">
          <template v-if="selShops.length">
            <span v-for="s in selShops.slice(0, 3)" :key="s.id" class="qc-tc-chip">{{ s.name }}</span>
            <span v-if="selShops.length > 3" class="qc-tc-chip more">+{{ selShops.length - 3 }}</span>
          </template>
          <span v-else class="qc-tc-ph">选择店铺</span>
          <span class="qc-tc-n">{{ selShops.length ? `${selShops.length} 家` : '' }}</span>
        </div>
      </div>
      <div v-if="!isLoose" class="sg-field">
        <label>发送人<span class="qc-tc-req">*</span></label>
        <!-- 图一样式：虚线圆人形icon＋灰字「添加成员」，不要外框；已选成员头像排按钮左侧 -->
        <div class="qc-tc-sendrow">
          <span v-for="m in senders.slice(0, 8)" :key="m.id" class="qc-tc-ava" :style="{ background: avaColor(m.name) }" :title="m.name">{{ m.name.slice(0, 1) }}</span>
          <span v-if="senders.length > 8" class="qc-tc-chip more">+{{ senders.length - 8 }}</span>
          <button type="button" class="qc-tc-sendadd" @click="senderOpen = true">
            <span class="sa-circle">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.2" r="3.4" /><path d="M5.8 18.6a6.2 6.2 0 0 1 12.4 0" /></svg>
            </span>
            添加成员
          </button>
        </div>
      </div>
      <div class="sg-field">
        <label>最迟处理时间<span class="qc-tc-req">*</span></label>
        <div ref="dlBox" class="qc-tc-dlbox">
          <div class="qc-tc-pickbox" @click="dlOpen = !dlOpen">
            <span :class="deadline ? 'qc-tc-val' : 'qc-tc-ph'">{{ deadline || '选择日期与时间（超出即逾期）' }}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div v-if="dlOpen" class="qc-date-pop qc-tc-dlpop">
            <div class="qc-cal">
              <div class="qc-cal-head">
                <button type="button" class="qc-cal-nav" title="上一月" @click="navMonth(-1)">‹</button>
                <span class="qc-cal-title">{{ viewLabel }}</span>
                <button type="button" class="qc-cal-nav" title="下一月" @click="navMonth(1)">›</button>
              </div>
              <div class="qc-cal-week">
                <span v-for="w in WEEK_HEAD" :key="w">{{ w }}</span>
              </div>
              <div class="qc-cal-grid">
                <template v-for="(c, i) in calCells" :key="i">
                  <span v-if="!c" class="qc-cal-blank" />
                  <button v-else type="button" class="qc-cal-day" :class="{ off: c < todayIso, start: c === dlDate }" :disabled="c < todayIso" @click="dlDate = c">{{ Number(c.slice(8)) }}</button>
                </template>
              </div>
            </div>
            <div class="qc-tc-tm">
              <div class="col">
                <button v-for="h in HOURS" :key="h" type="button" :class="{ on: dlTime.slice(0, 2) === h }" @click="dlTime = `${h}:${dlTime.slice(3) || '00'}`">{{ h }}</button>
              </div>
              <div class="col">
                <button v-for="m in MINS" :key="m" type="button" :class="{ on: dlTime.slice(3) === m }" @click="dlTime = `${dlTime.slice(0, 2) || '00'}:${m}`">{{ m }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="drawer-foot">
      <button type="button" class="btn" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" :disabled="!canSubmit" @click="submit">发起</button>
    </div>

    <!-- 关联商品弹窗：商品列表多选（搜索＋勾选） -->
    <Modal v-if="goodsOpen" title="关联商品" sub="选择商品" size="lg" @close="goodsOpen = false">
      <div class="qc-tc-goods">
        <span class="sg-inputwrap qc-tc-gsearch">
          <input v-model="goodsQ" class="sg-input" placeholder="搜索商品名称 / 商品ID">
          <button v-if="goodsQ" type="button" class="sg-clear" title="清除" @click="goodsQ = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
        <div class="qc-tc-glist">
          <label v-for="g in goodsRows" :key="g.id" class="qc-tc-grow">
            <Checkbox :checked="goodsPick.has(g.id)" @change="() => { const n = new Set(goodsPick); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); goodsPick = n; }" />
            <img class="qc-sg-prod-thumb" :src="thumbOf(g.id)" :alt="g.name">
            <div class="qc-sg-prod-info">
              <div class="qc-sg-prod-name" :title="g.name">{{ g.name }}</div>
              <div class="qc-sg-prod-meta"><span class="qc-sg-prod-lb">商品ID：</span>{{ g.id }}</div>
              <div class="qc-sg-prod-meta">
                <span class="qc-sg-prod-logo"><img :src="SHOP_LOGO[shopPlat(g.shopId)]" :alt="shopPlat(g.shopId)"></span>{{ shopName(g.shopId) }} · 上架 {{ g.listedAt }}
              </div>
            </div>
          </label>
          <div v-if="!goodsRows.length" class="qc-tc-gempty">无匹配商品</div>
        </div>
      </div>
      <template #foot>
        <button class="btn" @click="goodsOpen = false">取消</button>
        <button class="btn primary" @click="confirmGoods">确定({{ goodsPick.size }})</button>
      </template>
    </Modal>

    <!-- 关联店铺弹窗：店铺列表多选（搜索＋勾选），行语言同关联商品 -->
    <Modal v-if="shopsOpen" title="关联店铺" sub="选择店铺" size="lg" @close="shopsOpen = false">
      <div class="qc-tc-goods">
        <span class="sg-inputwrap qc-tc-gsearch">
          <input v-model="shopsQ" class="sg-input" placeholder="搜索店铺名称 / 店铺ID">
          <button v-if="shopsQ" type="button" class="sg-clear" title="清除" @click="shopsQ = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
        <div class="qc-tc-glist">
          <label v-for="s in shopRows" :key="s.id" class="qc-tc-grow">
            <Checkbox :checked="shopsPick.has(s.id)" @change="() => { const n = new Set(shopsPick); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); shopsPick = n; }" />
            <img class="qc-sg-prod-thumb" :src="shopThumb(s.id)" :alt="s.name">
            <div class="qc-sg-prod-info">
              <div class="qc-sg-prod-name" :title="s.name">{{ s.name }}</div>
              <div class="qc-sg-prod-meta"><span class="qc-sg-prod-lb">店铺ID：</span>{{ s.id }}</div>
              <div class="qc-sg-prod-meta">
                <span class="qc-sg-prod-logo"><img :src="SHOP_LOGO[s.platform]" :alt="s.platform"></span>{{ s.platform }} · 体验分 {{ s.score }}
              </div>
            </div>
          </label>
          <div v-if="!shopRows.length" class="qc-tc-gempty">无匹配店铺</div>
        </div>
      </div>
      <template #foot>
        <button class="btn" @click="shopsOpen = false">取消</button>
        <button class="btn primary" @click="confirmShops">确定({{ shopsPick.size }})</button>
      </template>
    </Modal>

    <!-- 发送人弹窗：通讯录多选 -->
    <QcAssignModal
      v-if="senderOpen"
      title="选择发送人"
      :source="INITIAL_MEMBERS"
      :initial-ids="senderIds"
      @close="senderOpen = false"
      @confirm="(ms: Member[]) => (senders = ms)"
    />
  </div>
</template>

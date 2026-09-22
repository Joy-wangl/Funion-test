<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import {
  MV_KINDS, MV_METHODS, MV_METHOD_STATUS, MV_COND_METRIC_NAMES, MV_DATE_PRESETS, MV_RANK_RANGES, MV_WEEK_DAYS, MV_MONTH_DAYS, MV_SOURCES, mvInitStatus,
  mvMetricMeta, mvShops, mvShopOf,
  type MvCondMetric, type MvCondRow, type MvDatePreset, type MvKind, type MvMethod, type MvRankRange, type MvSource, type MvTask, type MvTaskStatus,
} from './moveData';
import { PLATFORM_LOGO, PUB_STRATEGIES } from './data';

/** 视频号自动化配置抽屉：自动搬家两步（配置含被搬店铺 → 目标店铺），自动下架单页；选店铺置于任务类型与执行方式之间；新建 / 编辑 */
const props = defineProps<{ model: MvTask | null; tasks: MvTask[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'save', t: MvTask): void }>();

const m = props.model;

/* 步骤1：任务命名 + 任务类型 + 执行方式（配置选择统一下拉形式） */
const METHOD_LABEL: Record<MvMethod, string> = { 循环: '循环任务', 条件触发: '条件触发（长期）任务', 一次性: '一次性任务' };
const METHOD_LABELS = MV_METHODS.map((md) => METHOD_LABEL[md]);
const name = ref(m?.name ?? '');
const kind = ref<MvKind>(m?.kind ?? '自动搬家');
const source = ref<MvSource>(m?.source ?? '内部商机');
const method = ref<MvMethod>(m?.method ?? '循环');
const setMethod = (v: string) => { method.value = MV_METHODS.find((md) => METHOD_LABEL[md] === v) ?? '循环'; };
/* 循环配置动态结构：每天=几点；每周=周几+几点；每月=几号+几点 */
const MV_CYCLES = ['每天', '每周', '每月'];
const cycle = ref<'每天' | '每周' | '每月'>(m?.cycle ?? '每天');
const cycleDay = ref(m?.cycleDay ?? '周一');
const cycleTime = ref(m?.cycleTime ?? '02:00');
const setCycle = (v: string) => {
  cycle.value = v as '每天' | '每周' | '每月';
  if (v === '每周' && !MV_WEEK_DAYS.includes(cycleDay.value)) cycleDay.value = '周一';
  if (v === '每月' && !MV_MONTH_DAYS.includes(cycleDay.value)) cycleDay.value = '1号';
};
/* 一次性任务执行时间：立即执行 / 定时执行（日期+时分） */
const execMode = ref<'immediate' | 'scheduled'>('immediate');
const execDate = ref('');
const execTimeOne = ref('');
const openExecDp = (e: Event) => {
  const rect = (e.currentTarget as HTMLElement).closest('.mv-cond-date')?.getBoundingClientRect();
  dpPos.value = { x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 4 };
  const base = execDate.value ? new Date(`${execDate.value}T00:00:00`) : new Date();
  dpView.value = { y: base.getFullYear(), m: base.getMonth() + 1 };
  dpAnchor.value = '';
  dpOpen.value = '__exec__';
};
const execDpRow = computed(() => ({ key: '__exec__', v1: execDate.value, v2: '', preset: undefined, metric: '上架时间' as MvCondMetric, op: '=', conj: '且' as const }));
const dpRowC = computed(() => dpOpen.value === '__exec__' ? execDpRow.value : condRows.value.find((x) => x.key === dpOpen.value));
const dpPickExec = (isoV: string) => { execDate.value = isoV; dpOpen.value = ''; };
/* 执行时间校验：定时执行时必填日期和时间 */
const execTimeValid = computed(() => execMode.value === 'immediate' || (execDate.value !== '' && execTimeOne.value !== ''));
/* 执行时间：自绘时间选择器弹层（时/分双列滚选，与日历弹层同壳），替代裸文本输入 */
const TP_HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const TP_MINS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const tpOpen = ref(false);
const tpPos = ref({ x: 0, y: 0 });
/** 时间选择器目标：'cycle'=循环执行时间，'exec'=一次性定时执行时间 */
const tpTarget = ref<'cycle' | 'exec'>('cycle');
const tpH = computed(() => (tpTarget.value === 'cycle' ? cycleTime.value : execTimeOne.value).split(':')[0] ?? '');
const tpM = computed(() => (tpTarget.value === 'cycle' ? cycleTime.value : execTimeOne.value).split(':')[1] ?? '');
const openTp = (e: Event) => {
  tpTarget.value = 'cycle';
  const rect = (e.currentTarget as HTMLElement).closest('.mv-time-box')?.getBoundingClientRect();
  tpPos.value = { x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 4 };
  tpOpen.value = true;
  /* 双列滚到选中项居中 */
  nextTick(() => {
    document.querySelectorAll('.mv-tpop .mv-tp-col').forEach((col) => {
      const el = col.querySelector('.mv-tp-cell.on') as HTMLElement | null;
      if (el) (col as HTMLElement).scrollTo(0, el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2);
    });
  });
};
const openExecTp = (e: Event) => {
  tpTarget.value = 'exec';
  const rect = (e.currentTarget as HTMLElement).closest('.mv-time-box')?.getBoundingClientRect();
  tpPos.value = { x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 4 };
  tpOpen.value = true;
  nextTick(() => {
    document.querySelectorAll('.mv-tpop .mv-tp-col').forEach((col) => {
      const el = col.querySelector('.mv-tp-cell.on') as HTMLElement | null;
      if (el) (col as HTMLElement).scrollTo(0, el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2);
    });
  });
};
const tpPick = (h: string, mi: string) => {
  if (tpTarget.value === 'cycle') cycleTime.value = `${h}:${mi}`;
  else execTimeOne.value = `${h}:${mi}`;
};
const condRows = ref<MvCondRow[]>(m?.cond
  ? m.cond.map((r) => ({ ...r }))
  : [{ key: 'c0', conj: '且', metric: '销量', op: '>', v1: '', v2: '' }]);
const newRowKey = () => `c${Date.now().toString(36)}${condRows.value.length}`;
const addCondRow = () => { condRows.value.push({ key: newRowKey(), conj: '且', metric: '销量', op: '>', v1: '', v2: '' }); };
const removeCondRow = (i: number) => { condRows.value.splice(i, 1); };
/* 选定条件后带出对应约束：运算符枚举与值控件（数值+单位 / 时间预设+日期 / 排行范围+前N）随指标重置 */
const setRowMetric = (r: MvCondRow, v: string) => {
  r.metric = v as MvCondMetric;
  r.op = mvMetricMeta(r.metric).ops[0];
  r.v1 = '';
  r.v2 = '';
  r.preset = '自定义时间';
  r.unit = undefined;
  r.rankRange = '昨天';
  r.topN = '';
  dpOpen.value = '';
};
/* 销量排行时间范围切换：切回昨天清起止日期（相对窗口即完整条件） */
const setRowRankRange = (r: MvCondRow, v: string) => {
  r.rankRange = v as MvRankRange;
  r.v1 = '';
  r.v2 = '';
  dpOpen.value = '';
};
/* 时间预设切换：非自定义时清空日期输入（相对窗口即完整条件） */
const setRowPreset = (r: MvCondRow, v: string) => {
  r.preset = v as MvDatePreset;
  r.v1 = '';
  r.v2 = '';
  dpOpen.value = '';
};
/* 运算符切换：数值型清区间端点；日期型恒为范围不受运算符影响 */
const setRowOp = (r: MvCondRow, v: string) => {
  r.op = v;
  if (v === '介于') { r.preset = undefined; } /* 介于恒用自定义范围，清除预设 */
  else if (mvMetricMeta(r.metric).kind !== 'date') { r.v2 = ''; }
  dpOpen.value = '';
};
/* 行完整性：数值型阈值 ≥ 0；排行型前N ≥ 1 且指定范围必填起止；上架时间预设非自定义即完整，自定义必填起止范围且起 ≤ 止 */
const rowValid = (r: MvCondRow) => {
  const meta = mvMetricMeta(r.metric);
  if (meta.kind === 'rank') {
    const nOk = (r.topN ?? '').trim() !== '' && Number.isFinite(Number(r.topN)) && Number(r.topN) >= 1;
    if ((r.rankRange ?? '昨天') === '昨天') return nOk;
    return nOk && r.v1 !== '' && r.v2 !== '' && r.v1 <= r.v2;
  }
  if (meta.kind === 'date') {
    if (r.op === '介于') return r.v1 !== '' && r.v2 !== '' && r.v1 <= r.v2; /* 介于恒为范围，必填起止 */
    if ((r.preset ?? '自定义时间') !== '自定义时间') return true;
    return r.v1 !== '' && r.v2 !== '' && r.v1 <= r.v2;
  }
  return r.v1.trim() !== '' && Number.isFinite(Number(r.v1)) && Number(r.v1) >= 0;
};
const condValid = computed(() => condRows.value.length > 0 && condRows.value.every(rowValid));
/* 上架时间自定义日期：自绘日历弹层（恒为起止范围选：第一次点选为起、第二次为止），替代原生日期控件 */
const dpOpen = ref('');
const dpPos = ref({ x: 0, y: 0 });
const dpView = ref({ y: 2026, m: 9 });
const dpAnchor = ref('');
const dpIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dpToday = dpIso(new Date());
const openDp = (e: Event, r: MvCondRow) => {
  const rect = (e.currentTarget as HTMLElement).closest('.mv-cond-date')?.getBoundingClientRect();
  dpPos.value = { x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 4 };
  const base = r.v1 ? new Date(`${r.v1}T00:00:00`) : new Date();
  dpView.value = { y: base.getFullYear(), m: base.getMonth() + 1 };
  /* 已有起未有点（上次未选完关闭）→ 续接起点继续范围选 */
  dpAnchor.value = r.v1 && !r.v2 ? r.v1 : '';
  dpOpen.value = r.key;
};
const dpCells = computed(() => {
  const { y, m } = dpView.value;
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const start = new Date(y, m - 1, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: dpIso(d), day: d.getDate(), inMonth: d.getMonth() === m - 1 };
  });
});
const dpShift = (n: number) => {
  let { y, m } = dpView.value;
  m += n;
  if (m < 1) { m = 12; y -= 1; }
  if (m > 12) { m = 1; y += 1; }
  dpView.value = { y, m };
};
const dpCellClass = (c: { iso: string; inMonth: boolean }) => {
  const r = dpRowC.value;
  const cls: Record<string, boolean> = { out: !c.inMonth, today: c.iso === dpToday };
  if (!r) return cls;
  /* 执行日期：单选模式，高亮选中日期 */
  if (dpOpen.value === '__exec__') {
    cls.on = c.iso === execDate.value;
    return cls;
  }
  cls.on = c.iso === r.v1 || c.iso === r.v2 || (!r.v2 && c.iso === dpAnchor.value);
  cls.in = !!r.v1 && !!r.v2 && c.iso > r.v1 && c.iso < r.v2;
  return cls;
};
/* 范围选：第一次点选为起、第二次为止（反选自动交换） */
const dpPick = (isoV: string) => {
  const r = dpRowC.value;
  if (!r) return;
  if (!dpAnchor.value) { dpAnchor.value = isoV; r.v1 = isoV; r.v2 = ''; return; }
  if (isoV < dpAnchor.value) { r.v1 = isoV; r.v2 = dpAnchor.value; } else { r.v1 = dpAnchor.value; r.v2 = isoV; }
  dpAnchor.value = '';
  dpOpen.value = '';
};
const dpClear = () => {
  const r = dpRowC.value;
  if (r) { r.v1 = ''; r.v2 = ''; }
  dpAnchor.value = '';
  dpOpen.value = '';
};
const onDocDown = (e: MouseEvent) => {
  const t = e.target as HTMLElement;
  if (!t.closest('.mv-dppop') && !t.closest('.mv-cond-date')) dpOpen.value = '';
  if (!t.closest('.mv-tpop') && !t.closest('.mv-time-box')) tpOpen.value = false;
};
onMounted(() => document.addEventListener('mousedown', onDocDown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown));

/* 选店铺纯任务维度，置于任务类型与执行方式之间：自动搬家=被搬店铺、自动下架=关联店铺，统一芯片回显+加号弹窗多选 */
const shopIds = ref<string[]>(m ? [...m.shopIds] : []);
const removeShop = (id: string) => { shopIds.value = shopIds.value.filter((x) => x !== id); };
/* 自动搬家第二步：先下拉选发布策略（复用商品策略枚举），再选发布店铺（多选，芯片回显+弹窗选择） */
const MV_STRATEGY_OPTIONS = PUB_STRATEGIES.map((s) => s.name);
const strategy = ref(m?.strategy ?? MV_STRATEGY_OPTIONS[0]);
const targetIds = ref<string[]>(m?.targetShopIds ? [...m.targetShopIds] : []);
const removeTarget = (id: string) => { targetIds.value = targetIds.value.filter((x) => x !== id); };
/* 选店弹窗（被搬/目标共用）：多选暂存 + 搜索，确认后落回芯片行；第一版仅视频号 */
const pickModal = ref(false);
const modalMode = ref<'source' | 'target'>('source');
const srcPick = ref<string[]>([]);
const tgtPick = ref<string[]>([]);
const pickQuery = ref('');
/* 第一版仅视频号店铺 */
const VIDEO_SHOPS = mvShops.filter((s) => s.platform === '视频号');
const pickShops = computed(() => VIDEO_SHOPS.filter((s) =>
  !pickQuery.value.trim() || s.name.includes(pickQuery.value.trim())));
const pickRef = () => (modalMode.value === 'source' ? srcPick : tgtPick);
const curPick = computed(() => pickRef().value);
/* 全选行：按当前搜索过滤批量勾选/取消 */
const pickAllOn = computed(() => pickShops.value.length > 0 && pickShops.value.every((s) => curPick.value.includes(s.id)));
const togglePickAll = () => {
  const r = pickRef();
  r.value = pickAllOn.value
    ? r.value.filter((id) => !pickShops.value.some((s) => s.id === id))
    : Array.from(new Set([...r.value, ...pickShops.value.map((s) => s.id)]));
};
const openPick = (mode: 'source' | 'target') => {
  modalMode.value = mode;
  (mode === 'source' ? srcPick : tgtPick).value = [...(mode === 'source' ? shopIds : targetIds).value];
  pickQuery.value = '';
  pickModal.value = true;
};
const togglePick = (id: string) => {
  const r = pickRef();
  r.value = r.value.includes(id) ? r.value.filter((x) => x !== id) : [...r.value, id];
};
const confirmPick = () => {
  if (curPick.value.length === 0) {
    pushToast(modalMode.value === 'source' ? (kind.value === '自动搬家' ? '请选择被搬店铺' : '请选择关联店铺') : '请选择发布店铺', 'error');
    return;
  }
  if (modalMode.value === 'source') shopIds.value = [...curPick.value];
  else targetIds.value = [...curPick.value];
  pickModal.value = false;
};

/* 配置页校验：名称 + 循环时间（仅循环）+ 一次性执行时间（仅一次性）+ 条件配置（全方式）+ 被搬/关联店铺（自动发品免店铺） */
const validConfig = (needShops: boolean) => {
  if (!name.value.trim()) { pushToast('请输入任务名称', 'error'); return false; }
  if (method.value === '循环' && !cycleTime.value.trim()) { pushToast('请填写循环执行时间', 'error'); return false; }
  if (method.value === '一次性' && !execTimeValid.value) { pushToast('请选择执行时间', 'error'); return false; }
  if (!condValid.value) { pushToast('请完整填写条件配置（阈值与日期范围均需填写）', 'error'); return false; }
  if (needShops && kind.value !== '自动发品' && shopIds.value.length === 0) { pushToast(kind.value === '自动搬家' ? '请至少选择一个被搬店铺' : '请至少选择一个关联店铺', 'error'); return false; }
  return true;
};
/* 自动搬家：条件配置完成后下一步进入目标店铺选择；自动发品/自动下架直接保存 */
const step = ref(1);
const nextStep = () => { if (validConfig(true)) step.value = 2; };
/* 确认立即执行二次弹窗 */
const confirmImmediate = ref(false);

const save = () => {
  if (method.value === '一次性' && execMode.value === 'immediate' && step.value === 2) {
    /* 一次性+立即执行：先弹二次确认 */
    confirmImmediate.value = true;
    return;
  }
  if (!validConfig(true)) return;
  if (kind.value === '自动搬家' && targetIds.value.length === 0) { pushToast('请至少选择一个发布店铺', 'error'); return; }
  if (kind.value === '自动发品' && targetIds.value.length === 0) { pushToast('请至少选择一个发布店铺', 'error'); return; }
  const base: MvTask = m ? { ...m } : {
    id: `at-${Date.now().toString().slice(-6)}`,
    name: name.value.trim(),
    kind: kind.value,
    method: method.value,
    cond: [],
    shopIds: kind.value === '自动发品' ? [] : [...shopIds.value],
    targetShopIds: kind.value === '自动搬家' ? [...targetIds.value] : undefined,
    source: kind.value === '自动发品' ? source.value : undefined,
    creator: '七妮妮',
    status: mvInitStatus(method.value),
    createdAt: '2026-09-13 10:00',
  };
  /* 状态随执行方式枚举回落：编辑改方式后原状态不在新枚举内则重置为初始态 */
  const status: MvTaskStatus = MV_METHOD_STATUS[method.value].includes(base.status) ? base.status : mvInitStatus(method.value);
  emit('save', {
    ...base,
    name: name.value.trim(),
    kind: kind.value,
    method: method.value,
    strategy: kind.value === '自动搬家' ? strategy.value : undefined,
    source: kind.value === '自动发品' ? source.value : undefined,
    cycle: method.value === '循环' ? cycle.value : undefined,
    cycleDay: method.value === '循环' && cycle.value !== '每天' ? cycleDay.value : undefined,
    cycleTime: method.value === '循环' ? cycleTime.value.trim() : undefined,
    execMode: method.value === '一次性' ? execMode.value : undefined,
    execDate: method.value === '一次性' && execMode.value === 'scheduled' ? execDate.value : undefined,
    execTime: method.value === '一次性' && execMode.value === 'scheduled' ? execTimeOne.value : undefined,
    cond: condRows.value.map((r) => ({ ...r })),
    shopIds: kind.value === '自动发品' ? [] : [...shopIds.value],
    targetShopIds: kind.value === '自动搬家' ? [...targetIds.value] : undefined,
    status,
  });
};
</script>

<template>
  <div class="mv-drawer-mask" @click.self="emit('close')">
    <div class="mv-drawer">
      <div class="mv-dr-head">
        <span class="mv-dr-title">{{ m ? '编辑任务' : '新建任务' }}</span>
        <span class="mv-dr-x" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </span>
      </div>
      <div class="mv-dr-body">
        <!-- 步骤1：选店铺置于任务类型与执行方式之间（自动搬家=被搬店铺芯片行；自动下架=关联店铺内联多选） -->
        <div v-if="step === 1">
          <div class="sg-field">
            <label>任务名称<span class="mv-req">*</span></label>
            <input v-model="name" class="sg-input" placeholder="如 自动搬家-淘宝心选店全店循环" />
          </div>
          <div class="sg-field">
            <label>任务类型<span class="mv-req">*</span></label>
            <BubbleSelect class-name="sg-select" :options="MV_KINDS" :value="kind" @change="(v: string) => (kind = v as MvKind)" />
          </div>
          <!-- 商品来源：仅自动发品展示（内部商机/店铺商品） -->
          <div v-if="kind === '自动发品'" class="sg-field">
            <label>商品来源<span class="mv-req">*</span></label>
            <BubbleSelect class-name="sg-select" :options="MV_SOURCES" :value="source" @change="(v: string) => (source = v as MvSource)" />
          </div>
          <!-- 自动发品无被搬店铺（被搬的不是我们自己管理的店） -->
          <div v-if="kind !== '自动发品'" class="sg-field">
            <label>{{ kind === '自动搬家' ? '被搬店铺（可多选）' : '关联店铺（可多选）' }}<span class="mv-req">*</span></label>
            <div class="mv-chips">
              <span v-for="id in shopIds" :key="id" class="mv-chip">
                <span class="store-logo"><img :src="PLATFORM_LOGO[mvShopOf(id)?.platform ?? '淘宝']" alt="" /></span>
                <span class="mv-chip-name">{{ mvShopOf(id)?.name }}</span>
                <span class="mv-chip-x" @click="removeShop(id)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </span>
              </span>
              <button type="button" class="mv-chip-add" :aria-label="kind === '自动搬家' ? '选择被搬店铺' : '选择关联店铺'" @click="openPick('source')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>
          <div class="sg-field">
            <label>执行方式<span class="mv-req">*</span></label>
            <BubbleSelect class-name="sg-select" :options="METHOD_LABELS" :value="METHOD_LABEL[method]" @change="setMethod" />
          </div>
          <template v-if="method === '循环'">
            <div class="mv-cycle-grid">
              <div class="sg-field mv-cy-cycle">
                <label>循环周期<span class="mv-req">*</span></label>
                <BubbleSelect class-name="sg-select" :value="cycle" :options="MV_CYCLES" @change="setCycle" />
              </div>
              <div v-if="cycle === '每周'" class="sg-field mv-cy-day">
                <label>星期<span class="mv-req">*</span></label>
                <BubbleSelect class-name="sg-select" :value="cycleDay" :options="MV_WEEK_DAYS" @change="(v: string) => (cycleDay = v)" />
              </div>
              <div v-else-if="cycle === '每月'" class="sg-field mv-cy-day">
                <label>日期<span class="mv-req">*</span></label>
                <BubbleSelect class-name="sg-select" :value="cycleDay" :options="MV_MONTH_DAYS" @change="(v: string) => (cycleDay = v)" />
              </div>
              <div class="sg-field mv-cy-time">
                <label>执行时间<span class="mv-req">*</span></label>
                <div class="mv-cond-val mv-time-box" @click="openTp($event)">
                  <span class="mv-time-text" :class="cycleTime ? '' : 'empty'">{{ cycleTime || '选择时间' }}</span>
                  <span class="mv-cond-clock">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  </span>
                </div>
              </div>
            </div>
          </template>
          <template v-if="method === '一次性'">
            <div class="sg-field">
              <label>执行时间<span class="mv-req">*</span></label>
              <div class="mv-exec-mode">
                <label class="mv-exec-radio" :class="execMode === 'immediate' ? 'on' : ''">
                  <input type="radio" v-model="execMode" value="immediate" />立即执行
                </label>
                <label class="mv-exec-radio" :class="execMode === 'scheduled' ? 'on' : ''">
                  <input type="radio" v-model="execMode" value="scheduled" />定时执行
                </label>
              </div>
            </div>
            <template v-if="execMode === 'scheduled'">
              <div class="sg-field">
                <label>执行日期<span class="mv-req">*</span></label>
                <div class="mv-cond-val mv-cond-date" @click="openExecDp($event)">
                  <span class="mv-date-text" :class="execDate ? '' : 'empty'">{{ execDate || '选择日期' }}</span>
                  <span class="mv-cond-clock">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  </span>
                </div>
              </div>
              <div class="sg-field">
                <label>执行时间<span class="mv-req">*</span></label>
                <div class="mv-cond-val mv-time-box" @click="openExecTp($event)">
                  <span class="mv-time-text" :class="execTimeOne ? '' : 'empty'">{{ execTimeOne || '选择时间' }}</span>
                  <span class="mv-cond-clock">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  </span>
                </div>
              </div>
            </template>
          </template>
          <div class="sg-field">
            <label>条件配置<span class="mv-req">*</span></label>
            <div class="mv-cond-rows">
              <div v-for="(r, i) in condRows" :key="r.key" class="mv-cond-row">
                <span v-if="i === 0" class="mv-cond-when">当</span>
                <BubbleSelect v-else class-name="sg-select" :options="['且', '或']" :value="r.conj" class="mv-cond-conj" @change="(v: string) => (r.conj = v as '且' | '或')" />
                <BubbleSelect class-name="sg-select" :options="MV_COND_METRIC_NAMES" :value="r.metric" class="mv-cond-metric" @change="(v: string) => setRowMetric(r, v)" />
                <BubbleSelect v-if="mvMetricMeta(r.metric).kind !== 'rank' && r.metric !== '近X日内'" class-name="sg-select" :options="mvMetricMeta(r.metric).ops" :value="r.op" class="mv-cond-op" @change="(v: string) => setRowOp(r, v)" />
                <!-- 销量排行：时间范围（昨天/指定起止）＋前N名，无运算符 -->
                <template v-if="mvMetricMeta(r.metric).kind === 'rank'">
                  <BubbleSelect class-name="sg-select" :options="MV_RANK_RANGES" :value="r.rankRange ?? '昨天'" class="mv-cond-rangsel" @change="(v: string) => setRowRankRange(r, v)" />
                  <div v-if="(r.rankRange ?? '昨天') === '指定时间范围'" class="mv-cond-val mv-cond-date" @click="openDp($event, r)">
                    <span class="mv-date-text" :class="r.v1 ? '' : 'empty'">{{ r.v1 || '开始日期' }}<i>~</i>{{ r.v2 || '结束日期' }}</span>
                    <span class="mv-cond-clock">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    </span>
                  </div>
                  <div class="mv-cond-val mv-cond-rank">
                    <span class="mv-cond-prefix">前</span>
                    <input v-model="r.topN" inputmode="numeric" placeholder="N" />
                    <span class="mv-cond-unit">名</span>
                  </div>
                </template>
                <template v-else-if="mvMetricMeta(r.metric).kind === 'date'">
                  <BubbleSelect v-if="r.op !== '介于'" class-name="sg-select" :options="MV_DATE_PRESETS" :value="r.preset ?? '自定义时间'" class="mv-cond-preset" @change="(v: string) => setRowPreset(r, v)" />
                  <div
                    v-if="r.op === '介于' || (r.preset ?? '自定义时间') === '自定义时间'"
                    class="mv-cond-val mv-cond-date"
                    @click="openDp($event, r)"
                  >
                    <span class="mv-date-text" :class="r.v1 ? '' : 'empty'">{{ r.v1 || '开始日期' }}<i>~</i>{{ r.v2 || '结束日期' }}</span>
                    <span class="mv-cond-clock">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    </span>
                  </div>
                </template>
                <template v-else>
                  <div class="mv-cond-val">
                    <input v-model="r.v1" inputmode="decimal" placeholder="阈值" />
                    <span v-if="!mvMetricMeta(r.metric).units" class="mv-cond-unit">{{ mvMetricMeta(r.metric).unit }}</span>
                  </div>
                  <!-- 销量较昨日：阈值单位件/%可切 -->
                  <BubbleSelect
                    v-if="mvMetricMeta(r.metric).units"
                    class-name="sg-select"
                    :options="mvMetricMeta(r.metric).units ?? []"
                    :value="r.unit ?? mvMetricMeta(r.metric).unit"
                    class="mv-cond-unitsel"
                    @change="(v: string) => (r.unit = v as '件' | '%')"
                  />
                </template>
                <button type="button" class="mv-cond-del" aria-label="删除条件" @click="removeCondRow(i)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
              <div>
                <button type="button" class="mv-cond-add" @click="addCondRow">添加条件</button>
              </div>
            </div>
          </div>
        </div>
        <!-- 步骤2（自动搬家/自动发品）：先下拉选发布策略，再选发布店铺（芯片行 + 加号弹窗，交互同被搬店铺） -->
        <div v-else>
          <div class="sg-field">
            <label>发布策略<span class="mv-req">*</span></label>
            <BubbleSelect class-name="sg-select" :options="MV_STRATEGY_OPTIONS" :value="strategy" @change="(v: string) => (strategy = v)" />
          </div>
          <div class="sg-field">
            <label>发布店铺（可多选）<span class="mv-req">*</span></label>
            <div class="mv-chips">
              <span v-for="id in targetIds" :key="id" class="mv-chip">
                <span class="store-logo"><img :src="PLATFORM_LOGO[mvShopOf(id)?.platform ?? '淘宝']" alt="" /></span>
                <span class="mv-chip-name">{{ mvShopOf(id)?.name }}</span>
                <span class="mv-chip-x" @click="removeTarget(id)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </span>
              </span>
              <button type="button" class="mv-chip-add" aria-label="选择发布店铺" @click="openPick('target')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="mv-dr-foot">
        <button class="sg-btn" @click="emit('close')">取消</button>
        <button v-if="(kind === '自动搬家' || kind === '自动发品') && step === 1" class="sg-btn primary" @click="nextStep">下一步</button>
        <template v-else-if="step === 1">
          <button v-if="method === '一次性' && execMode === 'immediate'" class="sg-btn primary" @click="save">立即执行</button>
          <button v-else class="sg-btn primary" @click="save">保存任务</button>
        </template>
        <template v-else>
          <button class="sg-btn" @click="step = 1">上一步</button>
          <button v-if="method === '一次性' && execMode === 'immediate'" class="sg-btn primary" @click="save">立即执行</button>
          <button v-else class="sg-btn primary" @click="save">保存任务</button>
        </template>
      </div>
    </div>

    <!-- 上架时间自定义日期日历弹层（恒为起止范围选；Teleport body 防抽屉裁剪） -->
    <Teleport to="body">
      <div v-if="dpOpen && dpRowC" class="mv-dppop" :style="{ left: dpPos.x + 'px', top: dpPos.y + 'px' }">
        <div class="mv-dp-head">
          <span class="mv-dp-title">{{ dpView.y }}年{{ String(dpView.m).padStart(2, '0') }}月</span>
          <span class="mv-dp-nav">
            <button type="button" aria-label="上个月" @click="dpShift(-1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button type="button" aria-label="下个月" @click="dpShift(1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </span>
        </div>
        <div class="mv-dp-week"><span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span></div>
        <div class="mv-dp-grid">
          <button v-for="c in dpCells" :key="c.iso" type="button" class="mv-dp-cell" :class="dpCellClass(c)" @click="dpOpen === '__exec__' ? dpPickExec(c.iso) : dpPick(c.iso)">{{ c.day }}</button>
        </div>
        <div class="mv-dp-foot">
          <button v-if="dpOpen !== '__exec__'" type="button" @click="dpClear">清除</button>
          <button type="button" @click="dpOpen === '__exec__' ? dpPickExec(dpToday) : dpPick(dpToday)">今天</button>
        </div>
      </div>
    </Teleport>

    <!-- 执行时间选择器弹层（时/分双列滚选；Teleport body 防抽屉裁剪） -->
    <Teleport to="body">
      <div v-if="tpOpen" class="mv-tpop" :style="{ left: tpPos.x + 'px', top: tpPos.y + 'px' }">
        <div class="mv-tp-col">
          <button v-for="h in TP_HOURS" :key="h" type="button" class="mv-tp-cell" :class="tpH === h ? 'on' : ''" @click="tpPick(h, tpM)">{{ h }}</button>
        </div>
        <div class="mv-tp-col">
          <button v-for="mi in TP_MINS" :key="mi" type="button" class="mv-tp-cell" :class="tpM === mi ? 'on' : ''" @click="tpPick(tpH, mi)">{{ mi }}</button>
        </div>
      </div>
    </Teleport>

    <!-- 立即执行二次确认弹窗 -->
    <div v-if="confirmImmediate" class="mv-confirm-mask" @click.self="confirmImmediate = false">
      <div class="mv-confirm-box">
        <div class="mv-confirm-title">确认立即执行？</div>
        <div class="mv-confirm-msg">
          任务「{{ name.trim() }}」将立即开始执行，执行后状态将变为「执行中」。
          <br />请确认被搬店铺、条件配置等信息已填写正确。
        </div>
        <div class="mv-confirm-foot">
          <button class="sg-btn" @click="confirmImmediate = false">取消</button>
          <button class="sg-btn primary" @click="confirmImmediate = false; save()">确认执行</button>
        </div>
      </div>
    </div>

    <!-- 选店弹窗（被搬/目标共用）：搜索 + 多选列表，确认后落回芯片行（第一版仅视频号） -->
    <div v-if="pickModal" class="mv-srcmask" @click.self="pickModal = false">
      <div class="mv-srcmodal">
        <div class="mv-src-head">
          <span>{{ modalMode === 'source' ? (kind === '自动搬家' ? '选择被搬店铺（可多选）' : '选择关联店铺（可多选）') : '选择发布店铺（可多选）' }}</span>
          <span class="mv-dr-x" @click="pickModal = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </span>
        </div>
        <div class="mv-src-body">
          <div class="mv-src-search">
            <input v-model="pickQuery" placeholder="搜索店铺名称" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </div>
          <div class="mv-shoplist">
            <div v-if="pickShops.length > 0" class="mv-shopitem mv-shopall" :class="pickAllOn ? 'on' : ''" @click="togglePickAll">
              <input type="checkbox" :checked="pickAllOn" />
              <span>全部店铺</span>
            </div>
            <div
              v-for="s in pickShops"
              :key="s.id"
              class="mv-shopitem"
              :class="curPick.includes(s.id) ? 'on' : ''"
              @click="togglePick(s.id)"
            >
              <input type="checkbox" :checked="curPick.includes(s.id)" />
              <span class="store-logo"><img :src="PLATFORM_LOGO[s.platform]" alt="" /></span>
              <span>{{ s.name }}</span>
            </div>
            <div v-if="pickShops.length === 0" class="mv-src-empty">无匹配店铺</div>
          </div>
        </div>
        <div class="mv-src-foot">
          <button class="sg-btn" @click="pickModal = false">取消</button>
          <button class="sg-btn primary" @click="confirmPick">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

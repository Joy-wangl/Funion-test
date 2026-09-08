<script setup lang="ts">
/* ---------- 品控中心 2.0 · 标签配置（规则管理台）
   条件配置 / AI 分析不分子页：判定方式作为列表字段 + 工具栏分段筛选（与状态筛选并列）
   布局 = 左大类导航 + 右规则表格；编辑 / 新建收进同一抽屉（表单字段与条件行交互完全统一） ---------- */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import {
  CAT_COLOR,
  CYCLE_OPTS,
  HEALTH_DIMS,
  LOGIC_LABEL,
  PARAM_METRICS,
  PARAM_OPS,
  QC2_CATS,
  UNIT_TEXT,
  createQc2Label,
  cycleKindOf,
  labelHitCounts,
  paramConj,
  qc2Labels,
  touchAiRun,
  unitOfMetric,
  type CycleKind,
  type JudgeKind,
  type LabelCycle,
  type LabelParam,
  type LogicKind,
  type ParamOp,
  type Qc2Label,
} from './qc2Data';
import { pushToast } from '../../components/toast';

const props = defineProps<{ onPickLabel: (label: string | null) => void }>();

const kw = ref('');
/** 查询条件下拉化（全局规范：下拉统一 BubbleSelect，禁分段/原生 select 作筛选） */
const STATE_OPTS = ['全部状态', '已启用', '已停用'];
const stateFilter = ref(STATE_OPTS[0]);
/** 判定方式筛选：全部方式 / 条件配置 / AI 分析（列表字段同源） */
const judgeFilter = ref<'all' | JudgeKind>('all');
const JUDGE_OPTS: { v: 'all' | JudgeKind; t: string }[] = [
  { v: 'all', t: '全部方式' }, { v: 'rule', t: '条件配置' }, { v: 'ai', t: 'AI 分析' },
];
const JUDGE_TEXTS = JUDGE_OPTS.map((o) => o.t);
const setJudgeFilter = (v: string) => { judgeFilter.value = JUDGE_OPTS.find((o) => o.t === v)?.v ?? 'all'; };
const JUDGE_LABEL: Record<JudgeKind, string> = { rule: '条件配置', ai: 'AI 分析' };
const activeCat = ref('全部');

const hitCounts = computed(() => labelHitCounts());

interface CatItem { cat: string; color: string; total: number; enabled: number }
const subset = computed(() => qc2Labels.value);
const catNav = computed<CatItem[]>(() => [
  { cat: '全部', color: 'var(--color-primary)', total: subset.value.length, enabled: subset.value.filter((l) => l.enabled).length },
  ...QC2_CATS.map((cat) => {
    const items = subset.value.filter((l) => l.cat === cat);
    return { cat, color: CAT_COLOR[cat], total: items.length, enabled: items.filter((l) => l.enabled).length };
  }).filter((c) => c.total > 0),
]);

const rows = computed<Qc2Label[]>(() => {
  const kwv = kw.value.trim().toLowerCase();
  let list = subset.value;
  if (activeCat.value !== '全部') list = list.filter((l) => l.cat === activeCat.value);
  if (judgeFilter.value !== 'all') list = list.filter((l) => l.judge === judgeFilter.value);
  if (kwv) list = list.filter((l) => l.name.toLowerCase().includes(kwv) || l.rule.toLowerCase().includes(kwv));
  if (stateFilter.value !== '全部状态') list = list.filter((l) => (stateFilter.value === '已启用' ? l.enabled : !l.enabled));
  return list;
});

/* ---------- 启用 / 停用（即时生效） ---------- */
const setEnabled = (lb: Qc2Label) => {
  lb.enabled = !lb.enabled;
  const n = hitCounts.value.get(lb.id) ?? 0;
  pushToast(lb.enabled
    ? `「${lb.name}」已启用${n ? `，当前命中 ${n} 个编码` : ''}`
    : `「${lb.name}」已停用，${n} 个编码的该标签命中已从编码页移除`);
};

/* ---------- 阈值参数：行式条件组（当/且或 + 维度 + 周期 + 运算符 + 阈值/单位 + 删除，底部添加条件；
   参考自动化规则构建器条件行样式：灰底控件逐段拼装，单位后缀跟随维度自动带出） ---------- */
interface CondRow { key: string; conj: LogicKind; metric: string; days: number | null; op: ParamOp; vText: string }
const condRows = ref<CondRow[]>([]);
const newRowKey = () => `p${Date.now().toString(36)}${condRows.value.length}`;
const newRow = (): CondRow => ({ key: newRowKey(), conj: 'and', metric: PARAM_METRICS[0], days: null, op: '>', vText: '' });
const setRowConj = (row: CondRow, v: string) => { row.conj = v === '或' ? 'or' : 'and'; };
/* 周期列已移除（时间口径作为独立条件行表达）；换维度时旧窗口不再适用，重置 */
const setRowMetric = (row: CondRow, v: string) => { row.metric = v; row.days = null; };
const setRowOp = (row: CondRow, v: string) => { row.op = v as ParamOp; };
const setRowValue = (row: CondRow, e: Event) => { row.vText = (e.target as HTMLInputElement).value; };
const rowValid = (r: CondRow) => r.vText.trim() !== '' && Number.isFinite(Number(r.vText)) && Number(r.vText) >= 0;
const condValid = computed(() => condRows.value.every(rowValid));
const addCondRow = () => { condRows.value.push(newRow()); };
const removeCondRow = (i: number) => { condRows.value.splice(i, 1); };
const rowsToParams = (): LabelParam[] => condRows.value.map((r) => ({
  key: r.key, conj: r.conj, metric: r.metric, days: r.days, op: r.op, value: Number(r.vText), unit: unitOfMetric(r.metric),
}));

/* ---------- 综合评定维度编辑（AI 分析标签：多维综合评定，不以阈值表达） ---------- */
const toggleDim = (list: string[], dim: string) => {
  const at = list.indexOf(dim);
  if (at >= 0) { list.splice(at, 1); return; }
  /* 按维度池顺序插入，保证展示顺序稳定 */
  const order = HEALTH_DIMS.indexOf(dim);
  const idx = list.findIndex((d) => HEALTH_DIMS.indexOf(d) > order);
  list.splice(idx < 0 ? list.length : idx, 0, dim);
};

/* ---------- 编辑 / 新建统一抽屉（草稿语义：保存 / 取消；两种模式表单字段与条件行交互完全一致） ---------- */
interface LabelForm { mode: 'create' | 'edit'; id: string | null; cat: string; name: string; judge: JudgeKind; rule: string; dims: string[]; cycleKind: CycleKind; cycleEvery: number }
const form = ref<LabelForm | null>(null);
const openEdit = (lb: Qc2Label) => {
  form.value = {
    mode: 'edit', id: lb.id, cat: lb.cat, name: lb.name, judge: lb.judge, rule: lb.rule, dims: [...lb.dims],
    cycleKind: cycleKindOf(lb.cycle), cycleEvery: lb.cycle.every,
  };
  condRows.value = lb.params.map((p) => ({ key: p.key, conj: paramConj(p), metric: p.metric, days: p.days, op: p.op, vText: String(p.value) }));
};
const openCreate = () => {
  form.value = { mode: 'create', id: null, cat: QC2_CATS[0], name: '', judge: 'rule', rule: '', dims: [], cycleKind: 'daily', cycleEvery: 1 };
  condRows.value = [];
};
const closeForm = () => { form.value = null; };
/* 模板箭头回调内 v-if 收窄失效，大类赋值收进方法 */
const setCat = (v: string) => { if (form.value) form.value.cat = v; };
/* 抽屉遮罩与 Esc 均可关闭（项目全局交互规范） */
const onFormEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') closeForm(); };
watch(form, (v) => {
  if (v) document.addEventListener('keydown', onFormEsc);
  else document.removeEventListener('keydown', onFormEsc);
});
onBeforeUnmount(() => document.removeEventListener('keydown', onFormEsc));
/* 判定方式决定存哪侧配置：规则标签存阈值参数，AI 标签存评定维度，两者互斥 */
const effParams = (): LabelParam[] => (form.value?.judge === 'rule' ? rowsToParams() : []);
const effDims = (): string[] => (form.value?.judge === 'ai' ? [...form.value.dims] : []);
/* 评估周期（时间维度）：每日/每周/每月 固定 every=1；指定天数/每 X 周/每 X 月 需填 N */
const CYCLE_TEXTS = CYCLE_OPTS.map((o) => o.t);
const cycleOptOf = (k: CycleKind) => CYCLE_OPTS.find((o) => o.v === k) ?? CYCLE_OPTS[0];
const cycleVariable = computed(() => cycleOptOf(form.value?.cycleKind ?? 'daily').fixed === null);
const cycleUnitText = computed(() => UNIT_TEXT[cycleOptOf(form.value?.cycleKind ?? 'daily').unit]);
/* 模板箭头回调内 v-if 收窄失效，下拉当前文案收进 computed */
const cycleKindText = computed(() => CYCLE_OPTS.find((o) => o.v === form.value?.cycleKind)?.t ?? CYCLE_TEXTS[0]);
const setCycleKind = (v: string) => { if (form.value) form.value.cycleKind = CYCLE_OPTS.find((o) => o.t === v)?.v ?? 'daily'; };
const setCycleEvery = (e: Event) => { if (form.value) form.value.cycleEvery = Math.max(1, Math.floor(Number((e.target as HTMLInputElement).value) || 1)); };
const effCycle = (): LabelCycle => {
  const opt = cycleOptOf(form.value?.cycleKind ?? 'daily');
  return { unit: opt.unit, every: opt.fixed ?? Math.max(1, Math.floor(form.value?.cycleEvery || 1)) };
};
const paramSig = (list: LabelParam[]) =>
  JSON.stringify(list.map((p) => [p.key, p.metric, p.days, p.op, p.value, p.unit, paramConj(p)]));
const dirty = computed(() => {
  const f = form.value;
  if (!f || f.mode !== 'edit') return false;
  const src = qc2Labels.value.find((l) => l.id === f.id);
  if (!src) return false;
  return src.cat !== f.cat
    || src.name !== f.name.trim()
    || src.judge !== f.judge
    || src.rule !== f.rule.trim()
    || JSON.stringify(src.dims) !== JSON.stringify(effDims())
    || src.cycle.unit !== effCycle().unit
    || src.cycle.every !== effCycle().every
    || paramSig(src.params) !== paramSig(effParams());
});
const canSubmit = computed(() => !!form.value?.name.trim());
/* 条件行阈值未填全时拦截提交并提示（表单实时校验） */
const guardCond = (): boolean => {
  if (form.value?.judge !== 'rule' || condValid.value) return true;
  pushToast('请完善每条条件的阈值数值（≥ 0）', 'warning');
  return false;
};
const saveEdit = () => {
  const f = form.value;
  if (!f || f.mode !== 'edit' || !canSubmit.value || !guardCond()) return;
  const src = qc2Labels.value.find((l) => l.id === f.id);
  if (!src) return;
  src.cat = f.cat;
  src.name = f.name.trim();
  src.judge = f.judge;
  src.rule = f.rule.trim();
  src.params = effParams();
  src.dims = effDims();
  src.cycle = effCycle();
  if (src.judge === 'ai') {
    touchAiRun();
    pushToast(`「${src.name}」已保存，AI 分析结果已同步`);
  } else {
    pushToast(`「${src.name}」已保存，规则引擎实时生效`);
  }
  form.value = null;
};
const submitCreate = () => {
  const f = form.value;
  if (!f || f.mode !== 'create' || !canSubmit.value || !guardCond()) return;
  const lb = createQc2Label({
    cat: f.cat,
    name: f.name.trim(),
    judge: f.judge,
    rule: f.rule.trim(),
    params: effParams(),
    dims: effDims(),
    cycle: effCycle(),
  });
  form.value = null;
  judgeFilter.value = lb.judge;
  activeCat.value = lb.cat;
  pushToast(lb.judge === 'ai'
    ? `标签「${lb.name}」已创建，AI 分析结果已同步`
    : `标签「${lb.name}」已创建，规则引擎实时生效`);
};
</script>

<template>
  <div class="qc-head">
    <div class="qc-title">
      标签配置
    </div>
  </div>
  <div class="qc-body qc2-config">
    <div class="qc2-cfg-toolbar">
      <input v-model="kw" class="sg-input qc2-cfg-search" placeholder="搜索标签名 / 命中规则关键词">
      <BubbleSelect class-name="sg-select qc2-cfg-filter" :options="STATE_OPTS" :value="stateFilter" @change="(v) => (stateFilter = v)" />
      <BubbleSelect class-name="sg-select qc2-cfg-filter" :options="JUDGE_TEXTS" :value="JUDGE_OPTS.find((o) => o.v === judgeFilter)?.t ?? JUDGE_TEXTS[0]" @change="setJudgeFilter" />
      <span class="qc2-cfg-spacer" />
      <button type="button" class="sg-btn primary" @click="openCreate">+ 新建标签</button>
    </div>

    <div class="qc2-cfg-layout">
      <!-- 左：大类导航 -->
      <aside class="qc2-cfg-cats">
        <button
          v-for="c in catNav"
          :key="c.cat"
          type="button"
          :class="{ on: activeCat === c.cat }"
          @click="activeCat = c.cat"
        >
          <i class="qc2-cfg-dot" :style="{ background: c.color }" />
          <span class="qc2-cfg-cat-name">{{ c.cat }}</span>
          <span class="qc2-cfg-cat-n">{{ c.enabled }}/{{ c.total }}</span>
        </button>
      </aside>

      <!-- 右：规则表格 -->
      <div class="qc2-cfg-table">
        <table class="table">
          <thead>
            <tr>
              <th>标签</th>
              <th style="width: 110px">判定方式</th>
              <th style="width: 100px">命中编码</th>
              <th style="width: 90px">状态</th>
              <th class="th-op" style="width: 80px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lb in rows" :key="lb.id" :class="{ off: !lb.enabled }">
              <td>
                <div class="qc2-cfg-name-line">
                  <b>{{ lb.name }}</b>
                </div>
                <span class="qc2-cfg-rule-ell" :title="lb.rule">{{ lb.rule || '—' }}</span>
              </td>
              <td>
                <span class="tag" :class="lb.judge === 'ai' ? 'orange' : 'green'">{{ JUDGE_LABEL[lb.judge] }}</span>
              </td>
              <td>
                <button type="button" class="qc2-link-btn" @click="props.onPickLabel(lb.name)">
                  {{ lb.enabled ? (hitCounts.get(lb.id) ?? 0) : '—' }}
                </button>
              </td>
              <td>
                <span class="qc2-switch" :class="{ on: lb.enabled }" role="switch" :aria-checked="lb.enabled" tabindex="0" @click="setEnabled(lb)" @keydown.enter.prevent="setEnabled(lb)"><i /></span>
              </td>
              <td><button type="button" class="qc2-link-btn" @click="openEdit(lb)">编辑</button></td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="5" style="text-align: center; color: var(--color-text-4); padding: 40px 0">无匹配标签，请调整筛选条件</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑 / 新建统一抽屉（项目统一 .drawer 规范；两种模式表单字段与条件行交互完全一致） -->
    <template v-if="form">
      <div class="drawer-mask" @click="closeForm" />
      <div class="drawer qc2-edit-drawer">
        <div class="drawer-head">
          <div class="d-title">{{ form.mode === 'edit' ? '编辑标签' : '新建标签' }}</div>
          <span class="x" @click="closeForm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </span>
        </div>
        <div class="drawer-body">
          <div class="qc2-edit-field">
            <label>标签大类</label>
            <BubbleSelect class-name="sg-select" :options="QC2_CATS" :value="form.cat" class="qc2-cat-bs" @change="setCat" />
          </div>
          <div class="qc2-edit-field">
            <label><i class="req">*</i>标签名称</label>
            <input v-model="form.name" class="qc2-cfg-text" placeholder="如：秋季降温备货款">
          </div>
          <div class="qc2-edit-field">
            <label>判定方式</label>
            <span class="qc2-seg">
              <button type="button" :class="{ on: form.judge === 'rule' }" @click="form.judge = 'rule'">条件配置</button>
              <button type="button" :class="{ on: form.judge === 'ai' }" @click="form.judge = 'ai'">AI 分析</button>
            </span>
          </div>
          <div class="qc2-edit-field">
            <label>评估周期</label>
            <div class="qc2-cycle-row">
              <BubbleSelect class-name="sg-select" :options="CYCLE_TEXTS" :value="cycleKindText" @change="setCycleKind" />
              <template v-if="cycleVariable">
                <span class="qc2-cycle-pre">每</span>
                <input class="qc2-cycle-num" :value="form.cycleEvery" inputmode="numeric" @input="setCycleEvery">
                <span class="qc2-cycle-unit">{{ cycleUnitText }}</span>
              </template>
            </div>
          </div>
          <div v-if="form.judge === 'rule'" class="qc2-edit-field">
            <label>阈值参数</label>
            <div class="qc2-cond-rows">
              <div v-for="(r, i) in condRows" :key="r.key" class="qc2-cond-row">
                <span v-if="i === 0" class="qc2-cond-when">当</span>
                <BubbleSelect v-else class-name="sg-select" :options="['且', '或']" :value="LOGIC_LABEL[r.conj]" class="qc2-cond-conj" @change="(v) => setRowConj(r, v)" />
                <BubbleSelect class-name="sg-select" searchable :options="PARAM_METRICS" :value="r.metric" class="qc2-cond-metric" @change="(v) => setRowMetric(r, v)" />
                <BubbleSelect class-name="sg-select" :options="PARAM_OPS" :value="r.op" class="qc2-cond-op" @change="(v) => setRowOp(r, v)" />
                <div class="qc2-cond-val">
                  <input :value="r.vText" inputmode="decimal" placeholder="阈值" @input="setRowValue(r, $event)">
                  <span class="qc2-cond-unit">{{ unitOfMetric(r.metric) }}</span>
                </div>
                <button type="button" class="qc2-cond-del" aria-label="删除条件" @click="removeCondRow(i)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
              <div>
                <button type="button" class="qc2-cond-add" @click="addCondRow">添加条件</button>
              </div>
            </div>
          </div>
          <div v-else class="qc2-edit-field">
            <label>综合评定维度</label>
            <div class="qc2-dims-pick">
              <button
                v-for="d in HEALTH_DIMS"
                :key="d"
                type="button"
                class="qc2-dims-chip"
                :class="{ on: form.dims.includes(d) }"
                @click="toggleDim(form.dims, d)"
              >{{ d }}</button>
            </div>
          </div>
          <div class="qc2-edit-field">
            <label>标签描述</label>
            <textarea v-model="form.rule" class="qc2-cfg-rule" rows="4" placeholder="描述判定口径与业务含义，展示在标签列表与编码命中明细" />
          </div>
        </div>
        <div class="drawer-foot">
          <button type="button" class="btn" @click="closeForm">取消</button>
          <button v-if="form.mode === 'edit'" type="button" class="btn primary" :disabled="!dirty" @click="saveEdit">保存修改</button>
          <button v-else type="button" class="btn primary" :disabled="!canSubmit" @click="submitCreate">创建标签</button>
        </div>
      </div>
    </template>
  </div>
</template>

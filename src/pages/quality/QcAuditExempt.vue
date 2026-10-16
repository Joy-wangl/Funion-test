<script setup lang="ts">
/* ---------- 稽查模型配置 · 豁免机制：类型 → 条件 → 方式 逐条命中，命中后该商品当期豁免稽查评分 ---------- */
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import InputNumber from '../../components/InputNumber.vue';
import {
  DEFAULT_EXEMPTS,
  EXEMPT_APPEAL_STATES,
  EXEMPT_METRICS,
  EXEMPT_MODES,
  EXEMPT_OPS,
  EXEMPT_TYPES,
  METRIC_BY_KEY,
  defaultCondOf,
  defaultCondsOf,
  exemptCondText,
  exemptNameText,
  type ExemptCond,
  type ExemptMode,
  type ExemptOp,
  type ExemptRule,
  type ExemptType,
} from './qcAuditData';
import { pushToast } from '../../components/toast';

const KEY = 'funion:auditExempts';
const load = (): ExemptRule[] => {
  let list: ExemptRule[] | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) list = JSON.parse(raw) as ExemptRule[];
  } catch { /* 损坏回退默认 */ }
  const base = list ?? structuredClone(DEFAULT_EXEMPTS);
  /* 旧数据缺新增类型（如新店豁免）：按默认清单一次性补齐，不影响已有类型 */
  const types = new Set(base.map((r) => r.type));
  const missing = DEFAULT_EXEMPTS.filter((d) => !types.has(d.type)).map((d) => structuredClone(d));
  /* 旧数据无配置条件：按类型回填默认配置并重生成名称/条件文案 */
  return [...base, ...missing].map((r) => {
    if (r.conds && r.conds.length) return r;
    const conds = defaultCondsOf(r.type);
    return { ...r, conds, name: exemptNameText(conds), cond: exemptCondText(conds) };
  });
};

const rules = ref<ExemptRule[]>(load());
const showModal = ref(false);
const editing = ref<ExemptRule | null>(null);
const form = ref<ExemptRule>({
  id: '', type: '新品豁免', name: '', cond: '', conds: defaultCondsOf('新品豁免'), mode: '免考核', value: 0, enabled: true, updatedAt: '',
});
const now = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const TYPE_META: Record<ExemptType, { bg: string; color: string }> = {
  新品豁免: { bg: '#eef4ff', color: '#4f7cff' },
  新店豁免: { bg: '#f4edff', color: '#7c3aed' },
  新链接豁免: { bg: '#e8f7ee', color: '#1f9d55' },
  低样本豁免: { bg: '#f6f7f9', color: '#8b92a1' },
  申诉豁免: { bg: '#fff3e8', color: '#d46b08' },
};
const modeText = (r: ExemptRule) => (r.mode === '免考核' ? '免考核' : r.mode === '减权系数' ? `减权 ×${r.value.toFixed(1)}` : `延迟 ${r.value} 天考核`);

const openAdd = () => {
  editing.value = null;
  form.value = { id: '', type: '新品豁免', name: '', cond: '', conds: defaultCondsOf('新品豁免'), mode: '免考核', value: 0, enabled: true, updatedAt: '' };
  showModal.value = true;
};
const openEdit = (r: ExemptRule) => {
  editing.value = r;
  form.value = { ...r, conds: (r.conds && r.conds.length ? r.conds : defaultCondsOf(r.type)).map((c) => ({ ...c })) };
  showModal.value = true;
};
const closeModal = () => { showModal.value = false; };

/* ---------- 配置式条件：指标下拉 + 比较符 + 阈值步进器（状态类指标选状态），多条件「或」连接 ---------- */
const metricOpts = computed(() => EXEMPT_METRICS[form.value.type].map((m) => ({ value: m.key, label: m.label })));
const opOpts: string[] = [...EXEMPT_OPS];
const stateOpts: string[] = [...EXEMPT_APPEAL_STATES];
const metricDef = (c: ExemptCond) => METRIC_BY_KEY[c.metric] ?? EXEMPT_METRICS[form.value.type][0];
const unusedMetrics = computed(() => EXEMPT_METRICS[form.value.type].filter((m) => !form.value.conds.some((c) => c.metric === m.key)));
const pickType = (t: ExemptType) => { form.value.type = t; form.value.conds = defaultCondsOf(t); };
const setCondMetric = (c: ExemptCond, key: string) => { Object.assign(c, defaultCondOf(METRIC_BY_KEY[key])); };
const addCond = () => { const m = unusedMetrics.value[0]; if (m) form.value.conds.push(defaultCondOf(m)); };
const removeCond = (i: number) => { if (form.value.conds.length > 1) form.value.conds.splice(i, 1); };
const genName = computed(() => exemptNameText(form.value.conds));
/* 方式切换带入合理初值：减权系数 50%、延迟 7 天，避免 0 值配置 */
const pickMode = (m: ExemptMode) => {
  form.value.mode = m;
  if (m === '减权系数' && (form.value.value <= 0 || form.value.value >= 1)) form.value.value = 0.5;
  if (m === '延迟考核' && form.value.value <= 0) form.value.value = 7;
};
/* 减权系数以百分比步进配置（10%~90%），存储仍为 0~1 系数 */
const pct = computed(() => Math.round(form.value.value * 100));
const setPct = (v: number) => { form.value.value = v / 100; };

const submit = () => {
  if (!form.value.conds.length) return pushToast('请配置豁免条件');
  const conds = form.value.conds.map((c) => ({ ...c }));
  form.value.name = exemptNameText(conds);
  form.value.cond = exemptCondText(conds);
  if (editing.value) {
    Object.assign(editing.value, { ...form.value, conds, updatedAt: now() });
  } else {
    rules.value.push({ ...form.value, conds, id: `ex${Date.now()}`, updatedAt: now() });
  }
  showModal.value = false;
  pushToast(editing.value ? '豁免规则已更新' : '豁免规则已添加');
};
const remove = (r: ExemptRule) => {
  if (!window.confirm(`确认删除豁免规则「${r.name}」？删除后该类型不再豁免。`)) return;
  rules.value = rules.value.filter((x) => x.id !== r.id);
  pushToast('豁免规则已删除');
};
const toggle = (r: ExemptRule) => { r.enabled = !r.enabled; };

const save = () => {
  localStorage.setItem(KEY, JSON.stringify(rules.value));
  pushToast('豁免机制配置已保存');
};
const reset = () => {
  rules.value = structuredClone(DEFAULT_EXEMPTS);
  pushToast('已恢复默认豁免规则');
};
</script>

<template>
  <div class="qc-head qc-head-col">
    <div class="qc-title">豁免机制</div>
    <div class="qc-pm-sub">豁免按「类型 → 条件 → 方式」逐条命中：新品 / 新店 / 新链接 / 低样本 / 申诉中 商品当期不参与稽查评分</div>
  </div>
  <div class="qc-au-wrap">
    <div class="qc-au-banner">
      <span class="qc-au-banner-ico">!</span>
      <span>命中任一启用的豁免规则后，该商品当考核周期不参与稽查评分；减权系数按比例降低稽查权重，延迟考核顺延对应天数后再计入。</span>
    </div>

    <div class="qc-au-card">
      <div class="qc-au-card-hd">
        <span class="qc-au-card-t">豁免规则</span>
        <span class="qc-au-tip">共 {{ rules.length }} 条 · 生效 {{ rules.filter((r) => r.enabled).length }} 条</span>
        <button type="button" class="sg-btn primary sm" @click="openAdd">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 2.5v11M2.5 8h11" /></svg>
          新增豁免
        </button>
      </div>
      <table class="qc-au-tbl">
        <thead>
          <tr>
            <th style="width: 110px">豁免类型</th>
            <th>规则名称</th>
            <th>豁免条件</th>
            <th style="width: 130px">豁免方式</th>
            <th style="width: 170px">更新时间</th>
            <th style="width: 64px">生效</th>
            <th style="width: 110px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.id" :class="r.enabled ? '' : 'off'">
            <td><span class="qc-au-tag" :style="{ background: TYPE_META[r.type].bg, color: TYPE_META[r.type].color }">{{ r.type }}</span></td>
            <td>{{ r.name }}</td>
            <td class="qc-au-plat">{{ r.cond }}</td>
            <td>{{ modeText(r) }}</td>
            <td>{{ r.updatedAt }}</td>
            <td>
              <button type="button" class="qc-au-switch" :class="r.enabled ? 'on' : ''" @click="toggle(r)"><i /></button>
            </td>
            <td>
              <div class="qc-au-ops">
                <a @click="openEdit(r)">编辑</a>
                <a class="danger" @click="remove(r)">删除</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="qc-au-foot">
      <button type="button" class="sg-btn" @click="reset">恢复默认</button>
      <button type="button" class="sg-btn primary" @click="save">保存配置</button>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showModal" class="qc-au-mask" @mousedown.self="closeModal">
      <div class="qc-au-modal">
        <div class="qc-au-modal-hd">
          <span>{{ editing ? '编辑豁免规则' : '新增豁免规则' }}</span>
          <button type="button" class="qc-au-modal-x" @click="closeModal">×</button>
        </div>
        <div class="qc-au-modal-bd">
          <label class="qc-au-lab">豁免类型</label>
          <div class="qc-au-pills">
            <button v-for="t in EXEMPT_TYPES" :key="t" type="button" class="qc-au-pill" :class="form.type === t ? 'on' : ''" @click="pickType(t)">{{ t }}</button>
          </div>
          <label class="qc-au-lab">豁免条件</label>
          <div class="qc-au-conds">
            <template v-for="(c, i) in form.conds" :key="c.metric">
              <span v-if="i" class="qc-au-cond-or">或</span>
              <div class="qc-au-cond">
                <BubbleSelect class="qc-au-sel m" :options="metricOpts" :value="c.metric" @change="(v) => setCondMetric(c, v)" />
                <template v-if="metricDef(c).kind === 'num'">
                  <BubbleSelect class="qc-au-sel op" :options="opOpts" :value="c.op" @change="(v) => (c.op = v as ExemptOp)" />
                  <InputNumber v-model="c.value" :min="1" :max="9999" />
                  <span class="qc-au-unit">{{ metricDef(c).unit }}</span>
                </template>
                <BubbleSelect v-else class="qc-au-sel st" :options="stateOpts" :value="c.state" @change="(v) => (c.state = v)" />
                <button v-if="form.conds.length > 1" type="button" class="qc-au-cond-x" title="移除该条件" @click="removeCond(i)">×</button>
              </div>
            </template>
            <button v-if="unusedMetrics.length" type="button" class="qc-au-cond-add" @click="addCond">＋ 添加条件（或）</button>
            <div class="qc-au-cond-gen">规则名称：{{ genName }}</div>
          </div>
          <label class="qc-au-lab">豁免方式</label>
          <div class="qc-au-pills">
            <button v-for="m in EXEMPT_MODES" :key="m" type="button" class="qc-au-pill" :class="form.mode === m ? 'on' : ''" @click="pickMode(m as ExemptMode)">{{ m }}</button>
          </div>
          <div v-if="form.mode !== '免考核'" class="qc-au-mode-row">
            <span class="qc-au-lab">{{ form.mode === '减权系数' ? '减权系数' : '延迟考核' }}</span>
            <InputNumber v-if="form.mode === '减权系数'" :model-value="pct" :min="10" :max="90" :step="5" @update:model-value="setPct" />
            <InputNumber v-else v-model="form.value" :min="1" :max="365" />
            <span class="qc-au-unit">{{ form.mode === '减权系数' ? '%' : '天' }}</span>
          </div>
          <div class="qc-au-modal-sw">
            <span>立即生效</span>
            <button type="button" class="qc-au-switch" :class="form.enabled ? 'on' : ''" @click="form.enabled = !form.enabled"><i /></button>
          </div>
        </div>
        <div class="qc-au-modal-ft">
          <button type="button" class="sg-btn" @click="closeModal">取消</button>
          <button type="button" class="sg-btn primary" @click="submit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

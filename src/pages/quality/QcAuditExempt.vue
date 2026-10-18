<script setup lang="ts">
/* ---------- 稽查模型配置 · 豁免机制：类型 → 条件 → 方式 逐条命中，命中后该商品当期豁免稽查评分 ---------- */
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import {
  AUDIT_PLATS,
  DEFAULT_EXEMPTS,
  EXEMPT_METRICS,
  EXEMPT_MODES,
  EXEMPT_OPS,
  EXEMPT_TYPES,
  METRIC_BY_KEY,
  defaultCondOf,
  defaultCondsOf,
  exemptCondText,
  exemptNameText,
  type AuditPlat,
  type ExemptCond,
  type ExemptMode,
  type ExemptOp,
  type ExemptRule,
  type ExemptType,
} from './qcAuditData';
import { SHOP_LOGO } from './qcOnlineData';
import { pushToast } from '../../components/toast';

const KEY = 'funion:auditExempts';
const load = (): ExemptRule[] => {
  let list: ExemptRule[] | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) list = JSON.parse(raw) as ExemptRule[];
  } catch { /* 损坏回退默认 */ }
  const base = (list ?? structuredClone(DEFAULT_EXEMPTS)).filter((r) => (EXEMPT_TYPES as readonly string[]).includes(r.type));
  /* 旧数据缺新增类型（如新店豁免）：按默认清单一次性补齐，不影响已有类型 */
  const types = new Set(base.map((r) => r.type));
  const missing = DEFAULT_EXEMPTS.filter((d) => !types.has(d.type)).map((d) => structuredClone(d));
  /* 旧数据无配置条件：按类型回填默认配置并重生成名称/条件文案；旧数据无适用平台：商品/店铺维度回填淘宝 */
  return [...base, ...missing].map((r) => {
    const withPlat: ExemptRule = r.plat ? r : { ...r, plat: '淘宝' };
    if (withPlat.conds && withPlat.conds.length) return withPlat;
    const conds = defaultCondsOf(withPlat.type);
    return { ...withPlat, conds, name: exemptNameText(conds), cond: exemptCondText(conds) };
  });
};

const rules = ref<ExemptRule[]>(load());
const showModal = ref(false);
const editing = ref<ExemptRule | null>(null);
const form = ref<ExemptRule>({
  id: '', type: '新品豁免', plat: '淘宝', name: '', cond: '', conds: defaultCondsOf('新品豁免'), mode: '免考核', value: 0, enabled: true, updatedAt: '',
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
};
const modeText = (r: ExemptRule) => (r.mode === '免考核' ? '免考核' : r.mode === '减权系数' ? `减权 ×${r.value.toFixed(1)}` : `延迟 ${r.value} 天考核`);

/* 列表序：先按类型（同 EXEMPT_TYPES 序）再按平台（同 AUDIT_PLATS 序）；全平台通用的编码维度规则置末 */
const platIdx = (p?: AuditPlat) => (p ? AUDIT_PLATS.indexOf(p) : 99);
const sortedRules = computed(() =>
  [...rules.value].sort((a, b) => EXEMPT_TYPES.indexOf(a.type) - EXEMPT_TYPES.indexOf(b.type) || platIdx(a.plat) - platIdx(b.plat)),
);

const openAdd = () => {
  editing.value = null;
  form.value = { id: '', type: '新品豁免', plat: '淘宝', name: '', cond: '', conds: defaultCondsOf('新品豁免'), mode: '免考核', value: 0, enabled: true, updatedAt: '' };
  showModal.value = true;
};
const openEdit = (r: ExemptRule) => {
  editing.value = r;
  form.value = { ...r, conds: (r.conds && r.conds.length ? r.conds : defaultCondsOf(r.type)).map((c) => ({ ...c })) };
  showModal.value = true;
};
const closeModal = () => { showModal.value = false; };

/* ---------- 配置式条件：指标下拉 + 比较符 + 阈值，多条件「或」连接 ---------- */
const metricOpts = computed(() => EXEMPT_METRICS[form.value.type].map((m) => ({ value: m.key, label: m.label })));
const opOpts: string[] = [...EXEMPT_OPS];
const typeOpts: string[] = [...EXEMPT_TYPES];
const modeOpts: string[] = [...EXEMPT_MODES];
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
/* 减权系数以百分比配置（10%~90%），存储仍为 0~1 系数 */
const pct = computed(() => Math.round(form.value.value * 100));
const setPct = (v: number) => { form.value.value = v / 100; };
/* 数值盒（阈值/系数/天数）纯文本输入：仅取数字并夹取区间，清空即回落最小值 */
const setNum = (raw: string, min: number, max: number, apply: (n: number) => void) => {
  const d = raw.replace(/\D/g, '');
  apply(d === '' ? min : Math.min(max, Number(d)));
};

const submit = () => {
  if (!form.value.conds.length) return pushToast('请配置豁免条件');
  /* 同类型每平台仅一条：阈值就地编辑，禁重复挂同平台规则 */
  const dup = rules.value.find((x) => x.id !== editing.value?.id && x.type === form.value.type && x.plat === form.value.plat);
  if (dup) return pushToast(`「${form.value.plat ?? '全平台'}」已有${form.value.type}规则，请直接编辑该条`);
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
    <div class="qc-pm-sub">豁免按「类型 → 条件 → 方式」逐条命中：商品 / 店铺豁免按平台独立配置，各平台标准不通用</div>
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
            <th style="width: 110px">适用平台</th>
            <th>规则名称</th>
            <th>豁免条件</th>
            <th style="width: 130px">豁免方式</th>
            <th style="width: 170px">更新时间</th>
            <th style="width: 64px">生效</th>
            <th style="width: 110px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sortedRules" :key="r.id" :class="r.enabled ? '' : 'off'">
            <td><span class="qc-au-tag" :style="{ background: TYPE_META[r.type].bg, color: TYPE_META[r.type].color }">{{ r.type }}</span></td>
            <td>
              <span v-if="r.plat" class="qc-au-platchip"><img class="plat-logo" :src="SHOP_LOGO[r.plat]" :alt="r.plat">{{ r.plat }}</span>
              <span v-else class="qc-au-allplat">全平台通用</span>
            </td>
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

    <!-- 新增/编辑豁免规则：右侧抽屉表单（标签居上 + 红星必填 + 全宽下拉 + 行式条件组） -->
    <template v-if="showModal">
      <div class="drawer-mask" @click="closeModal" />
      <div class="drawer qc-au-dr">
        <div class="drawer-head">
          <div class="d-title">{{ editing ? '编辑豁免规则' : '新增豁免规则' }}</div>
          <span class="x" @click="closeModal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </span>
        </div>
        <div class="drawer-body">
          <div class="sg-field">
            <label>豁免类型<span class="qc-au-req">*</span></label>
            <BubbleSelect class-name="sg-select" :options="typeOpts" :value="form.type" @change="(v: string) => pickType(v as ExemptType)" />
          </div>
          <!-- 适用平台：商品/店铺维度按平台独立配置，四平台图标胶囊单选；同类型每平台仅一条 -->
          <div class="sg-field">
            <label>适用平台<span class="qc-au-req">*</span></label>
            <div class="qc-au-platpills">
              <button v-for="p in AUDIT_PLATS" :key="p" type="button" class="qc-au-platpill" :class="form.plat === p ? 'on' : ''" @click="form.plat = p">
                <img class="plat-logo" :src="SHOP_LOGO[p]" :alt="p">{{ p }}
              </button>
            </div>
          </div>
          <div class="sg-field">
            <label>豁免条件<span class="qc-au-req">*</span></label>
            <div class="qc-au-rows">
              <div v-for="(c, i) in form.conds" :key="c.metric" class="qc-au-row">
                <span class="qc-au-when">{{ i ? '或' : '当' }}</span>
                <BubbleSelect class="qc-au-metric" class-name="sg-select" :options="metricOpts" :value="c.metric" @change="(v: string) => setCondMetric(c, v)" />
                <BubbleSelect class="qc-au-op" class-name="sg-select" :options="opOpts" :value="c.op" @change="(v: string) => (c.op = v as ExemptOp)" />
                <div class="qc-au-val">
                  <input :value="String(c.value)" inputmode="numeric" placeholder="阈值" @input="setNum(($event.target as HTMLInputElement).value, 1, 9999, (n) => (c.value = n))" />
                  <span class="qc-au-vunit">{{ metricDef(c).unit }}</span>
                </div>
                <button v-if="form.conds.length > 1" type="button" class="qc-au-del" title="删除条件" @click="removeCond(i)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
              <div v-if="unusedMetrics.length">
                <button type="button" class="qc-au-addcond" @click="addCond">添加条件</button>
              </div>
            </div>
          </div>
          <div class="sg-field">
            <label>规则名称</label>
            <input class="sg-input qc-au-readonly" :value="genName" readonly />
          </div>
          <div class="sg-field">
            <label>豁免方式<span class="qc-au-req">*</span></label>
            <BubbleSelect class-name="sg-select" :options="modeOpts" :value="form.mode" @change="(v: string) => pickMode(v as ExemptMode)" />
          </div>
          <div v-if="form.mode !== '免考核'" class="sg-field">
            <label>{{ form.mode === '减权系数' ? '减权系数' : '延迟考核' }}<span class="qc-au-req">*</span></label>
            <div class="qc-au-val qc-au-val-short">
              <input
                v-if="form.mode === '减权系数'"
                :value="String(pct)"
                inputmode="numeric"
                @input="setNum(($event.target as HTMLInputElement).value, 10, 90, setPct)"
              />
              <input v-else :value="String(form.value)" inputmode="numeric" @input="setNum(($event.target as HTMLInputElement).value, 1, 365, (n) => (form.value = n))" />
              <span class="qc-au-vunit">{{ form.mode === '减权系数' ? '%' : '天' }}</span>
            </div>
          </div>
          <div class="sg-field">
            <label>立即生效</label>
            <div class="qc-au-swrow">
              <button type="button" class="qc-au-switch" :class="form.enabled ? 'on' : ''" @click="form.enabled = !form.enabled"><i /></button>
              <span class="qc-au-swtext">{{ form.enabled ? '保存后即刻参与豁免判定' : '暂不生效' }}</span>
            </div>
          </div>
        </div>
        <div class="drawer-foot">
          <button type="button" class="btn" @click="closeModal">取消</button>
          <button type="button" class="btn primary" @click="submit">保存</button>
        </div>
      </div>
    </template>
  </div>
</template>

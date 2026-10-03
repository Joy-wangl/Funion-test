<script setup lang="ts">
/* ---------- 问题商品定义（品控-线上）：垃圾品判定口径配置；订单/售后单/评价/会话四维度条件行，多条以「且」连接 ---------- */
import { computed, ref } from 'vue';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';

interface DefCond { key: string; conj: 'and' | 'or'; dim: string; metric: string; op: string; vText: string; }
interface DefState { createRange: string; cycle: string; cycleTime: string; conds: DefCond[]; }

/** 维度 → 指标池（单位跟随指标自动带出，无需单独选择） */
const DIM_METRICS: Record<string, { name: string; unit: string }[]> = {
  订单: [{ name: '订单量', unit: '单' }, { name: '退货率', unit: '%' }],
  售后单: [{ name: '售后单量', unit: '单' }, { name: '问题售后单量', unit: '单' }, { name: '售后占比', unit: '%' }],
  评价: [{ name: '评价数', unit: '条' }, { name: '差评数', unit: '条' }, { name: '差评率', unit: '%' }],
  会话: [{ name: '会话数', unit: '条' }, { name: '风险会话数', unit: '条' }, { name: '聊天风险率', unit: '%' }],
};
const DIMS = Object.keys(DIM_METRICS);
const OPS = ['>', '≥', '<', '≤'];
const CREATE_RANGES = ['近 30 天', '近 90 天', '近 180 天', '近 1 年'];
const CYCLES = ['每天', '每周', '每月'];
const unitOf = (dim: string, metric: string) => DIM_METRICS[dim]?.find((m) => m.name === metric)?.unit ?? '';

let seq = 0;
const newCond = (): DefCond => ({ key: `c${++seq}`, conj: 'and', dim: DIMS[0], metric: DIM_METRICS[DIMS[0]][0].name, op: '>', vText: '' });
const defaultState = (): DefState => ({
  createRange: '近 1 年',
  cycle: '每天',
  cycleTime: '09:00',
  conds: [{ key: `c${++seq}`, conj: 'and', dim: '订单', metric: '退货率', op: '>', vText: '10' }],
});
const clone = (s: DefState): DefState => ({ ...s, conds: s.conds.map((c) => ({ ...c })) });

/* 已保存口径置于模块级：切换侧栏再返回仍保留上次保存结果 */
let saved: DefState = defaultState();
const draft = ref<DefState>(clone(saved));

/* 默认查看态：口径只读呈现，避免误触；点击「编辑」进入编辑态，取消/保存后回到查看态 */
const editing = ref(false);
const startEdit = () => { draft.value = clone(saved); editing.value = true; };

const setDim = (c: DefCond, v: string) => { c.dim = v; c.metric = DIM_METRICS[v][0].name; };
const addCond = () => { draft.value.conds.push(newCond()); };
const removeCond = (i: number) => { draft.value.conds.splice(i, 1); };
const rowValid = (r: DefCond) => r.vText.trim() !== '' && Number.isFinite(Number(r.vText)) && Number(r.vText) >= 0;
const condText = (c: DefCond) => `${c.metric} ${c.op} ${c.vText}${unitOf(c.dim, c.metric)}`;
const condChips = computed(() => draft.value.conds.filter(rowValid).map((c) => ({ t: condText(c), conj: c.conj })));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved));

const save = () => {
  if (!draft.value.conds.length) { pushToast('请至少配置一条判定条件'); return; }
  if (!draft.value.conds.every(rowValid)) { pushToast('请补全判定条件阈值后再保存'); return; }
  saved = clone(draft.value);
  editing.value = false;
  pushToast(`已保存问题商品定义，共 ${saved.conds.length} 条判定条件`);
};
const cancel = () => { draft.value = clone(saved); editing.value = false; };
</script>

<template>
  <div class="qc-pd-page">
    <div class="qc-head">
      <div class="qc-title">
        问题商品定义
        <span class="qc-desc">配置垃圾品判定口径 · 保存后按循环执行周期生效</span>
      </div>
      <button v-if="!editing" class="sg-btn primary" @click="startEdit">编辑</button>
    </div>
    <div class="pd-panel">
      <div class="pd-banner">
        配置问题商品判定条件，多条之间以「且 / 或」连接；命中条件组合且在创建时间周期内创建的商品将被标记为问题商品。
      </div>
      <div class="pd-row">
        <label>创建时间周期</label>
        <BubbleSelect v-if="editing" class-name="sg-select pd-select" :value="draft.createRange" :options="CREATE_RANGES" @change="(v: string) => (draft.createRange = v)" />
        <span v-else class="pd-view-text pd-view-select">{{ draft.createRange }}</span>
        <span class="pd-hint">仅周期内创建的商品参与问题商品判定</span>
      </div>
      <div class="pd-row">
        <label>循环执行周期</label>
        <BubbleSelect v-if="editing" class-name="sg-select pd-select" :value="draft.cycle" :options="CYCLES" @change="(v: string) => (draft.cycle = v)" />
        <input v-if="editing" type="time" class="pd-time" :value="draft.cycleTime" @input="draft.cycleTime = ($event.target as HTMLInputElement).value">
        <template v-else>
          <span class="pd-view-text">{{ draft.cycle }}</span>
          <span class="pd-view-text">{{ draft.cycleTime }}</span>
        </template>
        <span class="pd-hint">按此频率重复执行问题商品判定</span>
      </div>
      <div class="pd-conds">
        <div v-for="(c, i) in draft.conds" :key="c.key" class="pd-cond">
          <span class="pd-idx">{{ i + 1 }}</span>
          <span v-if="i === 0" class="pd-when">当</span>
          <BubbleSelect
            v-else-if="editing"
            class-name="sg-select pd-conj-sel"
            :value="c.conj === 'or' ? '或' : '且'"
            :options="['且', '或']"
            @change="(v: string) => (c.conj = v === '或' ? 'or' : 'and')"
          />
          <span v-else class="pd-view-text pd-view-conj">{{ c.conj === 'or' ? '或' : '且' }}</span>
          <template v-if="editing">
            <BubbleSelect class-name="sg-select pd-dim" :value="c.dim" :options="DIMS" @change="(v: string) => setDim(c, v)" />
            <BubbleSelect class-name="sg-select pd-metric" :value="c.metric" :options="DIM_METRICS[c.dim].map((m) => m.name)" @change="(v: string) => (c.metric = v)" />
            <BubbleSelect class-name="sg-select pd-op" :value="c.op" :options="OPS" @change="(v: string) => (c.op = v)" />
            <div class="pd-val">
              <input inputmode="decimal" placeholder="阈值" :value="c.vText" @input="c.vText = ($event.target as HTMLInputElement).value">
              <span class="pd-unit">{{ unitOf(c.dim, c.metric) }}</span>
            </div>
            <button type="button" class="pd-del" aria-label="删除条件" @click="removeCond(i)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
            </button>
          </template>
          <template v-else>
            <span class="pd-view-text pd-view-dim">{{ c.dim }}</span>
            <span class="pd-view-text pd-view-metric">{{ c.metric }}</span>
            <span class="pd-view-text pd-view-op">{{ c.op }}</span>
            <span class="pd-view-text pd-view-val">{{ c.vText }}{{ unitOf(c.dim, c.metric) }}</span>
          </template>
        </div>
        <div v-if="!draft.conds.length" class="pd-empty">暂无判定条件，点击新增条件开始配置</div>
        <div v-if="editing">
          <button type="button" class="pd-add" @click="addCond">+ 新增条件</button>
        </div>
      </div>
      <div class="pd-summary">
        <span class="pd-summary-label">当前条件</span>
        <template v-for="(c, i) in condChips" :key="`c${i}`">
          <span v-if="i > 0" class="pd-conj">{{ c.conj === 'or' ? '或' : '且' }}</span>
          <span class="pd-chip">{{ c.t }}</span>
        </template>
        <template v-if="condChips.length">
          <span class="pd-conj">且</span>
          <span class="pd-chip">创建时间 {{ draft.createRange }}</span>
        </template>
        <span class="pd-conj">·</span>
        <span class="pd-chip">循环执行 {{ draft.cycle }} {{ draft.cycleTime }}</span>
      </div>
    </div>
    <div v-if="editing" class="pd-foot">
      <button class="sg-btn" @click="cancel">取消</button>
      <button class="sg-btn primary" :disabled="!dirty" @click="save">保存</button>
    </div>
  </div>
</template>

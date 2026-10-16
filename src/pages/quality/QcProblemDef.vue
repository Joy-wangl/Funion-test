<script setup lang="ts">
/* ---------- 问题商品定义（品控-线上）：单一配置模块＝系列编码判定口径（售后/聊天记录/评价三维度条件行）
   ＋店铺分评级配置（各平台分值阈值对应 S/A/B/C/D 等级）；创建时间周期与循环执行周期为全局口径 ---------- */
import { computed, ref } from 'vue';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { SHOP_GRADE_CFG, SHOP_GRADE_PLATS } from './qcOnlineData';
import type { ShopGradeCfg, ShopGradePlat } from './qcOnlineData';

interface DefCond { key: string; conj: 'and' | 'or'; metric: string; op: string; vText: string; }
type DimKey = 'after' | 'chat' | 'review';
interface ShopGradeTexts { s: string; a: string; b: string; c: string; }
interface DefState { createRange: string; cycle: string; cycleTime: string; shopGrades: Record<ShopGradePlat, ShopGradeTexts>; conds: Record<DimKey, DefCond[]>; }

/** 维度 tab → 指标池（单位跟随指标自动带出，无需单独选择） */
const DIM_TABS: { key: DimKey; label: string; metrics: { name: string; unit: string }[] }[] = [
  {
    key: 'after', label: '售后维度',
    metrics: [
      { name: '订单量', unit: '单' }, { name: '退货率', unit: '%' },
      { name: '售后单量', unit: '单' }, { name: '问题售后单量', unit: '单' }, { name: '售后占比', unit: '%' },
    ],
  },
  {
    key: 'chat', label: '聊天记录维度',
    metrics: [{ name: '会话数', unit: '条' }, { name: '风险会话数', unit: '条' }, { name: '聊天风险率', unit: '%' }],
  },
  {
    key: 'review', label: '评价维度',
    metrics: [{ name: '评价数', unit: '条' }, { name: '负面评价条数', unit: '条' }, { name: '差评率', unit: '%' }],
  },
];
const OPS = ['>', '≥', '<', '≤'];
const CREATE_RANGES = ['近 30 天', '近 90 天', '近 180 天', '近 1 年'];
const CYCLES = ['每天', '每周', '每月'];
/* 评级配置表列：S/A/B/C 四档可配分值阈值（≥），D 档由「低于 C 档阈值」自动得出，无需单独配置 */
const GC_KEYS: { k: keyof ShopGradeTexts; g: string }[] = [
  { k: 's', g: 'S' }, { k: 'a', g: 'A' }, { k: 'b', g: 'B' }, { k: 'c', g: 'C' },
];
const textsOfCfg = (): Record<ShopGradePlat, ShopGradeTexts> => {
  const out = {} as Record<ShopGradePlat, ShopGradeTexts>;
  for (const p of SHOP_GRADE_PLATS) {
    const c = SHOP_GRADE_CFG[p];
    out[p] = { s: String(c.minS), a: String(c.minA), b: String(c.minB), c: String(c.minC) };
  }
  return out;
};

/* 模块顶层两个配置 tab：编码配置（系列编码判定口径）/ 店铺评分配置（分值→等级阈值） */
const cfgTab = ref<'code' | 'shop'>('code');
const tab = ref<DimKey>('after');
const tabDef = computed(() => DIM_TABS.find((t) => t.key === tab.value) ?? DIM_TABS[0]);
const unitOf = (metric: string) => tabDef.value.metrics.find((m) => m.name === metric)?.unit ?? '';

let seq = 0;
const newCond = (): DefCond => ({ key: `c${++seq}`, conj: 'and', metric: tabDef.value.metrics[0].name, op: '>', vText: '' });
const defaultState = (): DefState => ({
  createRange: '近 1 年',
  cycle: '每天',
  cycleTime: '09:00',
  shopGrades: textsOfCfg(),
  conds: {
    after: [{ key: `c${++seq}`, conj: 'and', metric: '退货率', op: '>', vText: '10' }],
    chat: [],
    review: [],
  },
});
const clone = (s: DefState): DefState => ({
  ...s,
  shopGrades: Object.fromEntries(Object.entries(s.shopGrades).map(([p, t]) => [p, { ...t }])) as Record<ShopGradePlat, ShopGradeTexts>,
  conds: { after: s.conds.after.map((c) => ({ ...c })), chat: s.conds.chat.map((c) => ({ ...c })), review: s.conds.review.map((c) => ({ ...c })) },
});

/* 已保存口径置于模块级：切换侧栏再返回仍保留上次保存结果 */
let saved: DefState = defaultState();
const draft = ref<DefState>(clone(saved));

/* 默认查看态：口径只读呈现，避免误触；点击「编辑」进入编辑态，取消/保存后回到查看态 */
const editing = ref(false);
const startEdit = () => { draft.value = clone(saved); editing.value = true; };

const curConds = computed(() => draft.value.conds[tab.value]);
const allConds = computed(() => [...draft.value.conds.after, ...draft.value.conds.chat, ...draft.value.conds.review]);
const addCond = () => { curConds.value.push(newCond()); };
const removeCond = (i: number) => { curConds.value.splice(i, 1); };
const rowValid = (r: DefCond) => r.vText.trim() !== '' && Number.isFinite(Number(r.vText)) && Number(r.vText) >= 0;
const condText = (c: DefCond) => `${c.metric} ${c.op} ${c.vText}${unitOf(c.metric)}`;
const condChips = computed(() => curConds.value.filter(rowValid).map((c) => ({ t: condText(c), conj: c.conj })));
/* 评级阈值校验：0–5 的分值、且同平台满足 S ≥ A ≥ B ≥ C；D 档由 C 档阈值自动得出 */
const parseShopGrades = (): Record<ShopGradePlat, ShopGradeCfg> | null => {
  const out = {} as Record<ShopGradePlat, ShopGradeCfg>;
  for (const p of SHOP_GRADE_PLATS) {
    const t = draft.value.shopGrades[p];
    const n = [t.s, t.a, t.b, t.c].map((x) => Number(String(x).trim()));
    if (n.some((x) => !Number.isFinite(x) || x < 0 || x > 5)) return null;
    if (!(n[0] >= n[1] && n[1] >= n[2] && n[2] >= n[3])) return null;
    out[p] = { minS: n[0], minA: n[1], minB: n[2], minC: n[3] };
  }
  return out;
};
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved));

const save = () => {
  if (!allConds.value.length) { pushToast('请至少配置一条判定条件'); return; }
  if (!allConds.value.every(rowValid)) { pushToast('请补全判定条件阈值后再保存'); return; }
  const cfg = parseShopGrades();
  if (!cfg) { pushToast('店铺分评级配置有误：分值需为 0–5 且满足 S ≥ A ≥ B ≥ C'); return; }
  for (const p of SHOP_GRADE_PLATS) Object.assign(SHOP_GRADE_CFG[p], cfg[p]);
  saved = clone(draft.value);
  editing.value = false;
  pushToast(`已保存问题商品定义，共 ${allConds.value.length} 条判定条件，店铺分评级配置已生效`);
};
const cancel = () => { draft.value = clone(saved); editing.value = false; };
</script>

<template>
  <div class="qc-pd-page">
    <div class="qc-head">
      <div class="qc-title">
        问题商品定义
      </div>
      <button v-if="!editing" class="sg-btn primary" @click="startEdit">编辑</button>
    </div>
    <div class="pd-panel">
      <div class="pd-banner">
        本模块分两类配置：编码配置决定系列编码标记为问题商品的判定口径（命中条件组合且在创建时间周期内创建）；店铺评分配置定义各平台分值对应的 S / A / B / C / D 等级阈值。
      </div>
      <div class="pd-cfg-tabs">
        <button type="button" :class="{ active: cfgTab === 'code' }" @click="cfgTab = 'code'">编码配置</button>
        <button type="button" :class="{ active: cfgTab === 'shop' }" @click="cfgTab = 'shop'">店铺评分配置</button>
      </div>
      <template v-if="cfgTab === 'code'">
      <div class="qc-range-toggle pd-tabs">
        <button v-for="t in DIM_TABS" :key="t.key" type="button" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
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
        <div v-for="(c, i) in curConds" :key="c.key" class="pd-cond">
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
            <BubbleSelect class-name="sg-select pd-metric" :value="c.metric" :options="tabDef.metrics.map((m) => m.name)" @change="(v: string) => (c.metric = v)" />
            <BubbleSelect class-name="sg-select pd-op" :value="c.op" :options="OPS" @change="(v: string) => (c.op = v)" />
            <div class="pd-val">
              <input inputmode="decimal" placeholder="阈值" :value="c.vText" @input="c.vText = ($event.target as HTMLInputElement).value">
              <span class="pd-unit">{{ unitOf(c.metric) }}</span>
            </div>
            <button type="button" class="pd-del" aria-label="删除条件" @click="removeCond(i)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
            </button>
          </template>
          <template v-else>
            <span class="pd-view-text pd-view-metric">{{ c.metric }}</span>
            <span class="pd-view-text pd-view-op">{{ c.op }}</span>
            <span class="pd-view-text pd-view-val">{{ c.vText }}{{ unitOf(c.metric) }}</span>
          </template>
        </div>
        <div v-if="!curConds.length" class="pd-empty">暂无判定条件，点击新增条件开始配置</div>
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
      </template>
      <template v-else>
      <div class="pd-gc-note">
        按平台配置分值对应等级的阈值（S 最优质、D 最高风险）；D 档为「低于 C 档阈值」自动得出；保存后店铺分监控的评级同步生效。
      </div>
      <div class="pd-gc">
        <div class="pd-gc-row pd-gc-head">
          <span>平台</span>
          <span>S 级</span>
          <span>A 级</span>
          <span>B 级</span>
          <span>C 级</span>
          <span>D 级</span>
        </div>
        <div v-for="p in SHOP_GRADE_PLATS" :key="p" class="pd-gc-row">
          <span class="pd-gc-plat">{{ p }}</span>
          <template v-if="editing">
            <span v-for="g in GC_KEYS" :key="g.k" class="pd-gc-cell">
              <i>≥</i>
              <input inputmode="decimal" :value="draft.shopGrades[p][g.k]" @input="draft.shopGrades[p][g.k] = ($event.target as HTMLInputElement).value">
            </span>
          </template>
          <template v-else>
            <span v-for="g in GC_KEYS" :key="g.k" class="pd-gc-cell view">≥ {{ draft.shopGrades[p][g.k] }}</span>
          </template>
          <span class="pd-gc-cell dim">&lt; {{ draft.shopGrades[p].c }}</span>
        </div>
      </div>
      </template>
    </div>
    <div v-if="editing" class="pd-foot">
      <button class="sg-btn" @click="cancel">取消</button>
      <button class="sg-btn primary" :disabled="!dirty" @click="save">保存</button>
    </div>
  </div>
</template>

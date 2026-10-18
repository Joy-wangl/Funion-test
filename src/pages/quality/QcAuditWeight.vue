<script setup lang="ts">
/* ---------- 稽查模型配置 · 权重配置：页首平台切换（各平台权重不一致）＋总分三维权重 + 出分门槛 + 维度指标权重/档位线 ---------- */
import { computed, ref } from 'vue';
import { AUDIT_PLATS, PLATFORM_PRESETS, type AuditDim, type AuditGate, type AuditPlat, type AuditWeights } from './qcAuditData';
import { SHOP_LOGO } from './qcOnlineData';
import { pushToast } from '../../components/toast';

const KEY = 'funion:auditWeights';
/* 旧版门槛为全局字段：读取时回填为三维同值，保持已存配置不丢 */
type LegacyWeights = Pick<AuditWeights, 'dims' | 'indicators'> & Partial<Record<'cycleDays' | 'minOrders' | 'minReviews' | 'minChats', number>> & { gates?: Record<AuditDim, AuditGate> };
/* 存储按平台分键：funion:auditWeights:<平台>；无后缀旧键视为淘宝 */
const keyOf = (p: AuditPlat) => (p === '淘宝' ? KEY : `${KEY}:${p}`);
const load = (p: AuditPlat): AuditWeights => {
  let parsed: LegacyWeights | null = null;
  try {
    const raw = localStorage.getItem(keyOf(p));
    if (raw) parsed = JSON.parse(raw) as LegacyWeights;
  } catch { /* 损坏回退预设 */ }
  if (!parsed) return structuredClone(PLATFORM_PRESETS[p]);
  const base: LegacyWeights = parsed;
  if (base.gates) return { dims: base.dims, indicators: base.indicators, gates: base.gates };
  const g: AuditGate = { cycleDays: base.cycleDays ?? 30, minOrders: base.minOrders ?? 30, minReviews: base.minReviews ?? 30, minChats: base.minChats ?? 100 };
  return { dims: base.dims, indicators: base.indicators, gates: { 商品: { ...g }, 物流: { ...g }, 服务: { ...g } } };
};

/* 各平台配置独立持有：切换页签即整页换口径，编辑态切换先回滚 */
const plat = ref<AuditPlat>('淘宝');
const byPlat = ref<Record<AuditPlat, AuditWeights>>(
  AUDIT_PLATS.reduce((acc, p) => ({ ...acc, [p]: load(p) }), {} as Record<AuditPlat, AuditWeights>),
);
const w = computed(() => byPlat.value[plat.value]);
const DIMS: AuditDim[] = ['商品', '物流', '服务'];
const CYCLE_OPTS = [30, 60, 90];
/* 三维指标权重并列分组：分段胶囊 tab 切换、单组展示（色点沿用体验分三维趋势色） */
const dimTab = ref<AuditDim>('商品');
const DIM_COLOR: Record<AuditDim, string> = { 商品: '#00b42a', 物流: '#ff7d00', 服务: '#f53f3f' };
const indsOf = (d: AuditDim) => w.value.indicators.filter((x) => x.dim === d);
/* 出分门槛随维度页签切换：当前 tab 即当前维度的门槛配置 */
const gate = computed(() => w.value.gates[dimTab.value]);
const dimSum = computed(() => DIMS.reduce((a, d) => a + w.value.dims[d], 0));
const indSum = (d: AuditDim) => w.value.indicators.filter((x) => x.dim === d).reduce((a, b) => a + b.weight, 0);

const setDim = (d: AuditDim, v: number) => { w.value.dims[d] = Math.max(0, Math.min(100, Math.round(v) || 0)); };
const setInd = (key: string, patch: Partial<{ weight: number; fullLine: number; zeroLine: number }>) => {
  const ind = w.value.indicators.find((x) => x.key === key);
  if (!ind) return;
  Object.assign(ind, patch);
};

const save = () => {
  if (dimSum.value !== 100) return pushToast(`总分三维权重合计需为 100%（当前 ${dimSum.value}%），请调整后再保存`);
  for (const d of DIMS) {
    const s = indSum(d);
    if (s !== 100) return pushToast(`${d}分维度内指标权重合计需为 100%（当前 ${s}%），请调整后再保存`);
  }
  localStorage.setItem(keyOf(plat.value), JSON.stringify(w.value));
  editing.value = false;
  snapshot = null;
  pushToast(`「${plat.value}」权重配置已保存`);
};
const reset = () => {
  byPlat.value[plat.value] = structuredClone(PLATFORM_PRESETS[plat.value]);
  pushToast(`已恢复「${plat.value}」默认权重配置`);
};

/* 默认只读态：编辑入口进入编辑，取消回滚快照，保存成功后回到只读 */
const editing = ref(false);
let snapshot: AuditWeights | null = null;
const startEdit = () => { snapshot = JSON.parse(JSON.stringify(w.value)) as AuditWeights; editing.value = true; };
const cancelEdit = () => {
  if (snapshot) byPlat.value[plat.value] = snapshot;
  snapshot = null;
  editing.value = false;
  closeTip();
};
/* 平台切换：编辑中先回滚当前平台改动，避免快照跨平台串味 */
const setPlat = (p: AuditPlat) => {
  if (p === plat.value) return;
  if (editing.value) cancelEdit();
  plat.value = p;
  closeTip();
};

const dimCn: Record<AuditDim, string> = { 商品: '商品分', 物流: '物流分', 服务: '服务分' };
/* 对标平台指标为注释型口径：不占表格列，指标名后提示 icon 点击弹气泡展示
   （气泡 Teleport 到 body 固定定位，避免表格圆角 overflow 裁剪） */
const tipKey = ref<string | null>(null);
const tipPos = ref<{ top: number; left: number } | null>(null);
const tipInd = computed(() => w.value.indicators.find((x) => x.key === tipKey.value) ?? null);
const closeTip = () => { tipKey.value = null; tipPos.value = null; };
const toggleTip = (e: MouseEvent, key: string) => {
  if (tipKey.value === key) return closeTip();
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  tipKey.value = key;
  tipPos.value = { top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 356)) };
};
</script>

<template>
  <div class="qc-au-wrap qc-au-onewrap">
    <div class="qc-head qc-au-head">
      <div class="qc-title">权重配置</div>
      <button v-if="!editing" type="button" class="sg-btn primary sm" @click="startEdit">编辑</button>
    </div>
    <!-- 页首平台切换：下划线 tab（同店铺列表页首平台行语言）＋官方图标；各平台权重独立配置、切换即生效 -->
    <div class="qc-au-platbar">
      <div class="tc-typerow">
        <button
          v-for="p in AUDIT_PLATS"
          :key="p"
          type="button"
          class="tc-typeitem"
          :class="plat === p ? 'active' : ''"
          @click="setPlat(p)"
        >
          <img class="plat-logo" :src="SHOP_LOGO[p]" :alt="p">{{ p }}
        </button>
      </div>
    </div>
    <!-- 总分权重 -->
    <div class="qc-au-card">
      <div class="qc-au-card-hd">
        <span class="qc-au-card-t">总分权重分配</span>
        <span class="qc-au-sum" :class="dimSum !== 100 ? 'bad' : ''">合计 {{ dimSum }}%</span>
      </div>
      <div class="qc-au-dims">
        <div v-for="d in DIMS" :key="d" class="qc-au-dim">
          <div class="qc-au-dim-name">{{ dimCn[d] }}</div>
          <div class="qc-au-dim-ctrl">
            <input class="qc-au-num" type="number" min="0" max="100" :value="w.dims[d]" :disabled="!editing" @input="setDim(d, Number(($event.target as HTMLInputElement).value))">
            <span class="qc-au-unit">%</span>
          </div>
          <div class="qc-au-dim-bar"><i :style="{ width: `${w.dims[d]}%` }" /></div>
        </div>
      </div>
    </div>

    <!-- 维度指标权重与档位线：三维并列分组以 tab 切换，单组展示 -->
    <div class="qc-au-card">
      <div class="qc-au-card-hd qc-au-dimtabs">
        <div class="qc-mode-tabs qc-au-dim-tabs">
          <button v-for="d in DIMS" :key="d" type="button" :class="dimTab === d ? 'active' : ''" @click="dimTab = d; closeTip()">
            <i :style="{ background: DIM_COLOR[d] }"></i>{{ dimCn[d] }}<em class="n">{{ indsOf(d).length }}</em>
          </button>
        </div>
        <span class="qc-au-sum" :class="indSum(dimTab) !== 100 ? 'bad' : ''">合计 {{ indSum(dimTab) }}%</span>
      </div>
      <!-- 出分门槛随 tab 归属到对应维度：切到哪个页签配置哪个维度的门槛 -->
      <div class="qc-au-gate qc-au-gate-in">
        <div class="qc-au-gate-row">
          <label class="qc-au-lab">考核周期</label>
          <div class="qc-au-pills">
            <button v-for="c in CYCLE_OPTS" :key="c" type="button" class="qc-au-pill" :class="gate.cycleDays === c ? 'on' : ''" :disabled="!editing" @click="gate.cycleDays = c">近{{ c }}天</button>
          </div>
          <label class="qc-au-lab">周期最小订单数</label>
          <input class="qc-au-num" type="number" min="1" :value="gate.minOrders" :disabled="!editing" @input="gate.minOrders = Math.max(1, Math.round(Number(($event.target as HTMLInputElement).value) || 1))">
          <label class="qc-au-lab">评价样本门槛</label>
          <input class="qc-au-num" type="number" min="1" :value="gate.minReviews" :disabled="!editing" @input="gate.minReviews = Math.max(1, Math.round(Number(($event.target as HTMLInputElement).value) || 1))">
          <label class="qc-au-lab">会话样本门槛</label>
          <input class="qc-au-num" type="number" min="1" :value="gate.minChats" :disabled="!editing" @input="gate.minChats = Math.max(1, Math.round(Number(($event.target as HTMLInputElement).value) || 1))">
        </div>
      </div>
      <table class="qc-au-tbl qc-au-wtbl">
        <thead>
          <tr>
            <th>指标</th>
            <th>数据来源</th>
            <th>权重(%)</th>
            <th>满分线</th>
            <th>零分线</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ind in indsOf(dimTab)" :key="ind.key">
            <td>
              <span class="qc-au-ind-name">
                {{ ind.name }}
                <button
                  type="button"
                  class="qc-au-info"
                  :class="{ on: tipKey === ind.key }"
                  title="对标平台指标"
                  @click.stop="toggleTip($event, ind.key)"
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6.2" /><path d="M8 7.4v3.2M8 5.2v.2" /></svg>
                </button>
              </span>
            </td>
            <td><span class="qc-au-src">{{ ind.src }}</span></td>
            <td><input class="qc-au-num sm" type="number" min="0" max="100" :value="ind.weight" :disabled="!editing" @input="setInd(ind.key, { weight: Math.max(0, Math.min(100, Math.round(Number(($event.target as HTMLInputElement).value) || 0))) })"></td>
            <td><input class="qc-au-num sm" type="number" min="0" step="0.1" :value="ind.fullLine" :disabled="!editing" @input="setInd(ind.key, { fullLine: Number(($event.target as HTMLInputElement).value) || 0 })"></td>
            <td><input class="qc-au-num sm" type="number" min="0" step="0.1" :value="ind.zeroLine" :disabled="!editing" @input="setInd(ind.key, { zeroLine: Number(($event.target as HTMLInputElement).value) || 0 })"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="editing" class="qc-au-foot">
      <button type="button" class="sg-btn" @click="reset">恢复默认</button>
      <button type="button" class="sg-btn" @click="cancelEdit">取消</button>
      <button type="button" class="sg-btn primary" @click="save">保存配置</button>
    </div>
    <div v-if="tipKey" class="qc-au-info-mask" @click="closeTip"></div>
    <Teleport to="body">
      <span v-if="tipInd && tipPos" class="qc-au-info-pop" :style="{ top: `${tipPos.top}px`, left: `${tipPos.left}px` }" @click.stop>
        <span class="qc-au-info-pop-t">对标平台指标</span>
        {{ tipInd.platform }}
      </span>
    </Teleport>
  </div>
</template>

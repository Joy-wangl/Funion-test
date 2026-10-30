<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { DS_COND_METRICS, DS_CUT_METRICS, DS_COND_OPS, type DsCond, type DsStrategy } from './strategyData';

/** 动销策略（控价玩法）新建/详情抽屉：
 * 利润率设置 → 初始涨价（出单即涨） → 再涨价判断（观察后是否继续涨） → 降价判断（观察期内何时回退） → 回退规则 → 备注
 * 业务闭环：发布商品 → 观察出单 → 小幅涨价 → 继续观察销量/动销天数 → 满足条件再涨，否则触发降价 → 循环直至退出。
 */
const props = defineProps<{ model: DsStrategy | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'save', d: Omit<DsStrategy, 'id' | 'creator' | 'createdAt' | 'status' | 'platforms'>): void }>();

const readonly = computed(() => !!props.model);

interface DsForm {
  name: string;
  floorRate: string;
  targetRate: string;
  stepRate: string;
  riseConds: DsCond[];
  cutConds: DsCond[];
  observeDays: string;
  rollbackPct: string;
  zeroTimeoutDays: string;
  remark: string;
}
/* 再涨价判断默认行：销量涨幅(%) + 动销天数；移除调价间隔，避免与回退规则里的观察期冲突 */
const defaultConds = (): DsCond[] => [
  { conj: '且', metric: '销量涨幅', op: '≥', val: '10', unit: '%' },
  { conj: '且', metric: '动销天数', op: '≥', val: '2', unit: '天' },
];
/* 降价判断默认行：无订单天数 / 销量降幅(%) / 无动销天数，任一触发即回退 */
const defaultCutConds = (): DsCond[] => [
  { conj: '且', metric: '无订单天数', op: '≥', val: '2', unit: '天' },
  { conj: '或', metric: '销量降幅', op: '≥', val: '30', unit: '%' },
  { conj: '或', metric: '无动销天数', op: '≥', val: '3', unit: '天' },
];
const DEFAULTS: DsForm = {
  name: '',
  floorRate: '0',
  targetRate: '20',
  stepRate: '2',
  riseConds: defaultConds(),
  cutConds: defaultCutConds(),
  observeDays: '3',
  rollbackPct: '30',
  zeroTimeoutDays: '10',
  remark: '',
};
const form = ref<DsForm>({ ...DEFAULTS, riseConds: defaultConds(), cutConds: defaultCutConds() });
const errs = ref<Record<string, string | undefined>>({});
const pick = (m: DsStrategy): DsForm => ({
  name: m.name, floorRate: m.floorRate, targetRate: m.targetRate, stepRate: m.stepRate,
  riseConds: m.riseConds.map((c) => ({ ...c })), cutConds: m.cutConds.map((c) => ({ ...c })),
  observeDays: m.observeDays, rollbackPct: m.rollbackPct, zeroTimeoutDays: m.zeroTimeoutDays, remark: m.remark,
});
watch(() => props.model, (m) => {
  form.value = m ? pick(m) : { ...DEFAULTS, riseConds: defaultConds(), cutConds: defaultCutConds() };
  errs.value = {};
}, { immediate: true });
const REQ_NUM = ['floorRate', 'targetRate', 'stepRate', 'rollbackPct'] as const;
const save = () => {
  const e: Record<string, string | undefined> = {};
  if (!form.value.name.trim()) e.name = '请输入策略名称';
  for (const k of REQ_NUM) {
    if (form.value[k].trim() === '' || Number.isNaN(Number(form.value[k]))) e[k] = '请输入数值';
  }
  errs.value = e;
  if (Object.keys(e).some((k) => e[k])) return;
  for (const [list, label] of [[form.value.riseConds, '再涨价判断'], [form.value.cutConds, '降价判断']] as [DsCond[], string][]) {
    if (list.length === 0) { pushToast(`${label}至少保留一条条件`, 'error'); return; }
    const seen = new Set<string>();
    for (const c of list) {
      if (c.metric.trim() === '' || c.val.trim() === '') { pushToast(`请完整填写${label}阈值`, 'error'); return; }
      const n = Number(c.val);
      if (Number.isNaN(n)) { pushToast(`${label}阈值必须为数字`, 'error'); return; }
      if (n <= 0) { pushToast(`${label}中「${c.metric}」阈值必须大于 0`, 'error'); return; }
      if (!Number.isInteger(n) && (c.unit === '天' || c.unit === '件')) { pushToast(`${label}中「${c.metric}」必须是整数`, 'error'); return; }
      if (seen.has(c.metric)) { pushToast(`${label}中「${c.metric}」只能配置一次`, 'error'); return; }
      seen.add(c.metric);
    }
  }
  pushToast('策略已保存');
  emit('save', { ...form.value, riseConds: form.value.riseConds.map((c) => ({ ...c })), cutConds: form.value.cutConds.map((c) => ({ ...c })) });
};

/* 条件行：换指标时单位重置为默认；销量涨幅/降幅支持 %/件 切换；同组指标去重 */
const condList = (which: 'rise' | 'cut') => (which === 'rise' ? form.value.riseConds : form.value.cutConds);
const metricWord = (which: 'rise' | 'cut') => (which === 'rise' ? DS_COND_METRICS : DS_CUT_METRICS);
const metricUnits = (c: DsCond, which: 'rise' | 'cut') =>
  metricWord(which).find((m) => m.name === c.metric)?.units ?? [c.unit];
const usedMetrics = (which: 'rise' | 'cut', exceptIndex?: number) =>
  new Set(condList(which).filter((_, i) => i !== exceptIndex).map((c) => c.metric));
const metricOptions = (c: DsCond, which: 'rise' | 'cut', idx: number) => {
  const used = usedMetrics(which, idx);
  return metricWord(which).filter((m) => m.name === c.metric || !used.has(m.name));
};
const canAddCond = (which: 'rise' | 'cut') => {
  const used = usedMetrics(which);
  return metricWord(which).some((m) => !used.has(m.name));
};
const setCondMetric = (c: DsCond, name: string, which: 'rise' | 'cut') => {
  c.metric = name;
  c.unit = metricWord(which).find((m) => m.name === name)?.units[0] ?? '天';
};
const addCond = (which: 'rise' | 'cut') => {
  const ws = metricWord(which);
  const used = usedMetrics(which);
  const m = ws.find((x) => !used.has(x.name)) ?? ws[0];
  condList(which).push({ conj: '且', metric: m.name, op: '≥', val: '', unit: m.units[0] });
};
const removeCond = (which: 'rise' | 'cut', i: number) => condList(which).splice(i, 1);

/* 详情态与列表同口径：数值去尾零（5.00 → 5） */
const trimNum = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? v : String(parseFloat(v)));

/* 数值行定义：label / 单位 / 必填（顺序与参考稿一致）；涨价条件走条件行不走此表 */
type NumKey = 'floorRate' | 'targetRate' | 'stepRate' | 'observeDays' | 'rollbackPct' | 'zeroTimeoutDays';
interface NumRow { key: NumKey; label: string; unit: string; req?: boolean }
const LADDER: NumRow[] = [
  { key: 'floorRate', label: '最低利润', unit: '%', req: true },
  { key: 'targetRate', label: '最高利润率', unit: '%', req: true },
  { key: 'stepRate', label: '每档涨幅', unit: '%', req: true },
];
const BACK: NumRow[] = [
  { key: 'observeDays', label: '调价后观察', unit: '天' },
  { key: 'rollbackPct', label: '单次回退幅度', unit: '%', req: true },
  { key: 'zeroTimeoutDays', label: '停止调价时限', unit: '天' },
];
/* 五段分区：利润率 / 初始涨价说明 / 再涨价判断 / 降价判断 / 回退规则 */
interface Sec { t: string; rows?: NumRow[]; conds?: 'rise' | 'cut'; desc?: string }
const SECS: Sec[] = [
  { t: '利润率设置', rows: LADDER },
  { t: '初始涨价', desc: '商品发布后，一旦产生订单即按「每档涨幅」提升一档售价。' },
  { t: '再涨价判断', conds: 'rise', desc: '每次调价后观察指定天数：销量继续上升且达到设定的动销天数，则再涨一档。' },
  { t: '降价判断', conds: 'cut', desc: '观察期内，若连续无订单、销量下滑或无动销天数达到阈值，则按「单次回退幅度」降价一档。' },
  { t: '回退规则', rows: BACK, desc: '每次调价后均进入观察期；若超过停止调价时限仍未出单，则不再调价。' },
];
</script>

<template>
  <div class="ds-mask" @click.self="emit('close')">
    <div class="ds-drawer">
      <div class="ds-head">
        <span class="ds-head-t">{{ readonly ? '动销策略详情' : '新建动销策略' }}</span>
        <button type="button" class="ds-x" title="关闭" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      <div class="ds-body">
        <div class="ds-sec">
          <div class="ds-sec-t">基本信息</div>
          <div class="ds-row">
            <label class="ds-lb"><span class="ds-req">*</span>策略名称</label>
            <div class="ds-ctl grow">
              <template v-if="readonly">{{ form.name }}</template>
              <div v-else class="ds-namewrap">
                <input v-model="form.name" class="ds-in name" maxlength="100" placeholder="如：新品低价起量" @input="errs.name = undefined" />
                <span class="ds-count">{{ form.name.length }} / 100</span>
              </div>
            </div>
          </div>
          <div v-if="errs.name" class="ds-err">{{ errs.name }}</div>
        </div>

        <div v-for="(sec, si) in SECS" :key="sec.t" class="ds-sec">
          <div class="ds-sec-t"><span v-if="sec.conds" class="ds-req">*</span>{{ sec.t }}</div>
          <!-- 再涨价/降价判断：条件行模式（当/且 + 指标 + 运算符 + 阈值单位 + 删除），底部添加条件；详情态纯文本行 -->
          <template v-if="sec.conds">
            <template v-if="readonly">
              <div v-for="(c, ci) in condList(sec.conds)" :key="ci" class="ds-cond-text">
                <span class="ds-cond-conj">{{ ci === 0 ? '当' : c.conj }}</span>
                <span>{{ c.metric }}</span>
                <span class="ds-cond-op">{{ c.op }}</span>
                <span>{{ trimNum(c.val) }}{{ c.unit }}</span>
              </div>
            </template>
            <div v-else class="mv-cond-rows">
              <div v-for="(c, ci) in condList(sec.conds)" :key="ci" class="mv-cond-row">
                <span v-if="ci === 0" class="mv-cond-when">当</span>
                <BubbleSelect v-else class-name="sg-select" :options="['且', '或']" :value="c.conj" class="mv-cond-conj" @change="(v: string) => (c.conj = v as '且' | '或')" />
                <BubbleSelect class-name="sg-select" :options="metricOptions(c, sec.conds!, ci).map((m) => m.name)" :value="c.metric" class="mv-cond-metric" @change="(v: string) => setCondMetric(c, v, sec.conds!)" />
                <BubbleSelect class-name="sg-select" :options="DS_COND_OPS" :value="c.op" class="mv-cond-op" @change="(v: string) => (c.op = v)" />
                <div class="mv-cond-val">
                  <input v-model="c.val" inputmode="decimal" placeholder="阈值" />
                  <BubbleSelect
                    v-if="metricUnits(c, sec.conds!).length > 1"
                    class-name="sg-select mv-cond-unitsel"
                    :options="metricUnits(c, sec.conds!)"
                    :value="c.unit"
                    @change="(v: string) => (c.unit = v)"
                  />
                  <span v-else class="mv-cond-unit">{{ c.unit }}</span>
                </div>
                <button type="button" class="mv-cond-del" aria-label="删除条件" @click="removeCond(sec.conds!, ci)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" /></svg>
                </button>
              </div>
              <div v-if="canAddCond(sec.conds!)">
                <button type="button" class="mv-cond-add" @click="addCond(sec.conds!)">添加条件</button>
              </div>
            </div>
          </template>
          <template v-else-if="sec.rows">
            <div v-for="r in sec.rows" :key="r.key" class="ds-row">
              <label class="ds-lb"><span v-if="r.req" class="ds-req">*</span>{{ r.label }}</label>
              <div class="ds-ctl">
                <template v-if="readonly">{{ trimNum(form[r.key]) }} {{ r.unit }}</template>
                <template v-else>
                  <input v-model="form[r.key]" type="number" class="ds-in num" @input="errs[r.key] = undefined" />
                  <span class="ds-unit">{{ r.unit }}</span>
                </template>
              </div>
              <div v-if="errs[r.key]" class="ds-err">{{ errs[r.key] }}</div>
            </div>
            <div v-if="sec.desc" class="ds-desc">{{ sec.desc }}</div>
          </template>
          <template v-else-if="sec.desc">
            <div class="ds-desc">{{ sec.desc }}</div>
          </template>
          <span v-if="si === SECS.length - 1" class="ds-spacer"></span>
        </div>

        <div class="ds-sec">
          <div class="ds-row ds-row-top">
            <label class="ds-lb">备注</label>
            <div class="ds-ctl grow">
              <template v-if="readonly">{{ form.remark || '—' }}</template>
              <div v-else class="ds-remarkwrap">
                <textarea v-model="form.remark" class="ds-ta" maxlength="500" rows="3"></textarea>
                <span class="ds-count ta">{{ form.remark.length }} / 500</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ds-foot">
        <button type="button" class="ds-btn ghost" @click="emit('close')">{{ readonly ? '关闭' : '取消' }}</button>
        <button v-if="!readonly" type="button" class="ds-btn primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ds-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.42);
}

.ds-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: 94vw;
  background: #fff;
  box-shadow: -8px 0 24px rgba(15, 23, 42, 0.08);
}

.ds-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  padding: 18px 24px;
}

.ds-head-t {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #202532);
}

.ds-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--color-text-2, #445066);
  cursor: pointer;
}

.ds-x:hover {
  background: var(--color-fill-1, #f7f8fa);
}

.ds-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  padding: 8px 24px 24px;
}

.ds-body::-webkit-scrollbar {
  display: none;
}

.ds-sec {
  margin-bottom: 28px;
}

.ds-sec-t {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #202532);
  margin-bottom: 18px;
}

.ds-sec-t::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-primary, #4f7cff);
  border-radius: 2px;
}

/* 行：标签定宽 140px 贴最长标签「两次调价最少间隔」(10字) + 左侧对齐（标题长度一致左对齐），禁溢出内容边距 + 控件列 */
.ds-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  grid-template-areas:
    'lb ctl'
    '. err';
  column-gap: 14px;
  align-items: center;
  margin-bottom: 16px;
}

.ds-row-top {
  align-items: start;
}

.ds-lb {
  grid-area: lb;
  font-size: 14px;
  color: var(--color-text, #202532);
  text-align: left;
}

.ds-req {
  color: #ef4444;
  margin-right: 2px;
}

.ds-ctl {
  grid-area: ctl;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text, #202532);
}

.ds-unit {
  flex: none;
  font-size: 14px;
  color: var(--color-text-2, #445066);
}

.ds-in {
  height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--color-fill-1, #f7f8fa);
  font-size: 14px;
  color: var(--color-text, #202532);
  outline: none;
  transition: border-color 150ms, background 150ms;
}

.ds-in:focus {
  border-color: var(--color-primary, #4f7cff);
  background: #fff;
}

.ds-in.num {
  width: 150px;
}

.ds-in.name {
  width: 100%;
  padding-right: 74px;
}

.ds-namewrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.ds-count {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--color-text-3, #8b92a1);
  pointer-events: none;
}

.ds-count.ta {
  top: auto;
  bottom: 8px;
  transform: none;
}

.ds-remarkwrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.ds-ta {
  width: 100%;
  padding: 8px 10px 24px;
  border: 1px solid var(--color-border, #e8ebf1);
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  font-family: inherit;
  color: var(--color-text, #202532);
  outline: none;
  resize: vertical;
}

.ds-ta:focus {
  border-color: var(--color-primary, #4f7cff);
}

.ds-err {
  grid-area: err;
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
}

.ds-spacer {
  display: block;
  height: 4px;
}

/* 回退规则循环说明：灰字小号，说明观察-涨价/降价-回退的循环闭环 */
.ds-desc {
  margin-top: 2px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--color-fill-1, #f7f8fa);
  font-size: 12px;
  line-height: 1.8;
  color: var(--color-text-2, #445066);
}

.ds-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex: none;
  padding: 14px 24px;
  border-top: 1px solid transparent;
}

.ds-btn {
  min-width: 76px;
  height: 36px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms;
}

.ds-btn.ghost {
  background: var(--color-fill-1, #f7f8fa);
  color: var(--color-text-2, #445066);
}

.ds-btn.ghost:hover {
  background: #e9ecf1;
}

.ds-btn.primary {
  background: var(--color-primary, #4f7cff);
  color: #fff;
}

.ds-btn.primary:hover {
  background: #3a6be6;
}

/* 详情态条件行：连接词定宽与编辑态「当/且或」列对齐 */
.ds-cond-text {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--color-text, #202532);
}

.ds-cond-conj {
  width: 56px;
  flex: none;
  text-align: center;
  color: #4a5468;
}

.ds-cond-op {
  color: #4a5468;
}
</style>

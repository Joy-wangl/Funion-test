<script lang="ts">
/* 快捷编辑 SKU 共享弹窗的类型与联动构造器：父级构建 draft 行时使用 */
export type QuickVal = { name: string; code: string; series: string; cost: string; price: string; stock: string; profit: string; rate: string };
/** 属性配置维度（与商品详情 specs 同构）：属性名＋属性值清单 */
export type QuickSpec = { name: string; values: string[] };
export type QuickDraftRow = { thumb: string; title: string; jm: boolean; src: Record<string, string>; qcode: string; val: QuickVal; /** SKU 关联的属性值（属性名→值） */ vals: Record<string, string> };
export const numOf = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
};
/* 售价/利润恒两位小数：非数值原样返回 */
export const fmt2 = (v: string) => {
  const n = numOf(v);
  return Number.isFinite(n) ? n.toFixed(2) : v;
};
/* 成本价只读不可改；售价/利润/利润率三值联动可编辑：成本恒定，改任一项反推其余两项（利润=售价−成本；利润率=利润÷售价；售价=成本÷(1−利润率)） */
export const syncPriceVal = (v: QuickVal) => {
  const p = numOf(v.price);
  const c = numOf(v.cost);
  if (Number.isFinite(p) && Number.isFinite(c)) {
    v.profit = (p - c).toFixed(2);
    v.rate = p > 0 ? (((p - c) / p) * 100).toFixed(1) : '';
  }
};
export const syncProfitVal = (v: QuickVal) => {
  const pr = numOf(v.profit);
  const c = numOf(v.cost);
  if (Number.isFinite(pr) && Number.isFinite(c)) {
    const p = c + pr;
    v.price = p.toFixed(2);
    v.rate = p > 0 ? ((pr / p) * 100).toFixed(1) : '';
  }
};
export const syncRateVal = (v: QuickVal) => {
  const rt = numOf(v.rate);
  const c = numOf(v.cost);
  if (Number.isFinite(rt) && Number.isFinite(c) && rt < 100) {
    const p = c / (1 - rt / 100);
    v.price = p.toFixed(2);
    v.profit = (p - c).toFixed(2);
  }
};
export const mkVal = (name: string, code: string, series: string, cost: string, price: string, stock: string): QuickVal => {
  /* 商品编码为空时系列编码/成本价默认 0.00，编码查询成功后回填 */
  const v: QuickVal = { name, code, series: code.trim() ? series : '0.00', cost: code.trim() ? cost : '0.00', price: fmt2(price), stock, profit: '', rate: '' };
  syncPriceVal(v);
  return v;
};
</script>

<script setup lang="ts">
/** SKU 快捷编辑共享弹窗（千牛式）：商品创建列表单件/批量、店铺商品详情（视频号）共用；
 *  保留 SKU 全字段（图片/名称/商品编码/系列编码/成本价/售价/利润/利润率/库存数）＋操作（复制/删除）；
 *  属性配置＋属性值＋SKU 关联关系与商品详情保持一致：规格卡增删属性值（删值联动删 SKU 行），
 *  SKU 行按属性维度列展示关联值（BubbleSelect 可改），复制行同克隆关联关系；
 *  系列编码只读芯片（与商品详情 SKU 表同款 sgd-code 样式），编码失焦 mock 回查系列编码与成本价；
 *  保存仅 emit save，回写由父级按各自数据源处理。 */
import { ref } from 'vue';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import { createDetail } from './data';
import { sgJmDetail } from './shopGoodsData';
/* 同 SFC 内普通 <script> 块导出的 numOf/sync×3/mkVal 与类型已合并入本作用域，setup 块直接引用无需自导入 */

const props = defineProps<{
  /** draft 行（父级构建传入，组件内直接改行值） */
  draft: QuickDraftRow[];
  /** 批量态：标题与列展示口径切换 */
  batch: boolean;
  /** 标题副行（单件=商品标题，批量=已选 N 件商品） */
  sub: string;
  /** 京麦口径：商家编码/京东价列名 */
  jm: boolean;
  /** 属性配置（父级传入草稿态，组件内直接增删属性值）；空＝不展示属性区 */
  specs?: QuickSpec[];
  /** 底部主按钮文案（默认「保存」；店铺商品场景为「立即修改」） */
  saveText?: string;
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'save'): void }>();

/* 列头批量编辑：售价/利润/利润率/库存数 列头 icon，浮层输入统一值后整列应用（利润/利润率按联动反推） */
type ColEditKey = 'price' | 'profit' | 'rate' | 'stock';
const colEdit = ref<{ key: ColEditKey; value: string } | null>(null);
const openColEdit = (key: ColEditKey) => {
  colEdit.value = colEdit.value?.key === key ? null : { key, value: '' };
};
const applyColumn = () => {
  const ce = colEdit.value;
  if (!ce) return;
  for (const r of props.draft) {
    if (ce.key === 'stock') r.val.stock = ce.value;
    else {
      /* 售价/利润整列应用也归一两位小数 */
      r.val[ce.key] = ce.key === 'price' || ce.key === 'profit' ? fmt2(ce.value) : ce.value;
      (ce.key === 'price' ? syncPriceVal : ce.key === 'profit' ? syncProfitVal : syncRateVal)(r.val);
    }
  }
  colEdit.value = null;
};
/* 售价/利润输入失焦归一两位小数后再联动 */
const priceBlur = (r: QuickDraftRow) => {
  r.val.price = fmt2(r.val.price);
  syncPriceVal(r.val);
};
const profitBlur = (r: QuickDraftRow) => {
  r.val.profit = fmt2(r.val.profit);
  syncProfitVal(r.val);
};
/* 系列编码查询（mock 600ms）：按商品编码回查系列编码与成本价；编码输入失焦（点击空白）时先 toast 提示，查询完成后回填 */
const mockSeriesQuery = (code: string): Promise<{ series: string; cost: string }> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const hit = createDetail.skus.find((s) => s.code === code) || sgJmDetail.skus.find((s) => s.outerId === code);
      resolve(hit ? { series: hit.series, cost: hit.cost } : { series: `编码${code.slice(-2) || '00'}`, cost: '25.00' });
    }, 600);
  });
const codeBlur = (r: QuickDraftRow) => {
  const code = r.val.code.trim();
  if (!code) {
    r.qcode = '';
    r.val.series = '0.00';
    r.val.cost = '0.00';
    syncPriceVal(r.val);
    return;
  }
  if (code === r.qcode) return;
  r.qcode = code;
  pushToast('正在查询系列编码信息');
  mockSeriesQuery(code).then((res) => {
    r.val.series = res.series;
    r.val.cost = res.cost;
    syncPriceVal(r.val);
  });
};
/* 操作：复制＝当前行后插入值完全一致的 draft 行（src/vals 独立克隆，保存即新种子 SKU）；删除＝直接从 draft 移除 */
const copyQuick = (i: number) => {
  const r = props.draft[i];
  if (!r) return;
  props.draft.splice(i + 1, 0, { ...r, src: { ...r.src }, val: { ...r.val }, vals: { ...r.vals } });
};
const deleteQuick = (i: number) => {
  props.draft.splice(i, 1);
};
/* 属性配置（同详情规格卡）：新增属性值（失焦/回车提交）；删除属性值联动删除含该值的 SKU 行 */
const addVals = ref<Record<number, string>>({});
const addSpecValue = (si: number) => {
  const sp = props.specs?.[si];
  const v = (addVals.value[si] ?? '').trim();
  addVals.value[si] = '';
  if (!sp || !v || sp.values.includes(v)) return;
  sp.values.push(v);
};
const removeSpecValue = (si: number, v: string) => {
  const sp = props.specs?.[si];
  if (!sp) return;
  sp.values = sp.values.filter((x) => x !== v);
  for (let i = props.draft.length - 1; i >= 0; i--) {
    if (props.draft[i].vals[sp.name] === v) props.draft.splice(i, 1);
  }
};
</script>

<template>
  <div class="pm-page pm-host">
    <Modal :title="batch ? '批量编辑商品' : '快捷编辑SKU'" :sub="sub" size="xl" @close="emit('close')">
      <!-- 属性配置：与商品详情规格卡同构（属性名＋属性值芯片增删）；删属性值联动删含该值的 SKU 行 -->
      <div v-if="specs?.length" class="cp-quick-specs">
        <div v-for="(sp, si) in specs" :key="sp.name" class="cpd-spec-card">
          <div class="cpd-spec-head"><span class="cpd-vspec-name">{{ sp.name }}</span></div>
          <div class="cpd-vspec-vals">
            <span v-for="v in sp.values" :key="v" class="cpd-vspec-chip">{{ v }}<i title="删除该属性值" @click="removeSpecValue(si, v)">×</i></span>
            <span v-if="sp.values.length === 0" class="cpd-vsku-empty">—</span>
            <input v-model="addVals[si]" class="cpd-val-add" placeholder="输入属性值，点击空白处保存" @blur="addSpecValue(si)" @keyup.enter="addSpecValue(si)" />
          </div>
        </div>
      </div>
      <table class="cp-quick-table">
        <thead>
          <tr>
            <th>SKU图片</th>
            <th v-for="sp in specs ?? []" :key="sp.name">{{ sp.name }}</th>
            <th>SKU名称</th>
            <th>{{ jm ? '商家编码' : '商品编码' }}</th>
            <th>系列编码</th>
            <th>成本价</th>
            <th>{{ jm ? '京东价' : '售价' }}<button type="button" class="cp-quick-col-btn" title="批量修改本列" @click.stop="openColEdit('price')"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M11.4 1.6l3 3-9 9-3.8.8.8-3.8 9-9z" fill="currentColor" /></svg></button>
              <div v-if="colEdit?.key === 'price'" class="cp-quick-colpop" @click.stop>
                <input v-model="colEdit.value" class="ib-input" placeholder="统一值" />
                <button type="button" class="sg-btn primary" @click="applyColumn">应用</button>
              </div>
            </th>
            <th>利润<button type="button" class="cp-quick-col-btn" title="批量修改本列" @click.stop="openColEdit('profit')"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M11.4 1.6l3 3-9 9-3.8.8.8-3.8 9-9z" fill="currentColor" /></svg></button>
              <div v-if="colEdit?.key === 'profit'" class="cp-quick-colpop" @click.stop>
                <input v-model="colEdit.value" class="ib-input" placeholder="统一值" />
                <button type="button" class="sg-btn primary" @click="applyColumn">应用</button>
              </div>
            </th>
            <th>利润率<button type="button" class="cp-quick-col-btn" title="批量修改本列" @click.stop="openColEdit('rate')"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M11.4 1.6l3 3-9 9-3.8.8.8-3.8 9-9z" fill="currentColor" /></svg></button>
              <div v-if="colEdit?.key === 'rate'" class="cp-quick-colpop" @click.stop>
                <input v-model="colEdit.value" class="ib-input" placeholder="统一值" />
                <button type="button" class="sg-btn primary" @click="applyColumn">应用</button>
              </div>
            </th>
            <th>库存数<button type="button" class="cp-quick-col-btn" title="批量修改本列" @click.stop="openColEdit('stock')"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M11.4 1.6l3 3-9 9-3.8.8.8-3.8 9-9z" fill="currentColor" /></svg></button>
              <div v-if="colEdit?.key === 'stock'" class="cp-quick-colpop" @click.stop>
                <input v-model="colEdit.value" class="ib-input" placeholder="统一值" />
                <button type="button" class="sg-btn primary" @click="applyColumn">应用</button>
              </div>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in draft" :key="i">
            <td><img class="cp-quick-img" :src="r.thumb" alt="" /></td>
            <!-- SKU 关联属性值：按属性维度列展示，BubbleSelect 可改（复制后改关联即闭环） -->
            <td v-for="sp in specs ?? []" :key="sp.name">
              <BubbleSelect class-name="sg-select" :options="sp.values" :value="r.vals[sp.name] ?? ''" @change="(v: string) => (r.vals[sp.name] = v)" />
            </td>
            <td><input v-model="r.val.name" class="ib-input" /></td>
            <td><input v-model="r.val.code" class="ib-input" @blur="codeBlur(r)" /></td>
            <!-- 系列编码只读：与商品详情 SKU 表同款芯片样式统一 -->
            <td><span v-if="r.val.series" class="sgd-code">{{ r.val.series }}</span><template v-else>0</template></td>
            <td class="cp-quick-readonly">{{ r.val.cost }}</td>
            <td><input v-model="r.val.price" class="ib-input" @input="syncPriceVal(r.val)" @blur="priceBlur(r)" /></td>
            <td><input v-model="r.val.profit" class="ib-input" @input="syncProfitVal(r.val)" @blur="profitBlur(r)" /></td>
            <td class="cp-quick-rate"><input v-model="r.val.rate" class="ib-input" @input="syncRateVal(r.val)" /><span class="cp-quick-rate-suf">%</span></td>
            <td><input v-model="r.val.stock" class="ib-input" /></td>
            <td class="cp-quick-ops">
              <button type="button" class="cp-quick-op" @click="copyQuick(i)">复制</button>
              <button type="button" class="cp-quick-op danger" @click="deleteQuick(i)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <template #foot>
        <button class="sg-btn" @click="emit('close')">取消</button>
        <button class="sg-btn primary" @click="emit('save')">{{ saveText || '保存' }}</button>
      </template>
    </Modal>
  </div>
</template>

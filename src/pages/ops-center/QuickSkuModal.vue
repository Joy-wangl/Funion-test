<script lang="ts">
/* 快捷编辑 SKU 共享弹窗的类型与联动构造器：父级构建 draft 行时使用 */
export type QuickVal = { name: string; code: string; series: string; cost: string; price: string; stock: string; profit: string; rate: string };
/** 属性配置维度（与商品详情 specs 同构）：属性名＋属性值清单 */
export type QuickSpec = { name: string; values: string[] };
export type QuickDraftRow = { thumb: string; title: string; jm: boolean; src: Record<string, string>; qcode: string; val: QuickVal; /** SKU 关联的属性值（属性名→值） */ vals: Record<string, string>; /** 所属商品详情数据（保存时按它分组回写，与详情页同源） */ own?: Record<string, any> };
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
 *  批量态按商品分组展示：每件所选商品组首插商品头行（缩略图＋标题），组内为该商品各自的 SKU 行；
 *  属性值管理下沉到 SKU 表：属性维度列 BubbleSelect 下拉内可改名/删除属性值（删值联动删 SKU 行，二次确认），
 *  不再展示顶部属性配置模块；复制按属性勾选创建副本值（勾选数＝属性数−1，单层直接副本）；
 *  系列编码只读芯片（与商品详情 SKU 表同款 sgd-code 样式），编码失焦 mock 回查系列编码与成本价；
 *  保存仅 emit save，回写由父级按各自数据源处理。 */
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import { useAnchorPop } from '../../hooks/useAnchorPop';
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
  /** 京麦口径：商家编码列名（售价列统一叫「售价」） */
  jm: boolean;
  /** 属性配置（父级传入草稿态）：决定属性维度列与下拉选项；组件内可改名/删除属性值；空＝无属性维度列 */
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
/* 属性组合口径：按属性序拼接关联值（批量态混多件商品，需带商品标题隔离，避免跨商品误判重复） */
const comboOf = (r: QuickDraftRow) => (props.specs ?? []).map((sp) => r.vals[sp.name] ?? '').join(' / ');
const comboKey = (r: QuickDraftRow) => `${r.title}||${comboOf(r)}`;
/* 重复组合：同商品下同一属性组合出现多行即冲突（复制行未改归属时必然命中），记录首行号供提示 */
const dupInfo = computed(() => {
  const res: { dup: boolean; first: number }[] = props.draft.map(() => ({ dup: false, first: -1 }));
  if (!props.specs?.length) return res;
  const seen = new Map<string, number[]>();
  props.draft.forEach((r, i) => {
    const arr = seen.get(comboKey(r)) ?? [];
    arr.push(i);
    seen.set(comboKey(r), arr);
  });
  for (const arr of seen.values()) {
    if (arr.length < 2) continue;
    for (const i of arr) res[i] = { dup: true, first: arr[0] };
  }
  return res;
});
const dupTip = (i: number) => `属性组合与第 ${dupInfo.value[i].first + 1} 行重复，保存前请调整归属`;
/* 操作：复制按规格层数分流——
   单层规格直接复制，规格值加「副本」后缀自成新的属性值（并入属性配置）；
   多层规格（AB级）弹归属气泡勾选要创建副本的属性（勾选数＝属性数−1），副本值同样并入属性配置；
   无规格直接克隆；新行 1.6s 高亮定位＋toast 回显新组合 */
const flash = ref(-1);
let flashTimer: ReturnType<typeof setTimeout> | null = null;
const spawnCopy = (i: number, vals: Record<string, string>, comboText: string) => {
  const r = props.draft[i];
  if (!r) return;
  const row: QuickDraftRow = { ...r, src: { ...r.src }, val: { ...r.val }, vals: { ...vals } };
  if (props.specs?.length) row.val.name = autoName(row);
  props.draft.splice(i + 1, 0, row);
  flash.value = i + 1;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { flash.value = -1; }, 1600);
  pushToast(`已复制 SKU「${comboText}」`);
};
/* 副本属性值取名：源值＋「副本」，重名递增加序号 */
const copyValName = (sp: QuickSpec, v: string) => {
  let name = `${v}副本`;
  for (let n = 2; sp.values.includes(name); n++) name = `${v}副本${n}`;
  return name;
};
/* 副本值插在源值之后：详情 SKU 表按属性值序生成组合，副本行紧跟被复制的那条 */
const insertCopyVal = (sp: QuickSpec, srcVal: string, nv: string) => {
  const at = sp.values.indexOf(srcVal);
  if (at >= 0) sp.values.splice(at + 1, 0, nv);
  else sp.values.push(nv);
};
/* 复制归属气泡（多层规格）：锚定复制按钮；按属性（维度）勾选要创建副本的源值，
   勾选数＝属性数−1（2 属性选 1、3 属性选 2），未勾维度沿用源值；副本值并入属性配置 */
const copyPop = ref<{ row: number; dims: string[] } | null>(null);
const { pos: copyPos, open: openCopyPop, close: closeCopyPop } = useAnchorPop();
const copyQuick = (i: number, e: MouseEvent) => {
  const r = props.draft[i];
  if (!r) return;
  const sps = props.specs ?? [];
  if (sps.length === 1) {
    const sp = sps[0];
    const sv = r.vals[sp.name] ?? '';
    const nv = copyValName(sp, sv);
    insertCopyVal(sp, sv, nv);
    spawnCopy(i, { ...r.vals, [sp.name]: nv }, nv);
    return;
  }
  if (!sps.length) {
    spawnCopy(i, { ...r.vals }, r.val.name);
    return;
  }
  copyPop.value = { row: i, dims: [] };
  openCopyPop(e.currentTarget as HTMLElement, 260, '.cp-quick-copypop');
};
const toggleCopyDim = (name: string) => {
  const cp = copyPop.value;
  if (!cp) return;
  const at = cp.dims.indexOf(name);
  if (at >= 0) cp.dims.splice(at, 1);
  else cp.dims.push(name);
};
const confirmCopy = () => {
  const cp = copyPop.value;
  if (!cp) return;
  const src = props.draft[cp.row];
  if (!src) return;
  const sps = props.specs ?? [];
  const need = sps.length - 1;
  if (cp.dims.length !== need) {
    pushToast(`请选择 ${need} 个属性创建副本`, 'warning');
    return;
  }
  const vals = { ...src.vals };
  for (const name of cp.dims) {
    const sp = sps.find((s) => s.name === name);
    if (!sp) continue;
    const sv = src.vals[name] ?? '';
    const nv = copyValName(sp, sv);
    insertCopyVal(sp, sv, nv);
    vals[name] = nv;
  }
  closeCopyPop();
  spawnCopy(cp.row, vals, sps.map((s) => vals[s.name] ?? '').join(' / '));
};
const deleteQuick = (i: number) => {
  props.draft.splice(i, 1);
};
/* 保存守卫：存在重复属性组合时拦截并指明冲突行，避免写出同组合的多条 SKU */
const onSave = () => {
  const bad = dupInfo.value.findIndex((d, i) => d.dup && d.first !== i);
  if (bad >= 0) {
    pushToast(`第 ${bad + 1} 行与第 ${dupInfo.value[bad].first + 1} 行属性组合重复，请调整后再保存`, 'error');
    return;
  }
  emit('save');
};
/* SKU 名称随属性关联自动拼接：口径与详情一致（京麦空格分隔，淘宝/视频号「 + 」），改属性值/复制/改名后名称即跟随 */
const autoName = (r: QuickDraftRow) =>
  (props.specs ?? []).map((sp) => r.vals[sp.name] ?? '').filter(Boolean).join(props.jm ? ' ' : ' + ');
/* 属性值行内改名（SKU 表下拉内铅笔）：同步属性配置与所有 SKU 行的关联值 */
const renameSpecVal = (sp: QuickSpec, oldV: string, newV: string) => {
  if (sp.values.includes(newV)) {
    pushToast(`属性值「${newV}」已存在`, 'error');
    return;
  }
  sp.values = sp.values.map((v) => (v === oldV ? newV : v));
  for (const r of props.draft) {
    if (r.vals[sp.name] !== oldV) continue;
    r.vals[sp.name] = newV;
    r.val.name = autoName(r);
  }
};
/* 属性值删除（SKU 表下拉内垃圾桶）：二次确认后移除属性值；
   删非末值＝联动删除含该值的 SKU 行；删末值＝该规格转空，SKU 行保留仅去掉该维度（与详情页同语义，避免误删全部 SKU） */
const delBox = ref<{ sp: QuickSpec; value: string } | null>(null);
const delIsLast = computed(() => !!delBox.value && delBox.value.sp.values.length === 1);
const delRowCount = computed(() => {
  const b = delBox.value;
  if (!b || delIsLast.value) return 0;
  return props.draft.filter((r) => r.vals[b.sp.name] === b.value).length;
});
const delConfirmText = computed(() => {
  const b = delBox.value;
  if (!b) return '';
  return delIsLast.value
    ? `删除「${b.value}」后规格「${b.sp.name}」将无属性值，SKU 行保留、仅去掉该规格列，确认删除？`
    : `删除「${b.value}」将同时删除 ${delRowCount.value} 个关联 SKU 行，确认删除？`;
});
const doDeleteVal = () => {
  const b = delBox.value;
  if (!b) return;
  const last = delIsLast.value;
  b.sp.values = b.sp.values.filter((x) => x !== b.value);
  if (last) {
    for (const r of props.draft) {
      if (r.vals[b.sp.name] !== b.value) continue;
      delete r.vals[b.sp.name];
      r.val.name = autoName(r);
    }
  } else {
    for (let i = props.draft.length - 1; i >= 0; i--) {
      if (props.draft[i].vals[b.sp.name] === b.value) props.draft.splice(i, 1);
    }
  }
  delBox.value = null;
};
</script>

<template>
  <div class="pm-page pm-host">
    <Modal :title="batch ? '批量编辑商品' : '快捷编辑SKU'" :sub="sub" size="xxl" @close="emit('close')">
      <table class="cp-quick-table">
        <thead>
          <tr>
            <th>SKU图片</th>
            <th v-for="sp in specs ?? []" :key="sp.name">{{ sp.name }}</th>
            <th>SKU名称</th>
            <th>{{ jm ? '商家编码' : '商品编码' }}</th>
            <th>系列编码</th>
            <th>成本价</th>
            <th>售价<button type="button" class="cp-quick-col-btn" title="批量修改本列" @click.stop="openColEdit('price')"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M11.4 1.6l3 3-9 9-3.8.8.8-3.8 9-9z" fill="currentColor" /></svg></button>
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
          <template v-for="(r, i) in draft" :key="i">
            <!-- 批量态按商品分组：组首插入商品头行（缩略图＋标题），组内行为该商品的 SKU -->
            <tr v-if="batch && (i === 0 || draft[i - 1].title !== r.title || draft[i - 1].thumb !== r.thumb)" class="cp-quick-group" :class="{ 'cp-quick-sep': i > 0 }">
              <td :colspan="10 + (specs?.length ?? 0)"><span class="cp-quick-group-cell"><img class="cp-quick-img" :src="r.thumb" alt="" /><span class="cp-quick-group-title">{{ r.title }}</span></span></td>
            </tr>
            <tr :class="{ 'cp-quick-dup': dupInfo[i].dup, 'cp-quick-flash': flash === i }">
            <td><img class="cp-quick-img" :src="r.thumb" alt="" /></td>
            <!-- SKU 关联属性值：按属性维度列展示；下拉内可改名/删除该属性值（替代顶部属性配置模块）；重复组合红框＋行号提示 -->
            <td v-for="sp in specs ?? []" :key="sp.name" :class="{ 'cp-quick-dup': dupInfo[i].dup }" :title="dupInfo[i].dup ? dupTip(i) : undefined">
              <BubbleSelect
                class-name="sg-select"
                :options="sp.values"
                :value="r.vals[sp.name] ?? ''"
                renamable
                deletable
                @change="(v: string) => { r.vals[sp.name] = v; r.val.name = autoName(r); }"
                @rename="(o: string, n: string) => renameSpecVal(sp, o, n)"
                @delete="(v: string) => (delBox = { sp, value: v })"
              />
            </td>
            <td><input v-model="r.val.name" class="ib-input cp-quick-name" /></td>
            <td><input v-model="r.val.code" class="ib-input" @blur="codeBlur(r)" /></td>
            <!-- 系列编码只读：与商品详情 SKU 表同款芯片样式统一 -->
            <td><span v-if="r.val.series" class="sgd-code">{{ r.val.series }}</span><template v-else>0</template></td>
            <td class="cp-quick-readonly">{{ r.val.cost }}</td>
            <td><input v-model="r.val.price" class="ib-input" @input="syncPriceVal(r.val)" @blur="priceBlur(r)" /></td>
            <td><input v-model="r.val.profit" class="ib-input" @input="syncProfitVal(r.val)" @blur="profitBlur(r)" /></td>
            <td class="cp-quick-rate"><input v-model="r.val.rate" class="ib-input" @input="syncRateVal(r.val)" /><span class="cp-quick-rate-suf">%</span></td>
            <td><input v-model="r.val.stock" class="ib-input" /></td>
            <td class="cp-quick-ops">
              <button type="button" class="cp-quick-op" @click="copyQuick(i, $event)">复制</button>
              <button type="button" class="cp-quick-op danger" @click="deleteQuick(i)">删除</button>
            </td>
            </tr>
          </template>
        </tbody>
      </table>
      <template #foot>
        <button class="sg-btn" @click="emit('close')">取消</button>
        <button class="sg-btn primary" @click="onSave">{{ saveText || '保存' }}</button>
      </template>
    </Modal>
    <!-- 复制归属气泡（多层规格）：逐属性勾选要创建副本的源值（勾选数＝属性数−1），副本值预览在芯片内 -->
    <Teleport to="body">
      <div
        v-if="copyPop && copyPos"
        class="add-pop cp-quick-copypop"
        :style="{ left: `${copyPos.x}px`, top: `${copyPos.y}px` }"
        @mousedown.stop
      >
        <div v-for="sp in specs ?? []" :key="sp.name" class="cp-quick-poprow">
          <span class="cp-quick-popname">{{ sp.name }}</span>
          <button
            type="button"
            class="cp-quick-popchip"
            :class="{ on: copyPop.dims.includes(sp.name) }"
            @click="toggleCopyDim(sp.name)"
          >{{ draft[copyPop.row]?.vals[sp.name] }} → {{ copyValName(sp, draft[copyPop.row]?.vals[sp.name] ?? '') }}</button>
        </div>
        <div class="cp-quick-popfoot">
          <button type="button" class="sg-btn primary" @click="confirmCopy">复制</button>
        </div>
      </div>
    </Teleport>
    <!-- 删除属性值二次确认：联动删除含该值的 SKU 行，属不可逆操作 -->
    <Teleport to="body">
      <div v-if="delBox" class="mk-create-mask mk-confirm-mask" @click.self="delBox = null">
        <div class="mk-confirm-modal">
          <div class="mk-confirm-head">删除属性值</div>
          <div class="mk-confirm-body">{{ delConfirmText }}</div>
          <div class="mk-confirm-foot">
            <button class="sg-btn" @click="delBox = null">取消</button>
            <button class="sg-btn danger" @click="doDeleteVal">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

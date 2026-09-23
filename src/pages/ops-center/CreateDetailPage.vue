<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch } from 'vue';
import type { CreateRow, CreateVersion } from './data';
import { createDetail, createVersions } from './data';
import { pushToast } from '../../components/toast';
import CpdMediaSec from './CpdMediaSec.vue';
import ImgSizeCrop from './ImgSizeCrop.vue';
import MaterialCenter from './MaterialCenter.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';

const props = defineProps<{ row: CreateRow; /** 仅查看（竞对商机等）：隐藏编辑/关联发布/去水印入口 */ readonly?: boolean; /** 视频号（微信小店）：隐藏一键匹配、展示服务保障三选项 */ video?: boolean }>();
const emit = defineEmits<{ (e: 'back'): void; (e: 'openPub'): void }>();

const SHIP_OPTIONS = ['今日发', '24小时内发货', '48小时内发货', '大于48小时发货'];
const STUFF_OPTIONS = ['全新', '二手'];
/* SKU 表其它成本列头提示（原生 title） */
const OTHER_COST_TIP = '其它成本：运费、包装费、平台佣金等额外成本，利润与利润率计算时一并扣除';
/* 展开明细态出仓总成本列头提示（原生 title） */
const OUT_COST_TIP = '出仓总成本：出仓物流、仓储作业、工资分摊、推广等总成本，利润与利润率计算时一并扣除';

/** 商品创建详情页：查看态/编辑态（样式复用店铺商品详情 sgd-*，字段按原型） */
const editing = ref(false);
const showMaterial = ref(false);
const curVer = ref<CreateVersion>(createVersions.find((v) => v.current) ?? createVersions[0]);
const specOpen = ref(true);
const skuShow = ref(true);
const ship = ref('48小时内发货');
const stuff = ref('全新');
/* 视频号（微信小店）服务保障三选项：假一赔三/换货/7天无理由，查看态只读、编辑态可改 */
const FAKE3_OPTIONS = ['不支持假一赔三', '支持假一赔三'];
const EXCHANGE_OPTIONS = ['不支持换货', '支持换货'];
const SEVEN_DAY_OPTIONS = ['支持七天无理由', '不支持七天无理由'];
const fake3 = ref('不支持假一赔三');
const exchange = ref('不支持换货');
const sevenDay = ref('支持七天无理由');
/* 详情数据按实例深拷贝：编辑操作（规格增删/拖拽、尺寸替换回写）只影响当前页实例，
   避免污染淘宝/视频号共用的种子对象（曾导致一处删值后另一平台详情规格丢失） */
const d = reactive(JSON.parse(JSON.stringify(createDetail)) as typeof createDetail);

/* ---------- 淘宝规格/SKU 联动模型 ----------
   规格属性值笛卡尔积自动生成 SKU：SKU 名称默认=属性值组合文本（如 黑色 + 小码）；
   删除属性值 → 包含该值的 SKU 同步删除；删除 SKU → 未被其它 SKU 引用的属性值联动删除；
   规格/属性值拖拽排序、属性值改名，SKU 列表均同步且不丢已编辑的售价/库存 */
interface TSku { key: string; vals: Record<string, string>; name: string; skuName: string; series: string; cost: string; other: string; price: string; stock: string; code: string; profit: string; rate: string; cloudRatio: string; wageRatio: string; promoRate: string; taxRatio: string }
/* 规格维度稳定 id：拖拽重排规格不改变 SKU key；key 按 id 排序生成，与展示顺序解耦 */
const specIds = ref<string[]>(d.specs.map((_, i) => `sp${i}`));
let specIdSeed = d.specs.length;
/* 手动删除的 SKU 组合 key：笛卡尔积重算时过滤，避免被删行复活 */
const skuDeleted = ref<string[]>([]);
const tSkus = ref<TSku[]>([]);
/* 空维度值（undefined）不参与 key/组合文本：新增空规格前后 SKU key 不变，已编辑售价/库存不丢 */
const skuKeyOf = (vals: Record<string, string>) => [...specIds.value].sort().map((id) => vals[id]).filter(Boolean).join(' / ');
const skuNameOf = (vals: Record<string, string>) => specIds.value.map((id) => vals[id]).filter(Boolean).join(' + ');
const filledSpecCount = computed(() => d.specs.filter((s) => s.values.length > 0).length);
const syncSkus = () => {
  if (filledSpecCount.value === 0) { tSkus.value = []; return; }
  let combos: Record<string, string>[] = [{}];
  d.specs.forEach((s, si) => {
    if (s.values.length === 0) return; /* 空维度不参与笛卡尔积，SKU 表暂隐该列 */
    const id = specIds.value[si];
    const next: Record<string, string>[] = [];
    for (const c of combos) for (const v of s.values) next.push({ ...c, [id]: v });
    combos = next;
  });
  const old = new Map(tSkus.value.map((s) => [s.key, s]));
  const deleted = new Set(skuDeleted.value);
  tSkus.value = combos
    .map((vals, i) => {
      const key = skuKeyOf(vals);
      const prev = old.get(key);
      if (prev) return { ...prev, vals, key, name: skuNameOf(vals) };
      /* 新组合：沿用静态种子的售价/编码（颜色＋款式命中），否则给默认值 */
      const texts = Object.values(vals);
      const base = d.skus.find((s) => texts.includes(s.color) && texts.includes(s.style));
      return {
        key, vals, name: skuNameOf(vals),
        skuName: base?.name ?? skuNameOf(vals),
        series: base?.series ?? `编码${String.fromCharCode(65 + (i % 26))}`, cost: base?.cost ?? '0', other: base?.other ?? '0',
        price: base?.price ?? d.price, stock: base?.stock ?? '0',
        code: base?.code ?? `SKU-${String(i + 1).padStart(3, '0')}`,
        profit: base?.profit ?? '', rate: base?.rate ?? '',
        cloudRatio: base?.cloudRatio ?? '0%', wageRatio: base?.wageRatio ?? '4', promoRate: base?.promoRate ?? '5', taxRatio: base?.taxRatio ?? '2',
      };
    })
    .filter((s) => !deleted.has(s.key));
};
syncSkus();
/* 属性列合并格：排在前面的属性值被多个其它属性组合绑定（占多个行）时，以 rowspan 合并为一格展示 */
const samePrefix = (a: TSku, b: TSku, di: number) => {
  for (let k = 0; k <= di; k++) {
    const id = specIds.value[k];
    if (a.vals[id] !== b.vals[id]) return false;
  }
  return true;
};
const skuMerge = computed(() => {
  const rows = tSkus.value;
  const grid: { show: boolean; span: number }[][] = rows.map(() => d.specs.map(() => ({ show: false, span: 1 })));
  for (let di = 0; di < d.specs.length; di++) {
    let i = 0;
    while (i < rows.length) {
      let j = i + 1;
      while (j < rows.length && samePrefix(rows[i], rows[j], di)) j++;
      grid[i][di] = { show: true, span: j - i };
      i = j;
    }
  }
  return grid;
});
/* 利润/利润率不空：未填时按 售价−产品成本−其它成本 / 利润÷售价 自动兜底计算，手填值优先 */
const profitOf = (s: TSku) => {
  if (s.profit) return s.profit;
  const p = parseFloat(s.price) || 0;
  const c = parseFloat(s.cost) || 0;
  const o = parseFloat(s.other) || 0;
  return (p - c - o).toFixed(2);
};
const rateOf = (s: TSku) => {
  if (s.rate) return s.rate;
  const p = parseFloat(s.price) || 0;
  const pr = parseFloat(profitOf(s)) || 0;
  return p > 0 ? ((pr / p) * 100).toFixed(2) : '0.00';
};

/* 重点操作二次确认弹窗：复用营销页等模块的 mk-confirm 样式 */
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => { confirmBox.value = { title, message, onOk }; };
const doConfirm = () => { confirmBox.value?.onOk(); confirmBox.value = null; };

/* 拖拽武装：仅按住把手后才允许拖整卡/整标签，避免与改名输入框文本选择冲突 */
const specArm = ref<number | null>(null);
const specDrag = ref<number | null>(null);
const specAddVals = ref<string[]>([]);
const onSpecDragOver = (i: number) => {
  const from = specDrag.value;
  if (from === null || from === i) return;
  const [m] = d.specs.splice(from, 1);
  d.specs.splice(i, 0, m);
  const [mid] = specIds.value.splice(from, 1);
  specIds.value.splice(i, 0, mid);
  specDrag.value = i;
};
const askRemoveSpec = (si: number) => {
  const sp = d.specs[si];
  askConfirm('删除规格', `删除规格「${sp.name || `规格${si + 1}`}」将同时删除其下全部属性值（${sp.values.length} 个），SKU 列表将按剩余规格重新生成，是否继续？`, () => {
    const id = specIds.value[si];
    /* 清理 skuDeleted：移除含该规格维度 key，避免残留过滤新组合 */
    skuDeleted.value = skuDeleted.value.filter((k) => !k.split(' / ').some((v) => sp.values.includes(v)));
    d.specs.splice(si, 1);
    specIds.value.splice(si, 1);
    specAddVals.value.splice(si, 1);
    syncSkus();
    pushToast('规格已删除，SKU 已按剩余规格重新生成');
  });
};
const addSpec = () => {
  d.specs.push({ name: `规格${d.specs.length + 1}`, values: [] });
  specIds.value.push(`sp${specIdSeed++}`);
  specAddVals.value.push('');
  syncSkus();
};
const valArm = ref<string | null>(null);
const valDrag = ref<string | null>(null);
const onValDragOver = (si: number, vi: number) => {
  const from = valDrag.value;
  if (!from || from === `${si}-${vi}`) return;
  const [fs, fv] = from.split('-').map(Number);
  if (fs !== si) return;
  const [m] = d.specs[si].values.splice(fv, 1);
  d.specs[si].values.splice(vi, 0, m);
  valDrag.value = `${si}-${vi}`;
};
const askRemoveSpecValue = (si: number, vi: number) => {
  const v = d.specs[si].values[vi];
  const id = specIds.value[si];
  const last = d.specs[si].values.length === 1;
  const n = tSkus.value.filter((s) => s.vals[id] === v).length;
  /* 删最后一个值＝维度转空：SKU 保留仅暂隐该列，与删普通值的联动删除语义区分 */
  askConfirm('删除属性值', last
    ? `删除属性值「${v}」后规格「${d.specs[si].name || `规格${si + 1}`}」将无属性值，SKU 列表暂隐该规格列，其余 SKU 保留，是否继续？`
    : `删除属性值「${v}」将同步删除包含该属性值的 ${n} 个 SKU，是否继续？`, () => {
      d.specs[si].values.splice(vi, 1);
      /* 清理 skuDeleted：移除含该属性值的 key，被删 SKU 若值被重新添加可复活 */
      skuDeleted.value = skuDeleted.value.filter((k) => !k.includes(v));
      syncSkus();
      pushToast(last ? `属性值「${v}」已删除，规格「${d.specs[si].name || `规格${si + 1}`}」无属性值暂隐于 SKU 列表` : `属性值「${v}」及关联的 ${n} 个 SKU 已删除`);
    });
};
/* 属性值改名：失焦提交；空值/重名回退并提示；已生成 SKU 同步改名且不丢售价/库存编辑 */
const onSpecValChange = (si: number, vi: number, e: Event) => {
  const input = e.target as HTMLInputElement;
  const nv = input.value.trim();
  const ov = d.specs[si].values[vi];
  if (nv === ov) { input.value = ov; return; }
  if (!nv) { pushToast('属性值不能为空', 'warning'); input.value = ov; return; }
  if (d.specs[si].values.includes(nv)) { pushToast('该属性值已存在', 'warning'); input.value = ov; return; }
  d.specs[si].values[vi] = nv;
  const id = specIds.value[si];
  /* skuDeleted 同步改名：旧 key 替换为新 key，避免删除记录失效导致被删 SKU 复活 */
  skuDeleted.value = skuDeleted.value.map((k) => k.replace(ov, nv));
  tSkus.value.forEach((s) => {
    if (s.vals[id] !== ov) return;
    s.vals = { ...s.vals, [id]: nv };
    s.key = skuKeyOf(s.vals);
    s.name = skuNameOf(s.vals);
  });
};
/* 添加属性值：点击空白处（失焦）即保存，回车同样生效；空内容失焦静默忽略 */
const addSpecValue = (si: number) => {
  const v = (specAddVals.value[si] ?? '').trim();
  if (!v) return;
  if (d.specs[si].values.includes(v)) { pushToast('该属性值已存在', 'warning'); return; }
  d.specs[si].values.push(v);
  specAddVals.value[si] = '';
  syncSkus();
};
/* 删除 SKU：未被其它 SKU 引用的属性值联动删除；组合 key 记入已删名单，重算不复活 */
const askRemoveSku = (sku: TSku) => {
  const others = tSkus.value.filter((s) => s.key !== sku.key);
  const orphans = specIds.value
    .map((id, si) => ({ si, id, v: sku.vals[id] }))
    .filter(({ id, v }) => !others.some((s) => s.vals[id] === v));
  const orphanTxt = orphans.map((o) => `「${o.v}」`).join('、');
  askConfirm(
    '删除 SKU',
    orphans.length
      ? `删除 SKU「${sku.name}」后，属性值${orphanTxt}未被其它 SKU 引用，将一并删除，是否继续？`
      : `确认删除 SKU「${sku.name}」？其属性值仍被其它 SKU 引用，将予以保留。`,
    () => {
      skuDeleted.value.push(sku.key);
      orphans.forEach(({ si, v }) => {
        const idx = d.specs[si].values.indexOf(v);
        if (idx >= 0) d.specs[si].values.splice(idx, 1);
      });
      syncSkus();
      pushToast(orphans.length ? `SKU「${sku.name}」及属性值${orphanTxt}已删除` : `SKU「${sku.name}」已删除`);
    },
  );
};

/* ---------- 图片预览 + 预览内一键去水印 ---------- */
const previewList = ref<string[]>([]);
const previewIdx = ref(0);
const curPreview = computed(() => previewList.value[previewIdx.value] ?? '');
/* 工具条缩放：0.5–3 倍，切图/开闭时复位 */
const zoom = ref(1);
const zoomBy = (d: number) => { zoom.value = Math.min(3, Math.max(0.5, Math.round((zoom.value + d) * 100) / 100)); };
const openPreview = (list: string[], i: number) => { previewList.value = list; previewIdx.value = i; zoom.value = 1; };
const closePreview = () => { previewList.value = []; previewIdx.value = 0; zoom.value = 1; sizePanel.value = false; };
const stepPreview = (d: number) => {
  const n = previewList.value.length;
  previewIdx.value = (previewIdx.value + d + n) % n;
  zoom.value = 1;
  sizePanel.value = false;
};

/* 预览全屏切换（工具条末位图标） */
const previewMaskRef = ref<HTMLDivElement | null>(null);
const isFull = ref(false);
const syncFull = () => { isFull.value = !!document.fullscreenElement; };
onMounted(() => document.addEventListener('fullscreenchange', syncFull));
const toggleFull = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void previewMaskRef.value?.requestFullscreen();
};

/* 去水印状态（按图片槽位「组#下标」汇总）：queued→running→done/fail，完成后仍可再次去水印 */
interface WmState { status: 'queued' | 'running' | 'done' | 'fail'; percent: number; delay: number }
/* 生成记录（原图/每次去水印生成），支持还原到任一版本 */
interface WmRec { id: string; kind: 'origin' | 'wm'; label: string; time: string }
const wmState = ref<Record<string, WmState>>({});
const wmOf = (key: string) => wmState.value[key];
/* 模拟失败种子：按 src 确定性命中，保证结果展示同时存在成功与失败 */
const wmFailSeed = (src: string) => {
  let h = 0;
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) % 97;
  return h % 3 === 0;
};
let wmTimer: number | undefined;
const ensureWmTick = () => {
  if (wmTimer !== undefined) return;
  wmTimer = window.setInterval(() => {
    const hadRunning = Object.values(wmState.value).some((s) => s.status === 'running');
    const next: Record<string, WmState> = { ...wmState.value };
    for (const k of Object.keys(next)) {
      const s = next[k];
      if (s.status === 'queued') {
        /* 排队槽位到期才开跑，形成批次内时间差 */
        const delay = s.delay - 120;
        next[k] = delay <= 0 ? { status: 'running', percent: 4, delay: 0 } : { status: 'queued', percent: 0, delay };
        continue;
      }
      if (s.status !== 'running') continue;
      if (s.percent >= 100) {
        const fail = wmFailSeed(k);
        next[k] = fail ? { status: 'fail', percent: 100, delay: 0 } : { status: 'done', percent: 100, delay: 0 };
        if (!fail) pushWmRecord(k);
      } else next[k] = { status: 'running', percent: Math.min(100, s.percent + 8), delay: 0 };
    }
    const stillRunning = Object.values(next).some((s) => s.status === 'running');
    wmState.value = next;
    /* 本轮全部完成：一次性汇总成功/失败数提示 */
    if (hadRunning && !stillRunning) {
      const ok = Object.values(next).filter((s) => s.status === 'done').length;
      const fail = Object.values(next).filter((s) => s.status === 'fail').length;
      pushToast(fail ? `去水印完成：成功 ${ok} · 失败 ${fail}` : `去水印完成：成功 ${ok}`);
    }
    if (!stillRunning) { window.clearInterval(wmTimer); wmTimer = undefined; }
  }, 120);
};
const runWm = (key: string, delay = 0) => {
  const cur = wmOf(key)?.status;
  if (cur === 'running' || cur === 'queued') return; /* 提交防重 */
  ensureOrigin(key);
  wmState.value = {
    ...wmState.value,
    [key]: delay > 0 ? { status: 'queued', percent: 0, delay } : { status: 'running', percent: 4, delay: 0 },
  };
  ensureWmTick();
};
/* ---------- 生成记录：原图 + 每次去水印生成，可还原 ---------- */
const wmRecords = ref<Record<string, WmRec[]>>({});
const wmActiveRec = ref<Record<string, string>>({});
const nowStr = () => {
  const p = (n: number) => `${n}`.padStart(2, '0');
  const t = new Date();
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`;
};
const ensureOrigin = (key: string) => {
  if (wmRecords.value[key]) return;
  const rec: WmRec = { id: `${key}@0`, kind: 'origin', label: '原图', time: props.row.time };
  wmRecords.value = { ...wmRecords.value, [key]: [rec] };
  wmActiveRec.value = { ...wmActiveRec.value, [key]: rec.id };
};
const pushWmRecord = (key: string) => {
  ensureOrigin(key);
  const list = wmRecords.value[key];
  const n = list.filter((r) => r.kind === 'wm').length + 1;
  const rec: WmRec = { id: `${key}@${n}`, kind: 'wm', label: `去水印生成 ${n}`, time: nowStr() };
  wmRecords.value = { ...wmRecords.value, [key]: [...list, rec] };
  wmActiveRec.value = { ...wmActiveRec.value, [key]: rec.id };
};
/* 点击生成记录即切换使用该版本（选中哪个展示哪个） */
const selectRec = (key: string, id: string) => {
  if (wmActiveRec.value[key] === id) return;
  wmActiveRec.value = { ...wmActiveRec.value, [key]: id };
  const rec = (wmRecords.value[key] ?? []).find((r) => r.id === id);
  pushToast(rec?.kind === 'origin' ? '已切换使用原图' : `已切换使用「${rec?.label ?? ''}」`);
};
/* 模板视图：槽位去水印状态 */
const wmViewOf = (key: string) => wmState.value[key];
/* 预览组键：按已知图组引用区分，单图组用 src 保唯一（ref 深响应代理会破坏引用相等，先 toRaw） */
const groupKeyOf = (list: string[]) => {
  const raw = toRaw(list);
  return raw === toRaw(d.thumbs) ? 'thumbs' : raw === toRaw(d.mainImgs) ? 'main' : raw === toRaw(d.detailImgs) ? 'detail' : `single:${list[0] ?? ''}`;
};
const previewGroup = computed(() => groupKeyOf(previewList.value));
const curWmKey = computed(() => `${previewGroup.value}#${previewIdx.value}`);
/* 详情页主图槽位键 */
const mainWmKey = computed(() => `single:${props.row.thumb}#0`);
/* 当前预览图的生成记录（新→旧）；仅存在生成历史时在预览右侧展示 */
const curRecords = computed(() => [...(wmRecords.value[curWmKey.value] ?? [])].reverse());
const curActiveRecId = computed(() => wmActiveRec.value[curWmKey.value] ?? '');
/* 预览内一键去水印：仅提交当前预览图片（非整组批量） */
const curWmState = computed(() => wmState.value[curWmKey.value]);
const curWmRunning = computed(() => curWmState.value?.status === 'running' || curWmState.value?.status === 'queued');
const onPreviewWm = () => runWm(curWmKey.value);

/* ---------- 预览内修改尺寸：预设＋自由裁剪逻辑见共享组件 ImgSizeCrop，此处仅保留面板开合与裁剪结果回写 ---------- */
const sizePanel = ref(false);
const previewImgRef = ref<HTMLImageElement | null>(null);
/* 裁剪结果回写：替换当前预览图；白底图/场景图预览传的是临时数组，回写字段以同步缩略图 */
const commitSize = (url: string) => {
  const srcUrl = curPreview.value;
  const list = previewList.value;
  list[previewIdx.value] = url;
  const raw = toRaw(list);
  if (raw !== toRaw(d.thumbs) && raw !== toRaw(d.mainImgs) && raw !== toRaw(d.detailImgs)) {
    if (srcUrl === d.whiteImg) d.whiteImg = url;
    else if (srcUrl === d.sceneImg) d.sceneImg = url;
  }
};
/* 右侧栏一键去水印：批量提交本页全部图片槽位 */
const pageWmKeys = computed(() => {
  const keys = [`single:${props.row.thumb}#0`];
  const push = (g: string, n: number) => { for (let i = 0; i < n; i++) keys.push(`${g}#${i}`); };
  push('thumbs', d.thumbs.length);
  push('main', d.mainImgs.length);
  push('detail', d.detailImgs.length);
  keys.push(`single:${d.whiteImg}#0`, `single:${d.sceneImg}#0`);
  return keys;
});
const pageWmRunning = computed(() => Object.values(wmState.value).some((s) => s.status === 'running' || s.status === 'queued'));
const onPageWm = () => {
  pageWmKeys.value.forEach((k, i) => runWm(k, i * 180));
  pushToast('去水印任务已提交');
};
onBeforeUnmount(() => {
  if (wmTimer !== undefined) window.clearInterval(wmTimer);
  document.removeEventListener('fullscreenchange', syncFull);
});

/* ESC：全屏中先退全屏，否则关闭预览 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (document.fullscreenElement) { void document.exitFullscreen(); return; }
  closePreview();
};
watch(previewList, (v) => {
  if (v.length) document.addEventListener('keydown', onKeydown);
  else document.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <MaterialCenter v-if="showMaterial" @back="showMaterial = false" />
  <div v-else class="sg-page sgd-page cpd-page">
    <div class="sgd-hero">
      <div class="sgd-top">
        <div class="sgd-top-left">
          <button class="sgd-back" title="返回" @click="emit('back')">←</button>
          <span class="sgd-top-title">商品详情</span>
        </div>
        <div v-if="!props.readonly" class="cpd-top-acts">
          <template v-if="editing">
            <button class="sg-btn" @click="editing = false">取消编辑</button>
            <button class="sg-btn primary" @click="editing = false; pushToast('版本已保存')">保存版本</button>
          </template>
          <template v-else>
            <button class="cpd-pub-link" @click="emit('openPub')">关联发布任务 &gt;</button>
            <button class="sg-btn" @click="editing = true">编辑</button>
          </template>
        </div>
      </div>

      <div class="sgd-cat">
        <span class="sgd-cat-label">当前类目<i>*</i></span>
        <span>{{ d.category.join('/') }}</span>
        <a v-if="editing" class="cpd-cat-edit" href="#" @click.prevent>修改</a>
      </div>

      <div class="sgd-head">
        <div class="sgd-gallery">
          <div class="sgd-thumbs">
            <span
              v-for="(t, i) in d.thumbs"
              :key="i"
              class="cpd-wmbox"
              :class="wmViewOf(`thumbs#${i}`)?.status === 'fail' ? 'wm-fail' : ''"
            >
              <img
                class="sgd-thumb cpd-previewable"
                :class="i === 0 ? 'active' : ''"
                :src="t"
                alt=""
                @click="openPreview(d.thumbs, i)"
              />
              <i
                v-if="wmViewOf(`thumbs#${i}`) && (wmViewOf(`thumbs#${i}`)!.status === 'running' || wmViewOf(`thumbs#${i}`)!.status === 'queued')"
                class="cpd-wm-mask"
                :class="wmViewOf(`thumbs#${i}`)!.status"
              >
                <span v-if="wmViewOf(`thumbs#${i}`)!.status === 'running'" class="cpd-wm-spin" />
                <b v-else class="cpd-wm-queue">排队中</b>
              </i>
            </span>
          </div>
          <span
            class="cpd-wmbox"
            :class="wmViewOf(mainWmKey)?.status === 'fail' ? 'wm-fail' : ''"
          >
            <img class="sgd-main cpd-previewable" :src="props.row.thumb" alt="" @click="openPreview([props.row.thumb], 0)" />
            <i
              v-if="wmViewOf(mainWmKey) && (wmViewOf(mainWmKey)!.status === 'running' || wmViewOf(mainWmKey)!.status === 'queued')"
              class="cpd-wm-mask"
              :class="wmViewOf(mainWmKey)!.status"
            >
              <span v-if="wmViewOf(mainWmKey)!.status === 'running'" class="cpd-wm-spin" />
              <b v-else class="cpd-wm-queue">排队中</b>
            </i>
          </span>
        </div>
        <div class="sgd-info">
          <h2>{{ props.row.title }}</h2>
          <div class="sgd-fields">
            <div class="sgd-frow"><span>创建时间：</span><b>{{ curVer.time }}</b></div>
            <div class="sgd-frow"><span>创建人：</span><b>{{ curVer.person }}</b></div>
            <div class="sgd-frow"><span>审核状态：</span><b><span class="sgd-tag orange">{{ d.checkStatus }}</span></b></div>
          </div>
        </div>
        <div class="cpd-side-acts">
          <button class="cpd-side-btn" @click="pushToast('手机预览：演示环境暂不可用', 'warning')">
            <span class="ic">▯</span>手机预览
          </button>
          <button class="cpd-side-btn" @click="pushToast('AI审查完成：未发现合规问题')">
            <span class="ic">◉</span>AI审查
          </button>
          <button v-if="editing" class="cpd-side-btn" @click="showMaterial = true">
            <span class="ic">❐</span>素材
          </button>
          <button v-if="!props.readonly" class="cpd-side-btn" :class="pageWmRunning ? 'wm-busy' : ''" :disabled="pageWmRunning" @click="onPageWm">
            <span class="ic"><i v-if="pageWmRunning" class="cpd-wm-spin" /><template v-else>✦</template></span>{{ pageWmRunning ? '去水印中…' : '一键去水印' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 商品规格 -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品规格</div>
        <button class="sgd-collapse" @click="specOpen = !specOpen">{{ specOpen ? '∨ 收起' : '∧ 展开' }}</button>
      </div>
      <div v-if="specOpen" class="sgd-sec-body">
        <template v-if="editing">
          <div
            v-for="(sp, si) in d.specs"
            :key="specIds[si]"
            class="cpd-spec-card"
            :class="specDrag === si ? 'dragging' : ''"
            :draggable="specArm === si"
            @dragstart="specDrag = si"
            @dragover.prevent="onSpecDragOver(si)"
            @dragend="specArm = null; specDrag = null; syncSkus()"
          >
            <div class="cpd-spec-head">
              <span class="cpd-drag" title="拖动排序规格" @mousedown="specArm = si" @mouseup="specArm = null">⋮</span>
              <input v-model="sp.name" class="cpd-vspec-name" placeholder="规格名" />
              <span class="cpd-spec-ics">
                <i class="danger" title="删除该规格" @click="askRemoveSpec(si)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6" /></svg>
                </i>
              </span>
            </div>
            <!-- 属性值标签形式：把手拖拽排序＋点击改名（失焦提交）＋删除（弹窗提示联动删除 SKU） -->
            <div class="cpd-vspec-vals">
              <span
                v-for="(v, vi) in sp.values"
                :key="vi"
                class="cpd-vspec-chip cpd-tchip"
                :class="valDrag === `${si}-${vi}` ? 'dragging' : ''"
                :draggable="valArm === `${si}-${vi}`"
                @dragstart="valDrag = `${si}-${vi}`"
                @dragover.prevent="onValDragOver(si, vi)"
                @dragend="valArm = null; valDrag = null; syncSkus()"
              >
                <i class="cpd-chip-grip" title="拖动排序属性值" @mousedown="valArm = `${si}-${vi}`" @mouseup="valArm = null">⋮</i>
                <input class="cpd-chip-input" :value="v" @change="onSpecValChange(si, vi, $event)" />
                <i class="cpd-chip-del" title="删除该属性值" @click="askRemoveSpecValue(si, vi)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6" /></svg>
                </i>
              </span>
              <span v-if="sp.values.length === 0" class="cpd-vsku-empty">—</span>
              <input class="cpd-val-add" v-model="specAddVals[si]" placeholder="输入属性值，点击空白处保存" @blur="addSpecValue(si)" @keyup.enter="addSpecValue(si)" />
            </div>
          </div>
          <button class="cpd-add-spec" @click="addSpec">⊕ 添加规格</button>
        </template>
        <template v-if="!editing">
          <div v-for="sp in d.specs" :key="sp.name" class="cpd-spec-card cpd-spec-view">
            <div class="cpd-spec-head"><span class="cpd-vspec-name">{{ sp.name }}</span></div>
            <div class="cpd-vspec-vals">
              <span v-for="v in sp.values" :key="v" class="cpd-vspec-chip">{{ v }}</span>
              <span v-if="sp.values.length === 0" class="cpd-vsku-empty">—</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 商品SKU -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品SKU</div>
        <div class="cpd-sku-acts">
          <button v-if="editing && !video" class="sg-btn primary cpd-sm" @click="pushToast('一键匹配完成')">一键匹配</button>
          <label class="sgd-sku-toggle">
            <input v-model="skuShow" type="checkbox" />
            展开明细
          </label>
        </div>
      </div>
      <div class="sgd-sec-body">
        <div class="cpd-sku-wrap">
          <!-- SKU 行=规格属性值笛卡尔积自动生成；属性列按绑定关系 rowspan 合并；删除 SKU 联动删除未被引用的属性值（淘宝/视频号统一） -->
          <table :class="['sg-table', 'cpd-sku-table', 'cpd-tsku', skuShow ? 'cpd-tsku-x' : '']">
            <thead>
              <tr>
                <th>排序</th>
                <th>SKU图</th>
                <th>编码图片</th>
                <template v-for="(sp, di) in d.specs" :key="specIds[di]"><th v-if="sp.values.length">{{ sp.name || `规格${di + 1}` }}</th></template>
                <th>组合</th>
                <th>SKU名称</th>
                <th>商品编码</th>
                <th>系列编码</th>
                <th>库存数</th>
                <!-- 展开明细：云仓占比/成本价/出仓总成本/工资分摊比例/推广费率/税比例（原型明细字段）；收起：产品成本价/其它成本 -->
                <template v-if="skuShow">
                  <th>云仓占比</th>
                  <th>成本价</th>
                  <th :title="OUT_COST_TIP">出仓总成本 ⓘ</th>
                  <th>工资分摊比例</th>
                  <th>推广费率</th>
                  <th>税比例</th>
                </template>
                <template v-else>
                  <th>产品成本价</th>
                  <th :title="OTHER_COST_TIP">其它成本 ⓘ</th>
                </template>
                <th>售价</th>
                <th>利润</th>
                <th>利润率</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, ri) in tSkus" :key="s.key">
                <td>{{ ri + 1 }}</td>
                <td><img class="sgd-sku-img" :src="row.thumb" alt="" /></td>
                <td><img class="sgd-sku-img" :src="row.thumb" alt="" /></td>
                <template v-for="(sid, di) in specIds" :key="sid">
                  <td v-if="d.specs[di].values.length && skuMerge[ri][di].show" class="cpd-merge-cell" :rowspan="skuMerge[ri][di].span">{{ s.vals[specIds[di]] }}</td>
                </template>
                <td>{{ s.name }}</td>
                <td>
                  <input v-if="editing" v-model="s.skuName" class="cpd-cell-input cpd-cell-wide" />
                  <template v-else>{{ s.skuName }}</template>
                </td>
                <td><span class="cpd-code-outline">{{ s.code }}</span></td>
                <td><span v-if="s.series" class="sgd-code">{{ s.series }}</span><template v-else>0</template></td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.stock" class="cpd-cell-input" /><i>件</i></span>
                  <template v-else>{{ s.stock }}</template>
                </td>
                <template v-if="skuShow">
                  <td>{{ s.cloudRatio }}</td>
                  <td>{{ s.cost ? `${s.cost} 元` : '0 元' }}</td>
                  <td>
                    <span v-if="editing" class="cpd-cell-num"><input v-model="s.other" class="cpd-cell-input" /><i>元</i></span>
                    <template v-else>{{ s.other ? `${s.other} 元` : '0 元' }}</template>
                  </td>
                  <td>
                    <span v-if="editing" class="cpd-cell-num"><input v-model="s.wageRatio" class="cpd-cell-input" /><i>%</i></span>
                    <template v-else>{{ s.wageRatio ? `${s.wageRatio}%` : '0%' }}</template>
                  </td>
                  <td>
                    <span v-if="editing" class="cpd-cell-num"><input v-model="s.promoRate" class="cpd-cell-input" /><i>%</i></span>
                    <template v-else>{{ s.promoRate ? `${s.promoRate}%` : '0%' }}</template>
                  </td>
                  <td>
                    <span v-if="editing" class="cpd-cell-num"><input v-model="s.taxRatio" class="cpd-cell-input" /><i>%</i></span>
                    <template v-else>{{ s.taxRatio ? `${s.taxRatio}%` : '0%' }}</template>
                  </td>
                </template>
                <template v-else>
                  <td>{{ s.cost ? `${s.cost} 元` : '0 元' }}</td>
                  <td>
                    <span v-if="editing" class="cpd-cell-num"><input v-model="s.other" class="cpd-cell-input" /><i>元</i></span>
                    <template v-else>{{ s.other ? `${s.other} 元` : '0 元' }}</template>
                  </td>
                </template>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.price" class="cpd-cell-input" /><i>元</i></span>
                  <template v-else>{{ s.price }} 元</template>
                </td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="profitOf(s)" @input="s.profit = ($event.target as HTMLInputElement).value" /><i>元</i></span>
                  <template v-else>{{ profitOf(s) }} 元</template>
                </td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="rateOf(s)" @input="s.rate = ($event.target as HTMLInputElement).value" /><i>%</i></span>
                  <template v-else>{{ rateOf(s) }}%</template>
                </td>
                <td class="cpd-row-ops">
                  <a href="#" @click.prevent>查看</a>
                  <a v-if="editing" class="danger" href="#" @click.prevent="askRemoveSku(s)">删除</a>
                </td>
              </tr>
              <tr v-if="tSkus.length === 0"><td :colspan="(skuShow ? 18 : 14) + filledSpecCount" class="cpd-vsku-empty">—</td></tr>
            </tbody>
          </table>
        </div>
        <div class="sgd-price">
          <span>一口价<i>*</i></span>
          <input v-if="editing" class="sg-input sgd-price-input" :value="d.price" />
          <b v-else>{{ d.price }}</b>
        </div>
      </div>
    </div>

    <CpdMediaSec
      title="3*4主图"
      note="最多上传10张图片，支持最小尺寸1:1 700*700，固定主图比例为3:4，大小3M以内"
      :imgs="d.mainImgs"
      :ratio34="true"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.mainImgs, i)"
      :wm-of="(i) => wmViewOf(`main#${i}`)"
    />
    <CpdMediaSec
      title="商品详情*"
      note="宝贝详情图【高度≤2】，超出将被裁剪，建议宽度≥1440像素以确保清晰，拖动模块可排序"
      :imgs="d.detailImgs"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.detailImgs, i)"
      :wm-of="(i) => wmViewOf(`detail#${i}`)"
    />
    <CpdMediaSec
      title="商品视频"
      note="视频要求：时长5秒~60秒；宽高比支持1:1、3:4、9:16（9:16视频商品详情页不展示，可在首页推荐、微详情等展示）最多可上传5个"
      :imgs="d.videos"
      :video="true"
      :editing="editing"
      add-label="添加视频"
    />
    <CpdMediaSec
      title="通用商品白底图"
      note="宽高800*800，所报名商品台的白底图，纯白边，图片饱满（上下贴边或左右贴边），将作为个性化素材展示"
      :imgs="[d.whiteImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.whiteImg], i)"
      :wm-of="() => wmViewOf(`single:${d.whiteImg}#0`)"
    />
    <CpdMediaSec
      title="通用商品场景图(非必填)"
      note="基本要求：带有背景，无牛皮癣，主体清晰完整不变形、不拼图、不含图、不留白边，建议主体突出与背景和谐。背景不宜过于复杂，色调自然。格式要求：800*800px，JPG/JPEG、小于3M"
      :imgs="[d.sceneImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.sceneImg], i)"
      :wm-of="() => wmViewOf(`single:${d.sceneImg}#0`)"
    />

    <!-- 视频号（微信小店）服务保障三选项：独立白卡、标题独行无蓝条，控件在下（参照原版客户端） -->
    <template v-if="video">
      <div class="sgd-sec">
        <div class="sgd-sec-body">
          <div class="cpd-svc-title">是否假一赔三</div>
          <div class="cpd-radios">
            <span
              v-for="t in FAKE3_OPTIONS"
              :key="t"
              class="cpd-radio"
              :class="`${fake3 === t ? 'on' : ''} ${editing ? '' : 'ro'}`"
              @click="editing ? (fake3 = t) : null"
            >
              <i class="cpd-rad" />{{ t }}
            </span>
          </div>
        </div>
      </div>
      <div class="sgd-sec">
        <div class="sgd-sec-body">
          <div class="cpd-svc-title">是否支持换货</div>
          <div class="cpd-radios">
            <span
              v-for="t in EXCHANGE_OPTIONS"
              :key="t"
              class="cpd-radio"
              :class="`${exchange === t ? 'on' : ''} ${editing ? '' : 'ro'}`"
              @click="editing ? (exchange = t) : null"
            >
              <i class="cpd-rad" />{{ t }}
            </span>
          </div>
        </div>
      </div>
      <div class="sgd-sec">
        <div class="sgd-sec-body">
          <div class="cpd-svc-title">7天无理由</div>
          <BubbleSelect class-name="cpd-svc-select" :value="sevenDay" :options="SEVEN_DAY_OPTIONS" :disabled="!editing" @change="(v) => (sevenDay = v)" />
        </div>
      </div>
    </template>

    <!-- 其它信息 -->
    <div class="sgd-sec">
      <div class="sgd-sec-head"><div class="sgd-sec-title">其它信息</div></div>
      <div class="sgd-sec-body">
        <div class="cpd-radio-row">
          <span class="cpd-radio-label">发货时效<i>*</i></span>
          <div class="cpd-radios">
            <span
              v-for="t in SHIP_OPTIONS"
              :key="t"
              class="cpd-radio"
              :class="`${ship === t ? 'on' : ''} ${editing ? '' : 'ro'}`"
              @click="editing ? (ship = t) : null"
            >
              <i class="cpd-rad" />{{ t }}
            </span>
          </div>
        </div>
        <div class="cpd-radio-row">
          <span class="cpd-radio-label">宝贝类型<i>*</i></span>
          <div class="cpd-radios">
            <span
              v-for="t in STUFF_OPTIONS"
              :key="t"
              class="cpd-radio"
              :class="`${stuff === t ? 'on' : ''} ${editing ? '' : 'ro'}`"
              @click="editing ? (stuff = t) : null"
            >
              <i class="cpd-rad" />{{ t }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图片预览：全屏暗幕 + 底部悬浮工具条（翻页/缩放/全屏/一键去水印，完成后可再次去水印） -->
    <div v-if="previewList.length" ref="previewMaskRef" class="cpd-preview-mask">
      <button type="button" class="cpd-preview-close" title="关闭（Esc）" @click="closePreview">✕</button>
      <div class="cpd-preview-stage" @click.self="closePreview">
        <div
          class="cpd-preview-imgwrap"
          :class="wmViewOf(curWmKey)?.status === 'fail' ? 'wm-fail' : ''"
          :style="{ transform: `scale(${zoom})` }"
        >
          <img ref="previewImgRef" :src="curPreview" alt="" />
          <div v-if="wmViewOf(curWmKey)?.status === 'running'" class="cpd-preview-wming">
            <i class="cpd-wm-spin" />去水印中 {{ wmViewOf(curWmKey)!.percent }}%
          </div>
          <div v-else-if="wmViewOf(curWmKey)?.status === 'queued'" class="cpd-preview-wming">排队中…</div>
          <!-- 修改尺寸＋自由裁剪：选区层就地渲染，面板 Teleport 到暗幕（共享组件，京麦详情/素材中心同款） -->
          <ImgSizeCrop v-model:open="sizePanel" :src="curPreview" :zoom="zoom" :img-el="previewImgRef" :commit="commitSize" />
        </div>
      </div>
      <!-- 生成记录：存在去水印生成历史时展示；点击任一版本即切换使用，选中版本加角标 -->
      <aside v-if="curRecords.length > 1" class="cpd-preview-recs">
        <div class="cpd-recs-head">生成记录<span>{{ curRecords.length }} 个版本</span></div>
        <div class="cpd-recs-list">
          <button
            v-for="r in curRecords"
            :key="r.id"
            type="button"
            class="cpd-recs-item"
            :class="r.id === curActiveRecId ? 'active' : ''"
            @click="selectRec(curWmKey, r.id)"
          >
            <span class="cpd-recs-thumb">
              <img :src="curPreview" alt="" />
              <i v-if="r.id === curActiveRecId" class="cpd-recs-badge">✓</i>
            </span>
            <span class="cpd-recs-info">
              <b>{{ r.label }}</b>
              <span>{{ r.time }}</span>
            </span>
          </button>
        </div>
      </aside>
      <div class="cpd-preview-bar">
        <button type="button" class="cpd-bar-btn" title="上一张" :disabled="previewList.length < 2" @click="stepPreview(-1)">‹</button>
        <span class="cpd-bar-count">{{ previewIdx + 1 }} / {{ previewList.length }}</span>
        <button type="button" class="cpd-bar-btn" title="下一张" :disabled="previewList.length < 2" @click="stepPreview(1)">›</button>
        <i class="cpd-bar-div" />
        <button type="button" class="cpd-bar-btn" title="缩小" :disabled="zoom <= 0.5" @click="zoomBy(-0.25)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M7.5 10.5h6" /></svg>
        </button>
        <button type="button" class="cpd-bar-btn" title="放大" :disabled="zoom >= 3" @click="zoomBy(0.25)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg>
        </button>
        <button type="button" class="cpd-bar-btn" :title="isFull ? '退出全屏' : '全屏'" @click="toggleFull">
          <svg v-if="!isFull" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
        </button>
        <template v-if="editing">
          <i class="cpd-bar-div" />
          <button type="button" class="cpd-bar-size" :class="sizePanel ? 'on' : ''" title="修改图片尺寸" @click="sizePanel = !sizePanel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5" /><path d="M20 15v5h-5" /><path d="m4 4 7 7" /><path d="m20 20-7-7" /></svg>
            修改尺寸
          </button>
        </template>
        <i v-if="!props.readonly" class="cpd-bar-div" />
        <button v-if="!props.readonly" type="button" class="cpd-bar-wm" :disabled="curWmRunning" @click="onPreviewWm">
          {{ curWmState?.status === 'running' ? `去水印中 ${curWmState.percent}%` : curWmState?.status === 'queued' ? '排队中…' : '一键去水印' }}
        </button>
      </div>
    </div>

    <!-- 删除规格/属性值/SKU 二次确认：复用营销页等模块的 mk-confirm 弹窗样式，联动删除范围写入文案 -->
    <Teleport to="body">
      <div v-if="confirmBox" class="mk-create-mask mk-confirm-mask" @click.self="confirmBox = null">
        <div class="mk-confirm-modal">
          <div class="mk-confirm-head">{{ confirmBox.title }}</div>
          <div class="mk-confirm-body">{{ confirmBox.message }}</div>
          <div class="mk-confirm-foot">
            <button class="sg-btn" @click="confirmBox = null">取消</button>
            <button class="sg-btn danger" @click="doConfirm">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

import { reactive, ref } from 'vue';

/* ============ 批量素材类型 ============ */
export type AsMaterialType = '主图' | '3:4主图' | '详情图' | 'SKU图' | '白底图' | '场景图';
export const AS_MATERIAL_TYPES: AsMaterialType[] = ['主图', '3:4主图', '详情图', 'SKU图', '白底图', '场景图'];
export const AS_MATERIAL_PRESET: Record<AsMaterialType, { ratio: string; w: number; h: number }> = {
  主图: { ratio: '1:1', w: 800, h: 800 },
  '3:4主图': { ratio: '3:4', w: 750, h: 1000 },
  详情图: { ratio: 'detail', w: 750, h: 2000 },
  SKU图: { ratio: '1:1', w: 800, h: 800 },
  白底图: { ratio: '1:1', w: 800, h: 800 },
  场景图: { ratio: '3:4', w: 750, h: 1000 },
};

/* ============ 动作（能力）模型 ============ */
export type ActionKey =
  | 'changeTheme' | 'changeSubject' | 'changeScene' | 'replicate'
  | 'mainImg' | 'detailImg'
  | 'whiteBg' | 'clipKeep' | 'clipClean'
  | 'allMaterials';

export interface ActionMeta {
  key: ActionKey;
  name: string;
  group: 'AI 换图' | '一键生成' | '抠图与清理' | '批量替换';
  desc: string;
  /** 场景步骤：theme=主题库 / scene=场景库或参考图 / ref=参考图 */
  sceneKind?: 'theme' | 'scene' | 'ref';
  needStyle: boolean;
  /** 风格可选（单图复刻默认不套用） */
  styleOptional?: boolean;
  /** 换主体：需另选新主体 */
  needSubject?: boolean;
  /** 选区交互：keep=保留选区 / clean=清除选区 */
  needRect?: 'keep' | 'clean';
  ratios: string[];
  multi: boolean;
  detail?: boolean;
  /** 一键全素材：一次性产出多类型素材 */
  batch?: boolean;
}

export const ACTIONS: ActionMeta[] = [
  { key: 'allMaterials', name: '一键全素材', group: '批量替换', desc: '选择商品后，按场景+风格一次性生成主图、3:4主图、详情图、SKU图、白底图、场景图等全套素材', sceneKind: 'scene', needStyle: true, ratios: ['batch'], multi: true, batch: true },
  { key: 'changeTheme', name: '换主题', group: 'AI 换图', desc: '保留主体与构图，一键更换整体主题氛围', sceneKind: 'theme', needStyle: true, ratios: ['1:1', '3:4', '9:16', '16:9', 'custom'], multi: true },
  { key: 'changeSubject', name: '换主体', group: 'AI 换图', desc: '维持当前场景，一键更换商品主体', needSubject: true, needStyle: true, ratios: ['1:1', '3:4', '9:16', '16:9', 'custom'], multi: true },
  { key: 'changeScene', name: '换场景', group: 'AI 换图', desc: '基于竞品或自有商品图，一键更换场景', sceneKind: 'scene', needStyle: true, ratios: ['1:1', '3:4', '9:16', '16:9', 'custom'], multi: true },
  { key: 'replicate', name: '单图复刻', group: 'AI 换图', desc: '复刻参考图构图与氛围，替换为自有商品', sceneKind: 'ref', needStyle: true, styleOptional: true, ratios: ['1:1', '3:4', '9:16', '16:9', 'custom'], multi: true },
  { key: 'mainImg', name: '商品主图', group: '一键生成', desc: '选择商品图片生成电商平台主图', needStyle: true, ratios: ['1:1', '3:4', '9:16', '16:9', 'custom'], multi: true },
  { key: 'detailImg', name: '详情图', group: '一键生成', desc: '生成竖版详情长图（多屏版式）', needStyle: true, ratios: ['detail'], multi: false, detail: true },
  { key: 'whiteBg', name: '抠白底图', group: '抠图与清理', desc: '自动抠出主体，输出纯白 / 透明底图', needStyle: false, ratios: ['1:1', '3:4', 'custom'], multi: false },
  { key: 'clipKeep', name: '选区抠图', group: '抠图与清理', desc: '框选保留区域，抠出选区内主体', needStyle: false, needRect: 'keep', ratios: ['1:1', '3:4', 'custom'], multi: false },
  { key: 'clipClean', name: '选区清除杂物', group: '抠图与清理', desc: '框选并清除画面中的杂物水印', needStyle: false, needRect: 'clean', ratios: ['source'], multi: false },
];
export const actionOf = (k: ActionKey) => ACTIONS.find((a) => a.key === k)!;
export const ACTION_GROUPS: ActionMeta['group'][] = ['批量替换', 'AI 换图', '一键生成', '抠图与清理'];

/* ============ 输出比例 ============ */
export interface RatioPreset { key: string; label: string; w: number; h: number; note: string }
export const RATIOS: RatioPreset[] = [
  { key: '1:1', label: '1:1', w: 800, h: 800, note: '主图·方图' },
  { key: '3:4', label: '3:4', w: 750, h: 1000, note: '主图·竖图' },
  { key: '9:16', label: '9:16', w: 720, h: 1280, note: '竖版·故事' },
  { key: '16:9', label: '16:9', w: 1280, h: 720, note: '横版·banner' },
  { key: 'custom', label: '自定义', w: 0, h: 0, note: '宽 × 高' },
  { key: 'detail', label: '750 宽长图', w: 750, h: 2000, note: '详情长图' },
  { key: 'source', label: '跟随原图', w: 0, h: 0, note: '不改变尺寸' },
];
export const ratioOf = (k: string) => RATIOS.find((r) => r.key === k)!;

/* ============ 场景库 / 风格库（配置页可启停与自定义） ============ */
export interface SceneItem { id: string; name: string; cat: string; desc: string; bg: string; enabled: boolean; builtin: boolean }
export const SCENE_CATS = ['纯色棚拍', '家居室内', '户外自然', '节日营销', '厨卫空间', '办公数码'];
export const scenes = reactive<SceneItem[]>([
  { id: 'sc01', name: '雾感浅灰', cat: '纯色棚拍', desc: '中性浅灰渐变，突出主体轮廓', bg: 'linear-gradient(165deg,#f7f8fc 0%,#e6e9f2 100%)', enabled: true, builtin: true },
  { id: 'sc02', name: '奶油白', cat: '纯色棚拍', desc: '暖白柔光，适配美妆母婴', bg: 'linear-gradient(165deg,#fdfaf4 0%,#f3ead9 100%)', enabled: true, builtin: true },
  { id: 'sc03', name: '莫兰迪绿', cat: '纯色棚拍', desc: '低饱和绿底，清新耐看', bg: 'linear-gradient(165deg,#eef3ee 0%,#d8e3d8 100%)', enabled: true, builtin: true },
  { id: 'sc04', name: '法式复古室内', cat: '家居室内', desc: '石膏线墙面＋木地板暖光', bg: 'linear-gradient(160deg,#f2e8dc 0%,#d9c4ab 60%,#b99a78 100%)', enabled: true, builtin: true },
  { id: 'sc05', name: '极简客厅', cat: '家居室内', desc: '浅色沙发背景，生活感陈列', bg: 'linear-gradient(165deg,#f4f2ee 0%,#ddd6cb 100%)', enabled: true, builtin: true },
  { id: 'sc06', name: '暖阳卧室一角', cat: '家居室内', desc: '侧逆光窗帘氛围', bg: 'linear-gradient(150deg,#fbf3e6 0%,#e8cfae 100%)', enabled: true, builtin: true },
  { id: 'sc07', name: '阳光草地', cat: '户外自然', desc: '户外草坪自然光', bg: 'linear-gradient(170deg,#dff0c8 0%,#9ec97e 100%)', enabled: true, builtin: true },
  { id: 'sc08', name: '海滨沙滩', cat: '户外自然', desc: '海天一色度假感', bg: 'linear-gradient(175deg,#dff1f7 0%,#8fc6dd 55%,#e8d8b0 100%)', enabled: true, builtin: true },
  { id: 'sc09', name: '森林晨雾', cat: '户外自然', desc: '雾感绿林，天然有机联想', bg: 'linear-gradient(170deg,#e8f0e6 0%,#7d9c86 100%)', enabled: true, builtin: true },
  { id: 'sc10', name: '年货红主题', cat: '节日营销', desc: '正红＋金点缀，年货节氛围', bg: 'linear-gradient(160deg,#f7d9d0 0%,#d8433a 100%)', enabled: true, builtin: true },
  { id: 'sc11', name: '大促舞台', cat: '节日营销', desc: '高饱和撞色促销舞台', bg: 'linear-gradient(150deg,#ffe3c2 0%,#f2603d 60%,#c22b4a 100%)', enabled: true, builtin: true },
  { id: 'sc12', name: '圣诞夜', cat: '节日营销', desc: '墨绿＋暖灯串夜景', bg: 'linear-gradient(165deg,#20402f 0%,#0e241b 100%)', enabled: false, builtin: true },
  { id: 'sc13', name: '大理石厨房', cat: '厨卫空间', desc: '白色大理石台面＋厨具陈设', bg: 'linear-gradient(165deg,#f6f5f2 0%,#d8d5cf 100%)', enabled: true, builtin: true },
  { id: 'sc14', name: '浴室水雾', cat: '厨卫空间', desc: '瓷砖＋水雾清新感', bg: 'linear-gradient(170deg,#e9f4f4 0%,#bcd8d8 100%)', enabled: true, builtin: true },
  { id: 'sc15', name: '桌面办公', cat: '办公数码', desc: '木质桌面＋键盘显示器背景', bg: 'linear-gradient(165deg,#efe9e0 0%,#c9bcae 100%)', enabled: true, builtin: true },
  { id: 'sc16', name: '科技暗场', cat: '办公数码', desc: '深色舞台光，数码质感', bg: 'linear-gradient(160deg,#2b3350 0%,#12162a 100%)', enabled: true, builtin: true },
]);

export interface StyleItem { id: string; name: string; desc: string; tint: string; thumb: string; tags: string[]; enabled: boolean; builtin: boolean }
export const STYLE_TAGS = ['主图', '详情图', '场景图'];

/* 风格缩略图：用 SVG 渐变+图标模拟真实氛围样片，避免纯颜色当风格 */
const mkThumb = (start: string, end: string, icon: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><text x="32" y="37" font-size="20" text-anchor="middle" fill="rgba(255,255,255,.9)" font-family="Arial">${icon}</text></svg>`)}`;

export const styles = reactive<StyleItem[]>([
  { id: 'st01', name: '清新自然', desc: '明亮通透、绿植光影，适配家居/日化/食品', tint: '#dcebe0', thumb: mkThumb('#eaf6ef', '#9ec9a8', '🌿'), tags: ['主图', '详情图', '场景图'], enabled: true, builtin: true },
  { id: 'st02', name: '清冷高级', desc: '低饱和灰蓝、克制留白，突出产品质感', tint: '#c8d0db', thumb: mkThumb('#eef1f5', '#7a8ba3', '💎'), tags: ['主图', '详情图', '场景图'], enabled: true, builtin: true },
  { id: 'st03', name: '暖调生活', desc: '午后暖光、居家场景，营造亲近感', tint: '#e8c9a0', thumb: mkThumb('#fdf4e9', '#d9a873', '🏠'), tags: ['主图', '详情图', '场景图'], enabled: true, builtin: true },
  { id: 'st04', name: '极简棚拍', desc: '纯白/浅灰无干扰背景，电商通用', tint: '#e8ecf4', thumb: mkThumb('#ffffff', '#d8dde8', '⬜'), tags: ['主图', '详情图', 'SKU图'], enabled: true, builtin: true },
  { id: 'st05', name: '轻奢质感', desc: '大理石/金属/柔光，美妆/珠宝/家电显贵', tint: '#d9c6a4', thumb: mkThumb('#f5efe6', '#b89b78', '✨'), tags: ['主图', '场景图'], enabled: true, builtin: true },
  { id: 'st06', name: '日系明亮', desc: '高明度低对比、柔和阴影，清新不腻', tint: '#f3d3c2', thumb: mkThumb('#fff5f0', '#e6b8a8', '🍑'), tags: ['主图', '详情图', '场景图'], enabled: true, builtin: true },
  { id: 'st07', name: '复古胶片', desc: '暖棕颗粒、旧时光滤镜，适合服饰/文创', tint: '#c9a689', thumb: mkThumb('#e8d7c4', '#9c7a5e', '🎞'), tags: ['主图', '场景图'], enabled: true, builtin: true },
  { id: 'st08', name: '科技冷感', desc: '深色底+冷光线条，数码/3C/工具类', tint: '#2b3a67', thumb: mkThumb('#3b4d7d', '#151b2e', '⚡'), tags: ['主图', '详情图'], enabled: true, builtin: true },
  { id: 'st09', name: '促销氛围', desc: '高饱和撞色+价格氛围，大促主图', tint: '#e6543c', thumb: mkThumb('#ffefe8', '#e6543c', '🔥'), tags: ['主图'], enabled: true, builtin: true },
  { id: 'st10', name: '母婴温馨', desc: '奶白粉蓝、圆润柔和，母婴/家纺', tint: '#f3d3c2', thumb: mkThumb('#fff8f5', '#eacbc0', '🍼'), tags: ['主图', '详情图', '场景图'], enabled: true, builtin: true },
]);

/* ============ 选区 / 结果 / 任务 ============ */
export interface Rect { x: number; y: number; w: number; h: number }
export interface Picked { title: string; img: string; id?: string }

export interface GenResult {
  id: string;
  action: ActionKey;
  src: string;
  subject?: string;
  bg?: string;
  tint?: string;
  title?: string;
  w: number;
  h: number;
  rects: Rect[];
  screens: number;
  transparent: boolean;
  seed: number;
  productName: string;
  saved: boolean;
  time: string;
  /** 批量素材：主图 / 3:4主图 / 详情图 / SKU图 / 白底图 / 场景图 */
  materialType?: AsMaterialType;
  /** 素材库字段 */
  name: string;
  tag: string;
  source: '生成结果' | '本地上传';
  pinned: boolean;
}
export interface GenTask {
  id: string;
  action: ActionKey;
  product: Picked | null;
  sceneName: string;
  styleName: string;
  ratioLabel: string;
  count: number;
  status: 'running' | 'success' | 'failed';
  failReason?: string;
  time: string;
  dur: string;
  results: GenResult[];
  /** 生成参数快照：单张重生成 / 再次生成复用 */
  draft: GenDraft | null;
}

export const RESULT_TAG: Record<ActionKey, string> = {
  changeTheme: '场景图', changeSubject: '场景图', changeScene: '场景图', replicate: '场景图',
  mainImg: '主图', detailImg: '详情图',
  whiteBg: '抠图与清理', clipKeep: '抠图与清理', clipClean: '抠图与清理',
  allMaterials: '批量素材',
};

let seq = 100;
export const uid = (p: string) => `${p}${++seq}`;
const p2 = (n: number) => String(n).padStart(2, '0');
export const fmtNow = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;

export const tasks = reactive<GenTask[]>([]);
export const materials = reactive<GenResult[]>([]);

/* 跨页跳转桥：素材库「用作源图」/ 任务记录「再次生成」→ 工作台预填 */
export interface AsJump { ts: number; page: 'workbench' | 'material' | 'task' | 'config'; draft?: Partial<GenDraft> }
export const asJump = ref<AsJump | null>(null);

export interface GenDraft {
  action: ActionKey;
  product: Picked | null;
  subject: Picked | null;
  refImg: string | null;
  sceneMode: 'lib' | 'ref';
  sceneId: string | null;
  styleOn: boolean;
  styleId: string | null;
  ratioKey: string;
  w: number;
  h: number;
  count: number;
  screens: number;
  bgColor: 'white' | 'transparent';
  rects: Rect[];
  /** 一键全素材：勾选的素材类型 */
  materialTypes: AsMaterialType[];
}
export const emptyDraft = (action: ActionKey = 'changeTheme'): GenDraft => {
  const meta = actionOf(action);
  return {
    action, product: null, subject: null, refImg: null, sceneMode: 'lib', sceneId: null,
    styleOn: !meta.styleOptional, styleId: null,
    ratioKey: meta.ratios[0], w: 800, h: 800, count: meta.batch ? 1 : 2, screens: 4,
    bgColor: 'white', rects: [],
    materialTypes: meta.batch ? [...AS_MATERIAL_TYPES] : [],
  };
};

/* 生成引擎（原型 mock：异步推进 + 按动作产出可视化结果） */
export const startTask = (d: GenDraft): GenTask => {
  const meta = actionOf(d.action);
  const isBatch = d.action === 'allMaterials';
  const ratio = ratioOf(d.ratioKey);
  const scene = d.sceneId ? scenes.find((s) => s.id === d.sceneId) : undefined;
  const style = d.styleOn && d.styleId ? styles.find((s) => s.id === d.styleId) : undefined;
  const task: GenTask = {
    id: `T${Date.now() % 1000000}`,
    action: d.action,
    product: d.product,
    sceneName: d.action === 'changeScene' && d.sceneMode === 'ref' ? '竞品参考图' : scene?.name ?? (meta.sceneKind ? '' : '—'),
    styleName: style?.name ?? (meta.needStyle ? (d.styleOn ? '—' : '不套用') : '—'),
    ratioLabel: isBatch ? `全素材 ${d.materialTypes.length} 类` : d.action === 'detailImg' ? `750×${d.screens * 500}（${d.screens} 屏）` : d.ratioKey === 'source' ? '跟随原图' : `${ratioOf(d.ratioKey).w || d.w}×${ratioOf(d.ratioKey).h || d.h}`,
    count: isBatch ? d.materialTypes.length : (meta.multi ? d.count : 1),
    status: 'running',
    time: fmtNow(),
    dur: '—',
    results: [],
    draft: { ...d, rects: d.rects.map((r) => ({ ...r })) },
  };
  tasks.unshift(task);
  const rt = tasks[0];
  const n = rt.count;
  const started = Date.now();
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      if (isBatch) {
        const mt = d.materialTypes[i];
        const preset = AS_MATERIAL_PRESET[mt];
        rt.results.push(buildResult(d, preset.w, preset.h, scene?.bg, style?.tint, i, mt));
      } else {
        const w = d.ratioKey === 'custom' ? d.w : ratio.w || 800;
        const h = d.ratioKey === 'custom' ? d.h : d.action === 'detailImg' ? d.screens * 500 : ratio.h || 800;
        rt.results.push(buildResult(d, w, h, scene?.bg, style?.tint, i));
      }
      if (rt.results.length === n) {
        rt.status = 'success';
        rt.dur = `${((Date.now() - started) / 1000).toFixed(1)}s`;
      }
    }, 700 + i * 650);
  }
  return rt;
};

export const buildResult = (
  d: GenDraft,
  w: number,
  h: number,
  bg: string | undefined,
  tint: string | undefined,
  i: number,
  materialType?: AsMaterialType,
): GenResult => {
  const meta = actionOf(d.action);
  const productTitle = d.product?.title ?? '本地上传';
  return {
    id: uid('R'),
    action: d.action,
    src: d.action === 'replicate' && d.refImg ? d.refImg : d.product?.img ?? '',
    subject: d.action === 'changeSubject' ? d.subject?.img : undefined,
    bg: bg ?? (d.action === 'changeSubject' ? 'linear-gradient(165deg,#f2efe9 0%,#d9d2c6 100%)' : undefined),
    tint,
    title: d.product?.title,
    w, h,
    rects: d.rects.map((r) => ({ ...r })),
    screens: d.screens,
    transparent: d.bgColor === 'transparent',
    seed: i + 1,
    productName: d.action === 'changeSubject' ? d.subject?.title ?? '' : productTitle,
    materialType,
    saved: false,
    time: fmtNow(),
    name: materialType
      ? `${productTitle}·${materialType}`
      : `${meta.name}·${(d.action === 'changeSubject' ? d.subject?.title : productTitle) ?? '本地上传'}`.slice(0, 24),
    tag: materialType ?? RESULT_TAG[d.action],
    source: '生成结果',
    pinned: false,
  };
};

/* 历史种子：1 成功（含已存素材）+ 1 失败（可重试），保证列表非空且覆盖失败态 */
let seeded = false;
export const ensureSeed = (product: Picked, product2: Picked) => {
  if (seeded) return;
  seeded = true;
  const d1: GenDraft = { ...emptyDraft('changeScene'), product, sceneId: 'sc04', styleId: 'st02', count: 2 };
  const t1: GenTask = {
    id: 'T208811', action: 'changeScene', product, sceneName: '法式复古室内', styleName: 'INS 轻奢',
    ratioLabel: '800×800', count: 2, status: 'success', time: `${fmtNow().slice(0, 10)} 09:24`, dur: '2.1s', results: [], draft: d1,
  };
  t1.results = [buildResult(d1, 800, 800, scenes[3].bg, styles[1].tint, 0), buildResult(d1, 800, 800, scenes[3].bg, styles[1].tint, 1)];
  t1.results.forEach((r) => { r.saved = true; r.time = t1.time; materials.push(r); });
  const d2: GenDraft = { ...emptyDraft('whiteBg'), product: product2, bgColor: 'white' };
  const t2: GenTask = {
    id: 'T208826', action: 'whiteBg', product: product2, sceneName: '—', styleName: '—',
    ratioLabel: '800×800', count: 1, status: 'failed', failReason: '抠图失败：源图主体遮挡过重，请更换商品图后重试',
    time: `${fmtNow().slice(0, 10)} 10:02`, dur: '0.8s', results: [], draft: d2,
  };
  tasks.push(t1, t2);
  const d3: GenDraft = { ...emptyDraft('mainImg'), product, styleId: 'st03', count: 1 };
  const t3: GenTask = {
    id: 'T208830', action: 'mainImg', product, sceneName: '—', styleName: '日系清新',
    ratioLabel: '800×800', count: 1, status: 'success', time: `${fmtNow().slice(0, 10)} 10:41`, dur: '1.3s',
    results: [buildResult(d3, 800, 800, undefined, styles[2].tint, 0)], draft: d3,
  };
  tasks.push(t3);
};

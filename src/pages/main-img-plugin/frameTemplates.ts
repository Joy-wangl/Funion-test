/**
 * 主图外露标签：合成引擎 ＋ 外边框模板库
 * 全部绘制在 1000×1000 归一化画布上（按目标尺寸等比 scale），文字层坐标为 0~1 比例，
 * 因此预览、模板缩略图、导出到粘贴板三处共用同一份绘制逻辑，位置与字号表现完全一致。
 */

/** 归一化画布边长（绘制单位） */
export const STAGE = 1000;

const FONT = '"PingFang SC","Helvetica Neue",Helvetica,"Segoe UI",Arial,sans-serif';

/** 可选文字字体：均为免费可商用授权（不侵权）。webfont 按需加载，未加载时回退系统黑体 */
export interface FontOption {
  key: string;
  label: string;
  /** CSS font-family 串（含回退） */
  family: string;
  /** 授权说明（仅注释/溯源用，不在界面展示） */
  license: string;
  src?: { type: 'url'; url: string } | { type: 'google'; css: string };
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'sys', label: '默认黑体', family: FONT, license: '系统自带' },
  {
    key: 'puhui',
    label: '阿里巴巴普惠体 3.0',
    family: '"Alibaba PuHuiTi 3.0","PingFang SC",sans-serif',
    license: '阿里巴巴普惠体：免费商用（含企业）',
    src: { type: 'url', url: 'https://cdn.jsdelivr.net/npm/@fontpkg/alibaba-pu-hui-ti-3-0@3.1.2/AlibabaPuHuiTi-3-85-Bold.ttf' },
  },
  {
    key: 'noto-sans',
    label: '思源黑体',
    family: '"Noto Sans SC","PingFang SC",sans-serif',
    license: 'SIL OFL 免费商用',
    src: { type: 'google', css: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap' },
  },
  {
    key: 'noto-serif',
    label: '思源宋体',
    family: '"Noto Serif SC","Songti SC",serif',
    license: 'SIL OFL 免费商用',
    src: { type: 'google', css: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap' },
  },
  {
    key: 'zcool-huangyou',
    label: '站酷庆科黄油体',
    family: '"ZCOOL QingKe HuangYou","PingFang SC",sans-serif',
    license: '站酷字库：免费商用',
    src: { type: 'google', css: 'https://fonts.googleapis.com/css2?family=ZCOOL+QingKe+HuangYou&display=swap' },
  },
  {
    key: 'zcool-kuaile',
    label: '站酷快乐体',
    family: '"ZCOOL KuaiLe","PingFang SC",sans-serif',
    license: '站酷字库：免费商用',
    src: { type: 'google', css: 'https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap' },
  },
];

export const DEFAULT_FONT_KEY = 'sys';

export const fontFamilyOf = (key?: string): string =>
  (FONT_OPTIONS.find((f) => f.key === key)?.family) ?? FONT_OPTIONS[0].family;

export interface FrameLayer {
  id: string;
  /** 文字内容，空串＝该层不绘制 */
  text: string;
  /** 文字中心点比例坐标 */
  x: number;
  y: number;
  /** 字号（归一化画布单位） */
  size: number;
  color: string;
  /** 文字底色，空串＝无底（直接压在模板色带上） */
  bg: string;
  weight: number;
  /** 字体 key（FONT_OPTIONS），缺省＝默认黑体 */
  font?: string;
  /** 底色圆角 */
  radius: number;
  padX: number;
  padY: number;
}

export interface FrameTemplate {
  id: string;
  name: string;
  /** 遮罩装饰：边框 / 色带 / 渐变遮罩，绘制在商品图之上、文字之下 */
  draw: (ctx: CanvasRenderingContext2D) => void;
  layers: Omit<FrameLayer, 'id'>[];
}

export interface LayerBox { x: number; y: number; w: number; h: number }

/** 商品图变换：scale=相对 cover 基准的缩放倍数，x/y=中心点偏移（归一化画布单位） */
export interface ImgTransform { scale: number; x: number; y: number }

export const DEFAULT_IMG_TF: ImgTransform = { scale: 1, x: 0, y: 0 };

const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
};

/** 商品图 cover 铺满画布（居中裁切，不变形），再叠加缩放与平移变换 */
const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, tf: ImgTransform) => {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const k = Math.max(STAGE / iw, STAGE / ih) * tf.scale;
  const w = iw * k;
  const h = ih * k;
  ctx.drawImage(img, STAGE / 2 + tf.x - w / 2, STAGE / 2 + tf.y - h / 2, w, h);
};

const applyFont = (ctx: CanvasRenderingContext2D, l: FrameLayer) => {
  ctx.font = `${l.weight} ${l.size}px ${fontFamilyOf(l.font)}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
};

/** 文字层外框（含底色内边距），用于画布拖拽命中判定 */
export const layerBox = (ctx: CanvasRenderingContext2D, l: FrameLayer): LayerBox => {
  applyFont(ctx, l);
  const w = ctx.measureText(l.text || ' ').width + l.padX * 2;
  const h = l.size * 1.2 + l.padY * 2;
  return { x: l.x * STAGE - w / 2, y: l.y * STAGE - h / 2, w, h };
};

const drawLayer = (ctx: CanvasRenderingContext2D, l: FrameLayer) => {
  if (!l.text.trim()) return;
  const b = layerBox(ctx, l);
  if (l.bg) {
    roundRectPath(ctx, b.x, b.y, b.w, b.h, l.radius);
    ctx.fillStyle = l.bg;
    ctx.fill();
  }
  applyFont(ctx, l);
  ctx.fillStyle = l.color;
  ctx.fillText(l.text, l.x * STAGE, l.y * STAGE);
};

/** 无商品图时的底板色（保持遮罩与文字可见） */
const EMPTY_BG = '#eceef3';

/** 完整合成：底板 → 商品图(含缩放/平移) → 模板遮罩 → 文字层。size 为目标画布像素边长 */
export const drawComposite = (
  ctx: CanvasRenderingContext2D,
  size: number,
  img: HTMLImageElement | null,
  tpl: FrameTemplate,
  layers: FrameLayer[],
  tf: ImgTransform = DEFAULT_IMG_TF,
) => {
  ctx.setTransform(size / STAGE, 0, 0, size / STAGE, 0, 0);
  ctx.clearRect(0, 0, STAGE, STAGE);
  ctx.fillStyle = EMPTY_BG;
  ctx.fillRect(0, 0, STAGE, STAGE);
  if (img) drawCover(ctx, img, tf);
  tpl.draw(ctx);
  layers.forEach((l) => drawLayer(ctx, l));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

/** 按模板生成一份可编辑文字层（切换模板即重置为该模板的默认文案与位置） */
export const layersOf = (tpl: FrameTemplate): FrameLayer[] =>
  tpl.layers.map((l, i) => ({ ...l, id: `${tpl.id}-t${i}` }));

export const templateOf = (id: string): FrameTemplate => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/* ── 用户上传的 PNG 模板：图片等比内切居中铺满画布（透明区透出商品图），附一条空文案层待用户填写 ── */
export const makePngTemplate = (id: string, name: string, image: HTMLImageElement): FrameTemplate => ({
  id,
  name,
  draw: (ctx) => {
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih) return;
    const k = Math.min(STAGE / iw, STAGE / ih);
    const w = iw * k;
    const h = ih * k;
    ctx.drawImage(image, (STAGE - w) / 2, (STAGE - h) / 2, w, h);
  },
  layers: [],
});

/* ── 模板一：促销红框 ＋ 顶部横幅 ＋ 底部价格条（对标参考图效果） ── */
const promoFrame: FrameTemplate = {
  id: 'promo-frame',
  name: '促销红框',
  draw: (ctx) => {
    ctx.strokeStyle = '#e8382f';
    ctx.lineWidth = 26;
    ctx.strokeRect(13, 13, STAGE - 26, STAGE - 26);
    const top = ctx.createLinearGradient(0, 0, STAGE, 0);
    top.addColorStop(0, '#ff6a3d');
    top.addColorStop(1, '#e8382f');
    ctx.fillStyle = top;
    ctx.fillRect(26, 26, STAGE - 52, 158);
    const bot = ctx.createLinearGradient(0, 826, 0, STAGE);
    bot.addColorStop(0, '#ef4a35');
    bot.addColorStop(1, '#c81f16');
    ctx.fillStyle = bot;
    ctx.fillRect(26, 826, STAGE - 52, 148);
  },
  layers: [
    { text: '抽绳收口 一拎就走', x: 0.5, y: 0.105, size: 78, color: '#ffffff', bg: '', weight: 600, radius: 0, padX: 0, padY: 0 },
    { text: '家用抽绳式5卷共75只', x: 0.5, y: 0.255, size: 42, color: '#c81f16', bg: '#ffffff', weight: 500, radius: 999, padX: 24, padY: 10 },
    { text: '¥9.9', x: 0.5, y: 0.9, size: 104, color: '#ffffff', bg: '', weight: 600, radius: 0, padX: 0, padY: 0 },
  ],
};

/* ── 模板二：顶部横幅（无色边框，主副文案压顶） ── */
const topBanner: FrameTemplate = {
  id: 'top-banner',
  name: '顶部横幅',
  draw: (ctx) => {
    const g = ctx.createLinearGradient(0, 0, STAGE, 0);
    g.addColorStop(0, '#ff7a45');
    g.addColorStop(1, '#f5222d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, STAGE, 200);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillRect(0, 206, STAGE, 6);
  },
  layers: [
    { text: '限时秒杀 抢完即止', x: 0.5, y: 0.085, size: 74, color: '#ffffff', bg: '', weight: 600, radius: 0, padX: 0, padY: 0 },
    { text: '前100名下单立减5元', x: 0.5, y: 0.163, size: 38, color: '#fff4ec', bg: '', weight: 500, radius: 0, padX: 0, padY: 0 },
  ],
};

/* ── 模板三：角标标签（左上折角标 ＋ 底部胶囊促销语） ── */
const cornerTag: FrameTemplate = {
  id: 'corner-tag',
  name: '角标标签',
  draw: (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, STAGE - 40, STAGE - 40);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(300, 0);
    ctx.lineTo(300, 92);
    ctx.arcTo(300, 140, 252, 140, 48);
    ctx.lineTo(0, 140);
    ctx.closePath();
    ctx.fillStyle = '#f5222d';
    ctx.fill();
  },
  layers: [
    { text: '新品首发', x: 0.15, y: 0.07, size: 62, color: '#ffffff', bg: '', weight: 600, radius: 0, padX: 0, padY: 0 },
    { text: '下单立减10元', x: 0.5, y: 0.9, size: 46, color: '#ffffff', bg: 'rgba(0,0,0,.55)', weight: 500, radius: 999, padX: 26, padY: 12 },
  ],
};

export const TEMPLATES: FrameTemplate[] = [promoFrame, topBanner, cornerTag];

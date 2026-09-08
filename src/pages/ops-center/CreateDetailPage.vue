<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import type { CreateRow, CreateVersion } from './data';
import { createDetail, createVersions } from './data';
import { pushToast } from '../../components/toast';
import CpdMediaSec from './CpdMediaSec.vue';
import MaterialCenter from './MaterialCenter.vue';

const props = defineProps<{ row: CreateRow }>();
const emit = defineEmits<{ (e: 'back'): void; (e: 'openPub'): void }>();

const SHIP_OPTIONS = ['今日发', '24小时内发货', '48小时内发货', '大于48小时发货'];
const STUFF_OPTIONS = ['全新', '二手'];
const OTHER_COST_TIP = '包含 快递费、包材费、出仓成本、仓库房租、工费分摊、税费、预估推广费';

/** 商品创建详情页：查看态/编辑态（样式复用店铺商品详情 sgd-*，字段按原型） */
const editing = ref(false);
const showMaterial = ref(false);
const curVer = ref<CreateVersion>(createVersions.find((v) => v.current) ?? createVersions[0]);
const specOpen = ref(true);
const skuShow = ref(true);
const ship = ref('48小时内发货');
const stuff = ref('全新');
const d = createDetail;

/* ---------- 图片预览 + 预览内一键去水印 ---------- */
const previewList = ref<string[]>([]);
const previewIdx = ref(0);
const curPreview = computed(() => previewList.value[previewIdx.value] ?? '');
/* 工具条缩放：0.5–3 倍，切图/开闭时复位 */
const zoom = ref(1);
const zoomBy = (d: number) => { zoom.value = Math.min(3, Math.max(0.5, Math.round((zoom.value + d) * 100) / 100)); };
const openPreview = (list: string[], i: number) => { previewList.value = list; previewIdx.value = i; zoom.value = 1; };
const closePreview = () => { previewList.value = []; previewIdx.value = 0; zoom.value = 1; };
const stepPreview = (d: number) => {
  const n = previewList.value.length;
  previewIdx.value = (previewIdx.value + d + n) % n;
  zoom.value = 1;
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
  return raw === d.thumbs ? 'thumbs' : raw === d.mainImgs ? 'main' : raw === d.detailImgs ? 'detail' : `single:${list[0] ?? ''}`;
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
        <div class="cpd-top-acts">
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
          <button class="cpd-side-btn" :class="pageWmRunning ? 'wm-busy' : ''" :disabled="pageWmRunning" @click="onPageWm">
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
          <div v-for="sp in d.specs" :key="sp.name" class="cpd-spec-card">
            <div class="cpd-spec-head">
              <span class="cpd-drag">⋮</span>
              <span>{{ sp.name }}</span>
              <span class="cpd-spec-ics"><i>✎</i><i class="danger">🗑</i></span>
            </div>
            <div class="cpd-spec-grid">
              <div v-for="v in sp.values" :key="v" class="cpd-spec-cell">
                <label>属性</label>
                <div class="cpd-spec-input">
                  <input :value="v" />
                  <!-- 属性值操作：仅保留删除 icon（SVG），移除原 ◉ 圆点占位 -->
                  <i class="cpd-ico danger" title="删除该属性值">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6" /></svg>
                  </i>
                </div>
              </div>
            </div>
            <div class="cpd-spec-add"><input placeholder="请输入" /></div>
          </div>
          <button class="cpd-add-spec" @click="pushToast('已添加新规格')">⊕ 添加规格</button>
        </template>
        <template v-else>
          <div v-for="sp in d.specs" :key="sp.name" class="sgd-spec-row">
            <span class="sgd-spec-label">{{ sp.name }}</span>
            <div class="sgd-spec-chips"><span v-for="v in sp.values" :key="v" class="sgd-chip">{{ v }}</span></div>
          </div>
        </template>
      </div>
    </div>

    <!-- 商品SKU -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品SKU</div>
        <div class="cpd-sku-acts">
          <button v-if="editing" class="sg-btn primary cpd-sm" @click="pushToast('一键匹配完成')">一键匹配</button>
          <label class="sgd-sku-toggle">
            <input v-model="skuShow" type="checkbox" />
            展开明细
          </label>
        </div>
      </div>
      <div class="sgd-sec-body">
        <div v-if="skuShow" class="cpd-sku-wrap">
          <table class="sg-table cpd-sku-table">
            <thead>
              <tr>
                <th>SKU图</th>
                <th>编码图片</th>
                <th>颜色分类</th>
                <th>款式</th>
                <th>SKU名称</th>
                <th>商品编码</th>
                <th>系列编码</th>
                <th>产品成本价</th>
                <th :title="OTHER_COST_TIP">其它成本价 ⓘ</th>
                <th>售价</th>
                <th>利润</th>
                <th>利润率</th>
                <th>编辑</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in d.skus" :key="i">
                <td><img class="sgd-sku-img" :src="props.row.thumb" alt="" /></td>
                <td><img class="sgd-sku-img" :src="props.row.thumb" alt="" /></td>
                <td>{{ i % 2 === 0 ? s.color : '' }}</td>
                <td>{{ s.style }}</td>
                <td><input v-if="editing" class="cpd-cell-input" :value="s.name" /><template v-else>{{ s.name }}</template></td>
                <td><span class="sgd-code">{{ s.code }}</span></td>
                <td><input v-if="editing" class="cpd-cell-input" :value="s.series" /><template v-else>{{ s.series }}</template></td>
                <td>{{ s.cost }}</td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="s.other" /><i>元</i></span>
                  <template v-else>{{ s.other }} 元</template>
                </td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="s.price" /><i>元</i></span>
                  <template v-else>{{ s.price }} 元</template>
                </td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="s.profit" /><i>元</i></span>
                  <template v-else>{{ s.profit ? `${s.profit} 元` : '-' }}</template>
                </td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="s.rate" /><i>%</i></span>
                  <template v-else>{{ s.rate }}%</template>
                </td>
                <td class="cpd-row-ops">
                  <a href="#" @click.prevent>查看</a>
                  <a v-if="editing" class="danger" href="#" @click.prevent>删除</a>
                </td>
              </tr>
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
          <img :src="curPreview" alt="" />
          <div v-if="wmViewOf(curWmKey)?.status === 'running'" class="cpd-preview-wming">
            <i class="cpd-wm-spin" />去水印中 {{ wmViewOf(curWmKey)!.percent }}%
          </div>
          <div v-else-if="wmViewOf(curWmKey)?.status === 'queued'" class="cpd-preview-wming">排队中…</div>
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
        <i class="cpd-bar-div" />
        <button type="button" class="cpd-bar-wm" :disabled="curWmRunning" @click="onPreviewWm">
          {{ curWmState?.status === 'running' ? `去水印中 ${curWmState.percent}%` : curWmState?.status === 'queued' ? '排队中…' : '一键去水印' }}
        </button>
      </div>
    </div>

  </div>
</template>

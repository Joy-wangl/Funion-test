<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { CreateRow } from './data';
import { sgJmDetail } from './shopGoodsData';
import { pushToast } from '../../components/toast';
import CpdMediaSec from './CpdMediaSec.vue';
import ImgSizeCrop from './ImgSizeCrop.vue';
import MaterialCenter from './MaterialCenter.vue';

const props = defineProps<{ row: CreateRow; startEdit?: boolean }>();
const emit = defineEmits<{ (e: 'back'): void; (e: 'openPub'): void }>();

/** 京麦（京东 POP）商品创建详情页：展示形式与淘宝/视频号详情一致（sgd- 与 cpd- 类名同构）；
 *  字段映射京麦 SP-API 商品接口：getProduct（头）/material（主图/长图/白底/透明/视频）/skuList（SKU 表）/sku-materials（场景图）/productDetailDesc（PC/APP 详情） */
const editing = ref(!!props.startEdit);
const showMaterial = ref(false);
const specOpen = ref(true);
const skuShow = ref(true);
const d = sgJmDetail;

/* ---------- 商品规格 → 商品SKU：规格值笛卡尔积动态生成 ----------
 *  规格A(值A1…)×规格B(值B1…)→SKU「A1 B1」；新增属性值（如 B2）自动补出「A1 B1」「A1 B2」等 SKU */
interface JmSpec { name: string; values: string[] }
const specs = ref<JmSpec[]>(d.saleAttrs.map((s) => ({ name: s.name, values: [...s.values] })));
const addVals = ref<string[]>(d.saleAttrs.map(() => ''));
const addSpecValue = (si: number) => {
  const v = (addVals.value[si] ?? '').trim();
  if (!v) { pushToast('请输入属性值', 'warning'); return; }
  if (specs.value[si].values.includes(v)) { pushToast('该属性值已存在', 'warning'); return; }
  specs.value[si].values.push(v);
  addVals.value[si] = '';
};
const removeSpecValue = (si: number, v: string) => {
  specs.value[si].values = specs.value[si].values.filter((x) => x !== v);
};
/* 属性图：每个属性值最多 1 张（非必填）；SKU 图默认取商品主图（头部画廊） */
const pickAttrImg = () => pushToast('属性图：每个属性值最多上传 1 张（非必填）', 'info');

/* SKU 行 = 各规格属性值笛卡尔积；已知组合沿用 skuList 静态价/库存/编码，新增组合给默认值 */
const skuRows = computed(() => {
  const lists = specs.value.map((s) => s.values);
  if (lists.some((l) => l.length === 0)) return [];
  let combos: string[][] = [[]];
  for (const list of lists) {
    const next: string[][] = [];
    for (const c of combos) for (const v of list) next.push([...c, v]);
    combos = next;
  }
  return combos.map((combo, i) => {
    const name = combo.join(' ');
    const base = d.skus.find((s) => s.name === name);
    return {
      name,
      attrs: specs.value.map((s, k) => `${s.name}:${combo[k]}`).join(' '),
      jdPrice: base?.jdPrice ?? '39.90',
      marketPrice: base?.marketPrice ?? '59.90',
      stock: base?.stock ?? '0',
      outerId: base?.outerId ?? `${d.itemNum}-N${i + 1}`,
      upc: base?.upc ?? `69012345678${String(90 + i).slice(-2)}`,
      status: base?.status ?? '上架',
    };
  });
});

/* ---------- 图片预览：全屏暗幕 + 底部悬浮工具条（翻页/缩放/全屏），与淘宝详情同范式 ---------- */
const previewList = ref<string[]>([]);
const previewIdx = ref(0);
const curPreview = computed(() => previewList.value[previewIdx.value] ?? '');
/* 工具条缩放：0.5–3 倍，切图/开闭时复位 */
const zoom = ref(1);
const zoomBy = (v: number) => { zoom.value = Math.min(3, Math.max(0.5, Math.round((zoom.value + v) * 100) / 100)); };
const openPreview = (list: string[], i: number) => { previewList.value = list; previewIdx.value = i; zoom.value = 1; };
const closePreview = () => { previewList.value = []; previewIdx.value = 0; zoom.value = 1; sizePanel.value = false; };
const stepPreview = (v: number) => {
  const n = previewList.value.length;
  previewIdx.value = (previewIdx.value + v + n) % n;
  zoom.value = 1;
  sizePanel.value = false;
};

/* 预览内修改尺寸＋自由裁剪（共享组件 ImgSizeCrop，与淘宝/视频号详情同款）：裁剪结果回写当前预览图 */
const sizePanel = ref(false);
const previewImgRef = ref<HTMLImageElement | null>(null);
const commitSize = (url: string) => { previewList.value[previewIdx.value] = url; };

/* 预览全屏切换（工具条末位图标） */
const previewMaskRef = ref<HTMLDivElement | null>(null);
const isFull = ref(false);
const syncFull = () => { isFull.value = !!document.fullscreenElement; };
onMounted(() => document.addEventListener('fullscreenchange', syncFull));
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFull));
const toggleFull = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void previewMaskRef.value?.requestFullscreen();
};

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
  <div v-else class="sg-page sgd-page cpd-page jm-detail">
    <div class="sgd-hero">
      <div class="sgd-top">
        <div class="sgd-top-left">
          <button class="sgd-back" title="返回" @click="emit('back')">←</button>
          <span class="sgd-top-title">商品详情</span>
          <span class="jm-plat-tag">京麦</span>
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

      <!-- 类目：getProduct.categoryDetail 末级类目路径 -->
      <div class="sgd-cat">
        <span class="sgd-cat-label">当前类目<i>*</i></span>
        <span>居家用品 / 厨房用具 / 刀具</span>
        <a v-if="editing" class="cpd-cat-edit" href="#" @click.prevent>修改</a>
      </div>

      <div class="sgd-head">
        <div class="sgd-gallery">
          <div class="sgd-thumbs">
            <img
              v-for="(t, i) in d.mainImgs"
              :key="i"
              class="sgd-thumb cpd-previewable"
              :class="i === 0 ? 'active' : ''"
              :src="t"
              alt=""
              @click="openPreview(d.mainImgs, i)"
            />
          </div>
          <img class="sgd-main cpd-previewable" :src="props.row.thumb" alt="" @click="openPreview([props.row.thumb], 0)" />
        </div>
        <div class="sgd-info">
          <h2>{{ props.row.title }}</h2>
          <div class="sgd-fields">
            <div class="sgd-frow"><span>商品ID：</span><b>{{ d.productId }}</b></div>
            <div class="sgd-frow"><span>品牌：</span><b>{{ d.brand }}</b></div>
            <div class="sgd-frow"><span>创建时间：</span><b>{{ props.row.time }}</b></div>
            <div class="sgd-frow"><span>创建人：</span><b>{{ props.row.person }}</b></div>
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
        </div>
      </div>
    </div>

    <!-- 商品规格：SKU 销售属性模板 saleAttrs -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品规格</div>
        <button class="sgd-collapse" @click="specOpen = !specOpen">{{ specOpen ? '∨ 收起' : '∧ 展开' }}</button>
      </div>
      <div v-if="specOpen" class="sgd-sec-body">
        <template v-if="editing">
          <div v-for="(sp, si) in specs" :key="sp.name" class="cpd-spec-card">
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
                  <!-- 属性值操作图标：属性图（每个属性值最多1张·非必填）+ 删除（联动重算 SKU） -->
                  <i class="cpd-ico" title="上传属性图（最多1张·非必填）" @click="pickAttrImg">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="m4.5 18 5-5 3.5 3.5L17 13l3 3" /></svg>
                  </i>
                  <i class="cpd-ico danger" title="删除该属性值" @click="removeSpecValue(si, v)">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6" /></svg>
                  </i>
                </div>
              </div>
            </div>
            <div class="cpd-spec-add"><input v-model="addVals[si]" placeholder="请输入属性值，回车新增 SKU 组合" @keyup.enter="addSpecValue(si)" /></div>
          </div>
          <button class="cpd-add-spec" @click="pushToast('已添加新规格')">⊕ 添加规格</button>
          <div class="jm-spec-note">规格与属性值按笛卡尔积生成商品SKU：规格值 A1×B1=SKU「A1 B1」，新增属性值 B2 自动补出「A1 B1」「A1 B2」；每个属性值最多 1 张属性图（非必填），SKU 图默认取商品主图。</div>
        </template>
        <template v-else>
          <div v-for="sp in specs" :key="sp.name" class="sgd-spec-row">
            <span class="sgd-spec-label">{{ sp.name }}</span>
            <div class="sgd-spec-chips"><span v-for="v in sp.values" :key="v" class="sgd-chip">{{ v }}</span></div>
          </div>
        </template>
      </div>
    </div>

    <!-- 商品SKU：skuList（skuName/saleAttrs/priceInfo/stockNum/outerId/upcCode/skuStatus） -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品SKU</div>
        <label class="sgd-sku-toggle">
          <input v-model="skuShow" type="checkbox" />
          展开明细
        </label>
      </div>
      <div class="sgd-sec-body">
        <div v-if="skuShow" class="cpd-sku-wrap">
          <table class="sg-table cpd-sku-table jm-sku-table">
            <thead>
              <tr>
                <th>SKU图</th>
                <th>SKU名称</th>
                <th>销售属性</th>
                <th>京东价</th>
                <th>市场价</th>
                <th>库存</th>
                <th>商品编码</th>
                <th>条码</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in skuRows" :key="`${s.name}-${i}`">
                <td><img class="sgd-sku-img" :src="props.row.thumb" alt="" /></td>
                <td><input v-if="editing" class="cpd-cell-input" :value="s.name" /><template v-else>{{ s.name }}</template></td>
                <td>{{ s.attrs }}</td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="s.jdPrice" /><i>元</i></span>
                  <template v-else>¥{{ s.jdPrice }}</template>
                </td>
                <td>¥{{ s.marketPrice }}</td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input class="cpd-cell-input" :value="s.stock" /><i>件</i></span>
                  <template v-else>{{ s.stock }}</template>
                </td>
                <td><span class="sgd-code">{{ s.outerId }}</span></td>
                <td><span class="sgd-code">{{ s.upc }}</span></td>
                <td><span class="sgd-tag" :class="s.status === '上架' ? 'green' : 'gray'">{{ s.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 素材：material.mainImages 方图（最多10张，1:1，480*480~1500*1500，≤3M） -->
    <CpdMediaSec
      title="主图（方图）*"
      note="商品主图 material.mainImages：必填，最少1张、最多10张，比例1:1，尺寸480*480~1500*1500px，小于3M，JPG/JPEG/PNG，首图须为白底实物图"
      :imgs="d.mainImgs"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.mainImgs, i)"
    />
    <!-- 素材：material.rectangleImages 长图（3:4，部分类目） -->
    <CpdMediaSec
      title="长图"
      note="商品长图 material.rectangleImages：非必填，最多1张，比例3:4（部分类目可使用），尺寸480*640~1125*1500px，小于3M"
      :imgs="d.rectImgs"
      :ratio34="true"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.rectImgs, i)"
    />
    <!-- 详情图：productDetailDesc.desc（PC）/ mobileDesc（APP） -->
    <CpdMediaSec
      title="商品详情（PC端）*"
      note="PC端商详 productDetailDesc.desc：必填，最少1张，详情描述图，图片宽度750~1500px、单图高度≤1500px、小于3M，总高度建议≤15000px"
      :imgs="d.detailPc"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.detailPc, i)"
    />
    <CpdMediaSec
      title="商品详情（APP端）(非必填)"
      note="APP端商详 productDetailDesc.mobileDesc：非必填，0~8张，移动端详情描述，京麦移动端支持装修0~8张图、文本不超过500字"
      :imgs="d.detailApp"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.detailApp, i)"
    />
    <!-- 素材：material.whiteBackGroundImages -->
    <CpdMediaSec
      title="白底图"
      note="白底图 material.whiteBackGroundImages：非必填，最多1张，纯白边、无牛皮癣/logo/阴影，图片饱满，将作为个性化素材展示"
      :imgs="[d.whiteImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.whiteImg], i)"
    />
    <!-- 素材：material.transparentImages -->
    <CpdMediaSec
      title="透明图"
      note="透明图 material.transparentImages：非必填，最多1张，透明背景商品图，用于搜索/活动素材"
      :imgs="[d.transparentImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.transparentImg], i)"
    />
    <!-- SKU素材：sku-materials 场景图 -->
    <CpdMediaSec
      title="场景图(非必填)"
      note="场景图 SKU素材 sku-materials：非必填，最多1张，带有背景、无牛皮癣、主体清晰完整，建议800*800px，JPG/JPEG、小于3M"
      :imgs="[d.sceneImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.sceneImg], i)"
    />
    <!-- 素材：material.videos 主图视频 -->
    <CpdMediaSec
      title="商品视频"
      note="主图视频 material.videos：非必填，0~5个，时长5秒~60秒，宽高比支持1:1、3:4、9:16，最多可上传5个"
      :imgs="d.videos"
      :video="true"
      :editing="editing"
      add-label="添加视频"
    />

    <!-- 图片预览：全屏暗幕 + 底部悬浮工具条（翻页/缩放/全屏），展示形式与淘宝详情一致 -->
    <div v-if="previewList.length" ref="previewMaskRef" class="cpd-preview-mask">
      <button type="button" class="cpd-preview-close" title="关闭（Esc）" @click="closePreview">✕</button>
      <div class="cpd-preview-stage" @click.self="closePreview">
        <div class="cpd-preview-imgwrap" :style="{ transform: `scale(${zoom})` }">
          <img ref="previewImgRef" :src="curPreview" alt="" />
          <!-- 修改尺寸＋自由裁剪：选区层就地渲染，面板 Teleport 到暗幕（共享组件） -->
          <ImgSizeCrop v-model:open="sizePanel" :src="curPreview" :zoom="zoom" :img-el="previewImgRef" :commit="commitSize" />
        </div>
      </div>
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
      </div>
    </div>

  </div>
</template>

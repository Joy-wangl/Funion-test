<script setup lang="ts">
import { computed, ref } from 'vue';
import { PLATFORM_LOGO } from './data';
import { sgDetail } from './shopGoodsData';
import type { SgProduct } from './shopGoodsData';

const props = defineProps<{
  product: SgProduct;
  /** 覆盖底部主操作（不传按商品状态推断；内部商机等复用场景传入，支持多个按钮） */
  foot?: { text: string; cls: string }[];
  /** 隐藏右上「编辑」按钮（商机等不可编辑场景） */
  hideEdit?: boolean;
}>();
const emit = defineEmits<{ (e: 'back'): void }>();

/** 详情底部主操作：按商品状态给出 */
function footAction(p: SgProduct): { text: string; cls: string } {
  switch (p.status) {
    case 'selling':
    case 'auditFail':
      return { text: '下架', cls: 'warn' };
    case 'auditing':
      return { text: '撤销审核', cls: 'danger' };
    case 'offSystem':
    case 'offManual':
    case 'offDeposit':
    case 'offBrand':
    case 'offBan':
      return { text: '立即上架', cls: 'primary' };
    case 'draft':
      return { text: '发布上架', cls: 'primary' };
  }
}

/* ================= 详情页 ================= */
const specOpen = ref(true);
const skuShow = ref(true);
const p = computed(() => props.product);
const foot = computed(() => props.foot ?? [footAction(p.value)]);

const statusTag = computed(() =>
  p.value.status === 'selling' ? { text: '出售中', cls: 'green' }
  : p.value.status === 'auditing' ? { text: '审核中', cls: 'blue' }
  : p.value.status === 'auditFail' ? { text: '审核未通过', cls: 'red' }
  : p.value.status === 'draft' ? { text: '草稿', cls: 'orange' }
  : { text: '已下架', cls: 'gray' });

const thumbs = computed(() => [p.value.img, ...sgDetail.mainImgs.slice(0, 4)]);
</script>

<template>
  <div class="sg-page sgd-page">
    <div class="sgd-hero">
      <div class="sgd-top">
        <div class="sgd-top-left">
          <button class="sgd-back" title="返回" @click="emit('back')">←</button>
          <span class="sgd-top-title">商品详情</span>
        </div>
        <button v-if="!hideEdit" class="sg-btn">编辑</button>
      </div>

      <div v-if="p.offType" class="sgd-offnotice">
        <span class="sgd-offnotice-t">下架原因：</span>
        <span>{{ p.offReason }}</span>
      </div>

      <div class="sgd-cat">
        <span class="sgd-cat-label">当前类目<i>*</i></span>
        <span>{{ p.category.join(' / ') }}</span>
      </div>
      <div class="sgd-head">
        <div class="sgd-gallery">
          <div class="sgd-thumbs">
            <img v-for="(t, i) in thumbs" :key="i" class="sgd-thumb" :class="i === 0 ? 'active' : ''" :src="t" alt="" />
          </div>
          <img class="sgd-main" :src="p.img" alt="" />
        </div>
        <div class="sgd-info">
          <h2>{{ p.title }}</h2>
          <div class="sgd-fields">
            <div class="sgd-frow"><span>商品来源：</span><b>{{ p.source }}</b></div>
            <div class="sgd-frow"><span>版本号：</span><b>{{ p.version }}</b></div>
            <div class="sgd-frow"><span>商品ID：</span><b>{{ p.id }}</b></div>
            <div class="sgd-frow"><span>操作人：</span><b>{{ p.operator }}</b></div>
            <div v-if="p.status !== 'draft' && p.status !== 'auditing'" class="sgd-frow">
              <span>上架店铺：</span>
              <b class="sgd-store">
                <span class="store-logo"><img :src="PLATFORM_LOGO[p.storePlatform]" alt="" /></span>
                {{ p.store }}
              </b>
            </div>
            <div v-if="p.shelfTime" class="sgd-frow"><span>上架时间：</span><b>{{ p.shelfTime }}</b></div>
            <div v-if="p.submitTime" class="sgd-frow"><span>提交审核时间：</span><b>{{ p.submitTime }}</b></div>
            <div v-if="p.createTime" class="sgd-frow"><span>创建时间：</span><b>{{ p.createTime }}</b></div>
            <div v-if="p.offTime" class="sgd-frow"><span>下架时间：</span><b>{{ p.offTime }}</b></div>
            <div v-if="p.offReason" class="sgd-frow"><span>下架原因：</span><b class="sgd-red">{{ p.offReason }}</b></div>
            <div v-if="p.rejectReason" class="sgd-frow"><span>驳回原因：</span><b class="sgd-red">{{ p.rejectReason }}</b></div>
            <div class="sgd-frow">
              <span>商品状态：</span>
              <b><span class="sgd-tag" :class="statusTag.cls">{{ statusTag.text }}</span></b>
            </div>
            <div v-if="p.status !== 'draft'" class="sgd-frow"><span>商品策略：</span><b>{{ p.strategy }}</b></div>
          </div>
        </div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品规格</div>
        <button class="sgd-collapse" @click="specOpen = !specOpen">{{ specOpen ? '∨ 收起' : '∧ 展开' }}</button>
      </div>
      <div v-if="specOpen" class="sgd-sec-body">
        <div class="sgd-spec-row">
          <span class="sgd-spec-label">颜色</span>
          <div class="sgd-spec-chips"><span v-for="c in sgDetail.colors" :key="c" class="sgd-chip">{{ c }}</span></div>
        </div>
        <div class="sgd-spec-row">
          <span class="sgd-spec-label">规格</span>
          <div class="sgd-spec-chips"><span v-for="c in sgDetail.styles" :key="c" class="sgd-chip">{{ c }}</span></div>
        </div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品SKU</div>
        <label class="sgd-sku-toggle">
          <input v-model="skuShow" type="checkbox" />
          展开明细
        </label>
      </div>
      <div class="sgd-sec-body">
        <table v-if="skuShow" class="sg-table sgd-sku-table">
          <thead>
            <tr>
              <th :style="{ width: '76px' }">SKU图</th>
              <th :style="{ width: '76px' }">编码图片</th>
              <th>颜色分类</th>
              <th :style="{ width: '120px' }">款式</th>
              <th :style="{ width: '160px' }">SKU名称</th>
              <th :style="{ width: '160px' }">商品编码</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in sgDetail.skus" :key="i">
              <td><img class="sgd-sku-img" :src="p.img" alt="" /></td>
              <td><img class="sgd-sku-img" :src="p.img" alt="" /></td>
              <td>{{ i % 2 === 0 ? s.color : '' }}</td>
              <td>{{ s.style }}</td>
              <td>{{ s.name }}</td>
              <td><span class="sgd-code">{{ s.code }}</span></td>
            </tr>
          </tbody>
        </table>
        <div class="sgd-price">
          <span>一口价<i>*</i></span>
          <input class="sg-input sgd-price-input" :value="sgDetail.price" readonly />
        </div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head"><div class="sgd-sec-title">3:4主图</div></div>
      <div class="sgd-sec-body">
        <div class="sgd-note">最多上传5张图片，支持最小尺寸750*1000，固定宽高比例为3:4，大小20M以内</div>
        <div class="sgd-imgs ratio34"><img v-for="(m, i) in sgDetail.mainImgs" :key="i" :src="m" alt="" /></div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head"><div class="sgd-sec-title">商品详情</div></div>
      <div class="sgd-sec-body">
        <div class="sgd-note">宝贝详情图【高度≤2】，超出将被裁剪，建议宽度≥1440像素以确保清晰，拖动模块可排序</div>
        <div class="sgd-imgs"><img v-for="(m, i) in sgDetail.detailImgs" :key="i" :src="m" alt="" /></div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head"><div class="sgd-sec-title">商品视频</div></div>
      <div class="sgd-sec-body">
        <div class="sgd-note">视频要求：时长5秒~5分钟；宽高比支持1:1、3:4、9:16（9:16视频商品详情页不展示，可在首页推荐、微详情等展示）最多可上传5个</div>
        <div class="sgd-imgs">
          <span v-for="(m, i) in sgDetail.videos" :key="i" class="sgd-video"><img :src="m" alt="" /><i class="sgd-play">▶</i></span>
        </div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head"><div class="sgd-sec-title">通用商品白底图</div></div>
      <div class="sgd-sec-body">
        <div class="sgd-note">宽高800*800，所报名商品台的白底图，纯白边，图片饱满（上下贴边或左右贴边），将作为个性化素材展示</div>
        <div class="sgd-imgs"><img :src="sgDetail.whiteImg" alt="" /></div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head"><div class="sgd-sec-title">通用商品场景图(非必填)</div></div>
      <div class="sgd-sec-body">
        <div class="sgd-note">基本要求：带有背景，无牛皮癣，主体清晰完整不变形、不拼图、不含图、不留白边，建议主体突出与背景和谐。背景不宜过于复杂，色调自然。格式要求：800*800px，JPG/JPEG、小于3M</div>
        <div class="sgd-imgs"><img :src="sgDetail.sceneImg" alt="" /></div>
      </div>
    </div>

    <div class="sgd-foot">
      <button v-for="f in foot" :key="f.text" class="sgd-foot-btn" :class="f.cls">{{ f.text }}</button>
    </div>
  </div>
</template>

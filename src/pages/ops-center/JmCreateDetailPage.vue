<script setup lang="ts">
import { ref } from 'vue';
import type { CreateRow } from './data';
import { sgJmDetail } from './shopGoodsData';
import { pushToast } from '../../components/toast';
import CpdMediaSec from './CpdMediaSec.vue';

const props = defineProps<{ row: CreateRow }>();
const emit = defineEmits<{ (e: 'back'): void; (e: 'openPub'): void }>();

/** 京麦（京东 POP）商品创建详情页：字段映射京麦开放平台 SP-API 商品接口（getProduct/material/sku-materials） */
const editing = ref(false);
const specOpen = ref(true);
const skuShow = ref(true);
const d = sgJmDetail;
</script>

<template>
  <div class="sg-page sgd-page cpd-page jm-detail">
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

      <!-- 类目：categoryDetail 末级类目路径 -->
      <div class="sgd-cat">
        <span class="sgd-cat-label">当前类目<i>*</i></span>
        <span>居家用品 / 厨房用具 / 刀具</span>
        <a v-if="editing" class="cpd-cat-edit" href="#" @click.prevent>修改</a>
      </div>

      <div class="sgd-head">
        <div class="sgd-gallery">
          <div class="sgd-thumbs">
            <img v-for="(t, i) in d.mainImgs" :key="i" class="sgd-thumb" :class="i === 0 ? 'active' : ''" :src="t" alt="" />
          </div>
          <img class="sgd-main" :src="props.row.thumb" alt="" />
        </div>
        <div class="sgd-info">
          <h2>{{ props.row.title }}</h2>
          <div class="sgd-fields">
            <div class="sgd-frow"><span>商品ID：</span><b>{{ d.productId }}</b></div>
            <div class="sgd-frow"><span>创建时间：</span><b>2026-08-15 10:24:10</b></div>
          </div>
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
          <div v-for="sp in d.saleAttrs" :key="sp.name" class="cpd-spec-card">
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
                  <i class="danger">🗑</i>
                  <i>◉</i>
                </div>
              </div>
            </div>
            <div class="cpd-spec-add"><input placeholder="请输入" /></div>
          </div>
          <button class="cpd-add-spec" @click="pushToast('已添加新规格')">⊕ 添加规格</button>
        </template>
        <template v-else>
          <div v-for="sp in d.saleAttrs" :key="sp.name" class="sgd-spec-row">
            <span class="sgd-spec-label">{{ sp.name }}</span>
            <div class="sgd-spec-chips"><span v-for="v in sp.values" :key="v" class="sgd-chip">{{ v }}</span></div>
          </div>
        </template>
      </div>
    </div>

    <!-- 商品SKU：skuList（logo/skuName/saleAttrs/priceInfo/stockNum/outerId） -->
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
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, i) in d.skus" :key="i">
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
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 素材：material.mainImages 方图 -->
    <CpdMediaSec
      title="主图（方图）*"
      note="商品主图 material.mainImages：1:1 方图，建议 800*800，JPG/PNG，单张 3M 以内"
      :imgs="d.mainImgs"
      :editing="editing"
      add-label="添加图片"
    />
    <!-- 素材：material.rectangleImages 长图 -->
    <CpdMediaSec
      title="长图"
      note="商品长图 material.rectangleImages：用于搜索/推荐长图展示位"
      :imgs="d.rectImgs"
      :ratio34="true"
      :editing="editing"
      add-label="添加图片"
    />
    <!-- 详情图：productDetailDesc.desc（PC）/ mobileDesc（APP） -->
    <CpdMediaSec
      title="商品详情（PC端）*"
      note="PC端商详 productDetailDesc.desc：详情描述图，建议宽度≥1440像素，拖动模块可排序"
      :imgs="d.detailPc"
      :editing="editing"
      add-label="添加图片"
    />
    <CpdMediaSec
      title="商品详情（APP端）*"
      note="APP端商详 productDetailDesc.mobileDesc：移动端详情描述图"
      :imgs="d.detailApp"
      :editing="editing"
      add-label="添加图片"
    />
    <!-- 素材：material.whiteBackGroundImages -->
    <CpdMediaSec
      title="白底图"
      note="白底图 material.whiteBackGroundImages：纯白边、图片饱满，将作为个性化素材展示"
      :imgs="[d.whiteImg]"
      :editing="editing"
    />
    <!-- 素材：material.transparentImages -->
    <CpdMediaSec
      title="透明图"
      note="透明图 material.transparentImages：透明背景商品图，用于搜索/活动素材"
      :imgs="[d.transparentImg]"
      :editing="editing"
    />
    <!-- SKU素材：sku-materials 场景图 -->
    <CpdMediaSec
      title="场景图(非必填)"
      note="场景图 SKU素材 sku-materials：带有背景、无牛皮癣、主体清晰完整，建议 800*800px"
      :imgs="[d.sceneImg]"
      :editing="editing"
    />
    <!-- 素材：material.videos 主图视频 -->
    <CpdMediaSec
      title="商品视频"
      note="主图视频 material.videos：时长5秒~60秒，宽高比支持1:1、3:4、9:16，最多可上传5个"
      :imgs="d.videos"
      :video="true"
      :editing="editing"
      add-label="添加视频"
    />

    <!-- 其它信息：logisticsInfo / afterServiceInfo / 重量尺寸 -->
    <div class="sgd-sec">
      <div class="sgd-sec-head"><div class="sgd-sec-title">其它信息</div></div>
      <div class="sgd-sec-body">
        <div class="jm-kv-grid">
          <div class="jm-kv"><label>发货地：</label><b>{{ d.delivery }}</b></div>
          <div class="jm-kv"><label>运费模板：</label><b>{{ d.transport }}</b></div>
          <div class="jm-kv"><label>包装清单：</label><b>{{ d.packListing }}</b></div>
          <div class="jm-kv"><label>售后服务：</label><b>{{ d.afterService }}</b></div>
          <div class="jm-kv"><label>重量（kg）：</label><b>{{ d.weight }}</b></div>
          <div class="jm-kv"><label>长×宽×高（mm）：</label><b>{{ d.dims }}</b></div>
        </div>
      </div>
    </div>
  </div>
</template>

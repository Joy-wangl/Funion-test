<script setup lang="ts">
import { ref } from 'vue';
import type { CreateRow, CreateVersion } from './data';
import { createDetail, createVersions } from './data';
import { pushToast } from '../../components/toast';
import ToastWrap from '../../components/ToastWrap.vue';
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
            <img v-for="(t, i) in d.thumbs" :key="i" class="sgd-thumb" :class="i === 0 ? 'active' : ''" :src="t" alt="" />
          </div>
          <img class="sgd-main" :src="props.row.thumb" alt="" />
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
          <button class="cpd-side-btn" @click="pushToast('手机预览：演示环境暂不可用')">
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
    />
    <CpdMediaSec
      title="商品详情*"
      note="宝贝详情图【高度≤2】，超出将被裁剪，建议宽度≥1440像素以确保清晰，拖动模块可排序"
      :imgs="d.detailImgs"
      :editing="editing"
      add-label="添加图片"
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
    />
    <CpdMediaSec
      title="通用商品场景图(非必填)"
      note="基本要求：带有背景，无牛皮癣，主体清晰完整不变形、不拼图、不含图、不留白边，建议主体突出与背景和谐。背景不宜过于复杂，色调自然。格式要求：800*800px，JPG/JPEG、小于3M"
      :imgs="[d.sceneImg]"
      :editing="editing"
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

    <div class="pm-page pm-host"><ToastWrap /></div>
  </div>
</template>

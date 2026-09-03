<script setup lang="ts">
import { computed, ref } from 'vue';
import { pushToast } from '../../components/toast';
import { BEE_PLATFORM_LOGO } from './data';
import type { BeeProduct } from './data';
import { sgDetail } from '../ops-center/shopGoodsData';

const props = defineProps<{ product: BeeProduct }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'pub', p: BeeProduct): void }>();

/* 内容与智能运营中心商品详情同源，布局对齐千牛发布页：左标签右内容、紧凑表单行、方格图位、SKU 价格/库存列 */
const CATEGORY = ['居家日用', '收纳整理', '家庭收纳用具'];
const mains = computed(() => [props.product.img, ...sgDetail.mainImgs].slice(0, 5));
const mainEmpty = computed(() => 5 - mains.value.length);
/* 空图位数：编辑态未满补 1 个添加槽；查看态补足 5 */
const plusSlots = computed(() => (editing.value ? (mains.value.length < 5 ? 1 : 0) : mainEmpty.value));
const imgs34 = computed(() => sgDetail.mainImgs);
const videosList = computed(() => sgDetail.videos);

/* 编辑态：千牛发布式表单，保存后回查看态 */
const editing = ref(false);
const draft = ref({ title: '', price: '' });
const err = ref<{ title?: string; price?: string }>({});
const skuRows = ref(sgDetail.skus.map((s, i) => ({ ...s, price: sgDetail.price, stock: [120, 80, 150, 60][i % 4] })));

const startEdit = () => {
  draft.value = { title: props.product.title, price: sgDetail.price };
  err.value = {};
  editing.value = true;
};
const save = () => {
  const e: { title?: string; price?: string } = {};
  if (!draft.value.title.trim()) e.title = '请填写商品标题';
  const price = Number(draft.value.price);
  if (!draft.value.price.trim() || Number.isNaN(price) || price <= 0) e.price = '请填写有效的一口价';
  err.value = e;
  if (Object.keys(e).length) return;
  props.product.title = draft.value.title.trim();
  editing.value = false;
  pushToast('商品资料已保存');
};
const addImg = () => pushToast('演示环境：图片上传即将上线', 'warning');

/* AI 美化：一键优化主图与标题（演示） */
const aiBusy = ref(false);
const aiBeautify = () => {
  if (aiBusy.value) return;
  aiBusy.value = true;
  pushToast('AI 正在美化商品主图与标题…');
  setTimeout(() => {
    aiBusy.value = false;
    pushToast('AI 美化完成（演示）');
  }, 900);
};
</script>

<template>
  <div class="bee-dialog wide qd-page">
    <!-- 顶栏 -->
    <div class="bp-head">
      <span class="bee-logo">🐝</span>
      <span class="bp-title">蜜蜂搬家 · 商品详情</span>
      <div class="bp-head-r">
        <button v-if="!editing" class="bp-btn" @click="startEdit">编辑</button>
        <button class="bp-btn ai" :disabled="aiBusy" @click="aiBeautify">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" /></svg>
          {{ aiBusy ? '美化中…' : 'AI美化' }}
        </button>
        <span class="bp-tag" :class="product.complete ? 'ok' : 'no'">{{ product.complete ? '已完善' : '未完善' }}</span>
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="qd-body">
      <!-- 来源信息：采集维度只读，顶部一排展示；编辑态不展示 -->
      <div v-if="!editing" class="qd-meta">
        <span class="qd-meta-i">
          <em>来源平台</em>
          <span class="bp-plat">
            <img :src="BEE_PLATFORM_LOGO[product.platform]" alt="" />
            {{ product.platform }}
          </span>
        </span>
        <span class="qd-meta-i">
          <em>商品链接</em>
          <a class="qd-link" :href="product.link" target="_blank" rel="noreferrer">{{ product.link }}</a>
        </span>
        <span class="qd-meta-i"><em>导入时间</em>{{ product.importTime }}</span>
      </div>
      <!-- 基本信息 -->
      <div class="qd-sec">
        <div class="qd-sec-t">基本信息</div>
        <div class="qd-row">
          <span class="qd-label"><i>*</i>商品标题</span>
          <div class="qd-ctrl">
            <div class="qd-titlewrap">
              <input v-if="editing" v-model="draft.title" class="qd-input title" maxlength="60" placeholder="请输入商品标题" />
              <span v-else class="qd-input title">{{ product.title }}</span>
              <span class="qd-count">{{ (editing ? draft.title : product.title).length }}/60</span>
            </div>
            <div v-if="err.title" class="qd-err">{{ err.title }}</div>
          </div>
        </div>
        <div class="qd-row">
          <span class="qd-label"><i>*</i>当前类目</span>
          <div class="qd-ctrl qd-cat">{{ CATEGORY.join(' / ') }}</div>
        </div>
      </div>

      <!-- 商品图片 -->
      <div class="qd-sec">
        <div class="qd-sec-t">商品图片</div>
        <div class="qd-row">
          <span class="qd-label"><i>*</i>主图</span>
          <div class="qd-ctrl">
            <div class="qd-imgs">
              <img v-for="(m, i) in mains" :key="i" class="qd-img" :src="m" alt="" />
              <span v-for="n in plusSlots" :key="'e' + n" class="qd-img plus" @click="editing && addImg()">+<em>添加图片</em></span>
            </div>
          </div>
        </div>
        <div class="qd-row">
          <span class="qd-label">3:4主图</span>
          <div class="qd-ctrl">
            <div class="qd-note">最多上传5张图片，支持最小尺寸750*1000，固定宽高比例为3:4，大小20M以内</div>
            <div class="qd-imgs">
              <img v-for="(m, i) in imgs34" :key="i" class="qd-img r34" :src="m" alt="" />
              <span v-if="editing" class="qd-img r34 plus" @click="addImg">+<em>添加图片</em></span>
            </div>
          </div>
        </div>
        <div class="qd-row">
          <span class="qd-label">商品视频</span>
          <div class="qd-ctrl">
            <div class="qd-note">视频要求：时长5秒~5分钟；宽高比支持1:1、3:4、9:16，最多可上传5个</div>
            <div class="qd-imgs">
              <span v-for="(m, i) in videosList" :key="i" class="qd-video">
                <img class="qd-img" :src="m" alt="" /><i class="qd-play">▶</i>
              </span>
              <span v-if="editing" class="qd-img plus" @click="addImg">+<em>添加视频</em></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 销售信息 -->
      <div class="qd-sec">
        <div class="qd-sec-t">销售信息</div>
        <div class="qd-row">
          <span class="qd-label"><i>*</i>一口价</span>
          <div class="qd-ctrl">
            <div class="qd-titlewrap">
              <input v-if="editing" v-model="draft.price" class="qd-input price" placeholder="0.00" />
              <span v-else class="qd-input price">¥ {{ sgDetail.price }}</span>
              <span class="qd-count">元</span>
            </div>
            <div v-if="err.price" class="qd-err">{{ err.price }}</div>
          </div>
        </div>
        <div class="qd-row">
          <span class="qd-label">颜色分类</span>
          <div class="qd-ctrl qd-chips"><span v-for="c in sgDetail.colors" :key="c" class="qd-chip">{{ c }}</span></div>
        </div>
        <div class="qd-row">
          <span class="qd-label">规格</span>
          <div class="qd-ctrl qd-chips"><span v-for="c in sgDetail.styles" :key="c" class="qd-chip">{{ c }}</span></div>
        </div>
        <div class="qd-row">
          <span class="qd-label">商品SKU</span>
          <div class="qd-ctrl">
            <div class="qd-sku">
              <table class="bp-table">
                <thead>
                  <tr>
                    <th style="width: 64px">SKU图</th>
                    <th>颜色分类</th>
                    <th style="width: 90px">款式</th>
                    <th style="width: 120px">SKU名称</th>
                    <th style="width: 110px">价格(元)</th>
                    <th style="width: 110px">库存(件)</th>
                    <th style="width: 150px">商品编码</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(s, i) in skuRows" :key="i">
                    <td><img class="qd-sku-img" :src="product.img" alt="" /></td>
                    <td><input v-if="editing" v-model="s.color" class="qd-input" placeholder="颜色" /><span v-else>{{ s.color }}</span></td>
                    <td><input v-if="editing" v-model="s.style" class="qd-input" placeholder="款式" /><span v-else>{{ s.style }}</span></td>
                    <td><input v-if="editing" v-model="s.name" class="qd-input" placeholder="SKU名称" /><span v-else>{{ s.name }}</span></td>
                    <td><input v-if="editing" v-model="s.price" class="qd-input" /><span v-else>{{ s.price }}</span></td>
                    <td><input v-if="editing" v-model.number="s.stock" class="qd-input" /><span v-else>{{ s.stock }}</span></td>
                    <td><input v-if="editing" v-model="s.code" class="qd-input code" placeholder="商品编码" /><span v-else class="qd-code">{{ s.code }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- 详情描述 -->
      <div class="qd-sec">
        <div class="qd-sec-t">详情描述</div>
        <div class="qd-row">
          <span class="qd-label">详情图</span>
          <div class="qd-ctrl">
            <div class="qd-note">宝贝详情图【高度≤2】，超出将被裁剪，建议宽度≥1440像素以确保清晰</div>
            <div class="qd-desc">
              <img v-for="(m, i) in sgDetail.detailImgs" :key="i" :src="m" alt="" />
            </div>
          </div>
        </div>
        <div class="qd-row">
          <span class="qd-label">白底图</span>
          <div class="qd-ctrl">
            <div class="qd-imgs"><img class="qd-img" :src="sgDetail.whiteImg" alt="" /></div>
          </div>
        </div>
        <div class="qd-row">
          <span class="qd-label">场景图</span>
          <div class="qd-ctrl">
            <div class="qd-imgs"><img class="qd-img" :src="sgDetail.sceneImg" alt="" /></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底栏：查看态 关闭/编辑/铺货；编辑态 取消/保存 -->
    <div class="qd-foot">
      <template v-if="!editing">
        <button class="bp-btn primary" @click="emit('pub', product)">发起铺货</button>
      </template>
      <template v-else>
        <button class="bp-btn" @click="editing = false">取消</button>
        <button class="bp-btn primary" @click="save">保存</button>
      </template>
    </div>
  </div>
</template>

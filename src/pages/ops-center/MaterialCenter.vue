<script setup lang="ts">
import { ref } from 'vue';
import { createDetail } from './data';
import { pushToast } from '../../components/toast';
import ToastWrap from '../../components/ToastWrap.vue';

/** 素材中心：商品详情编辑态「素材」入口进入；左栏选图换图/一键美化，右栏素材库 */
const emit = defineEmits<{ (e: 'back'): void }>();

const d = createDetail;
const tab = ref<'swap' | 'beauty'>('swap');
const mainImgs = ref<string[]>([...d.mainImgs]);
const detailImgs = ref<string[]>([...d.detailImgs]);

/* 素材库条目（静态）：同一商品多角度主图，用裁切位置区分 */
const libOpen = ref(true);
const LIB_IMGS = ['center 15%', 'center center', 'center 40%', 'center 70%', 'center 90%'];

const removeMain = (i: number) => mainImgs.value.splice(i, 1);
const removeDetail = (i: number) => detailImgs.value.splice(i, 1);
</script>

<template>
  <div class="mc-page">
    <div class="mc-top">
      <span class="mc-title">素材中心</span>
      <div class="mc-acts">
        <button class="sg-btn" @click="emit('back')">取消</button>
        <button class="sg-btn primary" @click="pushToast('素材修改已保存'); emit('back')">保存修改</button>
      </div>
    </div>

    <div class="mc-body">
      <!-- 左栏：选图换图 / 一键美化 -->
      <div class="mc-left">
        <div class="mc-tabs">
          <div class="mc-tab" :class="tab === 'swap' ? 'active' : ''" @click="tab = 'swap'">选图换图</div>
          <div class="mc-tab" :class="tab === 'beauty' ? 'active' : ''" @click="tab = 'beauty'">一键美化</div>
        </div>

        <div v-if="tab === 'swap'" class="mc-left-body">
          <div class="mc-sec-title">商品主图</div>
          <div class="mc-imgs">
            <div v-for="(im, i) in mainImgs" :key="`m${i}`" class="mc-img">
              <img :src="im" alt="" />
              <div class="mc-img-mask">
                <span class="mc-drag" aria-hidden="true">
                  <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
                </span>
                <div class="mc-img-ops">
                  <a href="#" @click.prevent="pushToast('查看图片：演示环境暂不可用')">查看</a>
                  <a href="#" @click.prevent="pushToast('更换图片：演示环境暂不可用')">更换</a>
                  <a href="#" @click.prevent="removeMain(i)">删除</a>
                </div>
              </div>
            </div>
            <button class="mc-upload" @click="pushToast('上传图片：演示环境暂不可用')"><i>+</i>上传图片</button>
          </div>

          <div class="mc-sec-title">SKU图片</div>
          <div class="mc-sku-list">
            <div v-for="(s, i) in d.skus" :key="i" class="mc-sku-row">
              <div class="mc-sku-th"><img :src="d.mainImgs[i % d.mainImgs.length]" alt="" /><span>SKU图片</span></div>
              <div class="mc-sku-th"><img :src="d.mainImgs[(i + 1) % d.mainImgs.length]" alt="" /><span>编码图片</span></div>
              <div class="mc-sku-info">
                <div class="mc-sku-name">{{ s.name }}</div>
                <div class="mc-sku-codes"><span>{{ s.code }}</span></div>
              </div>
            </div>
          </div>

          <div class="mc-sec-title">详情图</div>
          <div class="mc-imgs">
            <div v-for="(im, i) in detailImgs" :key="`d${i}`" class="mc-img">
              <img :src="im" alt="" />
              <div class="mc-img-mask">
                <span class="mc-drag" aria-hidden="true">
                  <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
                </span>
                <div class="mc-img-ops">
                  <a href="#" @click.prevent="pushToast('查看图片：演示环境暂不可用')">查看</a>
                  <a href="#" @click.prevent="pushToast('更换图片：演示环境暂不可用')">更换</a>
                  <a href="#" @click.prevent="removeDetail(i)">删除</a>
                </div>
              </div>
            </div>
            <button class="mc-upload" @click="pushToast('上传图片：演示环境暂不可用')"><i>+</i>上传图片</button>
          </div>

          <div class="mc-sec-title">商品视频</div>
          <div class="mc-imgs">
            <div v-for="(v, i) in d.videos" :key="`v${i}`" class="mc-img">
              <img :src="v" alt="" />
              <span class="mc-play">▶</span>
            </div>
            <button class="mc-upload" @click="pushToast('上传视频：演示环境暂不可用')"><i>+</i>上传视频</button>
          </div>

          <div class="mc-sec-title">通用商品白底图</div>
          <div class="mc-imgs">
            <div class="mc-img"><img :src="d.whiteImg" alt="" /></div>
            <button class="mc-upload" @click="pushToast('上传图片：演示环境暂不可用')"><i>+</i>上传图片</button>
          </div>
        </div>
        <div v-else class="mc-left-body mc-beauty-empty">暂无美化任务</div>
      </div>

      <!-- 右栏：素材库 -->
      <div class="mc-right">
        <div class="mc-right-head">
          <span class="mc-right-title">素材库</span>
          <button class="sg-btn primary" @click="pushToast('导入素材：演示环境暂不可用')">导入素材</button>
        </div>
        <div class="mc-lib">
          <div class="mc-lib-top">
            <div class="mc-lib-title">韩系波点缎面裙摆马尾抓夹女高级感半扎发后脑勺气质发夹头饰发卡</div>
            <button class="mc-fold" @click="libOpen = !libOpen">{{ libOpen ? '收起' : '展开' }} {{ libOpen ? '∧' : '∨' }}</button>
          </div>
          <div class="mc-lib-meta">
            <span class="mc-lib-tag">淘宝</span>
            <span>2026-08-27 14:18:12</span>
            <span>王龙</span>
            <a href="#" @click.prevent="pushToast('前往查看：演示环境暂不可用')">前往查看&gt;&gt;</a>
          </div>
          <template v-if="libOpen">
            <div class="mc-sec-title">商品主图</div>
            <div class="mc-lib-imgs">
              <img v-for="(p, i) in LIB_IMGS" :key="i" src="/products/hairpin.png" alt="" :style="{ objectPosition: p }" />
            </div>
          </template>
        </div>
      </div>
    </div>

    <ToastWrap />
  </div>
</template>

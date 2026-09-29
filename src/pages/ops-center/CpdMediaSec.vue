<script setup lang="ts">
/** 图集/视频区块（编辑态追加「添加图片/视频」上传位；传 onPreview 时图片可点击预览；传 wmOf 时叠加处理中 loading 环；结果仅失败红框，成功不做额外展示；
 *  传 kbPick 时上传位后再追加「推荐素材」位，点击回调 onKbPick 打开素材库选用抽屉；
 *  传 onUpload 时上传位打开本地文件框追加（single 时仅单张且已有图后隐藏上传/素材位）；
 *  传 onReplace/onCrop/onDelete 时缩略图悬浮「更换/裁剪/删除」操作，更换回调带磁贴位置供页级选图抽屉使用） */
import { ref } from 'vue';
export interface CpdWmView { status: 'queued' | 'running' | 'done' | 'fail'; percent: number }
const props = defineProps<{
  title: string;
  note: string;
  imgs: string[];
  video?: boolean;
  ratio34?: boolean;
  editing: boolean;
  addLabel?: string;
  single?: boolean;
  onPreview?: (i: number) => void;
  wmOf?: (i: number) => CpdWmView | undefined;
  kbPick?: boolean;
  onKbPick?: () => void;
  onUpload?: (files: File[]) => void;
  onReplace?: (i: number, rect?: DOMRect) => void;
  onCrop?: (i: number) => void;
  onDelete?: (i: number) => void;
}>();

const addRef = ref<HTMLInputElement | null>(null);
const pickAdd = () => { if (props.onUpload) addRef.value?.click(); };
const onAddFiles = (e: Event) => {
  const el = e.target as HTMLInputElement;
  if (el.files?.length) props.onUpload?.([...el.files]);
  el.value = '';
};
const tileRect = (e: Event) => (e.currentTarget as HTMLElement).closest('.cpd-wmbox')?.getBoundingClientRect();
</script>

<template>
  <div class="sgd-sec">
    <div class="sgd-sec-head"><div class="sgd-sec-title">{{ title }}</div></div>
    <div class="sgd-sec-body">
      <div class="sgd-note">{{ note }}</div>
      <div class="sgd-imgs" :class="ratio34 ? 'ratio34' : ''">
        <template v-for="(m, i) in imgs" :key="i">
          <span v-if="video" class="sgd-video"><img :src="m" alt="" /><i class="sgd-play">▶</i></span>
          <span v-else class="cpd-wmbox" :class="wmOf?.(i)?.status === 'fail' ? 'wm-fail' : ''">
            <img :class="onPreview ? 'cpd-previewable' : ''" :src="m" alt="" @click="onPreview?.(i)" />
            <!-- 处理中：执行中 loading 环，排队浅遮罩 + 文案，让用户感知时间差 -->
            <i
              v-if="wmOf?.(i) && (wmOf(i)!.status === 'running' || wmOf(i)!.status === 'queued')"
              class="cpd-wm-mask"
              :class="wmOf(i)!.status"
            >
              <span v-if="wmOf(i)!.status === 'running'" class="cpd-wm-spin" />
              <b v-else class="cpd-wm-queue">排队中</b>
            </i>
            <i v-if="editing && !video && (onReplace || onCrop || onDelete)" class="cpd-img-ops">
              <button v-if="onReplace" type="button" @click.stop="onReplace(i, tileRect($event))">更换</button>
              <button v-if="onCrop" type="button" @click.stop="onCrop(i)">裁剪</button>
              <button v-if="onDelete" type="button" @click.stop="onDelete(i)">删除</button>
            </i>
          </span>
        </template>
        <span v-if="editing && addLabel && !(single && imgs.length)" class="cpd-upload" @click="pickAdd">{{ addLabel }}<i>本地上传</i></span>
        <span v-if="editing && kbPick && !(single && imgs.length)" class="cpd-upload cpd-upload-kb" @click="onKbPick?.()">推荐素材<i>素材库选用</i></span>
      </div>
    </div>
    <input ref="addRef" type="file" accept="image/*" :multiple="!single" class="cpd-file-hidden" @change="onAddFiles">
  </div>
</template>

<script setup lang="ts">
/** 图集/视频区块（编辑态追加「添加图片/视频」上传位；传 onPreview 时图片可点击预览；传 wmOf 时叠加处理中 loading 环；结果仅失败红框，成功不做额外展示） */
export interface CpdWmView { status: 'queued' | 'running' | 'done' | 'fail'; percent: number }
defineProps<{
  title: string;
  note: string;
  imgs: string[];
  video?: boolean;
  ratio34?: boolean;
  editing: boolean;
  addLabel?: string;
  onPreview?: (i: number) => void;
  wmOf?: (i: number) => CpdWmView | undefined;
}>();
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
          </span>
        </template>
        <span v-if="editing && addLabel" class="cpd-upload">{{ addLabel }}<i>本地上传</i></span>
      </div>
    </div>
  </div>
</template>

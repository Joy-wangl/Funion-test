<script setup lang="ts">
/** 图集/视频区块（编辑态追加「添加图片/视频」上传位） */
defineProps<{
  title: string;
  note: string;
  imgs: string[];
  video?: boolean;
  ratio34?: boolean;
  editing: boolean;
  addLabel?: string;
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
          <img v-else :src="m" alt="" />
        </template>
        <span v-if="editing && addLabel" class="cpd-upload">{{ addLabel }}<i>本地上传</i></span>
      </div>
    </div>
  </div>
</template>

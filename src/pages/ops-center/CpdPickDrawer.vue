<script setup lang="ts">
/** 更换图片抽屉（京麦/店铺商品详情共用）：按图片类型分组磁贴选源（跨组去重由页级 groups 保证），或本地上传；
 *  与商品创建详情的 cpd-pick 抽屉同构同样式 */
import { ref } from 'vue';
defineProps<{
  open: boolean;
  groups: { label: string; imgs: string[] }[];
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'pick', src: string): void;
  (e: 'local', files: File[]): void;
}>();
const fileRef = ref<HTMLInputElement | null>(null);
const onFile = (e: Event) => {
  const el = e.target as HTMLInputElement;
  const files = el.files ? [...el.files] : [];
  el.value = '';
  if (files.length) emit('local', files);
};
</script>

<template>
  <div v-if="open" class="cpd-pick-mask" @click.self="emit('close')">
    <div class="cpd-pick">
      <div class="cpd-pick-head">
        <div class="cpd-pick-title">选用商品图片</div>
        <button type="button" class="cpd-pick-close" title="关闭" @click="emit('close')">×</button>
      </div>
      <div class="cpd-pick-body">
        <div v-for="g in groups" :key="g.label" class="cpd-pick-sec">
          <div class="cpd-pick-sec-title">{{ g.label }}</div>
          <div class="cpd-pick-grid">
            <button v-for="s in g.imgs" :key="s" type="button" class="cpd-pick-tile" @click="emit('pick', s)"><img :src="s" alt="" /></button>
          </div>
        </div>
        <div class="cpd-pick-sec">
          <div class="cpd-pick-sec-title">本地上传</div>
          <div class="cpd-pick-grid">
            <button type="button" class="cpd-pick-add" @click="fileRef?.click()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>新增</span>
            </button>
          </div>
        </div>
        <input ref="fileRef" type="file" accept="image/*" class="cpd-file-hidden" @change="onFile">
      </div>
    </div>
  </div>
</template>

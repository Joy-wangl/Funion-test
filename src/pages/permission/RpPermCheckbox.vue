<script setup lang="ts">
import { ref } from 'vue';
import Checkbox from './Checkbox.vue';

/* 权限矩阵勾选：本地状态，初始自 cfg.checked */
const props = defineProps<{ checked: boolean }>();
const val = ref(props.checked);
</script>

<template>
  <Checkbox :checked="val" @change="(c: boolean) => val = c" />
</template>

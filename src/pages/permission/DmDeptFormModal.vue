<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Modal from '../../components/Modal.vue';

/* ---------- 添加/编辑部门弹窗 ---------- */
const props = defineProps<{ title: string; value: string }>();
const emit = defineEmits<{
  (e: 'ok', v: string): void;
  (e: 'close'): void;
}>();

const val = ref(props.value);
const inputEl = ref<HTMLInputElement | null>(null);
onMounted(() => inputEl.value?.focus());

const ok = () => {
  if (!val.value.trim()) { inputEl.value?.focus(); return; }
  emit('ok', val.value.trim());
  emit('close');
};
</script>

<template>
  <Modal :title="title" @close="emit('close')">
    <div class="cnt-wrap">
      <input ref="inputEl" v-model="val" class="input" placeholder="请输入部门名称" :maxlength="10" />
      <span class="cnt">{{ val.length }}/10</span>
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="ok">确定</button>
    </template>
  </Modal>
</template>

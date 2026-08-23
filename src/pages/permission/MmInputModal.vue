<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Modal from '../../components/Modal.vue';

/* ---------- 名称输入弹窗 ---------- */
const props = defineProps<{
  title: string;
  value: string;
}>();
const emit = defineEmits<{
  (e: 'ok', v: string): void;
  (e: 'close'): void;
}>();

const val = ref(props.value);
const inputRef = ref<HTMLInputElement | null>(null);
onMounted(() => inputRef.value?.focus());

const onOk = () => {
  if (!val.value.trim()) { inputRef.value?.focus(); return; }
  emit('ok', val.value.trim());
  emit('close');
};
</script>

<template>
  <Modal :title="title" @close="emit('close')">
    <div class="form-item mt0">
      <label>名称</label>
      <input v-model="val" ref="inputRef" class="input" maxlength="20" placeholder="请输入名称" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="onOk">确定</button>
    </template>
  </Modal>
</template>

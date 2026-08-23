<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Modal from '../../components/Modal.vue';

/* ---------- 名称输入弹窗 ---------- */
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
    <div class="form-item" :style="{ margin: 0 }">
      <label>名称 <span class="req">*</span></label>
      <input ref="inputEl" v-model="val" class="input" placeholder="请输入名称" :maxlength="20" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="ok">确定</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../../components/Modal.vue';

defineProps<{ channelLabel: string }>();
const emit = defineEmits<{
  (e: 'next', name: string): void;
  (e: 'close'): void;
}>();

const name = ref('');

const next = () => { if (!name.value.trim()) return; emit('next', name.value.trim()); };
</script>

<template>
  <Modal title="新建运营组" :sub="`步骤 1/2 · 渠道：${channelLabel}`" size="md" @close="emit('close')">
    <div class="form-item">
      <label>运营组名称</label>
      <input v-model="name" class="input" placeholder="请输入组名" :maxlength="20" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="next">下一步：选择组长</button>
    </template>
  </Modal>
</template>

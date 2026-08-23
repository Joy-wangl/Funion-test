<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../../components/Modal.vue';
import type { OpsGroup } from './opsGroupData';

const props = defineProps<{ group: OpsGroup }>();
const emit = defineEmits<{
  (e: 'confirm', name: string): void;
  (e: 'close'): void;
}>();

const name = ref(props.group.name);

const save = () => { if (!name.value.trim()) return; emit('confirm', name.value.trim()); };
</script>

<template>
  <Modal title="编辑运营组" size="md" @close="emit('close')">
    <div class="form-item">
      <label>运营组名称</label>
      <input v-model="name" class="input" placeholder="请输入组名" :maxlength="20" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="save">保存</button>
    </template>
  </Modal>
</template>

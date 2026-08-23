<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../../components/Modal.vue';
import DeptTransfer from './DeptTransfer.vue';
import { pushToast } from '../../components/toast';
import type { Member } from './data';

/* ---------- 移动部门 ---------- */
const props = defineProps<{
  ids: string[];
  members: Member[];
}>();
const emit = defineEmits<{
  (e: 'confirm', name: string): void;
  (e: 'close'): void;
}>();

const picked = ref<Map<string, string>>(new Map());
const who = props.ids.length === 1 ? `「${props.members.find((m) => m.id === props.ids[0])?.name}」` : `选中的 ${props.ids.length} 名成员`;

const ok = () => {
  if (!picked.value.size) { pushToast('请选择目标部门', 'error'); return; }
  emit('confirm', [...picked.value.values()][0]);
  emit('close');
};
</script>

<template>
  <Modal title="移动部门" :sub="`将${who}移动到新的部门`" size="md" @close="emit('close')">
    <div class="form-tip mb">选择目标部门，成员的角色配置保持不变。</div>
    <DeptTransfer :picked="picked" @picked-change="(next: Map<string, string>) => picked = next" />
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="ok">确定移动</button>
    </template>
  </Modal>
</template>

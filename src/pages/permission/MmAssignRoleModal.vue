<script setup lang="ts">
import { ref } from 'vue';
import Modal from '../../components/Modal.vue';
import RoleSelector from './RoleSelector.vue';
import type { Member } from './data';

/* ---------- 分配角色 ---------- */
const props = defineProps<{
  ids: string[];
  members: Member[];
}>();
const emit = defineEmits<{
  (e: 'confirm', roles: string[]): void;
  (e: 'close'): void;
}>();

const preset = props.ids.length === 1 ? props.members.find((m) => m.id === props.ids[0])?.roles ?? [] : [];
const roles = ref<string[]>(preset);
const who = props.ids.length === 1 ? `「${props.members.find((m) => m.id === props.ids[0])?.name}」` : `选中的 ${props.ids.length} 名成员`;

const ok = () => {
  emit('confirm', roles.value);
  emit('close');
};
</script>

<template>
  <Modal title="分配角色" :sub="`为${who}分配角色`" size="md" @close="emit('close')">
    <div class="form-tip" :style="{ marginBottom: '14px' }">角色决定成员可访问的菜单、数据范围与功能权限。批量分配将覆盖成员原有角色。</div>
    <RoleSelector :initial="preset" @change="(v: string[]) => roles = v" />
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="ok">确定</button>
    </template>
  </Modal>
</template>

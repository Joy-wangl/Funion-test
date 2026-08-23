<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { INITIAL_MEMBERS } from './data';
import { OPS_ROLE_LABEL } from './opsGroupData';
import type { OpsGroup, OpsMember, OpsRole } from './opsGroupData';
import MemberPickPanel from './MemberPickPanel.vue';
import OgPickedSide from './OgPickedSide.vue';

const props = defineProps<{
  role: OpsRole;
  group: OpsGroup;
  parentId: string;
  channelMembers: OpsMember[];
  taken: Set<string>;
}>();
const emit = defineEmits<{
  (e: 'confirm', ids: string[]): void;
  (e: 'close'): void;
}>();

const picked = ref<Set<string>>(new Set());

const parent = computed(() => props.channelMembers.find((m) => m.memberId === props.parentId));
const pool = INITIAL_MEMBERS.filter((m) => m.status !== 'pending');
const pickedMembers = computed(() => pool.filter((m) => picked.value.has(m.id)));

const toggle = (id: string) => {
  const next = new Set(picked.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  picked.value = next;
};
const remove = (id: string) => {
  const next = new Set(picked.value);
  next.delete(id);
  picked.value = next;
};
const confirm = () => { if (!picked.value.size) return; emit('confirm', [...picked.value]); };
</script>

<template>
  <Modal :title="`添加${OPS_ROLE_LABEL[role]}`" :sub="`组：${group.name} · 上级：${parent?.name ?? ''}`" size="xl" @close="emit('close')">
    <div class="member-transfer">
      <MemberPickPanel
        :members="pool"
        :selected-ids="picked"
        :disabled-ids="taken"
        no-dept-pick
        :on-toggle="toggle"
        :on-bulk="() => {}"
      />
      <OgPickedSide :picked="pickedMembers" :max="1000" :on-remove="remove" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">确认添加</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { OPS_ROLE_LABEL } from './opsGroupData';
import type { OpsGroup, OpsMember } from './opsGroupData';

const props = defineProps<{
  entry: OpsMember;
  group: OpsGroup;
  channelGroups: OpsGroup[];
  channelMembers: OpsMember[];
}>();
const emit = defineEmits<{
  (e: 'confirm', targetGroupId: string, targetParentId: string): void;
  (e: 'close'): void;
}>();

const targetGroupId = ref(props.group.id);
const targetParentId = ref('');

/* 助理为「移动至」语义：改挂其它组长/专员；专员为「转交」 */
const title = computed(() => (props.entry.role === 'assistant' ? '移动助理' : `转交${OPS_ROLE_LABEL[props.entry.role]}`));
const okText = computed(() => (props.entry.role === 'assistant' ? '确认移动' : '确认转交'));

const parentCandidates = computed(() => {
  if (props.entry.role === 'specialist') {
    return props.channelMembers.filter((m) => m.groupId === targetGroupId.value && m.role === 'leader' && m.memberId !== props.entry.memberId);
  }
  if (props.entry.role === 'assistant') {
    /* 助理可挂靠专员，也可直挂组长 */
    return props.channelMembers.filter((m) => m.groupId === targetGroupId.value && (m.role === 'leader' || m.role === 'specialist') && m.memberId !== props.entry.memberId);
  }
  return [];
});

watch([targetGroupId, parentCandidates], () => {
  targetParentId.value = parentCandidates.value[0]?.memberId ?? '';
}, { immediate: true });

const confirm = () => {
  if (!targetGroupId.value || !targetParentId.value) return;
  emit('confirm', targetGroupId.value, targetParentId.value);
};
</script>

<template>
  <Modal :title="title" :sub="`当前：${entry.name} · 组：${group.name}`" size="md" @close="emit('close')">
    <div class="form-item">
      <label>目标分组</label>
      <BubbleSelect
        class-name="input"
        :value="targetGroupId"
        :options="channelGroups.map((g) => ({ value: g.id, label: g.name }))"
        @change="(v: string) => targetGroupId = v"
      />
    </div>
    <div class="form-item">
      <label>{{ entry.role === 'specialist' ? '挂靠组长' : '挂靠上级' }}</label>
      <BubbleSelect
        class-name="input"
        :value="targetParentId || '请选择'"
        :options="parentCandidates.map((m) => ({ value: m.memberId, label: m.role === 'leader' ? `${m.name}（组长）` : m.name }))"
        @change="(v: string) => targetParentId = v"
      />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">{{ okText }}</button>
    </template>
  </Modal>
</template>

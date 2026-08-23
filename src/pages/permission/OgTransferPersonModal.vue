<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { INITIAL_MEMBERS } from './data';
import type { OpsGroup, OpsMember } from './opsGroupData';
import MemberPickPanel from './MemberPickPanel.vue';
import OgPickedSide from './OgPickedSide.vue';

/* 转交组长/专员：唤起成员选择组件（仅可选人、已有归属禁选），一对一交接 */
const props = defineProps<{
  entry: OpsMember;
  group: OpsGroup;
  role: 'leader' | 'specialist';
  taken: Set<string>;
}>();
const emit = defineEmits<{
  (e: 'confirm', memberId: string): void;
  (e: 'close'): void;
}>();

const picked = ref<Set<string>>(new Set());

const pool = INITIAL_MEMBERS.filter((m) => m.status !== 'pending');
const disabled = computed(() => new Set([...props.taken, props.entry.memberId]));
const pickedMembers = computed(() => pool.filter((m) => picked.value.has(m.id)));
const pickedSrc = computed(() => pickedMembers.value[0]);
const roleLabel = props.role === 'leader' ? '组长' : '专员';
const oldLabel = props.role === 'leader' ? '原组长' : '原专员';
const demoteLabel = props.role === 'leader' ? '专员' : '助理';

const toggleSingle = (id: string) => {
  picked.value = picked.value.has(id) ? new Set() : new Set([id]);
};
const confirm = () => { if (!pickedSrc.value) return; emit('confirm', pickedSrc.value.id); };
</script>

<template>
  <Modal :title="`转交运营${roleLabel}`" :sub="`当前：${entry.name} · 组：${group.name}`" size="xl" @close="emit('close')">
    <div class="member-transfer">
      <MemberPickPanel
        :members="pool"
        :selected-ids="picked"
        :disabled-ids="disabled"
        no-dept-pick
        :on-toggle="toggleSingle"
        :on-bulk="() => {}"
      />
      <OgPickedSide :picked="pickedMembers" :max="1" :on-remove="() => picked = new Set()" />
    </div>
    <div v-if="pickedSrc" class="form-tip" :style="{ marginTop: '10px' }">转交后：<b>{{ pickedSrc.name }}</b> 将成为「{{ group.name }}」{{ roleLabel }}，{{ oldLabel }} {{ entry.name }} 转为{{ demoteLabel }}。</div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">确认转交</button>
    </template>
  </Modal>
</template>

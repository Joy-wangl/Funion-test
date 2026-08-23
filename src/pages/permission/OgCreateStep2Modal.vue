<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { INITIAL_MEMBERS } from './data';
import MemberPickPanel from './MemberPickPanel.vue';
import OgPickedSide from './OgPickedSide.vue';

const props = defineProps<{
  name: string;
  channelLabel: string;
  taken: Set<string>;
}>();
const emit = defineEmits<{
  (e: 'confirm', leaderId: string): void;
  (e: 'back'): void;
  (e: 'close'): void;
}>();

const picked = ref<Set<string>>(new Set());

const pool = INITIAL_MEMBERS.filter((m) => m.status !== 'pending');
const pickedMembers = computed(() => pool.filter((m) => picked.value.has(m.id)));
const pickedSrc = computed(() => pickedMembers.value[0]);

const toggleSingle = (id: string) => {
  picked.value = picked.value.has(id) ? new Set() : new Set([id]);
};

const confirm = () => { if (!pickedSrc.value) return; emit('confirm', pickedSrc.value.id); };
</script>

<template>
  <Modal title="选择组长" :sub="`步骤 2/2 · 组名：${name} · 渠道：${channelLabel}`" size="xl" @close="emit('close')">
    <div class="member-transfer">
      <MemberPickPanel
        :members="pool"
        :selected-ids="picked"
        :disabled-ids="taken"
        no-dept-pick
        :on-toggle="toggleSingle"
        :on-bulk="() => {}"
      />
      <OgPickedSide :picked="pickedMembers" :max="1" :on-remove="() => picked = new Set()" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('back')">上一步</button>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">创建</button>
    </template>
  </Modal>
</template>

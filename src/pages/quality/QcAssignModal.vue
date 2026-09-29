<script setup lang="ts">
/* ---------- 分配成员（品控-线上 部门/角色管理）：通讯录选人 + 右侧已选 ---------- */
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import MemberPickPanel from '../permission/MemberPickPanel.vue';
import { avaColor } from '../permission/data';
import type { Member } from '../permission/data';
import { IconXsm } from '../permission/permIcons';

const props = defineProps<{ source: Member[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', members: Member[]): void }>();

const valid = computed(() => props.source.filter((m) => m.status !== 'pending'));
const selectedIds = ref<Set<string>>(new Set());
const selected = computed(() => valid.value.filter((m) => selectedIds.value.has(m.id)));

const toggle = (id: string) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};
const bulk = (ids: string[], checked: boolean) => {
  const next = new Set(selectedIds.value);
  ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
  selectedIds.value = next;
};
const confirm = () => {
  if (!selected.value.length) { pushToast('请至少选择一名成员', 'error'); return; }
  emit('confirm', selected.value);
  emit('close');
};
</script>

<template>
  <div class="qc-perm-scope">
    <Modal title="分配成员" sub="选择成员" size="xl" @close="emit('close')">
    <div class="member-transfer">
      <MemberPickPanel :members="valid" :selected-ids="selectedIds" :on-toggle="toggle" :on-bulk="bulk" />
      <div class="member-transfer-right">
        <div class="mtr-head">已选择({{ selected.length }}/1000)</div>
        <div class="mtr-body">
          <div v-if="!selected.length" class="mtr-empty">暂未选择成员</div>
          <div v-for="m in selected" :key="m.id" class="mtr-selected">
            <span class="og-ava" :style="{ background: avaColor(m.name) }">{{ m.name.slice(0, 1) }}</span>
            <span class="mtr-name">{{ m.name }}</span>
            <span class="mtr-rm" @click="toggle(m.id)"><IconXsm /></span>
          </div>
        </div>
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">确定</button>
    </template>
    </Modal>
  </div>
</template>

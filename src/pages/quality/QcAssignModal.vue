<script setup lang="ts">
/* ---------- 分配成员（品控-线上 部门/角色管理）：通讯录选人 + 右侧已选 ---------- */
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import MemberPickPanel from '../permission/MemberPickPanel.vue';
import { avaColor } from '../permission/data';
import type { Member } from '../permission/data';
import { IconXsm } from '../permission/permIcons';

const props = defineProps<{ source: Member[]; title?: string; initialIds?: Set<string>; /** 单选（转交场景）：点选即替换，分组批量不生效 */ single?: boolean; /** 选人同时必填的原因（转交原因）：传入标签即出现原因输入框 */ reasonLabel?: string; reasonPh?: string }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', members: Member[], reason: string): void }>();

const valid = computed(() => props.source.filter((m) => m.status !== 'pending'));
const selectedIds = ref<Set<string>>(new Set(props.initialIds ?? []));
const selected = computed(() => valid.value.filter((m) => selectedIds.value.has(m.id)));
const reason = ref('');

const toggle = (id: string) => {
  if (props.single) { selectedIds.value = new Set([id]); return; }
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};
const bulk = (ids: string[], checked: boolean) => {
  if (props.single) return;
  const next = new Set(selectedIds.value);
  ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
  selectedIds.value = next;
};
const confirm = () => {
  if (!selected.value.length) { pushToast('请至少选择一名成员', 'error'); return; }
  const rs = reason.value.trim();
  if (props.reasonLabel && !rs) { pushToast(`请填写${props.reasonLabel}`, 'error'); return; }
  emit('confirm', props.single ? selected.value.slice(0, 1) : selected.value, rs);
  emit('close');
};
</script>

<template>
  <div class="qc-perm-scope">
    <Modal :title="props.title ?? '分配成员'" sub="选择成员" size="xl" @close="emit('close')">
    <div class="member-transfer">
      <MemberPickPanel :members="valid" :selected-ids="selectedIds" :on-toggle="toggle" :on-bulk="bulk" />
      <div class="member-transfer-right">
        <div class="mtr-head">已选择({{ selected.length }}/{{ props.single ? 1 : 1000 }})</div>
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
    <!-- 选人同时必填原因（转交场景）：转入人可见，并写入处理流程节点 -->
    <div v-if="props.reasonLabel" class="sg-field qc-am-reason">
      <label>{{ props.reasonLabel }}<span class="qc-tc-req">*</span></label>
      <textarea v-model="reason" class="sg-input qc-tc-textarea qc-todo-rejta" maxlength="100" :placeholder="props.reasonPh ?? `请填写${props.reasonLabel}`" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">确定</button>
    </template>
    </Modal>
  </div>
</template>

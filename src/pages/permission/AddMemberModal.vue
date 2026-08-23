<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { avaColor } from './data';
import type { Member } from './data';
import { OPS_CHANNELS, OPS_ROLE_LABEL, newGroupId, nowStamp } from './opsGroupData';
import type { OpsChannelGroups, OpsChannelMembers, OpsRole } from './opsGroupData';
import type { OpsBindCfg } from './opsBind';
import { emptyAssign } from './opsBind';
import MemberPickPanel from './MemberPickPanel.vue';
import OpsBindingStep from './OpsBindingStep.vue';
import { IconXsm } from './permIcons';

/* ---------- 添加成员（图一：左侧部门成员选择 + 右侧已选 + 运营归属） ---------- */
const props = defineProps<{
  opsGroups: OpsChannelGroups;
  opsMembers: OpsChannelMembers;
  sourceMembers: Member[];
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', members: Member[], roles: string[], opsPatch?: { groups: OpsChannelGroups; members: OpsChannelMembers }): void;
}>();

const selectedIds = ref<Set<string>>(new Set());
const step = ref<1 | 2>(1);
const opsCfg = ref<OpsBindCfg>({
  taobao: { leader: emptyAssign(), specialist: emptyAssign(), assistant: emptyAssign() },
  video: { leader: emptyAssign(), specialist: emptyAssign(), assistant: emptyAssign() },
});

const selectedMembers = computed(() => props.sourceMembers.filter((m) => selectedIds.value.has(m.id)));
const validSource = computed(() => props.sourceMembers.filter((m) => m.status !== 'pending'));

const toggleMember = (id: string) => {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
};

const removeMember = (id: string) => {
  const next = new Set(selectedIds.value);
  next.delete(id);
  selectedIds.value = next;
};

const bulkSetMembers = (ids: string[], checked: boolean) => {
  const next = new Set(selectedIds.value);
  ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
  selectedIds.value = next;
};

const confirm = () => {
  if (selectedMembers.value.length === 0) { pushToast('请至少选择一名成员', 'error'); return; }

  const patchGroups = { ...props.opsGroups };
  const patchMembers: OpsChannelMembers = { ...props.opsMembers };

  for (const { key, label } of OPS_CHANNELS) {
    const ch = opsCfg.value[key];
    /* 归属必选：每个平台都须为所有成员分配职位 */
    const assigned = new Set([...ch.leader.memberIds, ...ch.specialist.memberIds, ...ch.assistant.memberIds]);
    if (selectedMembers.value.some((m) => !assigned.has(m.id))) { pushToast(`请为${label}平台所有成员分配职位`, 'error'); return; }

    if (ch.leader.memberIds.length > 0) {
      /* 一个组只有一个组长：组长职位新建运营组 */
      const name = ch.leader.groupName.trim();
      if (!name) { pushToast(`请输入${label}平台新建运营组名称`, 'error'); return; }
      const member = selectedMembers.value.find((m) => m.id === ch.leader.memberIds[0]);
      if (member) {
        const gid = newGroupId();
        patchGroups[key] = [...patchGroups[key], { id: gid, channel: key, name, leaderId: member.id, createdAt: nowStamp() }];
        patchMembers[key] = patchMembers[key].filter((m) => m.memberId !== member.id);
        patchMembers[key].push({ memberId: member.id, name: member.name, role: 'leader', groupId: gid, parentId: null, addedBy: '管理员', addedAt: nowStamp() });
      }
    }

    for (const r of ['specialist', 'assistant'] as OpsRole[]) {
      const ids = ch[r].memberIds;
      if (ids.length === 0) continue;
      const group = patchGroups[key].find((g) => g.id === ch[r].groupId);
      if (!group) { pushToast(`请选择${label}平台${OPS_ROLE_LABEL[r]}的运营组`, 'error'); return; }
      let parentId = ch[r].parentId;
      if (r === 'specialist') {
        /* 选组后组长直接代入，无需再选 */
        parentId = patchMembers[key].find((m) => m.groupId === group.id && m.role === 'leader')?.memberId ?? '';
        if (!parentId) { pushToast(`组「${group.name}」暂无组长，请选择其它组`, 'error'); return; }
      } else if (!parentId) {
        pushToast(`请选择${label}平台${OPS_ROLE_LABEL[r]}的挂靠专员`, 'error'); return;
      }
      ids.forEach((id) => {
        const member = selectedMembers.value.find((m) => m.id === id);
        if (!member) return;
        patchMembers[key] = patchMembers[key].filter((m) => m.memberId !== id);
        patchMembers[key].push({ memberId: id, name: member.name, role: r, groupId: group.id, parentId, addedBy: '管理员', addedAt: nowStamp() });
      });
    }
  }

  emit('confirm', selectedMembers.value, [], { groups: patchGroups, members: patchMembers });
  emit('close');
};
</script>

<template>
  <Modal
    title="分配成员"
    :sub="step === 1 ? '步骤 1/2 · 选择成员' : '步骤 2/2 · 分配运营归属'"
    size="xl"
    @close="emit('close')"
  >
    <div v-if="step === 1" class="member-transfer">
      <MemberPickPanel
        :members="validSource"
        :selected-ids="selectedIds"
        :on-toggle="toggleMember"
        :on-bulk="bulkSetMembers"
      />
      <div class="member-transfer-right">
        <div class="mtr-head">已选择({{ selectedMembers.length }}/1000)</div>
        <div class="mtr-body">
          <template v-if="selectedMembers.length === 0">
            <div class="mtr-empty">暂未选择成员</div>
          </template>
          <template v-else>
            <div v-for="m in selectedMembers" :key="m.id" class="mtr-selected">
              <span class="og-ava" :style="{ background: avaColor(m.name) }">{{ m.name.slice(0, 1) }}</span>
              <span class="mtr-name">{{ m.name }}</span>
              <span class="mtr-rm" @click="removeMember(m.id)"><IconXsm /></span>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div v-else class="am-step2">
      <div class="am-step2-sum">
        <span class="am-sum-label">已选成员</span>
        <div class="am-sum-tags">
          <span v-for="m in selectedMembers" :key="m.id" class="am-sum-tag">
            <span class="og-ava" :style="{ background: avaColor(m.name) }">{{ m.name.slice(0, 1) }}</span>
            {{ m.name }}
          </span>
        </div>
      </div>
      <OpsBindingStep
        :ops-groups="opsGroups"
        :ops-members="opsMembers"
        :ops-cfg="opsCfg"
        :selected-members="selectedMembers"
        @change="(next: OpsBindCfg) => opsCfg = next"
      />
    </div>
    <template #foot>
      <button v-if="step === 2" class="btn" @click="step = 1">上一步</button>
      <button class="btn" @click="emit('close')">取消</button>
      <button
        v-if="step === 1"
        class="btn primary"
        @click="selectedMembers.length === 0 ? pushToast('请至少选择一名成员', 'error') : (step = 2)"
      >下一步</button>
      <button v-else class="btn primary" @click="confirm">确定</button>
    </template>
  </Modal>
</template>

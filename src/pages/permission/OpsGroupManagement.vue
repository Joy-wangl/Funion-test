<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { avaColor } from './data';
import type { Member } from './data';
import ToastWrap from '../../components/ToastWrap.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import './style.css';
import { IconArrow, IconMore, IconSearch, IconWarn } from './permIcons';
import MoreActions from '../../components/MoreActions.vue';
import OgActionStack from './OgActionStack.vue';
import OgCreateStep1Modal from './OgCreateStep1Modal.vue';
import OgCreateStep2Modal from './OgCreateStep2Modal.vue';
import OgEditGroupModal from './OgEditGroupModal.vue';
import OgAddSubModal from './OgAddSubModal.vue';
import OgTransferModal from './OgTransferModal.vue';
import OgTransferPersonModal from './OgTransferPersonModal.vue';
import {
  INITIAL_OPS_GROUPS,
  INITIAL_OPS_MEMBERS,
  OPS_CHANNELS,
  OPS_ROLE_COLOR,
  OPS_ROLE_LABEL,
  nowStamp,
  newGroupId,
  opsMemberSource,
} from './opsGroupData';
import type { OpsChannel, OpsChannelGroups, OpsChannelMembers, OpsGroup, OpsMember, OpsRole } from './opsGroupData';

/* ---------- 弹窗状态（msg 为结构化富文本：pre + <b>bold</b> + post） ---------- */
type ConfirmMsg = { pre: string; bold?: string; post: string };
type ModalState =
  | { kind: 'createGroup'; step: 1; name?: string }
  | { kind: 'createGroup'; step: 2; name: string }
  | { kind: 'editGroup'; group: OpsGroup }
  | { kind: 'addSub'; role: OpsRole; parentId: string; group: OpsGroup }
  | { kind: 'transfer'; entry: OpsMember; group: OpsGroup }
  | { kind: 'confirm'; title: string; msg: ConfirmMsg; okText: string; onOk: () => void };

const groups = ref<OpsChannelGroups>(INITIAL_OPS_GROUPS);
const members = ref<OpsChannelMembers>(INITIAL_OPS_MEMBERS);
const channel = ref<OpsChannel>('taobao');
const gq = ref('');
const selGroup = ref('');
const expSpecs = ref<Set<string>>(new Set());
const modal = ref<ModalState | null>(null);

const channelGroups = computed(() => groups.value[channel.value]);
const channelMembers = computed(() => members.value[channel.value]);
const channelLabel = computed(() => OPS_CHANNELS.find((c) => c.key === channel.value)?.label ?? '');

const mutateGroups = (fn: (list: OpsGroup[]) => OpsGroup[]) => {
  groups.value = { ...groups.value, [channel.value]: fn(groups.value[channel.value]) };
};
const mutateMembers = (fn: (list: OpsMember[]) => OpsMember[]) => {
  members.value = { ...members.value, [channel.value]: fn(members.value[channel.value]) };
};

const groupViews = computed(() => channelGroups.value.map((g) => {
  const leader = channelMembers.value.find((m) => m.groupId === g.id && m.role === 'leader');
  const specs = channelMembers.value.filter((m) => m.groupId === g.id && m.role === 'specialist');
  const size = channelMembers.value.filter((m) => m.groupId === g.id).length;
  return { group: g, leader, specs, size };
}));

const visibleGroups = computed(() => {
  const q = gq.value.trim().toLowerCase();
  if (!q) return groupViews.value;
  return groupViews.value.filter(({ group, leader, specs }) => {
    if (group.name.toLowerCase().includes(q)) return true;
    if (leader?.name.toLowerCase().includes(q)) return true;
    return specs.some((s) => s.name.toLowerCase().includes(q));
  });
});

const activeView = computed(() => visibleGroups.value.find((v) => v.group.id === selGroup.value) ?? visibleGroups.value[0]);
const activeGroup = computed(() => activeView.value?.group);
const activeLeader = computed(() => activeView.value?.leader);
const activeSpecs = computed(() => activeView.value?.specs ?? []);

watch(channel, () => { selGroup.value = ''; });
watch(activeGroup, () => { expSpecs.value = new Set(); });

const toggleSpec = (id: string) => {
  const next = new Set(expSpecs.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  expSpecs.value = next;
};

const isMemberTaken = (memberId: string) => channelMembers.value.some((m) => m.memberId === memberId);

const createGroup = (name: string, leaderId: string) => {
  if (isMemberTaken(leaderId)) {
    pushToast('该成员在当前平台已有运营归属', 'error');
    return;
  }
  const src = opsMemberSource(leaderId);
  if (!src) return;
  const gid = newGroupId();
  mutateGroups((list) => [...list, { id: gid, channel: channel.value, name, leaderId, createdAt: nowStamp() }]);
  mutateMembers((list) => [
    ...list,
    { memberId: leaderId, name: src.name, role: 'leader', groupId: gid, parentId: null, addedBy: '管理员', addedAt: nowStamp() },
  ]);
  selGroup.value = gid;
  pushToast(`已创建运营组「${name}」`);
  modal.value = null;
};

const renameGroup = (groupId: string, name: string) => {
  mutateGroups((list) => list.map((g) => (g.id === groupId ? { ...g, name } : g)));
  pushToast('已更新组名');
  modal.value = null;
};

const deleteGroup = (group: OpsGroup) => {
  const size = channelMembers.value.filter((m) => m.groupId === group.id).length;
  if (size > 0) {
    pushToast('组内仍有成员，无法删除', 'error');
    return;
  }
  mutateGroups((list) => list.filter((g) => g.id !== group.id));
  pushToast('已删除运营组');
};

const addSubordinates = (groupId: string, role: OpsRole, parentId: string, ids: string[]) => {
  if (ids.some((id) => isMemberTaken(id))) {
    pushToast('部分成员在当前平台已有运营归属', 'error');
    return;
  }
  const srcs = ids.map((id) => opsMemberSource(id)).filter((s): s is Member => !!s);
  if (!srcs.length) return;
  mutateMembers((list) => [
    ...list,
    ...srcs.map((s) => ({ memberId: s.id, name: s.name, role, groupId, parentId, addedBy: '管理员', addedAt: nowStamp() })),
  ]);
  pushToast(`已添加 ${srcs.length} 名${OPS_ROLE_LABEL[role]}`);
  modal.value = null;
};

const transferRole = (entry: OpsMember, fromGroup: OpsGroup, targetGroupId: string, targetParentId: string) => {
  const targetGroup = channelGroups.value.find((g) => g.id === targetGroupId);
  if (!targetGroup) return;

  if (entry.role === 'leader') {
    const oldLeaderId = targetGroup.leaderId;
    mutateGroups((list) => list.map((g) => {
      if (g.id === fromGroup.id) return { ...g, leaderId: '' };
      if (g.id === targetGroupId) return { ...g, leaderId: entry.memberId };
      return g;
    }));
    mutateMembers((list) => list.map((m) => {
      if (m.memberId === entry.memberId) {
        return { ...m, groupId: targetGroupId, parentId: null };
      }
      if (oldLeaderId && m.memberId === oldLeaderId && m.groupId === targetGroupId) {
        return { ...m, role: 'specialist', parentId: entry.memberId };
      }
      if (m.parentId === entry.memberId && m.groupId === fromGroup.id) {
        return { ...m, groupId: targetGroupId };
      }
      return m;
    }));
    pushToast('已转交组长');
  } else if (entry.role === 'specialist') {
    mutateMembers((list) => list.map((m) => {
      if (m.memberId === entry.memberId) {
        return { ...m, groupId: targetGroupId, parentId: targetParentId };
      }
      if (m.parentId === entry.memberId && m.groupId === fromGroup.id) {
        return { ...m, groupId: targetGroupId, parentId: targetParentId };
      }
      return m;
    }));
    pushToast('已转交专员');
  } else {
    mutateMembers((list) => list.map((m) =>
      m.memberId === entry.memberId ? { ...m, groupId: targetGroupId, parentId: targetParentId } : m
    ));
    pushToast('已转交助理');
  }
  modal.value = null;
};

/* 转交＝替换：B 接任 A 的职位并接管 A 的下属，A 退出该运营组 */
const transferLeader = (group: OpsGroup, oldLeader: OpsMember, newLeaderId: string) => {
  if (isMemberTaken(newLeaderId)) {
    pushToast('该成员在当前平台已有运营归属', 'error');
    return;
  }
  const src = opsMemberSource(newLeaderId);
  if (!src) return;
  mutateGroups((list) => list.map((g) => (g.id === group.id ? { ...g, leaderId: newLeaderId } : g)));
  mutateMembers((list) => [
    ...list
      .filter((m) => m.memberId !== oldLeader.memberId)
      .map((m) => (m.groupId === group.id && m.role === 'specialist' && m.parentId === oldLeader.memberId
        ? { ...m, parentId: newLeaderId }
        : m)),
    { memberId: newLeaderId, name: src.name, role: 'leader' as OpsRole, groupId: group.id, parentId: null, addedBy: oldLeader.name, addedAt: nowStamp() },
  ]);
  pushToast(`已将组长转交给「${src.name}」`);
  modal.value = null;
};

const transferSpecialist = (group: OpsGroup, oldSpec: OpsMember, newSpecId: string) => {
  if (isMemberTaken(newSpecId)) {
    pushToast('该成员在当前平台已有运营归属', 'error');
    return;
  }
  const src = opsMemberSource(newSpecId);
  if (!src) return;
  mutateMembers((list) => [
    ...list
      .filter((m) => m.memberId !== oldSpec.memberId)
      .map((m) => (m.role === 'assistant' && m.parentId === oldSpec.memberId
        ? { ...m, parentId: newSpecId }
        : m)),
    { memberId: newSpecId, name: src.name, role: 'specialist' as OpsRole, groupId: group.id, parentId: oldSpec.parentId, addedBy: oldSpec.name, addedAt: nowStamp() },
  ]);
  pushToast(`已将专员转交给「${src.name}」`);
  modal.value = null;
};

const closeModal = () => { modal.value = null; };

/* RoleTag 样式 */
const roleTagStyle = (role: OpsRole) => {
  const c = OPS_ROLE_COLOR[role];
  return { color: c, background: `${c}14` };
};

const takenIds = computed(() => new Set(channelMembers.value.map((m) => m.memberId)));
const assisOf = (sp: OpsMember) => channelMembers.value.filter((m) => m.parentId === sp.memberId && m.role === 'assistant');

const openCreate = () => { modal.value = { kind: 'createGroup', step: 1 }; };
const openEditGroup = (group: OpsGroup) => { modal.value = { kind: 'editGroup', group }; };
const openTransfer = (entry: OpsMember, group: OpsGroup) => { modal.value = { kind: 'transfer', entry, group }; };
const openAddSub = (role: OpsRole, parentId: string, group: OpsGroup) => {
  modal.value = { kind: 'addSub', role, parentId, group };
};
const step2Next = (name: string) => { modal.value = { kind: 'createGroup', step: 2, name }; };
const step2Back = (name: string) => { modal.value = { kind: 'createGroup', step: 1, name }; };
const okConfirm = (m: Extract<ModalState, { kind: 'confirm' }>) => { m.onOk(); closeModal(); };

/* 组长行操作（模板回调无法收窄 activeLeader/activeGroup，统一在此守卫） */
const openLeaderTransfer = () => {
  if (activeLeader.value && activeGroup.value) openTransfer(activeLeader.value, activeGroup.value);
};
const openLeaderAddSpec = () => {
  if (activeLeader.value && activeGroup.value) openAddSub('specialist', activeLeader.value.memberId, activeGroup.value);
};

/* 弹窗确定入口（联合类型在模板回调中无法收窄，统一在此守卫） */
const step2Confirm = (leaderId: string) => {
  if (modal.value?.kind === 'createGroup' && modal.value.step === 2) createGroup(modal.value.name, leaderId);
};
const step2BackCur = () => {
  if (modal.value?.kind === 'createGroup' && modal.value.step === 2) step2Back(modal.value.name);
};
const editGroupConfirm = (name: string) => {
  if (modal.value?.kind === 'editGroup') renameGroup(modal.value.group.id, name);
};
const addSubConfirm = (ids: string[]) => {
  if (modal.value?.kind === 'addSub') addSubordinates(modal.value.group.id, modal.value.role, modal.value.parentId, ids);
};
const transferConfirm = (gid: string, pid: string) => {
  if (modal.value?.kind === 'transfer') transferRole(modal.value.entry, modal.value.group, gid, pid);
};
const transferPersonConfirm = (memberId: string) => {
  if (modal.value?.kind === 'transfer') {
    if (modal.value.entry.role === 'leader') transferLeader(modal.value.group, modal.value.entry, memberId);
    else transferSpecialist(modal.value.group, modal.value.entry, memberId);
  }
};
</script>

<template>
  <div class="og-wrap">
    <div class="og-toolbar">
      <div class="og-tabs">
        <button
          v-for="c in OPS_CHANNELS"
          :key="c.key"
          class="og-tab"
          :class="channel === c.key ? 'active' : ''"
          @click="channel = c.key"
        >{{ c.label }}</button>
      </div>
      <div class="og-tools">
        <div class="input-icon og-search">
          <span class="ic"><IconSearch /></span>
          <input v-model="gq" class="input" placeholder="搜索组名 / 组长 / 成员" />
        </div>
        <button class="btn primary" @click="openCreate">+ 新建运营组</button>
      </div>
    </div>

    <div class="og-md">
      <div class="og-md-left">
        <template v-if="visibleGroups.length">
          <div
            v-for="{ group, leader, size } in visibleGroups"
            :key="group.id"
            class="og-md-item"
            :class="activeGroup?.id === group.id ? 'active' : ''"
            @click="selGroup = group.id"
          >
            <div class="og-md-item-hd">
              <span class="og-md-name">{{ group.name }}</span>
              <span class="og-g-count">{{ size }}人</span>
              <span class="og-md-more" @click.stop>
                <MoreActions :items="[
                  { label: '重命名', onClick: () => openEditGroup(group) },
                  { label: '删除组织', danger: true, onClick: () => deleteGroup(group) },
                ]">
                  <template #trigger><IconMore /></template>
                </MoreActions>
              </span>
            </div>
            <div class="og-md-item-sub">
              <span v-if="leader" class="og-lead-ava" :style="{ background: avaColor(leader.name) }">{{ leader.name.slice(0, 1) }}</span>
              组长：{{ leader?.name ?? '未指定' }}
            </div>
          </div>
        </template>
        <div v-else class="empty" :style="{ padding: '20px 0' }">无匹配运营组</div>
      </div>

      <div class="og-md-right">
        <div v-if="activeView && activeGroup" class="og-detail">
          <div class="og-detail-hd">
            <span class="og-g-name">{{ activeGroup.name }}</span>
          </div>
          <div class="og-detail-body">
            <div class="og-table">
              <div class="og-tr head">
                <div class="og-cell">成员名称</div>
                <div class="og-cell">职位</div>
                <div class="og-cell">添加时间</div>
                <div class="og-cell">添加人</div>
                <div class="og-cell">操作</div>
              </div>
              <div v-if="activeLeader" class="og-tr">
                <div class="og-cell og-td-name">
                  <span class="og-ava" :style="{ background: avaColor(activeLeader.name) }">{{ activeLeader.name.slice(0, 1) }}</span>
                  <span class="og-cell-nm">{{ activeLeader.name }}</span>
                </div>
                <div class="og-cell"><span class="og-role-tag" :style="roleTagStyle('leader')">{{ OPS_ROLE_LABEL['leader'] }}</span></div>
                <div class="og-cell og-td-dim">{{ activeLeader.addedAt }}</div>
                <div class="og-cell og-td-dim">{{ activeLeader.addedBy }}</div>
                <div class="og-cell">
                  <OgActionStack :items="[
                    { label: '转交组长', onClick: openLeaderTransfer },
                    { label: '添加专员', onClick: openLeaderAddSpec },
                  ]" />
                </div>
              </div>
              <div v-else class="og-tr-empty">该组暂无组长</div>
              <template v-for="sp in activeSpecs" :key="sp.memberId">
                <div class="og-tr spec" @click="toggleSpec(sp.memberId)">
                  <div class="og-cell og-td-name d1">
                    <span class="arrow" :class="(expSpecs.has(sp.memberId) ? 'open' : '') + ' ' + (assisOf(sp).length ? '' : 'leaf')"><IconArrow /></span>
                    <span class="og-ava" :style="{ background: avaColor(sp.name) }">{{ sp.name.slice(0, 1) }}</span>
                    <span class="og-cell-nm">{{ sp.name }}</span>
                    <span v-if="assisOf(sp).length > 0" class="og-g-count">{{ assisOf(sp).length }}助理</span>
                  </div>
                  <div class="og-cell"><span class="og-role-tag" :style="roleTagStyle('specialist')">{{ OPS_ROLE_LABEL['specialist'] }}</span></div>
                  <div class="og-cell og-td-dim">{{ sp.addedAt }}</div>
                  <div class="og-cell og-td-dim">{{ sp.addedBy }}</div>
                  <div class="og-cell" @click.stop>
                    <OgActionStack :items="[
                      { label: '转交专员', onClick: () => openTransfer(sp, activeGroup) },
                      { label: '添加助理', onClick: () => openAddSub('assistant', sp.memberId, activeGroup) },
                    ]" />
                  </div>
                </div>
                <template v-if="expSpecs.has(sp.memberId)">
                  <template v-if="assisOf(sp).length">
                    <div v-for="a in assisOf(sp)" :key="a.memberId" class="og-tr sub">
                      <div class="og-cell og-td-name d2">
                        <span class="arrow leaf"><IconArrow /></span>
                        <span class="og-ava sm" :style="{ background: avaColor(a.name) }">{{ a.name.slice(0, 1) }}</span>
                        <span class="og-cell-nm">{{ a.name }}</span>
                      </div>
                      <div class="og-cell"><span class="og-role-tag" :style="roleTagStyle('assistant')">{{ OPS_ROLE_LABEL['assistant'] }}</span></div>
                      <div class="og-cell og-td-dim">{{ a.addedAt }}</div>
                      <div class="og-cell og-td-dim">{{ a.addedBy }}</div>
                      <div class="og-cell og-td-dim">-</div>
                    </div>
                  </template>
                  <div v-else class="og-tr sub">
                    <div class="og-cell og-td-name d2">
                      <span class="arrow leaf"><IconArrow /></span>
                      <span class="og-td-dim">暂无助理</span>
                    </div>
                    <div class="og-cell" />
                    <div class="og-cell" />
                    <div class="og-cell" />
                    <div class="og-cell" />
                  </div>
                </template>
              </template>
              <div v-if="activeLeader && activeSpecs.length === 0" class="og-tr-empty">暂无专员，可在组长行「添加专员」</div>
            </div>
          </div>
        </div>
        <div v-else class="empty" :style="{ padding: '60px 0' }">请选择左侧运营组</div>
      </div>
    </div>
  </div>

  <!-- 弹窗 -->
  <OgCreateStep1Modal
    v-if="modal?.kind === 'createGroup' && modal.step === 1"
    :channel-label="channelLabel"
    @next="step2Next"
    @close="closeModal"
  />
  <OgCreateStep2Modal
    v-else-if="modal?.kind === 'createGroup' && modal.step === 2"
    :name="modal.name"
    :channel-label="channelLabel"
    :taken="takenIds"
    @confirm="step2Confirm"
    @back="step2BackCur"
    @close="closeModal"
  />
  <OgEditGroupModal
    v-else-if="modal?.kind === 'editGroup'"
    :group="modal.group"
    @confirm="editGroupConfirm"
    @close="closeModal"
  />
  <OgAddSubModal
    v-else-if="modal?.kind === 'addSub'"
    :role="modal.role"
    :group="modal.group"
    :parent-id="modal.parentId"
    :channel-members="channelMembers"
    :taken="takenIds"
    @confirm="addSubConfirm"
    @close="closeModal"
  />
  <OgTransferModal
    v-else-if="modal?.kind === 'transfer' && modal.entry.role === 'assistant'"
    :entry="modal.entry"
    :group="modal.group"
    :channel-groups="channelGroups"
    :channel-members="channelMembers"
    @confirm="transferConfirm"
    @close="closeModal"
  />
  <OgTransferPersonModal
    v-else-if="modal?.kind === 'transfer'"
    :entry="modal.entry"
    :group="modal.group"
    :role="modal.entry.role === 'leader' ? 'leader' : 'specialist'"
    :taken="takenIds"
    @confirm="transferPersonConfirm"
    @close="closeModal"
  />
  <Modal v-else-if="modal?.kind === 'confirm'" :title="modal.title" @close="closeModal">
    <div :style="{ display: 'flex', gap: '12px', alignItems: 'flex-start' }">
      <span :style="{ color: 'var(--danger)', flexShrink: 0 }"><IconWarn /></span>
      <div :style="{ color: 'var(--text-2)', lineHeight: 1.6, paddingTop: '1px' }">
        {{ modal.msg.pre }}<b>{{ modal.msg.bold }}</b>{{ modal.msg.post }}
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="closeModal">取消</button>
      <button class="btn danger" @click="okConfirm(modal)">{{ modal.okText }}</button>
    </template>
  </Modal>

  <ToastWrap />
</template>

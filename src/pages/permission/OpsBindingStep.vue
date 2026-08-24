<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { OPS_CHANNELS, OPS_ROLE_LABEL } from './opsGroupData';
import type { OpsChannelGroups, OpsChannelMembers, OpsChannel, OpsRole } from './opsGroupData';
import { avaColor } from './data';
import type { Member } from './data';
import type { OpsBindCfg, RoleAssign } from './opsBind';
import { IconCheck } from './permIcons';

/* ---------- 运营归属配置（平台 tab · 先选职位再选人：组长单选 / 专员·助理多选） ---------- */
const props = defineProps<{
  opsGroups: OpsChannelGroups;
  opsMembers: OpsChannelMembers;
  opsCfg: OpsBindCfg;
  selectedMembers: Member[];
}>();
const emit = defineEmits<{ (e: 'change', next: OpsBindCfg): void }>();

const tab = ref<OpsChannel>('taobao');
const role = ref<OpsRole>('specialist');
const ch = computed(() => props.opsCfg[tab.value]);
const cfg = computed(() => ch.value[role.value]);
const update = (patch: Partial<RoleAssign>) => {
  emit('change', { ...props.opsCfg, [tab.value]: { ...ch.value, [role.value]: { ...cfg.value, ...patch } } });
};

const group = computed(() => props.opsGroups[tab.value].find((g) => g.id === cfg.value.groupId));
const groupLeader = computed(() => group.value ? props.opsMembers[tab.value].find((m) => m.groupId === group.value!.id && m.role === 'leader') : undefined);
/* 助理挂靠上级：专员或组长直挂 */
const assistantParents = computed(() => props.opsMembers[tab.value].filter((m) => (m.role === 'leader' || m.role === 'specialist') && m.groupId === cfg.value.groupId));

const assignedRoleOf = (id: string) =>
  (['leader', 'specialist', 'assistant'] as OpsRole[]).find((r) => ch.value[r].memberIds.includes(id));

/* 点选成员：先从本平台各职位移除，再按单/多选写入当前职位 */
const togglePick = (id: string) => {
  const wasOn = cfg.value.memberIds.includes(id);
  const nextCh = { ...ch.value };
  (['leader', 'specialist', 'assistant'] as OpsRole[]).forEach((r) => {
    nextCh[r] = { ...nextCh[r], memberIds: nextCh[r].memberIds.filter((x) => x !== id) };
  });
  if (!wasOn) nextCh[role.value] = { ...nextCh[role.value], memberIds: role.value === 'leader' ? [id] : [...cfg.value.memberIds, id] };
  emit('change', { ...props.opsCfg, [tab.value]: nextCh });
};

const sumParts = computed(() => (['leader', 'specialist', 'assistant'] as OpsRole[])
  .filter((r) => ch.value[r].memberIds.length > 0)
  .map((r) => `${OPS_ROLE_LABEL[r]}×${ch.value[r].memberIds.length}`));
</script>

<template>
  <div class="og-binding-step">
    <div class="og-bind-head">
      <div class="og-tabs og-bind-tabs">
        <button
          v-for="c in OPS_CHANNELS"
          :key="c.key"
          type="button"
          class="og-tab"
          :class="tab === c.key ? 'active' : ''"
          @click="tab = c.key"
        >
          {{ c.label }}
        </button>
      </div>
      <span v-if="sumParts.length > 0" class="og-binding-sum">{{ sumParts.join(' · ') }}</span>
    </div>
    <div class="og-bind-panel">
      <div class="og-bind-field">
        <label>职位</label>
        <div class="og-role-pills">
          <button
            v-for="r in (['leader', 'specialist', 'assistant'] as OpsRole[])"
            :key="r"
            type="button"
            class="og-pill"
            :class="role === r ? 'on' : ''"
            @click="role = r"
          >
            {{ OPS_ROLE_LABEL[r] }}
            <i v-if="ch[r].memberIds.length > 0" class="og-pill-n">{{ ch[r].memberIds.length }}</i>
          </button>
        </div>
      </div>
      <template v-if="role === 'leader'">
        <div class="og-bind-tip">一个运营组仅设一名组长，组长职位将在确定后新建运营组。</div>
        <div class="og-bind-field">
          <label>新建运营组名称</label>
          <input
            class="input"
            :value="cfg.groupName"
            placeholder="请输入组名"
            maxlength="20"
            @input="update({ groupName: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </template>
      <div v-if="role === 'specialist'" class="og-bind-field">
        <label>运营组</label>
        <BubbleSelect
          class-name="input"
          :value="cfg.groupId || '请选择'"
          :options="opsGroups[tab].map((g) => ({ value: g.id, label: g.name }))"
          @change="(v: string) => update({ groupId: v, parentId: '' })"
        />
        <div v-if="group" class="og-bind-hint" :class="groupLeader ? '' : 'warn'">
          {{ groupLeader ? `将自动挂靠该组组长：${groupLeader.name}` : '该组暂无组长，请选择其它组' }}
        </div>
        <div v-else class="og-bind-hint">选择运营组后自动挂靠该组组长</div>
      </div>
      <div v-if="role === 'assistant'" class="og-bind-grid">
        <div class="og-bind-field">
          <label>运营组</label>
          <BubbleSelect
            class-name="input"
            :value="cfg.groupId || '请选择'"
            :options="opsGroups[tab].map((g) => ({ value: g.id, label: g.name }))"
            @change="(v: string) => update({ groupId: v, parentId: '' })"
          />
        </div>
        <div class="og-bind-field">
          <label>挂靠上级</label>
          <BubbleSelect
            class-name="input"
            :value="cfg.parentId || '请选择'"
            :options="assistantParents.map((m) => ({ value: m.memberId, label: m.role === 'leader' ? `${m.name}（组长）` : `${m.name}（专员）` }))"
            @change="(v: string) => update({ parentId: v })"
          />
        </div>
      </div>
      <div class="og-bind-field">
        <label>选择成员{{ role === 'leader' ? '（单选）' : '（可多选）' }}</label>
        <div class="am-pick-list">
          <button
            v-for="m in selectedMembers"
            :key="m.id"
            type="button"
            class="am-pick"
            :class="assignedRoleOf(m.id) === role ? 'on' : ''"
            @click="togglePick(m.id)"
          >
            <span class="og-ava" :style="{ background: avaColor(m.name) }">{{ m.name.slice(0, 1) }}</span>
            <span class="nm">{{ m.name }}</span>
            <span v-if="assignedRoleOf(m.id) === role" class="ck"><IconCheck /></span>
            <i v-else-if="assignedRoleOf(m.id)" class="as">{{ OPS_ROLE_LABEL[assignedRoleOf(m.id)!] }}</i>
          </button>
        </div>
        <div v-if="role === 'leader'" class="og-bind-hint">组长仅可单选 1 名成员，点选新成员将自动替换。</div>
        <div v-else class="og-bind-hint">已在他职的成员会显示当前职位，点选将改配到本职位。</div>
      </div>
    </div>
  </div>
</template>

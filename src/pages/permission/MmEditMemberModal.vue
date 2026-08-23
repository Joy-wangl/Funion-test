<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import RoleSelector from './RoleSelector.vue';
import type { Member } from './data';

/* ---------- 编辑成员 ---------- */
const props = defineProps<{
  id: string;
  members: Member[];
}>();
const emit = defineEmits<{
  (e: 'save', patch: Partial<Member>): void;
  (e: 'close'): void;
  (e: 'openMoveDept', onPick: (name: string) => void): void;
}>();

const m = computed(() => props.members.find((x) => x.id === props.id));
const name = ref(m.value?.name ?? '');
const phone = ref(m.value && m.value.phone !== '-' ? m.value.phone : '');
const status = ref<Member['status']>(m.value?.status ?? 'normal');
const dept = ref(m.value?.dept ?? '');
const roles = ref<string[]>(m.value?.roles ?? []);

const save = () => {
  if (!m.value) return;
  emit('save', { name: name.value.trim() || m.value.name, phone: phone.value.trim() || '-', status: status.value, dept: dept.value, roles: roles.value });
  emit('close');
};
</script>

<template>
  <Modal v-if="m" title="编辑成员" size="md" @close="emit('close')">
    <div class="form-item"><label>姓名</label><input v-model="name" class="input" /></div>
    <div class="form-row">
      <div class="form-item grow">
        <label>手机号</label>
        <input v-model="phone" class="input" placeholder="请输入手机号" />
      </div>
      <div class="form-item grow">
        <label>账号状态</label>
        <BubbleSelect
          class-name="select"
          :value="status"
          :options="[
            { value: 'normal', label: '正常' },
            { value: 'frozen', label: '冻结' },
          ]"
          @change="(v: string) => status = v as Member['status']"
        />
      </div>
    </div>
    <div class="form-item"><label>所属部门</label>
      <div class="form-row-sm">
        <input :value="dept" class="input grow input-ro" readonly />
        <button class="btn" @click="emit('openMoveDept', (n: string) => dept = n)">更换部门</button>
      </div>
    </div>
    <div class="form-item mt0"><label>分配角色</label>
      <RoleSelector :initial="m.roles" @change="(v: string[]) => roles = v" />
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="save">保存</button>
    </template>
  </Modal>
</template>

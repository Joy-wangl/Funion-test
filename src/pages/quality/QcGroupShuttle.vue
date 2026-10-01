<script setup lang="ts">
/* 组别 / 运维人员穿梭选择：左列组、右列当前组成员，一个控件替代两个下拉（口径与售后列表「组别 / 运维人员」一致） */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import { ONLINE_GROUP_MEMBERS, ONLINE_GROUPS } from './qcOnlineData';
import '../../components/BubbleSelect.css';
import '../../components/CascadeSelect.css';

const ALL_GROUP = '全部组别';
const ALL_OPERATOR = '全部运维';

const props = defineProps<{
  group: string;
  operator: string;
  className?: string;
}>();
const emit = defineEmits<{ (e: 'change', group: string, operator: string): void }>();

const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
/* 右列跟随的组：默认落到当前选中组，未选组时落到第一个组 */
const active = ref(ONLINE_GROUPS[0] ?? '');
const members = computed(() => ONLINE_GROUP_MEMBERS[active.value] ?? []);
const triggerText = computed(() => (props.group === ALL_GROUP ? `${ALL_GROUP} / ${ALL_OPERATOR}` : `${props.group} / ${props.operator}`));

const pos = ref<{ top: number; left: number; up: boolean } | null>(null);
const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const estW = 340;
  const vw = window.innerWidth;
  pos.value = {
    top: r.bottom + 6,
    left: vw > 0 ? Math.max(8, Math.min(r.left, vw - estW - 8)) : r.left,
    up: false,
  };
};
/* 渲染后按实测宽高二次钳制：下方空间不足则向上展开 */
const fit = () => {
  const el = rootRef.value;
  const m = menuRef.value;
  if (!el || !m || !pos.value) return;
  const r = el.getBoundingClientRect();
  const { width, height } = m.getBoundingClientRect();
  const vw = window.innerWidth;
  const up = window.innerHeight - r.bottom - 6 < height && r.top - 6 > window.innerHeight - r.bottom - 6;
  pos.value = {
    top: up ? r.top - 6 : r.bottom + 6,
    left: Math.max(8, Math.min(r.left, vw - width - 8)),
    up,
  };
};

watch(open, (v) => {
  if (!v) {
    pos.value = null;
    document.removeEventListener('mousedown', onDocDown);
    return;
  }
  active.value = props.group === ALL_GROUP ? (ONLINE_GROUPS[0] ?? '') : props.group;
  document.addEventListener('mousedown', onDocDown);
  requestAnimationFrame(() => { updatePos(); nextTick(fit); });
  window.addEventListener('resize', updatePos);
  window.addEventListener('scroll', updatePos, true);
}, { flush: 'post' });

onBeforeUnmount(() => {
  window.removeEventListener('resize', updatePos);
  window.removeEventListener('scroll', updatePos, true);
  document.removeEventListener('mousedown', onDocDown);
});

const onDocDown = (e: MouseEvent) => {
  const t = e.target as Node;
  if (rootRef.value?.contains(t) || menuRef.value?.contains(t)) return;
  open.value = false;
};

const menuStyle = computed<CSSProperties>(() => pos.value
  ? {
    position: 'fixed',
    top: `${pos.value.top}px`,
    left: `${pos.value.left}px`,
    zIndex: 4100,
    transform: pos.value.up ? 'translateY(-100%)' : undefined,
  }
  : { position: 'fixed', visibility: 'hidden' });

/* 左列点组＝按整组筛（成员回到全部），菜单保持打开以便继续下钻到人 */
const pickGroup = (g: string) => {
  active.value = g;
  emit('change', g, ALL_OPERATOR);
};
const pickAllGroup = () => {
  emit('change', ALL_GROUP, ALL_OPERATOR);
  open.value = false;
};
const pickOperator = (o: string) => {
  emit('change', active.value, o);
  open.value = false;
};
</script>

<template>
  <div ref="rootRef" class="bselect" :class="[{ open }, className]">
    <button type="button" class="bselect-trigger" @click="open = !open">
      <span class="bselect-text">{{ triggerText }}</span>
      <svg class="bselect-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menuRef" class="casc-menu" :style="menuStyle">
        <div class="casc-cols">
          <div class="casc-col">
            <div class="casc-item" :class="{ selected: props.group === ALL_GROUP }" @click="pickAllGroup">
              <span class="casc-check">{{ props.group === ALL_GROUP ? '✓' : '' }}</span>{{ ALL_GROUP }}
            </div>
            <div
              v-for="g in ONLINE_GROUPS"
              :key="g"
              class="casc-item group"
              :class="{ active: active === g, selected: props.group === g }"
              @mouseenter="active = g"
              @click="pickGroup(g)"
            >
              <span class="casc-check">{{ props.group === g ? '✓' : '' }}</span>
              <span class="casc-gname">{{ g }}</span><i class="casc-arrow">▸</i>
            </div>
          </div>
          <div class="casc-col right">
            <div
              class="casc-item"
              :class="{ selected: props.group === active && props.operator === ALL_OPERATOR }"
              @click="pickOperator(ALL_OPERATOR)"
            >
              <span class="casc-check">{{ props.group === active && props.operator === ALL_OPERATOR ? '✓' : '' }}</span>{{ ALL_OPERATOR }}
            </div>
            <div
              v-for="o in members"
              :key="o"
              class="casc-item"
              :class="{ selected: props.group === active && props.operator === o }"
              @click="pickOperator(o)"
            >
              <span class="casc-check">{{ props.group === active && props.operator === o ? '✓' : '' }}</span>{{ o }}
            </div>
            <div v-if="!members.length" class="bselect-empty">该组暂无成员</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

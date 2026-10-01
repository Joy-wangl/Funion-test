<script setup lang="ts">
/* 问题类型穿梭选择：左列大类、右列当前大类小类；点大类＝按大类口径筛、点小类＝下钻到小类（控件语言同组别/运维穿梭） */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import { QC_PROBLEM_TYPES } from './qcCenterData';
import { subsOfType } from './qcOnlineData';
import '../../components/BubbleSelect.css';
import '../../components/CascadeSelect.css';

const ALL_TYPE = '全部问题类型';
const ALL_SUB = '全部小类';

const props = defineProps<{
  ptype: string | null;
  sub: string | null;
  className?: string;
}>();
const emit = defineEmits<{ (e: 'change', ptype: string | null, sub: string | null): void }>();

const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
/* 右列跟随的大类：默认落到当前选中大类，未选时落到第一个大类 */
const active = ref(QC_PROBLEM_TYPES[0] ?? '');
const subs = computed(() => (active.value ? subsOfType(active.value) : []));
const triggerText = computed(() => (!props.ptype ? ALL_TYPE : props.sub ? `${props.ptype} / ${props.sub}` : props.ptype));

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
  active.value = props.ptype ?? (QC_PROBLEM_TYPES[0] ?? '');
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

/* 左列点大类＝按大类口径筛（小类回到全部），菜单保持打开以便继续下钻到小类 */
const pickType = (t: string) => {
  active.value = t;
  emit('change', t, null);
};
const pickAllType = () => {
  emit('change', null, null);
  open.value = false;
};
const pickAllSub = () => {
  emit('change', active.value, null);
  open.value = false;
};
const pickSub = (s: string) => {
  emit('change', active.value, s);
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
            <div class="casc-item" :class="{ selected: !props.ptype }" @click="pickAllType">
              <span class="casc-check">{{ !props.ptype ? '✓' : '' }}</span>{{ ALL_TYPE }}
            </div>
            <div
              v-for="t in QC_PROBLEM_TYPES"
              :key="t"
              class="casc-item group"
              :class="{ active: active === t, selected: props.ptype === t }"
              @mouseenter="active = t"
              @click="pickType(t)"
            >
              <span class="casc-check">{{ props.ptype === t ? '✓' : '' }}</span>
              <span class="casc-gname">{{ t }}</span><i class="casc-arrow">▸</i>
            </div>
          </div>
          <div class="casc-col right">
            <div
              class="casc-item"
              :class="{ selected: props.ptype === active && !props.sub }"
              @click="pickAllSub"
            >
              <span class="casc-check">{{ props.ptype === active && !props.sub ? '✓' : '' }}</span>{{ ALL_SUB }}
            </div>
            <div
              v-for="s in subs"
              :key="s"
              class="casc-item"
              :class="{ selected: props.ptype === active && props.sub === s }"
              @click="pickSub(s)"
            >
              <span class="casc-check">{{ props.ptype === active && props.sub === s ? '✓' : '' }}</span>{{ s }}
            </div>
            <div v-if="!subs.length" class="bselect-empty">该大类暂无小类</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

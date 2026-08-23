<script lang="ts">
export interface BubbleOption {
  value: string;
  label: string;
  /** 禁用项：灰色展示、不可点选（用于业务约束提示） */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import './BubbleSelect.css';

const props = defineProps<{
  /** 选项：字符串（value=label）或 {value,label} */
  options: (string | BubbleOption)[];
  /** 受控值（option 的 value） */
  value?: string;
  /** 非受控默认值 */
  defaultValue?: string;
  disabled?: boolean;
  /** 外层容器附加类名（复用各模块盒样式） */
  className?: string;
  style?: CSSProperties;
}>();
const emit = defineEmits<{ (e: 'change', value: string): void }>();

const norm = (o: string | BubbleOption): BubbleOption =>
  typeof o === 'string' ? { value: o, label: o } : o;

const opts = computed(() => props.options.map(norm));
const inner = ref(props.defaultValue ?? (opts.value[0]?.value ?? ''));
const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const pos = ref<{ top: number; left: number; width: number; up: boolean; maxH: number } | null>(null);

const current = computed(() => props.value !== undefined ? props.value : inner.value);
const currentLabel = computed(() => opts.value.find((o) => o.value === current.value)?.label ?? current.value);
/* 当前值不在选项中 → 视为功能标题占位，灰色展示且不可作为选择项 */
const isPlaceholder = computed(() => !opts.value.some((o) => o.value === current.value));

/* 浮层设计理念：菜单 Teleport 到 body、fixed 定位，永不被弹窗/抽屉等 overflow 容器裁剪；
   下方空间不足时自动向上展开，滚动/缩放时跟随触发器重新定位 */
const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  /* 选项自然高度（opt 约 33px + 菜单 padding 12 + 上下边框 2），避免 border-box 下 2px 溢出滚动条 */
  const contentH = opts.value.length * 33 + 12 + 2;
  const spaceBelow = window.innerHeight - r.bottom - 6;
  const spaceAbove = r.top - 6;
  const up = contentH > spaceBelow && spaceAbove > spaceBelow;
  const maxH = Math.max(120, Math.min(contentH, up ? spaceAbove : spaceBelow));
  /* 水平方向保护：不超出视口左右缘 */
  const width = Math.max(r.width, 96);
  const vw = window.innerWidth;
  const left = vw > 0 ? Math.max(8, Math.min(r.left, vw - width - 8)) : r.left;
  pos.value = { top: up ? r.top - 6 : r.bottom + 6, left, width, up, maxH };
};

watch(open, (v) => {
  if (!v) { pos.value = null; return; }
  /* 渲染后测量，等价 React useLayoutEffect */
  requestAnimationFrame(updatePos);
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

watch(open, (v) => {
  if (v) document.addEventListener('mousedown', onDocDown);
  else document.removeEventListener('mousedown', onDocDown);
});

const menuStyle = computed<CSSProperties>(() => pos.value
  ? {
    position: 'fixed',
    top: `${pos.value.top}px`,
    left: `${pos.value.left}px`,
    minWidth: `${pos.value.width}px`,
    maxHeight: `${pos.value.maxH}px`,
    zIndex: 2500,
    transform: pos.value.up ? 'translateY(-100%)' : undefined,
  }
  : { position: 'fixed', visibility: 'hidden' });

const pickOpt = (o: BubbleOption) => {
  if (o.disabled) return;
  if (props.value === undefined) inner.value = o.value;
  emit('change', o.value);
  open.value = false;
};
</script>

<template>
  <div
    ref="rootRef"
    class="bselect"
    :class="[{ open, disabled }, className]"
    :style="style"
  >
    <button
      type="button"
      class="bselect-trigger"
      :disabled="disabled"
      @click="open = !open"
    >
      <span class="bselect-text" :class="{ ph: isPlaceholder }">{{ currentLabel }}</span>
      <svg class="bselect-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menuRef" class="bselect-menu" :style="menuStyle">
        <div
          v-for="o in opts"
          :key="o.value || o.label"
          class="bselect-opt"
          :class="{ selected: o.value === current, disabled: o.disabled }"
          @click="pickOpt(o)"
        >
          <span class="bselect-check">{{ o.value === current ? '✓' : '' }}</span>
          <span class="bselect-label">{{ o.label }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
/* 多选下拉：菜单对标 BubbleSelect 气泡语言（纯文字行、选中主色加粗带 ✓，无勾选框）；
   allLabel 提供「全部」选项行（点击清空=不限），未传时菜单头保留全选/清空；浮层 Teleport 到 body 不被容器裁剪 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import './MultiSelect.css';

const props = defineProps<{
  options: string[];
  /** 受控值（已选集合） */
  value: string[];
  /** 未选时占位文字 */
  placeholder?: string;
  /** 外层容器附加类名（复用各模块盒样式） */
  className?: string;
  /** 菜单顶部内置搜索框，按输入模糊过滤选项（长枚举场景） */
  searchable?: boolean;
  /** 「全部」选项行文案（如「全部」）：置于菜单首行，点击清空已选；提供时隐藏全选/清空菜单头 */
  allLabel?: string;
}>();
const emit = defineEmits<{ (e: 'change', value: string[]): void }>();

const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const search = ref('');
/* 搜索过滤：子串包含过滤展示项（勾选集不受影响） */
const shown = computed(() => {
  const q = search.value.trim();
  return q ? props.options.filter((o) => o.includes(q)) : props.options;
});
const pos = ref<{ top: number; left: number; width: number; up: boolean } | null>(null);

const label = computed(() => (props.value.length ? props.value.join('、') : props.allLabel ?? ''));
const allChecked = computed(() => props.options.length > 0 && props.options.every((o) => props.value.includes(o)));

const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const rows = shown.value.length + (props.allLabel ? 1 : 0);
  const contentH = rows * 33 + (props.allLabel ? 12 : 52) + (props.searchable ? 40 : 0);
  const spaceBelow = window.innerHeight - r.bottom - 6;
  const spaceAbove = r.top - 6;
  const up = contentH > spaceBelow && spaceAbove > spaceBelow;
  pos.value = { top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: Math.max(r.width, 120), up };
};

watch(open, (v) => {
  if (!v) { pos.value = null; return; }
  search.value = '';
  /* 渲染后测量；搜索框自动聚焦（focus 需等 pos 生效的重渲染完成） */
  requestAnimationFrame(() => {
    updatePos();
    if (props.searchable) nextTick(() => searchRef.value?.focus());
  });
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
    zIndex: 4100,
    transform: pos.value.up ? 'translateY(-100%)' : undefined,
  }
  : { position: 'fixed', visibility: 'hidden' });

const toggle = (o: string) => {
  emit('change', props.value.includes(o) ? props.value.filter((v) => v !== o) : [...props.value, o]);
};
const toggleAll = () => emit('change', allChecked.value ? [] : [...props.options]);
</script>

<template>
  <div ref="rootRef" class="msel" :class="[{ open }, className]">
    <button type="button" class="msel-trigger" @click="open = !open">
      <span class="msel-text" :class="{ ph: !label }">{{ label || placeholder || '请选择' }}</span>
      <svg class="msel-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menuRef" class="msel-menu" :style="menuStyle">
        <div v-if="searchable" class="msel-search">
          <input ref="searchRef" v-model="search" placeholder="搜索" />
        </div>
        <div v-if="allLabel" class="msel-opt" :class="{ on: !value.length }" @click="emit('change', [])">
          <span class="msel-check">{{ value.length ? '' : '✓' }}</span>
          <span class="msel-label">{{ allLabel }}</span>
        </div>
        <div v-if="!allLabel" class="msel-head">
          <span class="msel-head-btn" @click="toggleAll">全选</span>
          <span class="msel-head-btn" @click="emit('change', [])">清空</span>
        </div>
        <div v-for="o in shown" :key="o" class="msel-opt" :class="{ on: value.includes(o) }" @click="toggle(o)">
          <span class="msel-check">{{ value.includes(o) ? '✓' : '' }}</span>
          <span class="msel-label">{{ o }}</span>
        </div>
        <div v-if="!shown.length" class="msel-empty">无匹配项</div>
      </div>
    </Teleport>
  </div>
</template>

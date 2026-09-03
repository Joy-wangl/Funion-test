<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import './BubbleSelect.css';
import './CascadeSelect.css';

export interface CascGroup {
  name: string;
  children: string[];
}

/** 级联选择：左列分组（点击展开右列），右列具体选项；顶部 allLabel 为清除项。
 *  触发器复用 .bselect 视觉，菜单 Teleport 到 body 不被容器裁剪（同 BubbleSelect） */
const props = defineProps<{
  groups: CascGroup[];
  /** 受控值（allLabel 或某个具体选项） */
  value?: string;
  allLabel?: string;
  className?: string;
}>();
const emit = defineEmits<{ (e: 'change', v: string): void }>();

const all = computed(() => props.allLabel ?? '全部');
const current = computed(() => props.value ?? '');
const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const activeGroup = ref('');
const pos = ref<{ top: number; left: number; width: number; up: boolean } | null>(null);

const activeChildren = computed(() => props.groups.find((g) => g.name === activeGroup.value)?.children ?? []);

const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const contentH = Math.max(props.groups.length + 1, ...props.groups.map((g) => g.children.length)) * 33 + 14;
  const spaceBelow = window.innerHeight - r.bottom - 6;
  const spaceAbove = r.top - 6;
  const up = contentH > spaceBelow && spaceAbove > spaceBelow;
  const width = Math.max(r.width, 120);
  const vw = window.innerWidth;
  const left = vw > 0 ? Math.max(8, Math.min(r.left, vw - width - 176)) : r.left;
  pos.value = { top: up ? r.top - 6 : r.bottom + 6, left, width, up };
};

watch(open, (v) => {
  if (!v) {
    pos.value = null;
    document.removeEventListener('mousedown', onDocDown);
    return;
  }
  /* 展开时高亮当前值所在分组，无则首组 */
  activeGroup.value = props.groups.find((g) => g.children.includes(current.value))?.name ?? props.groups[0]?.name ?? '';
  document.addEventListener('mousedown', onDocDown);
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

const pickAll = () => { emit('change', all.value); open.value = false; };
const pickChild = (c: string) => { emit('change', c); open.value = false; };
</script>

<template>
  <div ref="rootRef" class="bselect" :class="[{ open }, className]">
    <button type="button" class="bselect-trigger" @click="open = !open">
      <span class="bselect-text">{{ current }}</span>
      <svg class="bselect-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menuRef" class="casc-menu" :style="menuStyle">
        <div class="casc-col">
          <div class="casc-item" :class="{ selected: current === all }" @click="pickAll">
            <span class="casc-check">{{ current === all ? '✓' : '' }}</span>{{ all }}
          </div>
          <div
            v-for="g in groups"
            :key="g.name"
            class="casc-item group"
            :class="{ active: activeGroup === g.name }"
            @click="activeGroup = g.name"
          >
            <span>{{ g.name }}</span><i class="casc-arrow">▸</i>
          </div>
        </div>
        <div class="casc-col right">
          <div
            v-for="c in activeChildren"
            :key="c"
            class="casc-item"
            :class="{ selected: current === c }"
            @click="pickChild(c)"
          >
            <span class="casc-check">{{ current === c ? '✓' : '' }}</span>{{ c }}
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

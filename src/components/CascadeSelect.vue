<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import './BubbleSelect.css';
import './CascadeSelect.css';

export interface CascGroup {
  name: string;
  children: string[];
}

/** 级联选择：左列分组 / 右列具体选项；顶部 allLabel 为清除项。
 *  右列悬浮披露：仅悬浮到有子项的分组才展开右列；悬浮到无子项的分组或「全部」行时右列收起；
 *  菜单打开时右列默认不展开（常见级联交互）。
 *  多选模式（multiple）：一级分组与二级选项均可点选、可混选，选中集为并集语义；勾选子项时菜单不关闭，
 *  点击「全部」行=清除选中并直接关闭菜单（结果立即代入触发器）。
 *  选中态视觉与全局下拉一致：✓ 前缀 + 主色加粗，不用勾选框；组行 ✓ 点击=整组全选/反选，组行悬浮=展开右列。
 *  搜索（searchable）：菜单顶部搜索框（同 BubbleSelect 视觉），按组名/子项名模糊过滤两列；
 *  组名命中时右列展示该组全部子项，否则仅展示命中子项。
 *  触发器复用 .bselect 视觉，菜单 Teleport 到 body 不被容器裁剪（同 BubbleSelect） */
const props = defineProps<{
  groups: CascGroup[];
  /** 受控值（allLabel 或某个具体选项）；多选模式改用 values */
  value?: string;
  /** 多选模式开关 */
  multiple?: boolean;
  /** 多选受控值（一级组名 / 二级选项名混合） */
  values?: string[];
  allLabel?: string;
  className?: string;
  /** 菜单顶部内置搜索框，按组名/子项名模糊过滤（长枚举场景，同 BubbleSelect searchable） */
  searchable?: boolean;
}>();
const emit = defineEmits<{ (e: 'change', v: string): void; (e: 'multi-change', v: string[]): void }>();

const all = computed(() => props.allLabel ?? '全部');
const childrenOf = (g: string) => props.groups.find((x) => x.name === g)?.children ?? [];
/* 组级勾选态为派生值：子项全选=checked（值只存叶子，不存组名），组框点击=全选/反选该组 */
const groupAllChecked = (g: string) => {
  const cs = childrenOf(g);
  return cs.length > 0 && cs.every((c) => curVals.value.includes(c));
};
const groupSomeChecked = (g: string) => childrenOf(g).some((c) => curVals.value.includes(c));
const toggleGroup = (g: string) => {
  if (!props.multiple) return;
  const cs = childrenOf(g);
  if (groupAllChecked(g)) emit('multi-change', curVals.value.filter((v) => !cs.includes(v)));
  else emit('multi-change', [...curVals.value, ...cs.filter((c) => !curVals.value.includes(c))]);
};
const current = computed(() => props.value ?? '');
const curVals = computed(() => props.values ?? []);
/* 多选回显：整组全选折叠为组名，其余叶子逐个展示 */
const triggerText = computed(() => {
  if (!props.multiple) return current.value;
  const vals = curVals.value;
  if (!vals.length) return all.value;
  const covered = new Set<string>();
  const out: string[] = [];
  for (const g of props.groups) {
    if (g.children.length && g.children.every((c) => vals.includes(c))) {
      out.push(g.name);
      g.children.forEach((c) => covered.add(c));
    }
  }
  vals.forEach((v) => { if (!covered.has(v)) out.push(v); });
  return out.join('、');
});
const toggleVal = (v: string) => {
  emit('multi-change', curVals.value.includes(v) ? curVals.value.filter((x) => x !== v) : [...curVals.value, v]);
};
const clearMulti = () => { emit('multi-change', []); open.value = false; };
const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const activeGroup = ref('');
const searchRef = ref<HTMLInputElement | null>(null);
const search = ref('');
const pos = ref<{ top: number; left: number; up: boolean } | null>(null);

/* 搜索过滤：左列保留组名命中或有子项命中的组；右列=命中子项（组名命中时展示全组） */
const query = computed(() => search.value.trim().toLowerCase());
const shownGroups = computed(() => !query.value ? props.groups : props.groups.filter((g) =>
  g.name.toLowerCase().includes(query.value) || g.children.some((c) => c.toLowerCase().includes(query.value))));
const activeChildren = computed(() => {
  const g = props.groups.find((x) => x.name === activeGroup.value);
  if (!g) return [] as string[];
  if (!query.value || g.name.toLowerCase().includes(query.value)) return g.children;
  return g.children.filter((c) => c.toLowerCase().includes(query.value));
});
/* 右列展示条件：悬浮到的分组有子项（无子项分组/「全部」行悬浮时收起） */
const showRight = computed(() => !!activeGroup.value && activeChildren.value.length > 0);

const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const contentH = Math.max(shownGroups.value.length + 1, activeChildren.value.length) * 33 + 14 + (props.searchable ? 40 : 0);
  const spaceBelow = window.innerHeight - r.bottom - 6;
  const spaceAbove = r.top - 6;
  const up = contentH > spaceBelow && spaceAbove > spaceBelow;
  /* 菜单宽度随内容（不铺满触发器）：此处仅估算视口钳制，渲染后由 fitLeft 实测再钳 */
  const estW = showRight.value ? 340 : 190;
  const vw = window.innerWidth;
  const left = vw > 0 ? Math.max(8, Math.min(r.left, vw - estW - 8)) : r.left;
  pos.value = { top: up ? r.top - 6 : r.bottom + 6, left, up };
};
/* 菜单渲染后按实测宽度二次钳制：宽触发器（抽屉通栏）下不被估算宽度推离触发器 */
const fitLeft = () => {
  const el = rootRef.value;
  const m = menuRef.value;
  if (!el || !m || !pos.value) return;
  const r = el.getBoundingClientRect();
  const mw = m.getBoundingClientRect().width;
  const vw = window.innerWidth;
  const left = Math.max(8, Math.min(r.left, vw - mw - 8));
  if (left !== pos.value.left) pos.value = { ...pos.value, left };
};

watch(open, (v) => {
  if (!v) {
    pos.value = null;
    document.removeEventListener('mousedown', onDocDown);
    return;
  }
  /* 展开时右列默认不出现，待悬浮到有子项的分组再披露 */
  activeGroup.value = '';
  search.value = '';
  document.addEventListener('mousedown', onDocDown);
  requestAnimationFrame(() => {
    updatePos();
    nextTick(fitLeft);
    if (props.searchable) nextTick(() => searchRef.value?.focus());
  });
  window.addEventListener('resize', updatePos);
  window.addEventListener('scroll', updatePos, true);
}, { flush: 'post' });

/* 搜索过滤后选项数量变化，重新测量菜单宽度/高度 */
watch(search, () => {
  if (open.value) requestAnimationFrame(() => { updatePos(); nextTick(fitLeft); });
});

/* 右列显隐会改变菜单宽度：贴近视口右缘时重新钳制左缘 */
watch(showRight, () => {
  if (open.value) requestAnimationFrame(fitLeft);
});

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

const pickAll = () => { emit('change', all.value); open.value = false; };
const pickChild = (c: string) => { emit('change', c); open.value = false; };
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
        <div v-if="searchable" class="bselect-search casc-search">
          <input
            ref="searchRef"
            v-model="search"
            placeholder="搜索"
            @keydown.esc.stop="open = false"
          />
        </div>
        <div v-if="shownGroups.length" class="casc-cols">
          <div class="casc-col">
            <div v-if="!multiple" class="casc-item" :class="{ selected: current === all }" @click="pickAll" @mouseenter="activeGroup = ''">
              <span class="casc-check">{{ current === all ? '✓' : '' }}</span>{{ all }}
            </div>
            <div v-else class="casc-item" @click="clearMulti" @mouseenter="activeGroup = ''">
              <span class="casc-check" />{{ all }}
            </div>
            <div
              v-for="g in shownGroups"
              :key="g.name"
              class="casc-item group"
              :class="{ active: activeGroup === g.name, checked: multiple && groupAllChecked(g.name), partial: multiple && !groupAllChecked(g.name) && groupSomeChecked(g.name) }"
              @mouseenter="activeGroup = g.name"
            >
              <span
                class="casc-check" :class="{ partial: multiple && !groupAllChecked(g.name) && groupSomeChecked(g.name) }"
                :title="multiple ? '整组全选/反选' : undefined" @click.stop="toggleGroup(g.name)"
              >{{ multiple && groupSomeChecked(g.name) ? '✓' : '' }}</span>
              <span class="casc-gname">{{ g.name }}</span><i v-if="g.children.length" class="casc-arrow">▸</i>
            </div>
          </div>
          <div v-if="showRight" class="casc-col right">
            <div
              v-for="c in activeChildren"
              :key="c"
              class="casc-item"
              :class="{ selected: !multiple && current === c, checked: multiple && curVals.includes(c) }"
              @click="multiple ? toggleVal(c) : pickChild(c)"
            >
              <span class="casc-check">{{ (!multiple && current === c) || (multiple && curVals.includes(c)) ? '✓' : '' }}</span>{{ c }}
            </div>
          </div>
        </div>
        <div v-else class="bselect-empty">无匹配项</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import './BubbleSelect.css';
import './CascadeSelect.css';

export interface CascSub {
  name: string;
  children: string[];
}
export type CascChild = string | CascSub;
export interface CascGroup {
  name: string;
  children: CascChild[];
}

/** 级联选择：左列分组 / 中列具体选项 / 右列子组披露（三级可选：二级行带子项时悬浮展开第三列，如 售前›特殊要求›指定备注）。
 *  悬浮到有子项的分组才展开中列；悬浮到无子项的分组或「全部」行时中列收起；菜单打开时中列默认不展开（常见级联交互）。
 *  多选模式（multiple）：分组/子组/叶子均可点选、可混选，选中集为并集语义（值只存叶子）；勾选子项时菜单不关闭，
 *  点击「全部」行=清除选中并直接关闭菜单（结果立即代入触发器）。
 *  选中态视觉与全局下拉一致：✓ 前缀 + 主色加粗，不用勾选框；组行/子组行 ✓ 点击=整组全选/反选；
 *  披露严格跟悬浮：组行悬浮=展开中列、子组行悬浮=展开右列，悬浮到叶子行/「全部」行时下一级收起（不残留）。
 *  搜索（searchable）：菜单顶部搜索框（同 BubbleSelect 视觉），按组名/子组名/叶子名模糊过滤各列；
 *  组名或子组名命中时展示其全部下级，否则仅展示命中叶子。
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
const isSub = (c: CascChild): c is CascSub => typeof c !== 'string';
/* 组内叶子=直挂叶子+子组下叶子（勾选态/回显折叠均按叶子集计算） */
const leavesOf = (g: CascGroup) => g.children.flatMap((c) => (isSub(c) ? c.children : [c]));
const childrenOf = (g: string) => leavesOf(props.groups.find((x) => x.name === g) ?? { name: g, children: [] });
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
/* 多选回显：整组全选折叠为组名、子组全选折叠为子组名，其余叶子逐个展示 */
const triggerText = computed(() => {
  if (!props.multiple) return current.value;
  const vals = curVals.value;
  if (!vals.length) return all.value;
  const covered = new Set<string>();
  const out: string[] = [];
  for (const g of props.groups) {
    const lv = leavesOf(g);
    if (lv.length && lv.every((c) => vals.includes(c))) {
      out.push(g.name);
      lv.forEach((c) => covered.add(c));
      continue;
    }
    for (const c of g.children) {
      if (isSub(c) && c.children.length && c.children.every((x) => vals.includes(x))) {
        out.push(c.name);
        c.children.forEach((x) => covered.add(x));
      }
    }
  }
  vals.forEach((v) => { if (!covered.has(v)) out.push(v); });
  return out.join('、');
});
const toggleVal = (v: string) => {
  emit('multi-change', curVals.value.includes(v) ? curVals.value.filter((x) => x !== v) : [...curVals.value, v]);
};
/* 子组勾选态与整组同语义：子项全选=checked，✓ 点击=整子组全选/反选 */
const subAllChecked = (s: CascSub) => s.children.length > 0 && s.children.every((c) => curVals.value.includes(c));
const subSomeChecked = (s: CascSub) => s.children.some((c) => curVals.value.includes(c));
const toggleSub = (s: CascSub) => {
  if (!props.multiple) return;
  if (subAllChecked(s)) emit('multi-change', curVals.value.filter((v) => !s.children.includes(v)));
  else emit('multi-change', [...curVals.value, ...s.children.filter((c) => !curVals.value.includes(c))]);
};
const clearMulti = () => { emit('multi-change', []); open.value = false; };
const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const activeGroup = ref('');
const activeSub = ref('');
const searchRef = ref<HTMLInputElement | null>(null);
const search = ref('');
const pos = ref<{ top: number; left: number; up: boolean } | null>(null);

/* 搜索过滤：左列保留组名命中或下级（子组名/叶子）命中的组 */
const query = computed(() => search.value.trim().toLowerCase());
const entryHit = (c: CascChild, q: string) => (isSub(c)
  ? c.name.toLowerCase().includes(q) || c.children.some((x) => x.toLowerCase().includes(q))
  : c.toLowerCase().includes(q));
const shownGroups = computed(() => !query.value ? props.groups : props.groups.filter((g) =>
  g.name.toLowerCase().includes(query.value) || g.children.some((c) => entryHit(c, query.value))));
/* 中列条目：组名/子组名命中展示全下级，否则仅命中叶子（子组内叶子命中时子组行只带命中叶子） */
const activeEntries = computed<CascChild[]>(() => {
  const g = props.groups.find((x) => x.name === activeGroup.value);
  if (!g) return [];
  if (!query.value || g.name.toLowerCase().includes(query.value)) return g.children;
  return g.children.flatMap<CascChild>((c) => {
    if (!isSub(c)) return c.toLowerCase().includes(query.value) ? [c] : [];
    if (c.name.toLowerCase().includes(query.value)) return [c];
    const hit = c.children.filter((x) => x.toLowerCase().includes(query.value));
    return hit.length ? [{ name: c.name, children: hit }] : [];
  });
});
/* 右列=悬浮子组的叶子（搜索过滤后的子组同样适用） */
const subChildren = computed(() => {
  const s = activeEntries.value.find((c): c is CascSub => isSub(c) && c.name === activeSub.value);
  return s ? s.children : [];
});
/* 中列展示条件：悬浮到的分组有下级；右列展示条件：悬浮到的子组有叶子 */
const showRight = computed(() => !!activeGroup.value && activeEntries.value.length > 0);
const showThird = computed(() => !!activeSub.value && subChildren.value.length > 0);

const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const contentH = Math.max(shownGroups.value.length + 1, activeEntries.value.length, subChildren.value.length) * 33 + 14 + (props.searchable ? 40 : 0);
  const spaceBelow = window.innerHeight - r.bottom - 6;
  const spaceAbove = r.top - 6;
  const up = contentH > spaceBelow && spaceAbove > spaceBelow;
  /* 菜单宽度随内容（不铺满触发器）：此处仅估算视口钳制，渲染后由 fitLeft 实测再钳 */
  const estW = showThird.value ? 510 : showRight.value ? 340 : 190;
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
  /* 展开时中/右列默认不出现，待悬浮到有下级的分组/子组再披露 */
  activeGroup.value = '';
  activeSub.value = '';
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
watch([showRight, showThird], () => {
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
            <div v-if="!multiple" class="casc-item" :class="{ selected: current === all }" @click="pickAll" @mouseenter="activeGroup = ''; activeSub = ''">
              <span class="casc-check">{{ current === all ? '✓' : '' }}</span>{{ all }}
            </div>
            <div v-else class="casc-item" @click="clearMulti" @mouseenter="activeGroup = ''; activeSub = ''">
              <span class="casc-check" />{{ all }}
            </div>
            <div
              v-for="g in shownGroups"
              :key="g.name"
              class="casc-item group"
              :class="{ active: activeGroup === g.name, checked: multiple && groupAllChecked(g.name), partial: multiple && !groupAllChecked(g.name) && groupSomeChecked(g.name) }"
              @mouseenter="activeGroup = g.name; activeSub = ''"
            >
              <span
                class="casc-check" :class="{ partial: multiple && !groupAllChecked(g.name) && groupSomeChecked(g.name) }"
                :title="multiple ? '整组全选/反选' : undefined" @click.stop="toggleGroup(g.name)"
              >{{ multiple && groupSomeChecked(g.name) ? '✓' : '' }}</span>
              <span class="casc-gname">{{ g.name }}</span><i v-if="g.children.length" class="casc-arrow">▸</i>
            </div>
          </div>
          <div v-if="showRight" class="casc-col right">
            <template v-for="c in activeEntries" :key="isSub(c) ? c.name : c">
              <!-- 子组行：与组行同视觉（✓ 整子组全选/反选 + ▸ 悬浮披露右列） -->
              <div
                v-if="isSub(c)"
                class="casc-item group"
                :class="{ active: activeSub === c.name, checked: multiple && subAllChecked(c), partial: multiple && !subAllChecked(c) && subSomeChecked(c) }"
                @mouseenter="activeSub = c.name"
              >
                <span
                  class="casc-check" :class="{ partial: multiple && !subAllChecked(c) && subSomeChecked(c) }"
                  :title="multiple ? '整组全选/反选' : undefined" @click.stop="toggleSub(c)"
                >{{ multiple && subSomeChecked(c) ? '✓' : '' }}</span>
                <span class="casc-gname">{{ c.name }}</span><i v-if="c.children.length" class="casc-arrow">▸</i>
              </div>
              <div
                v-else
                class="casc-item"
                :class="{ selected: !multiple && current === c, checked: multiple && curVals.includes(c) }"
                @mouseenter="activeSub = ''"
                @click="multiple ? toggleVal(c) : pickChild(c)"
              >
                <span class="casc-check">{{ (!multiple && current === c) || (multiple && curVals.includes(c)) ? '✓' : '' }}</span>{{ c }}
              </div>
            </template>
          </div>
          <div v-if="showThird" class="casc-col right">
            <div
              v-for="x in subChildren"
              :key="x"
              class="casc-item"
              :class="{ selected: !multiple && current === x, checked: multiple && curVals.includes(x) }"
              @click="multiple ? toggleVal(x) : pickChild(x)"
            >
              <span class="casc-check">{{ (!multiple && current === x) || (multiple && curVals.includes(x)) ? '✓' : '' }}</span>{{ x }}
            </div>
          </div>
        </div>
        <div v-else class="bselect-empty">无匹配项</div>
      </div>
    </Teleport>
  </div>
</template>

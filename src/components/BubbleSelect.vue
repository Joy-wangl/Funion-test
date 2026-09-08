<script lang="ts">
export interface BubbleOption {
  value: string;
  label: string;
  /** 禁用项：灰色展示、不可点选（用于业务约束提示） */
  disabled?: boolean;
  /** 选项图标：星星/旗帜 内联 SVG path，颜色由 color 控制 */
  icon?: 'star' | 'flag';
  /** 选项文字与图标颜色（彩色枚举场景） */
  color?: string;
}

/* 图标 path（viewBox 24）：fill=currentColor 跟随选项颜色 */
export const BUBBLE_ICON_PATHS: Record<'star' | 'flag', string> = {
  star: 'M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21Z',
  flag: 'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6Z',
};

/* 星星/旗帜彩色枚举色集（灰红橙黄绿蓝靛紫）：下拉选项与列表图标共用 */
export const COLOR_ENUM = [
  { name: '灰色', color: '#8a919c' },
  { name: '红色', color: '#f5222d' },
  { name: '橙色', color: '#fa8c16' },
  { name: '黄色', color: '#fadb14' },
  { name: '绿色', color: '#389e0d' },
  { name: '蓝色', color: '#2f54eb' },
  { name: '靛色', color: '#531dab' },
  { name: '紫色', color: '#b026c6' },
];
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
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
  /** 菜单顶部内置搜索框，按输入模糊过滤选项（长枚举场景，如自动化标签） */
  searchable?: boolean;
  /** 可新建：菜单顶部搜索框可直接输入，输入未命中现有选项时列表底部出现「＋ 新建「xx」」，点选/回车即 change 抛出新值（是否并入选项列表由使用方决定） */
  creatable?: boolean;
  /** 可改名：选项 hover 尾部出铅笔，点击切换行内输入行，回车/确认抛 rename(old, new)（同步范围由使用方决定） */
  renamable?: boolean;
}>();
const emit = defineEmits<{ (e: 'change', value: string): void; (e: 'rename', oldValue: string, newValue: string): void }>();

const norm = (o: string | BubbleOption): BubbleOption =>
  typeof o === 'string' ? { value: o, label: o } : o;

const opts = computed(() => props.options.map(norm));
const inner = ref(props.defaultValue ?? (opts.value[0]?.value ?? ''));
const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const search = ref('');
/* 模糊搜索：子串包含（不区分大小写）过滤；creatable 复用同一搜索框兼作新建输入 */
const canSearch = computed(() => props.searchable || props.creatable);
const shownOpts = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!canSearch.value || !q) return opts.value;
  return opts.value.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
});
/* 新建候选：输入非空且未精确命中现有选项时，列表底部给出「＋ 新建「xx」」 */
const createQuery = computed(() => {
  const q = search.value.trim();
  if (!props.creatable || !q) return '';
  return opts.value.some((o) => o.value === q || o.label === q) ? '' : q;
});
const pos = ref<{ top: number; left: number; width: number; up: boolean; maxH: number } | null>(null);

const current = computed(() => props.value !== undefined ? props.value : inner.value);
const currentLabel = computed(() => opts.value.find((o) => o.value === current.value)?.label ?? current.value);
const currentOpt = computed(() => opts.value.find((o) => o.value === current.value));
/* 当前值不在选项中 → 视为功能标题占位，灰色展示且不可作为选择项 */
const isPlaceholder = computed(() => !opts.value.some((o) => o.value === current.value));

/* 浮层设计理念：菜单 Teleport 到 body、fixed 定位，永不被弹窗/抽屉等 overflow 容器裁剪；
   下方空间不足时自动向上展开，滚动/缩放时跟随触发器重新定位 */
const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  /* 选项自然高度（opt 约 33px + 菜单 padding 12 + 上下边框 2，搜索框约 40px，新建候选行约 33px），避免 border-box 下 2px 溢出滚动条 */
  const contentH = shownOpts.value.length * 33 + 12 + 2 + (canSearch.value ? 40 : 0) + (createQuery.value ? 33 : 0);
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
  if (!v) { pos.value = null; renaming.value = null; renameText.value = ''; return; }
  search.value = '';
  /* 渲染后测量，等价 React useLayoutEffect；搜索/可新建菜单自动聚焦搜索框
     （focus 需等 pos 生效的重渲染完成，visibility:hidden 下 focus 无效） */
  requestAnimationFrame(() => {
    updatePos();
    if (canSearch.value) nextTick(() => searchRef.value?.focus());
  });
  window.addEventListener('resize', updatePos);
  window.addEventListener('scroll', updatePos, true);
}, { flush: 'post' });

/* 搜索过滤后选项数量变化，重新测量菜单高度 */
watch(search, () => {
  if (open.value) requestAnimationFrame(updatePos);
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
    /* 浮层 Teleport 到 body，层级需高于抽屉（ap-drawer 2801）/气泡（ap-bubble 4000）等容器 */
    zIndex: 4100,
    transform: pos.value.up ? 'translateY(-100%)' : undefined,
  }
  : { position: 'fixed', visibility: 'hidden' });

const pickOpt = (o: BubbleOption) => {
  if (o.disabled) return;
  /* 改名输入中：行点击不触发选中，避免误选 */
  if (renaming.value) return;
  if (props.value === undefined) inner.value = o.value;
  emit('change', o.value);
  open.value = false;
};

/* 修改已有类型：选项 hover 铅笔 → 行内输入行（回车/确认提交，Esc 取消） */
const renaming = ref<string | null>(null);
const renameText = ref('');
const renameRef = ref<HTMLInputElement | null>(null);
/* 输入行在 v-for 内：字符串 ref 会收成数组，用函数 ref 拿单元素（参数取 unknown 满足 VNodeRef 逆变） */
const setRenameRef = (el: unknown) => { renameRef.value = el as HTMLInputElement | null; };
const startRename = (o: BubbleOption) => {
  renaming.value = o.value;
  renameText.value = o.label;
  nextTick(() => renameRef.value?.focus());
};
const cancelRename = () => { renaming.value = null; renameText.value = ''; };
const confirmRename = (o: BubbleOption) => {
  const v = renameText.value.trim();
  if (!v || v === o.value) { cancelRename(); return; }
  renaming.value = null;
  renameText.value = '';
  emit('rename', o.value, v);
};

/* 新建类型：搜索框输入未命中 → 底部「＋ 新建「xx」」；回车优先精确命中选项，否则创建 */
const confirmCreate = (v: string) => {
  if (!v) return;
  search.value = '';
  open.value = false;
  emit('change', v);
};
const onSearchEnter = () => {
  const q = search.value.trim();
  if (!q) return;
  const exact = opts.value.find((o) => o.value === q || o.label === q);
  if (exact) { pickOpt(exact); return; }
  if (createQuery.value) confirmCreate(q);
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
      <span class="bselect-text" :class="{ ph: isPlaceholder }">
        <svg
          v-if="currentOpt?.icon"
          class="bselect-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          :style="{ color: currentOpt.color }"
          aria-hidden="true"
        ><path :d="BUBBLE_ICON_PATHS[currentOpt.icon]" fill="currentColor" /></svg>
        <span :style="currentOpt?.color ? { color: currentOpt.color } : undefined">{{ currentLabel }}</span>
      </span>
      <svg class="bselect-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menuRef" class="bselect-menu" :style="menuStyle">
        <div v-if="canSearch" class="bselect-search">
          <input
            ref="searchRef"
            v-model="search"
            :placeholder="creatable ? '搜索或输入新类型' : '搜索'"
            @keydown.enter="onSearchEnter"
            @keydown.esc.stop="open = false"
          />
        </div>
        <div
          v-for="o in shownOpts"
          :key="o.value || o.label"
          class="bselect-opt"
          :class="{ selected: o.value === current, disabled: o.disabled }"
          @click="pickOpt(o)"
        >
          <template v-if="renaming === o.value">
            <div class="bselect-rename-form" @click.stop>
              <input
                :ref="setRenameRef"
                v-model="renameText"
                @keydown.enter="confirmRename(o)"
                @keydown.esc.stop="cancelRename"
              />
              <button type="button" @click.stop="confirmRename(o)">确认</button>
            </div>
          </template>
          <template v-else>
            <span class="bselect-check">{{ o.value === current ? '✓' : '' }}</span>
            <svg
              v-if="o.icon"
              class="bselect-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              :style="{ color: o.color }"
              aria-hidden="true"
            ><path :d="BUBBLE_ICON_PATHS[o.icon]" fill="currentColor" /></svg>
            <span class="bselect-label" :style="o.color ? { color: o.color } : undefined">{{ o.label }}</span>
            <span v-if="renamable && !o.disabled" class="bselect-rename" title="修改类型" @click.stop="startRename(o)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
            </span>
          </template>
        </div>
        <div v-if="!shownOpts.length && !createQuery" class="bselect-empty">无匹配项</div>
        <div v-if="createQuery" class="bselect-create" @click="confirmCreate(createQuery)">
          <span class="bselect-create-plus">＋</span>新建「{{ createQuery }}」
        </div>
      </div>
    </Teleport>
  </div>
</template>

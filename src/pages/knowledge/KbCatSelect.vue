<script setup lang="ts">
/* 类目三级级联多选下拉（知识库条件查询用）：气泡式浮层视觉 token 同 BubbleSelect（白底圆角菜单/搜索框/悬浮浅底）；
   默认三列级联（点列内名称逐级下钻、复选框任意级多选）；输入搜索切换为扁平全路径多选列表 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';

const props = defineProps<{
  /** 类目全路径集合（三级数组，使用方去重） */
  paths: string[][];
  /** 已选路径（受控；可为任意层级路径，筛选按前缀匹配） */
  value: string[][];
}>();
const emit = defineEmits<{ (e: 'change', value: string[][]): void }>();

const open = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const searchRef = ref<HTMLInputElement | null>(null);
const search = ref('');

/* ---------- 三列级联：二级选项随活跃一级、三级随活跃二级 ---------- */
const lv1 = computed(() => [...new Set(props.paths.map((p) => p[0]))]);
const act1 = ref('');
const cur1 = computed(() => (lv1.value.includes(act1.value) ? act1.value : lv1.value[0] ?? ''));
const lv2 = computed(() => [...new Set(props.paths.filter((p) => p[0] === cur1.value).map((p) => p[1]))]);
const act2 = ref('');
const cur2 = computed(() => (lv2.value.includes(act2.value) ? act2.value : lv2.value[0] ?? ''));
const lv3 = computed(() => [...new Set(props.paths.filter((p) => p[0] === cur1.value && p[1] === cur2.value).map((p) => p[2]))]);

/* ---------- 搜索：任意级节点子串命中 → 扁平全路径列表（去重） ---------- */
const flatHits = computed(() => {
  const q = search.value.trim();
  if (!q) return [];
  const out: string[][] = [];
  const seen = new Set<string>();
  for (const p of props.paths) {
    for (let i = 1; i <= 3; i += 1) {
      if (p[i - 1]?.includes(q)) {
        const path = p.slice(0, i);
        const k = path.join('/');
        if (!seen.has(k)) { seen.add(k); out.push(path); }
      }
    }
  }
  return out;
});

/* ---------- 多选：勾选=路径精确存在；toggle 增删（前缀匹配语义由筛选侧处理） ---------- */
const samePath = (a: string[], b: string[]) => a.length === b.length && a.every((c, i) => c === b[i]);
const isChecked = (path: string[]) => props.value.some((v) => samePath(v, path));
const toggle = (path: string[]) => {
  emit('change', isChecked(path) ? props.value.filter((v) => !samePath(v, path)) : [...props.value, path]);
};

/* 触发器摘要：未选=占位灰字；已选=首条全路径 + 等 N 项 */
const summary = computed(() => {
  if (!props.value.length) return '';
  const first = props.value[0].join(' / ');
  return props.value.length > 1 ? `${first} 等 ${props.value.length} 项` : first;
});

/* ---------- 浮层定位：同 BubbleSelect 策略（fixed、下方不足向上翻、滚动/缩放跟随） ---------- */
const pos = ref<{ top: number; left: number; width: number; up: boolean; maxH: number } | null>(null);
const updatePos = () => {
  const el = rootRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  /* 内容高：搜索框约 40 + 列区最大 240 + 菜单 padding 12 + 边框 2 */
  const contentH = 40 + 240 + 12 + 2;
  const spaceBelow = window.innerHeight - r.bottom - 6;
  const spaceAbove = r.top - 6;
  const up = contentH > spaceBelow && spaceAbove > spaceBelow;
  const maxH = Math.max(160, Math.min(contentH, up ? spaceAbove : spaceBelow));
  /* 三列级联需要最小宽度，窄触发器时向外扩 */
  const width = Math.max(r.width, 432);
  const vw = window.innerWidth;
  const left = vw > 0 ? Math.max(8, Math.min(r.left, vw - width - 8)) : r.left;
  pos.value = { top: up ? r.top - 6 : r.bottom + 6, left, width, up, maxH };
};
watch(open, (v) => {
  if (!v) { pos.value = null; return; }
  search.value = '';
  requestAnimationFrame(() => {
    updatePos();
    nextTick(() => searchRef.value?.focus());
  });
  window.addEventListener('resize', updatePos);
  window.addEventListener('scroll', updatePos, true);
}, { flush: 'post' });
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
    /* 与 BubbleSelect 菜单同层：高于抽屉/弹窗容器 */
    zIndex: 4100,
    transform: pos.value.up ? 'translateY(-100%)' : undefined,
  }
  : { position: 'fixed', visibility: 'hidden' });
</script>

<template>
  <div ref="rootRef" class="kbcat" :class="{ open }">
    <button type="button" class="kbcat-trigger" @click="open = !open">
      <span class="kbcat-text" :class="{ ph: !summary }">{{ summary || '请选择类目' }}</span>
      <svg class="kbcat-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="open" ref="menuRef" class="kbcat-menu" :style="menuStyle">
        <div class="kbcat-search">
          <input ref="searchRef" v-model="search" placeholder="搜索类目" @keydown.esc.stop="open = false" />
        </div>
        <!-- 搜索态：扁平全路径多选列表 -->
        <div v-if="search.trim()" class="kbcat-flat">
          <div v-for="p in flatHits" :key="p.join('/')" class="kbcat-opt">
            <button type="button" class="kbcat-box" :class="{ on: isChecked(p) }" @click.stop="toggle(p)">
              <svg v-if="isChecked(p)" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </button>
            <span class="kbcat-label" @click="toggle(p)">{{ p.join(' / ') }}</span>
          </div>
          <div v-if="!flatHits.length" class="kbcat-empty">无匹配类目</div>
        </div>
        <!-- 默认态：三列级联（复选框多选任意级；点名称下钻下一级） -->
        <div v-else class="kbcat-cols">
          <div class="kbcat-col">
            <div v-for="c in lv1" :key="c" class="kbcat-opt" :class="{ active: c === cur1 }">
              <button type="button" class="kbcat-box" :class="{ on: isChecked([c]) }" @click.stop="toggle([c])">
                <svg v-if="isChecked([c])" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
              <span class="kbcat-label" @click="act1 = c; act2 = ''">{{ c }}</span>
              <svg class="kbcat-next" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </div>
          </div>
          <div class="kbcat-col">
            <div v-for="c in lv2" :key="c" class="kbcat-opt" :class="{ active: c === cur2 }">
              <button type="button" class="kbcat-box" :class="{ on: isChecked([cur1, c]) }" @click.stop="toggle([cur1, c])">
                <svg v-if="isChecked([cur1, c])" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
              <span class="kbcat-label" @click="act2 = c">{{ c }}</span>
              <svg class="kbcat-next" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </div>
          </div>
          <div class="kbcat-col">
            <div v-for="c in lv3" :key="c" class="kbcat-opt">
              <button type="button" class="kbcat-box" :class="{ on: isChecked([cur1, cur2, c]) }" @click.stop="toggle([cur1, cur2, c])">
                <svg v-if="isChecked([cur1, cur2, c])" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
              <span class="kbcat-label">{{ c }}</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

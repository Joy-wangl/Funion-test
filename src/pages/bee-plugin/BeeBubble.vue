<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { pushToast } from '../../components/toast';

defineProps<{
  loggedIn: boolean;
  userName: string;
  aiLoggedIn: boolean;
}>();
const emit = defineEmits<{
  (e: 'nav', view: 'products' | 'shops' | 'tasks' | 'strategy' | 'aigallery'): void;
  (e: 'login'): void;
  (e: 'switch'): void;
  (e: 'logout'): void;
}>();

const collapsed = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const pos = ref({ x: 24, y: 48 });
/* 二级菜单展开方向：气泡靠左时向右展，靠右时向左展，保证任何位置都可用 */
const subSide = ref<'left' | 'right'>('left');
/* 二级菜单延迟关闭：离开一级菜单后保留 280ms，斜向移动/穿越间隙不断 hover */
const openSub = ref<'' | 'products' | 'shops'>('');
let subTimer = 0;
const openSubNow = (k: 'products' | 'shops') => { window.clearTimeout(subTimer); openSub.value = k; };
const closeSubSoon = () => { window.clearTimeout(subTimer); subTimer = window.setTimeout(() => { openSub.value = ''; }, 280); };
/* 拖拽位移标记：拖动过后抑制 click，避免拖完误触展开/收起 */
let dragMoved = false;

/* 根据气泡在宿主内的水平空间决定菜单方向，并顺带钳制越界位置（resize 时同样生效） */
const updateSide = () => {
  const el = rootRef.value;
  const host = el?.parentElement;
  if (!el || !host) return;
  const r = el.getBoundingClientRect();
  pos.value = {
    x: Math.max(8, Math.min(pos.value.x, host.clientWidth - r.width - 8)),
    y: Math.max(8, Math.min(pos.value.y, host.clientHeight - r.height - 8)),
  };
  const leftSpace = pos.value.x;
  const rightSpace = host.clientWidth - pos.value.x - r.width;
  subSide.value = leftSpace >= rightSpace ? 'left' : 'right';
};

onMounted(() => {
  const host = rootRef.value?.parentElement;
  if (host) pos.value = { x: Math.max(12, host.clientWidth - 212 - 28), y: 48 };
  updateSide();
  window.addEventListener('resize', updateSide);
});
onBeforeUnmount(() => { window.removeEventListener('resize', updateSide); window.clearTimeout(subTimer); });

/* 拖拽：按住标题栏（展开态）/ 圆标（收起态）移动，限制在插件区域内 */
const startDrag = (e: PointerEvent) => {
  const el = rootRef.value;
  const host = el?.parentElement;
  /* 仅排除交互控件（收起钮、链接），收起态圆标整体可拖 */
  if (!el || !host || (e.target as HTMLElement).closest('.bee-b-fold, a')) return;
  e.preventDefault();
  dragMoved = false;
  const hr = host.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const dx = e.clientX - r.left;
  const dy = e.clientY - r.top;
  const move = (ev: PointerEvent) => {
    dragMoved = true;
    const x = Math.max(8, Math.min(ev.clientX - hr.left - dx, hr.width - r.width - 8));
    const y = Math.max(8, Math.min(ev.clientY - hr.top - dy, hr.height - r.height - 8));
    pos.value = { x, y };
    updateSide();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    setTimeout(() => { dragMoved = false; }, 0);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
};

/* 展开：从圆标恢复时按展开尺寸重新钳制，避免超出容器右缘/底缘 */
const expand = () => {
  if (dragMoved) return;
  collapsed.value = false;
  nextTick(() => {
    const el = rootRef.value;
    const host = el?.parentElement;
    if (!el || !host) return;
    const hr = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    pos.value = {
      x: Math.max(8, Math.min(pos.value.x, hr.width - r.width - 8)),
      y: Math.max(8, Math.min(pos.value.y, hr.height - r.height - 8)),
    };
    updateSide();
  });
};

const soon = (msg: string) => pushToast(msg);

const onSub = (item: string) => {
  if (dragMoved) return;
  switch (item) {
    case '选品列表': emit('nav', 'products'); break;
    default: soon(`演示环境：「${item}」即将上线`);
  }
};
</script>

<template>
  <div
    ref="rootRef"
    class="bee-bubble"
    :class="{ collapsed, 'sub-right': subSide === 'right' }"
    :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
  >
    <!-- 收起态：圆形 logo，可拖动可展开 -->
    <button
      v-if="collapsed"
      class="bee-b-mini"
      title="展开蜜蜂搬家"
      @pointerdown="startDrag"
      @click="expand"
    >
      <span class="bee-logo">🐝</span>
    </button>

    <template v-else>
      <!-- 标题栏：拖拽手柄 -->
      <div class="bee-b-head" @pointerdown="startDrag">
        <span class="bee-logo">🐝</span>
        <div class="bee-b-brand">
          <b>蜜蜂搬家</b>
          <i>bee.funion.com</i>
        </div>
      </div>

      <button class="bee-b-fold" title="收起气泡" @click="collapsed = true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6" /></svg>
      </button>

      <div class="bee-b-menu">
        <!-- 选品库 -->
        <div class="bee-mitem has-sub" :class="{ open: openSub === 'products' }" @mouseenter="openSubNow('products')" @mouseleave="closeSubSoon">
          <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-1.5 10.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 9z" /><path d="M8 9V7a4 4 0 0 1 8 0v2" /></svg>
          <span>选品库</span>
          <i class="bee-m-arrow">›</i>
          <div class="bee-sub" @click="openSub = ''">
            <b>选品库</b>
            <a v-for="s in ['选品列表']" :key="s" @click="onSub(s)">{{ s }}</a>
          </div>
        </div>

        <!-- 策略管理：铺货快速定价，按平台区分配置 -->
        <div class="bee-mitem" @click="emit('nav', 'strategy')">
          <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M19 7h1" /><circle cx="16" cy="7" r="2.4" /><path d="M4 17h1M11 17h9" /><circle cx="8" cy="17" r="2.4" /></svg>
          <span>策略管理</span>
        </div>

        <!-- 任务管理：商品维度铺货任务 -->
        <div class="bee-mitem" @click="emit('nav', 'tasks')">
          <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h6M9 5a3 3 0 0 1 6 0M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h4" /></svg>
          <span>任务管理</span>
        </div>

        <!-- 店铺管理 -->
        <div class="bee-mitem" @click="emit('nav', 'shops')">
          <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l1.2-5h13.6L20 10" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /><path d="M4 10h16" /></svg>
          <span>店铺管理</span>
        </div>

        <!-- AI图库：AI 生成商品图素材，独立账号体系 -->
        <div class="bee-mitem" @click="emit('nav', 'aigallery')">
          <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="9" cy="11" r="1.8" /><path d="M3 17l5-4 4 3 4-4 5 5" /><path d="M17.5 2.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" /></svg>
          <span>AI图库</span>
          <i class="bee-m-state" :class="{ on: aiLoggedIn }">{{ aiLoggedIn ? '已登录' : '未登录' }}</i>
        </div>

        <div class="bee-b-div" />

        <!-- 登录状态展示：未登录 → 扫码入口；已登录 → 切换/退出 -->
        <div v-if="!loggedIn" class="bee-mitem bee-m-login" @click="emit('login')">
          <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /><path d="M13 17l2.5-2.5L17 16" /></svg>
          <span>钉钉扫码登录</span>
          <i class="bee-m-state">未登录</i>
        </div>
        <div v-else class="bee-mitem bee-m-user">
          <span class="bee-m-ava">{{ userName.slice(0, 1) }}</span>
          <span class="bee-m-name"><i class="bee-dot" />{{ userName }}</span>
          <a class="bee-m-out" @click="emit('switch')">切换</a>
          <a class="bee-m-out" @click="emit('logout')">退出</a>
        </div>
      </div>

      <div class="bee-b-foot">
        <span>v1.0.0</span>
      </div>
    </template>
  </div>
</template>

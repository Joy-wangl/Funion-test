<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';
import type { BeeProduct } from '../bee-plugin/data';
import BeeLogin from '../bee-plugin/BeeLogin.vue';
import BeeAiGallery from '../bee-plugin/BeeAiGallery.vue';
import FSProducts from './FSProducts.vue';
import '../bee-plugin/BeePlugin.css';
import './FunionS.css';

/* Funion s：只做两件事——选品、AI美化；登录走插件本身，无策略/任务/店铺与 AI图库独立账号 */
type FSView = 'none' | 'login' | 'products' | 'ai';

const loggedIn = ref(false);
const userName = ref('');
const view = ref<FSView>('none');
/* 选品库行内「AI美化」直达工作台时预置的商品 */
const aiProduct = ref<BeeProduct | null>(null);

/* ESC 关闭当前弹窗；内层小弹窗（我的商品 picker）打开时优先交给内层 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (document.querySelector('.fs-plugin .bee-mask:not(.dialog)')) return;
  if (view.value !== 'none') view.value = 'none';
};

/* 未登录拦截：引导到插件自身登录（AI美化不另设账号体系） */
const guard = (v: 'products' | 'ai', p: BeeProduct | null = null) => {
  if (!loggedIn.value) {
    view.value = 'login';
    return;
  }
  aiProduct.value = p;
  view.value = v;
};

const onLogin = (u: string) => {
  loggedIn.value = true;
  userName.value = u;
  view.value = 'products';
  pushToast(`欢迎回来，${u}`, 'info');
};

const onLogout = () => {
  loggedIn.value = false;
  userName.value = '';
  view.value = 'none';
  pushToast('已退出登录', 'info');
};

/* ── 悬浮气泡：独立页面默认停靠右上，可拖拽，钳制在宿主内 ── */
const collapsed = ref(false);
const rootRef = ref<HTMLDivElement | null>(null);
const pos = ref({ x: 24, y: 48 });
let dragMoved = false;

const clampPos = () => {
  const el = rootRef.value;
  const host = el?.parentElement;
  if (!el || !host) return;
  const r = el.getBoundingClientRect();
  pos.value = {
    x: Math.max(8, Math.min(pos.value.x, host.clientWidth - r.width - 8)),
    y: Math.max(8, Math.min(pos.value.y, host.clientHeight - r.height - 8)),
  };
};

/* 拖拽：按住标题栏（展开态）/ 圆标（收起态）移动，限制在宿主区域内 */
const startDrag = (e: PointerEvent) => {
  const el = rootRef.value;
  const host = el?.parentElement;
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
  nextTick(clampPos);
};

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  const host = rootRef.value?.parentElement;
  if (host) pos.value = { x: Math.max(12, host.clientWidth - 212 - 28), y: 48 };
  clampPos();
  window.addEventListener('resize', clampPos);
});

/* AI美化工作台打开时气泡自动停靠右下，避免遮挡右栏算力入口 */
watch(view, async (v) => {
  if (v !== 'ai') return;
  await nextTick();
  const el = rootRef.value;
  const host = el?.parentElement;
  if (!el || !host) return;
  const r = el.getBoundingClientRect();
  pos.value = {
    x: Math.max(8, host.clientWidth - r.width - 16),
    y: Math.max(8, host.clientHeight - r.height - 16),
  };
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', clampPos);
});
</script>

<template>
  <div class="fs-plugin">
    <!-- 登录弹窗：插件自身登录（钉钉扫码 / 账号密码），无 AI图库独立账号 -->
    <div v-if="view === 'login'" class="bee-mask dialog" @click.self="view = 'none'">
      <BeeLogin tone="fs" brand="Funion s" slogan="选品 · AI美化 轻量插件" demo-user="FS用户" @success="onLogin" @close="view = 'none'" />
    </div>

    <!-- 选品库弹窗：只做选品，无任何铺货/发布 -->
    <div v-if="loggedIn && view === 'products'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog">
        <FSProducts @close="view = 'none'" @beautify="(p) => guard('ai', p)" />
      </div>
    </div>

    <!-- AI美化弹窗：复用 AI画图工作台，跟随插件登录态，不显示独立退出 -->
    <div v-if="loggedIn && view === 'ai'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog wide">
        <BeeAiGallery tone="fs" :user-name="userName" :initial="aiProduct" :show-logout="false" @close="view = 'none'" />
      </div>
    </div>

    <!-- 悬浮气泡：独立页面默认停靠右上 -->
    <div
      ref="rootRef"
      class="bee-bubble fs-bubble"
      :class="{ collapsed }"
      :style="{ left: `${pos.x}px`, top: `${pos.y}px` }"
    >
      <!-- 收起态：圆形 logo，可拖动可展开 -->
      <button
        v-if="collapsed"
        class="bee-b-mini"
        title="展开 Funion s"
        @pointerdown="startDrag"
        @click="expand"
      >
        <span class="bee-logo fs">S</span>
      </button>

      <template v-else>
        <!-- 标题栏：拖拽手柄 -->
        <div class="bee-b-head" @pointerdown="startDrag">
          <span class="bee-logo fs">S</span>
          <div class="bee-b-brand">
            <b>Funion s</b>
            <i>s.funion.com</i>
          </div>
        </div>

        <button class="bee-b-fold" title="收起气泡" @click="collapsed = true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6" /></svg>
        </button>

        <div class="bee-b-menu">
          <!-- 选品库 -->
          <div class="bee-mitem" @click="guard('products')">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-1.5 10.5a2 2 0 0 1-2 1.5h-9a2 2 0 0 1-2-1.5L4 9z" /><path d="M8 9V7a4 4 0 0 1 8 0v2" /></svg>
            <span>选品库</span>
          </div>

          <!-- AI美化 -->
          <div class="bee-mitem" @click="guard('ai')">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4l1.7 4.1 4.1 1.7-4.1 1.7L11 15.6l-1.7-4.1-4.1-1.7 4.1-1.7z" /><path d="M18.5 14.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" /></svg>
            <span>AI美化</span>
          </div>

          <div class="bee-b-div" />

          <!-- 登录状态：未登录 → 登录入口；已登录 → 用户行（悬浮显现退出） -->
          <div v-if="!loggedIn" class="bee-mitem bee-m-login" @click="view = 'login'">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /><path d="M13 17l2.5-2.5L17 16" /></svg>
            <span>登录</span>
            <i class="bee-m-state">未登录</i>
          </div>
          <div v-else class="bee-mitem bee-m-user">
            <span class="bee-m-ava">{{ userName.slice(0, 1) }}</span>
            <span class="bee-m-name"><i class="bee-dot" />{{ userName }}</span>
            <a class="bee-m-out" @click="onLogout">退出</a>
          </div>
        </div>

        <div class="bee-b-foot">
          <span>v1.0.0</span>
        </div>
      </template>
    </div>
  </div>
</template>

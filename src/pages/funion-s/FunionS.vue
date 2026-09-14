<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';
import type { BeeProduct } from '../bee-plugin/data';
import BeeLogin from '../bee-plugin/BeeLogin.vue';
import BeeProducts from '../bee-plugin/BeeProducts.vue';
import BeeShops from '../bee-plugin/BeeShops.vue';
import BeeTasks from '../bee-plugin/BeeTasks.vue';
import BeeStrategy from '../bee-plugin/BeeStrategy.vue';
import BeeAiGallery from '../bee-plugin/BeeAiGallery.vue';
import '../bee-plugin/BeePlugin.css';
import './FunionS.css';

/* Funion s：蜜蜂搬家功能全集搬入（选品铺货 / 店铺 / 任务 / 策略 / AI美化），与蜜蜂插件同源数据与交互，仅品牌配色与气泡默认位不同 */
type FSView = 'none' | 'login' | 'products' | 'shops' | 'tasks' | 'strategy' | 'ai';

const loggedIn = ref(false);
const userName = ref('');
const view = ref<FSView>('none');
/* 选品库行内「AI美化」直达工作台时预置的商品 */
const aiProduct = ref<BeeProduct | null>(null);

/* 弹窗态脏态离开守卫：与蜜蜂搬家同约定——子弹窗 defineExpose leaveHint（null=可直接离开），
   气泡切路由、退出、切换账号、ESC、关闭遮罩前统一二次确认 */
type LeaveHint = { title: string; msg: string; ok: string; cancel?: string };
const productsRef = ref<InstanceType<typeof BeeProducts> | null>(null);
const strategyRef = ref<InstanceType<typeof BeeStrategy> | null>(null);
const aiRef = ref<InstanceType<typeof BeeAiGallery> | null>(null);
const currentHint = (): LeaveHint | null => {
  if (view.value === 'products') return productsRef.value?.leaveHint?.() ?? null;
  if (view.value === 'strategy') return strategyRef.value?.leaveHint?.() ?? null;
  if (view.value === 'ai') return aiRef.value?.leaveHint?.() ?? null;
  return null;
};
const pending = ref<{ hint: LeaveHint; run: () => void } | null>(null);
const guarded = (run: () => void) => {
  const hint = currentHint();
  if (hint) pending.value = { hint, run };
  else run();
};
const confirmLeave = () => { const p = pending.value; pending.value = null; p?.run(); };

/* ESC 关闭当前弹窗；二次确认 / 内层小弹窗（我的商品 picker / 添加店铺等）打开时优先交给它们 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (pending.value) { pending.value = null; return; }
  if (document.querySelector('.fs-plugin .bee-mask:not(.dialog)')) return;
  if (view.value !== 'none') guarded(() => { view.value = 'none'; });
};

/* 未登录拦截：引导到插件自身登录（AI美化不另设账号体系） */
const guard = (v: 'products' | 'shops' | 'tasks' | 'strategy' | 'ai', p: BeeProduct | null = null) => {
  if (!loggedIn.value) {
    view.value = 'login';
    return;
  }
  aiProduct.value = p;
  guarded(() => { view.value = v; });
};

const onLogin = (u: string) => {
  const switching = loggedIn.value;
  loggedIn.value = true;
  userName.value = u;
  view.value = 'products';
  pushToast(switching ? `已切换至账号：${u}` : `欢迎回来，${u}`, 'info');
};

const onLogout = () => guarded(() => {
  loggedIn.value = false;
  userName.value = '';
  view.value = 'none';
  pushToast('已退出登录', 'info');
});
/* 切换账号：同样可能中断当前脏态弹窗，走守卫 */
const onSwitch = () => guarded(() => {
  view.value = 'login';
  pushToast('请使用新账号扫码，成功后将切换登录', 'info');
});

/* 供 App 顶层切换顶部 tab / 全局跳转前读取：当前视图脏态提示（null=可直接离开） */
defineExpose({ leaveHint: currentHint });

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
    <!-- 登录弹窗：插件自身登录（钉钉扫码 / 账号密码） -->
    <div v-if="view === 'login'" class="bee-mask dialog" @click.self="view = 'none'">
      <BeeLogin tone="fs" brand="Funion s" slogan="选品 / 铺货 / 店铺 / 策略 / AI美化 一站式" demo-user="FS用户" @success="onLogin" @close="view = 'none'" />
    </div>

    <!-- 选品库弹窗：完整选品铺货（详情编辑 / 单条发布 / 批量铺货 / 删除），行内 AI美化 直达工作台 -->
    <div v-if="loggedIn && view === 'products'" class="bee-mask dialog" @click.self="guarded(() => { view = 'none'; })">
      <div class="bee-dialog">
        <BeeProducts
          ref="productsRef"
          tone="fs"
          :user-name="userName"
          @close="guarded(() => { view = 'none'; })"
          @beautify="(p) => guard('ai', p)"
        />
      </div>
    </div>

    <!-- 店铺管理弹窗：平台店铺登录态 / 授权信息 -->
    <div v-if="loggedIn && view === 'shops'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog">
        <BeeShops tone="fs" @close="view = 'none'" />
      </div>
    </div>

    <!-- 任务管理弹窗：铺货任务与子任务重试 -->
    <div v-if="loggedIn && view === 'tasks'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog">
        <BeeTasks tone="fs" @close="view = 'none'" />
      </div>
    </div>

    <!-- 策略管理弹窗：铺货快速定价，按平台区分配置 -->
    <div v-if="loggedIn && view === 'strategy'" class="bee-mask dialog" @click.self="guarded(() => { view = 'none'; })">
      <div class="bee-dialog">
        <BeeStrategy ref="strategyRef" tone="fs" @close="guarded(() => { view = 'none'; })" />
      </div>
    </div>

    <!-- AI美化弹窗：复用 AI画图工作台，跟随插件登录态，不显示独立退出 -->
    <div v-if="loggedIn && view === 'ai'" class="bee-mask dialog" @click.self="guarded(() => { view = 'none'; })">
      <div class="bee-dialog wide">
        <BeeAiGallery ref="aiRef" tone="fs" :user-name="userName" :initial="aiProduct" :show-logout="false" @close="guarded(() => { view = 'none'; })" />
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

          <!-- 策略管理：铺货快速定价，按平台区分配置 -->
          <div class="bee-mitem" @click="guard('strategy')">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M19 7h1" /><circle cx="16" cy="7" r="2.4" /><path d="M4 17h1M11 17h9" /><circle cx="8" cy="17" r="2.4" /></svg>
            <span>策略管理</span>
          </div>

          <!-- 任务管理：商品维度铺货任务 -->
          <div class="bee-mitem" @click="guard('tasks')">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h6M9 5a3 3 0 0 1 6 0M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h4" /></svg>
            <span>任务管理</span>
          </div>

          <!-- 店铺管理 -->
          <div class="bee-mitem" @click="guard('shops')">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10l1.2-5h13.6L20 10" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /><path d="M4 10h16" /></svg>
            <span>店铺管理</span>
          </div>

          <!-- AI美化 -->
          <div class="bee-mitem" @click="guard('ai')">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4l1.7 4.1 4.1 1.7-4.1 1.7L11 15.6l-1.7-4.1-4.1-1.7 4.1-1.7z" /><path d="M18.5 14.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" /></svg>
            <span>AI美化</span>
          </div>

          <div class="bee-b-div" />

          <!-- 登录状态：未登录 → 登录入口；已登录 → 用户行（悬浮显现切换/退出） -->
          <div v-if="!loggedIn" class="bee-mitem bee-m-login" @click="view = 'login'">
            <svg class="bee-m-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /><path d="M13 17l2.5-2.5L17 16" /></svg>
            <span>登录</span>
            <i class="bee-m-state">未登录</i>
          </div>
          <div v-else class="bee-mitem bee-m-user">
            <span class="bee-m-ava">{{ userName.slice(0, 1) }}</span>
            <span class="bee-m-name"><i class="bee-dot" />{{ userName }}</span>
            <a class="bee-m-out" @click="onSwitch">切换</a>
            <a class="bee-m-out" @click="onLogout">退出</a>
          </div>
        </div>

        <div class="bee-b-foot">
          <span>v1.1.0</span>
        </div>
      </template>
    </div>

    <!-- 重要节点离开二次确认（路由切换 / 退出 / 关闭脏态弹窗） -->
    <div v-if="pending" class="bee-mask" @click.self="pending = null">
      <div class="bee-modal small">
        <div class="bm-head"><b>{{ pending.hint.title }}</b></div>
        <p class="st-del-t">{{ pending.hint.msg }}</p>
        <div class="bm-foot">
          <button class="bp-btn" @click="pending = null">{{ pending.hint.cancel || '取消' }}</button>
          <button class="bp-btn danger" @click="confirmLeave">{{ pending.hint.ok }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

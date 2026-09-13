<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { pushToast } from '../../components/toast';
import './BeePlugin.css';
import BeeBubble from './BeeBubble.vue';
import BeeLogin from './BeeLogin.vue';
import BeeProducts from './BeeProducts.vue';
import BeeShops from './BeeShops.vue';
import BeeTasks from './BeeTasks.vue';
import BeeStrategy from './BeeStrategy.vue';
import BeeAiGallery from './BeeAiGallery.vue';
import BeeAiLogin from './BeeAiLogin.vue';

type BeeView = 'none' | 'welcome' | 'login' | 'products' | 'shops' | 'tasks' | 'strategy' | 'aigallery';

const loggedIn = ref(false);
const userName = ref('');
const view = ref<BeeView>('none');

/* 弹窗态插件的重要节点离开守卫：策略表单编辑 / AI画图生成中为脏态，
   路由切换、退出登录、切换账号、ESC、关闭遮罩前统一二次确认，避免误丢失。
   脏态由各子弹窗通过 leaveHint() 暴露（返回 null 表示可直接离开） */
type LeaveHint = { title: string; msg: string; ok: string; cancel?: string };
const productsRef = ref<InstanceType<typeof BeeProducts> | null>(null);
const strategyRef = ref<InstanceType<typeof BeeStrategy> | null>(null);
const aiRef = ref<InstanceType<typeof BeeAiGallery> | null>(null);
const currentHint = (): LeaveHint | null => {
  if (view.value === 'products') return productsRef.value?.leaveHint?.() ?? null;
  if (view.value === 'strategy') return strategyRef.value?.leaveHint?.() ?? null;
  if (view.value === 'aigallery') return aiRef.value?.leaveHint?.() ?? null;
  return null;
};
const pending = ref<{ hint: LeaveHint; run: () => void } | null>(null);
const guarded = (run: () => void) => {
  const hint = currentHint();
  if (hint) pending.value = { hint, run };
  else run();
};
const confirmLeave = () => { const p = pending.value; pending.value = null; p?.run(); };

/* ESC 关闭当前弹窗；二次确认 / 内层小弹窗（添加店铺/店铺扫码）打开时优先交给它们 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (pending.value) { pending.value = null; return; }
  if (document.querySelector('.bee-plugin .bee-mask:not(.dialog)')) return;
  if (view.value !== 'none') guarded(() => { view.value = 'none'; });
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

/* 气泡导航：未登录时拦截并引导至品牌引导弹窗 */
const guard = (v: 'products' | 'shops' | 'tasks' | 'strategy' | 'aigallery') => {
  if (!loggedIn.value) {
    view.value = 'welcome';
    return;
  }
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

/* AI图库独立账号体系：搬家登录后仍需单独登录 AI图库 */
const aiLoggedIn = ref(false);
const aiUser = ref('');
const onAiLogin = (u: string) => {
  aiLoggedIn.value = true;
  aiUser.value = u;
  pushToast(`AI图库登录成功：${u}`);
};
const onAiLogout = () => {
  aiLoggedIn.value = false;
  aiUser.value = '';
  pushToast('已退出 AI图库 账号', 'info');
};

/* 供 App 顶层切换顶部 tab / 全局跳转前读取：当前视图脏态提示（null=可直接离开） */
defineExpose({ leaveHint: currentHint });
</script>

<template>
  <div class="bee-plugin">
    <!-- 品牌引导弹窗：默认不打开，未登录状态下点击功能入口才打开 -->
    <div v-if="view === 'welcome'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-welcome">
        <span class="bee-logo big">🐝</span>
        <b>蜜蜂搬家</b>
        <i>电商搬家插件 · 选品 / 搬家 / 店铺一站式管理</i>
        <div class="bw-acts">
          <button class="bp-btn primary" @click="view = 'login'">钉钉扫码登录</button>
        </div>
        <span class="bw-tip">提示：右侧悬浮气泡支持拖拽移动，功能均以弹窗形式打开</span>
      </div>
    </div>

    <!-- 钉钉扫码登录弹窗（未登录登录 / 已登录切换账号共用） -->
    <div v-if="view === 'login'" class="bee-mask dialog" @click.self="view = 'none'">
      <BeeLogin @success="onLogin" @close="view = 'none'" />
    </div>

    <!-- 选品库弹窗 -->
    <div v-if="loggedIn && view === 'products'" class="bee-mask dialog" @click.self="guarded(() => { view = 'none'; })">
      <div class="bee-dialog">
        <BeeProducts ref="productsRef" :user-name="userName" @close="guarded(() => { view = 'none'; })" />
      </div>
    </div>

    <!-- 店铺管理弹窗 -->
    <div v-if="loggedIn && view === 'shops'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog">
        <BeeShops @close="view = 'none'" />
      </div>
    </div>

    <!-- 任务管理弹窗 -->
    <div v-if="loggedIn && view === 'tasks'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog">
        <BeeTasks @close="view = 'none'" />
      </div>
    </div>

    <!-- 策略管理弹窗：铺货快速定价，按平台区分配置 -->
    <div v-if="loggedIn && view === 'strategy'" class="bee-mask dialog" @click.self="guarded(() => { view = 'none'; })">
      <div class="bee-dialog">
        <BeeStrategy ref="strategyRef" @close="guarded(() => { view = 'none'; })" />
      </div>
    </div>

    <!-- AI图库弹窗：未登录 AI账号 → 独立登录卡；已登录 → 图库 -->
    <div v-if="loggedIn && view === 'aigallery'" class="bee-mask dialog" @click.self="guarded(() => { view = 'none'; })">
      <BeeAiLogin v-if="!aiLoggedIn" @success="onAiLogin" @close="view = 'none'" />
      <div v-else class="bee-dialog wide">
        <BeeAiGallery ref="aiRef" :user-name="aiUser" @logout="guarded(onAiLogout)" @close="guarded(() => { view = 'none'; })" />
      </div>
    </div>

    <BeeBubble
      :logged-in="loggedIn"
      :user-name="userName"
      :ai-logged-in="aiLoggedIn"
      @nav="guard"
      @login="() => { view = 'login'; }"
      @switch="onSwitch"
      @logout="onLogout"
    />

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

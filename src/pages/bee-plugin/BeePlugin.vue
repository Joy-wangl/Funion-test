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

/* ESC 关闭当前弹窗；内层小弹窗（添加店铺/店铺扫码）打开时优先交给内层 */
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (document.querySelector('.bee-plugin .bee-mask:not(.dialog)')) return;
  if (view.value !== 'none') view.value = 'none';
};
onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

/* 气泡导航：未登录时拦截并引导至品牌引导弹窗 */
const guard = (v: 'products' | 'shops' | 'tasks' | 'strategy' | 'aigallery') => {
  if (!loggedIn.value) {
    view.value = 'welcome';
    return;
  }
  view.value = v;
};

const onLogin = (u: string) => {
  const switching = loggedIn.value;
  loggedIn.value = true;
  userName.value = u;
  view.value = 'products';
  pushToast(switching ? `已切换至账号：${u}` : `欢迎回来，${u}`, 'info');
};

const onLogout = () => {
  loggedIn.value = false;
  userName.value = '';
  view.value = 'none';
  pushToast('已退出登录', 'info');
};

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
    <div v-if="loggedIn && view === 'products'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog">
        <BeeProducts :user-name="userName" @close="view = 'none'" />
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
    <div v-if="loggedIn && view === 'strategy'" class="bee-mask dialog" @click.self="view = 'none'">
      <div class="bee-dialog">
        <BeeStrategy @close="view = 'none'" />
      </div>
    </div>

    <!-- AI图库弹窗：未登录 AI账号 → 独立登录卡；已登录 → 图库 -->
    <div v-if="loggedIn && view === 'aigallery'" class="bee-mask dialog" @click.self="view = 'none'">
      <BeeAiLogin v-if="!aiLoggedIn" @success="onAiLogin" @close="view = 'none'" />
      <div v-else class="bee-dialog wide">
        <BeeAiGallery :user-name="aiUser" @logout="onAiLogout" @close="view = 'none'" />
      </div>
    </div>

    <BeeBubble
      :logged-in="loggedIn"
      :user-name="userName"
      :ai-logged-in="aiLoggedIn"
      @nav="guard"
      @login="() => { view = 'login'; }"
      @switch="() => { view = 'login'; pushToast('请使用新账号扫码，成功后将切换登录', 'info'); }"
      @logout="onLogout"
    />
  </div>
</template>

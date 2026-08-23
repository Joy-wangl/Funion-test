<script setup lang="ts">
/* ---------- 会话卡片（头部命中类型 + 气泡） ---------- */
import { computed, ref } from 'vue';
import { SHOP_NAME, hitTypesOf, type ChatHit, type ChatSession } from './data';
import PlatLogo from './PlatLogo.vue';
import SessionBubbles from './SessionBubbles.vue';
import ChatFullModal from './ChatFullModal.vue';

const props = defineProps<{
  s: ChatSession;
  orders: string[];
  /** 提供时全屏交给父级（支持同编码会话切换 / 命中修改闭环） */
  onFullScreen?: () => void;
  onUpdateHits?: (id: string, hits: ChatHit[]) => void;
}>();

const open = ref(false);
const full = ref(false);
/* 命中修改未上提父级时的卡片内兜底状态 */
const localHits = ref<ChatHit[]>(props.s.hits);
const cur = computed<ChatSession>(() => (props.onUpdateHits ? props.s : { ...props.s, hits: localHits.value }));
</script>

<template>
  <div class="session-card">
    <div class="s-head" @click="open = !open">
      <span class="arrow" :class="{ open }" style="display: inline-flex">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg>
      </span>
      <span class="plat-chip"><PlatLogo :platform="cur.platform" />{{ cur.platform }}</span>
      <span class="s-meta"><i>店铺</i>{{ SHOP_NAME[cur.platform] }}</span>
      <span class="s-meta"><i>会话编号</i><b class="s-id">{{ cur.id }}</b></span>
      <span class="s-meta"><i>会话时间</i>{{ cur.startedAt }}</span>
      <span class="s-meta"><i>关联订单</i>{{ cur.orderId }}</span>
      <span class="s-meta"><i>消息数</i>{{ cur.messages.length }} 条</span>
      <span v-if="cur.hits.length" class="s-hits">
        <span v-for="t in hitTypesOf(cur)" :key="t" class="tag red">{{ t }}</span>
      </span>
      <span v-else class="tag green">无命中</span>
      <span class="s-right">
        <span v-if="orders.length > 0" class="s-orders">关联售后单 {{ orders.length }}</span>
        <span class="s-expand" @click.stop="onFullScreen ? onFullScreen() : (full = true)">全屏查看 ↗</span>
      </span>
    </div>
    <SessionBubbles v-if="open" :s="cur" />
    <ChatFullModal
      v-if="full && !onFullScreen"
      :sessions="[cur]"
      :current-id="cur.id"
      :on-nav="() => {}"
      :on-close="() => (full = false)"
      :on-update-hits="(_id: string, h: ChatHit[]) => (localHits = h)"
    />
  </div>
</template>

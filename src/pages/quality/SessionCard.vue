<script setup lang="ts">
/* ---------- 会话卡片（头部命中类型 + 气泡） ---------- */
import { computed, ref } from 'vue';
import { SHOP_NAME, type ChatHit, type ChatSession } from './data';
import PlatLogo from './PlatLogo.vue';
import SessionBubbles from './SessionBubbles.vue';
import ChatFullModal from './ChatFullModal.vue';

const props = defineProps<{
  s: ChatSession;
  orders: string[];
  /** 提供时全屏交给父级（支持同编码会话切换 / 命中修改闭环） */
  onFullScreen?: () => void;
  onUpdateHits?: (id: string, hits: ChatHit[]) => void;
  /** 品控-线上：气泡展示二级子问题下钻 */
  showSub?: boolean;
  /** 场景级已选小类：卡头只留该小类标签、气泡隐藏小类快选 */
  subFilter?: string | null;
  /** 提供时关联售后渲染为「售后单」按钮，点击前往对应售后单信息（缺省仍展示单号 chip） */
  onAfter?: (no: string) => void;
}>();

const open = ref(false);
const full = ref(false);
/* 命中修改未上提父级时的卡片内兜底状态 */
const localHits = ref<ChatHit[]>(props.s.hits);
const cur = computed<ChatSession>(() => (props.onUpdateHits ? props.s : { ...props.s, hits: localHits.value }));
/* 品控-线上：最终命中口径为问题小类，卡头标签展示小类（无小类兜底大类）；运维壳保持大类；选中小类后只留该小类 */
const chipTags = computed(() => {
  const hits = props.subFilter ? cur.value.hits.filter((h) => h.sub === props.subFilter) : cur.value.hits;
  const src = hits.map((h) => (props.showSub ? h.sub ?? h.type : h.type));
  return [...new Set(src)];
});
</script>

<template>
  <div class="session-card">
    <div class="s-head" @click="open = !open">
      <span class="arrow" :class="{ open }" style="display: inline-flex">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg>
      </span>
      <span class="s-shop"><PlatLogo :platform="cur.platform" />{{ SHOP_NAME[cur.platform] }}</span>
      <span class="s-meta"><i>会话编号</i><b class="s-id">{{ cur.id }}</b></span>
      <span class="s-meta"><i>会话时间</i>{{ cur.startedAt }}</span>
      <span class="s-meta"><i>关联订单</i>{{ cur.orderId }}</span>
      <span class="s-meta"><i>消息数</i>{{ cur.messages.length }} 条</span>
      <span v-if="cur.hits.length" class="s-hits">
        <span v-for="t in chipTags" :key="t" class="tag red">{{ t }}</span>
      </span>
      <span v-else class="tag green">无命中</span>
      <span class="s-right">
        <a
          v-if="orders.length && onAfter"
          class="s-link"
          :title="`关联售后单：${orders.join('、')}`"
          @click.stop="onAfter(orders[0])"
        >售后单</a>
        <span v-else-if="orders.length" class="s-orders" :title="`关联售后单：${orders.join('、')}`">
          关联售后: {{ orders[0] }}<i v-if="orders.length > 1">等 {{ orders.length }} 单</i>
        </span>
      </span>
      <span class="s-full" title="全屏查看" @click.stop="onFullScreen ? onFullScreen() : (full = true)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
      </span>
    </div>
    <SessionBubbles v-if="open" :s="cur" :show-sub="showSub" :sub-filter="subFilter" />
    <ChatFullModal
      v-if="full && !onFullScreen"
      :sessions="[cur]"
      :current-id="cur.id"
      :on-nav="() => {}"
      :on-close="() => (full = false)"
      :on-update-hits="(_id: string, h: ChatHit[]) => (localHits = h)"
      :show-sub="showSub"
      :sub-filter="subFilter"
    />
  </div>
</template>

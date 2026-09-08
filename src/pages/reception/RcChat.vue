<script setup lang="ts">
/* 聊天消息流（图二形式）：每条消息 = 头像 chip + 「发送方 · 时间」元信息行 + 气泡
   买家=左白底描边泡 + 浅蓝「买」chip；AI=右浅绿泡 + 浅绿「AI」chip；客服=右浅蓝泡 + 主色 chip（首字）
   订单卡片 / 申请发票卡片在气泡内渲染 */
import type { RcMsg } from './recordData';

const props = defineProps<{ msgs: RcMsg[]; agentName: string }>();

/** 元信息行发送方文案 */
const labelOf = (m: RcMsg) => (m.side === 'buyer' ? '买家' : m.side === 'bot' ? 'AI 回复' : props.agentName);
/** 头像 chip 文案 */
const avaOf = (m: RcMsg) => (m.side === 'buyer' ? '买' : m.side === 'bot' ? 'AI' : props.agentName[0]);
/** 头像 chip 色档 */
const toneOf = (m: RcMsg) => (m.side === 'buyer' ? 'buy' : m.side === 'bot' ? 'ai' : 'me');
/** 气泡色档（买家白底描边不加类） */
const bubbleOf = (m: RcMsg) => (m.side === 'bot' ? 'ai' : m.side === 'agent' ? 'me' : '');
</script>

<template>
  <div class="rcm-chat">
    <div class="rcm-chat-end">没有更多消息了</div>
    <div v-for="m in msgs" :key="m.id" class="rcm-msg" :class="m.side === 'buyer' ? 'l' : 'r'">
      <div class="rcm-mava" :class="toneOf(m)">{{ avaOf(m) }}</div>
      <div class="rcm-msg-main">
        <div class="rcm-msg-meta">{{ labelOf(m) }} · {{ m.time }}</div>
        <div class="rcm-bubble" :class="bubbleOf(m)">
          <template v-if="m.order">
            <div class="rcm-ord-no">订单编号：{{ m.order.no }}</div>
            <div class="rcm-ord-goods">
              <span class="rcm-ord-emoji">{{ m.order.emoji }}</span>
              <span class="rcm-ord-title">{{ m.order.title }}</span>
            </div>
            <div class="rcm-ord-price">{{ m.order.price }}</div>
          </template>
          <template v-else-if="m.invoice">
            <div class="rcm-inv">
              <span class="rcm-inv-ico">🧾</span>
              <div>
                <div class="rcm-inv-t">申请发票</div>
                <div class="rcm-inv-d">电子发票 · 个人 · 订单商品</div>
              </div>
            </div>
          </template>
          <template v-else>{{ m.text }}</template>
        </div>
      </div>
    </div>
  </div>
</template>

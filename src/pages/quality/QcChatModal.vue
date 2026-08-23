<script setup lang="ts">
/* ---------- 平台聊天记录弹窗（按平台 tab 切换） ---------- */
import { computed, ref } from 'vue';
import { AFTER_SALES_ORDERS, type ChatHit, type ChatSession, type Platform } from './data';
import type { QcCenterCode } from './qcCenterData';
import Modal from '../../components/Modal.vue';
import SessionCard from './SessionCard.vue';
import ChatFullModal from './ChatFullModal.vue';

const props = defineProps<{
  codes: QcCenterCode[];
  platforms: Platform[];
  initialPlatform: Platform;
  sessions: ChatSession[];
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
  onClose: () => void;
}>();

const plat = ref<Platform>(props.initialPlatform);
const fullId = ref<string | null>(null);
const sessions = computed(() => {
  const codeSet = new Set(props.codes.map((c) => c.code));
  return props.sessions.filter((s) => codeSet.has(s.code));
});
const tabs = computed(() => props.platforms.map((p) => ({ platform: p, count: sessions.value.filter((s) => s.platform === p).length })));
const list = computed(() => sessions.value.filter((s) => s.platform === plat.value));
</script>

<template>
  <Modal
    title="聊天记录"
    :sub="`按平台查看 ${codes.length} 个商品编码的聊天会话`"
    size="lg"
    @close="props.onClose"
  >
    <div class="qc-range-toggle qc-code-tabs" style="margin: 0 0 14px">
      <button
        v-for="t in tabs"
        :key="t.platform"
        type="button"
        :class="plat === t.platform ? 'active' : ''"
        @click="plat = t.platform"
      >
        {{ t.platform }} {{ t.count }}
      </button>
    </div>
    <div v-if="list.length" class="drawer-sessions">
      <SessionCard
        v-for="s in list"
        :key="s.id"
        :s="s"
        :orders="AFTER_SALES_ORDERS.filter((o) => o.sessionId === s.id).map((o) => o.id)"
        :on-full-screen="() => (fullId = s.id)"
        :on-update-hits="props.onUpdateHits"
      />
    </div>
    <div v-else style="color: var(--text-4); font-size: 12px">该平台暂无聊天记录</div>
    <ChatFullModal
      v-if="fullId"
      :sessions="list"
      :current-id="fullId"
      :on-nav="(id: string) => (fullId = id)"
      :on-close="() => (fullId = null)"
      :on-update-hits="props.onUpdateHits"
    />
    <template #foot>
      <button class="btn" @click="props.onClose">关闭</button>
    </template>
  </Modal>
</template>

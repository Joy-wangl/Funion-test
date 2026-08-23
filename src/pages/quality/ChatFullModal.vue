<script setup lang="ts">
/* ---------- 聊天全屏弹窗（头部对齐预览卡 · 同编码会话切换 · 命中类型修改） ---------- */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { SHOP_NAME, hitTypesOf, type ChatHit, type ChatSession } from './data';
import { QC_PROBLEM_TYPES } from './qcCenterData';
import PlatLogo from './PlatLogo.vue';
import SessionBubbles from './SessionBubbles.vue';

const props = defineProps<{
  sessions: ChatSession[];
  currentId: string;
  onNav: (id: string) => void;
  onClose: () => void;
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
}>();

const s = computed(() => props.sessions.find((x) => x.id === props.currentId));
/* 上一个/下一个仅链式切换当前编码的会话 */
const chain = computed(() => (s.value ? props.sessions.filter((x) => x.code === s.value!.code) : []));
const idx = computed(() => chain.value.findIndex((x) => x.id === props.currentId));
const addOpen = ref(false);
const addRef = ref<HTMLSpanElement | null>(null);

const onDown = (e: MouseEvent) => {
  if (addRef.value && !addRef.value.contains(e.target as Node)) addOpen.value = false;
};
watch(addOpen, (v) => {
  if (v) document.addEventListener('mousedown', onDown);
  else document.removeEventListener('mousedown', onDown);
});

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') props.onClose();
  else if (e.key === 'ArrowLeft' && idx.value > 0) props.onNav(chain.value[idx.value - 1].id);
  else if (e.key === 'ArrowRight' && idx.value < chain.value.length - 1) props.onNav(chain.value[idx.value + 1].id);
};
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('mousedown', onDown);
});

const types = computed(() => (s.value ? hitTypesOf(s.value) : []));
const addable = computed(() => QC_PROBLEM_TYPES.filter((t) => !types.value.includes(t)));
</script>

<template>
  <div v-if="s" class="chat-modal-mask" @click="props.onClose">
    <div class="chat-modal" @click.stop>
      <div class="chat-modal-head">
        <span class="plat-chip"><PlatLogo :platform="s.platform" />{{ s.platform }}</span>
        <span class="s-meta"><i>店铺</i>{{ SHOP_NAME[s.platform] }}</span>
        <span class="s-meta"><i>会话编号</i><b class="s-id">{{ s.id }}</b></span>
        <span class="s-meta"><i>会话时间</i>{{ s.startedAt }}</span>
        <span class="s-meta"><i>关联订单</i>{{ s.orderId }}</span>
        <span class="s-meta"><i>消息数</i>{{ s.messages.length }} 条</span>
        <span class="x" @click="props.onClose">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </span>
      </div>
      <div class="cm-hits">
        <span class="cm-hits-label">命中问题类型</span>
        <template v-if="types.length">
          <span v-for="t in types" :key="t" class="tag red">
            {{ t }}
            <i class="cm-x" title="移除该问题类型" @click="props.onUpdateHits(s.id, s.hits.filter((h) => h.type !== t))">×</i>
          </span>
        </template>
        <span v-else class="tag green">无命中</span>
        <span ref="addRef" class="cm-add">
          <a @click="addOpen = !addOpen">+ 添加</a>
          <span v-if="addOpen" class="cm-add-pop">
            <template v-if="addable.length">
              <a
                v-for="t in addable"
                :key="t"
                @click="props.onUpdateHits(s.id, [...s.hits, { type: t, phrase: '' }]); addOpen = false"
              >{{ t }}</a>
            </template>
            <span v-else class="cm-none">已添加全部类型</span>
          </span>
        </span>
      </div>
      <div class="chat-modal-body">
        <SessionBubbles :s="s" />
      </div>
      <div class="chat-modal-foot">
        <div class="cm-nav">
          <button type="button" :disabled="idx <= 0" @click="props.onNav(chain[idx - 1].id)">‹ 上一个</button>
          <span class="cm-idx">{{ idx + 1 }} / {{ chain.length }}</span>
          <button type="button" :disabled="idx >= chain.length - 1" @click="props.onNav(chain[idx + 1].id)">下一个 ›</button>
        </div>
      </div>
    </div>
  </div>
</template>

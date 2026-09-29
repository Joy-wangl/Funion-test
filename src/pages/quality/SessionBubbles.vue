<script setup lang="ts">
/* ---------- 聊天会话气泡（命中短语高亮） ---------- */
import { computed, ref } from 'vue';
import type { ChatSession } from './data';

const props = defineProps<{ s: ChatSession; showSub?: boolean }>();

const hitsOnly = ref(false);
/* 二级子问题下钻（品控-线上）：按命中子问题过滤会话气泡 */
const subSel = ref<string | null>(null);
const subChips = computed(() => {
  const m = new Map<string, number>();
  props.s.hits.forEach((h) => { if (h.sub) m.set(h.sub, (m.get(h.sub) ?? 0) + 1); });
  return [...m.entries()].map(([name, count]) => ({ name, count }));
});
const activeHits = computed(() => (subSel.value ? props.s.hits.filter((h) => h.sub === subSel.value) : props.s.hits));
const phrases = computed(() => activeHits.value.map((h) => h.phrase).filter(Boolean));
const baseMsgs = computed(() => (subSel.value
  ? props.s.messages.filter((m) => phrases.value.some((p) => m.text.includes(p)))
  : props.s.messages));
const hitMsgs = computed(() => baseMsgs.value.filter((m) => phrases.value.some((p) => m.text.includes(p))));
const msgs = computed(() => (hitsOnly.value ? hitMsgs.value : baseMsgs.value));

/* 命中短语高亮切分（与 React highlight 等价：长短语优先，逐段首处替换） */
type Part = { text: string; mark: boolean };
const highlightParts = (text: string, phs: string[]): Part[] => {
  if (!phs.length) return [{ text, mark: false }];
  const parts: (string | { m: string })[] = [text];
  [...phs].sort((a, b) => b.length - a.length).forEach((ph) => {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (typeof p !== 'string') continue;
      const idx = p.indexOf(ph);
      if (idx < 0) continue;
      parts.splice(i, 1, p.slice(0, idx), { m: ph }, p.slice(idx + ph.length));
      i += 2;
    }
  });
  return parts.map((p) => (typeof p === 'string' ? { text: p, mark: false } : { text: p.m, mark: true }));
};
</script>

<template>
  <div class="session-bubbles">
    <div v-if="showSub && subChips.length" class="b-subs">
      <span class="b-sub" :class="{ on: !subSel }" @click="subSel = null; hitsOnly = false">全部</span>
      <span
        v-for="c in subChips"
        :key="c.name"
        class="b-sub"
        :class="{ on: subSel === c.name }"
        @click="subSel = subSel === c.name ? null : c.name; hitsOnly = false"
      >{{ c.name }}<b>{{ c.count }}</b></span>
    </div>
    <div v-if="s.hits.length > 0" class="b-toggle">
      <a @click.prevent="hitsOnly = !hitsOnly">
        {{ hitsOnly ? `查看完整会话（${baseMsgs.length} 条）` : `只看命中（${hitMsgs.length} 条）` }}
      </a>
    </div>
    <div class="b-list">
      <div
        v-for="(m, i) in msgs"
        :key="i"
        class="bubble-row"
        :class="[m.role === 'buyer' ? 'buyer' : 'support', m.role === 'ai' ? 'ai' : '']"
      >
        <div class="b-av">{{ m.role === 'buyer' ? '买' : m.role === 'ai' ? 'AI' : '服' }}</div>
        <div class="b-main">
          <div class="b-meta">{{ m.role === 'buyer' ? '买家' : m.role === 'ai' ? 'AI 回复' : '客服' }} · {{ m.time }}</div>
          <div class="b-text">
            <template v-for="(seg, j) in highlightParts(m.text, phrases)" :key="j">
              <mark v-if="seg.mark">{{ seg.text }}</mark>
              <template v-else>{{ seg.text }}</template>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

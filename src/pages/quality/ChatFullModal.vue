<script setup lang="ts">
/* ---------- 聊天全屏弹窗（左侧会话信息栏 · 同编码会话切换 · 命中类型大类→小类两级添加） ---------- */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { SHOP_NAME, hitTypesOf, type ChatHit, type ChatSession } from './data';
import { QC_PROBLEM_TYPES } from './qcCenterData';
import { subsOfType } from './qcOnlineData';
import PlatLogo from './PlatLogo.vue';
import SessionBubbles from './SessionBubbles.vue';

const props = defineProps<{
  sessions: ChatSession[];
  currentId: string;
  onNav: (id: string) => void;
  onClose: () => void;
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
  /** 品控-线上：会话气泡展示二级子问题下钻 */
  showSub?: boolean;
  /** 场景级已选小类：气泡内隐藏小类快选并按其过滤 */
  subFilter?: string | null;
  /** 会话内容导出入口（售后列表关联会话传入）：缺省不展示导出钮 */
  onExport?: () => void;
  /** 客服打标：sessionId → csTag 映射（只读展示，同命中问题类型样式但不带删除/添加） */
  csTagMap?: Record<string, string>;
}>();

const s = computed(() => props.sessions.find((x) => x.id === props.currentId));
/* 上一个/下一个仅链式切换当前编码的会话 */
const chain = computed(() => (s.value ? props.sessions.filter((x) => x.code === s.value!.code) : []));
const idx = computed(() => chain.value.findIndex((x) => x.id === props.currentId));
const addOpen = ref(false);
const addRef = ref<HTMLSpanElement | null>(null);
const shuttleRef = ref<HTMLDivElement | null>(null);
const modalRef = ref<HTMLDivElement | null>(null);
/* 悬浮气泡锚定「+ 添加」下方：绝对定位覆盖内容层，打开不挤压左栏布局 */
const popStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' });
const openAdd = () => {
  addOpen.value = !addOpen.value;
  if (!addOpen.value) return;
  const m = modalRef.value?.getBoundingClientRect();
  const a = addRef.value?.getBoundingClientRect();
  if (m && a) popStyle.value = { top: `${a.bottom - m.top + 6}px`, left: `${a.left - m.left}px` };
};

const onDown = (e: MouseEvent) => {
  const t = e.target as Node;
  if (addRef.value?.contains(t) || shuttleRef.value?.contains(t)) return;
  addOpen.value = false;
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

/* 客服打标：只读展示，同命中问题类型样式但不带删除/添加 */
const csTag = computed(() => (s.value && props.csTagMap ? props.csTagMap[s.value.id] : undefined));

/* 命中小类快选外置到左栏（与命中问题类型同组），气泡内不再重复展示 */
const subSel = ref<string | null>(null);
watch(() => props.currentId, () => { subSel.value = null; });
const subChips = computed(() => {
  const m = new Map<string, number>();
  if (s.value) s.value.hits.forEach((h) => { if (h.sub) m.set(h.sub, (m.get(h.sub) ?? 0) + 1); });
  return [...m.entries()].map(([name, count]) => ({ name, count }));
});
const effSub = computed(() => subSel.value ?? props.subFilter ?? null);

/* 添加命中：先选大类，再在其小类中多选（该大类已添加的小类不再列出） */
const pickType = ref<string | null>(null);
const pickSubs = ref<string[]>([]);
const pickableSubs = computed(() => {
  if (!pickType.value || !s.value) return [];
  const done = new Set(s.value.hits.filter((h) => h.type === pickType.value).map((h) => h.sub));
  return subsOfType(pickType.value).filter((x) => !done.has(x));
});
const toggleSub = (sub: string) => {
  pickSubs.value = pickSubs.value.includes(sub) ? pickSubs.value.filter((x) => x !== sub) : [...pickSubs.value, sub];
};
const closePick = () => {
  addOpen.value = false;
  pickType.value = null;
  pickSubs.value = [];
};
const confirmAdd = () => {
  if (!s.value || !pickType.value || !pickSubs.value.length) return;
  const added = pickSubs.value.map((sub) => ({ type: pickType.value!, sub, phrase: '' }));
  props.onUpdateHits(s.value.id, [...s.value.hits, ...added]);
  closePick();
};
watch(addOpen, (v) => {
  if (!v) {
    pickType.value = null;
    pickSubs.value = [];
  }
});
</script>

<template>
  <div v-if="s" class="chat-modal-mask" @click="props.onClose">
    <div ref="modalRef" class="chat-modal cm-wide" @click.stop>
      <span class="cm-close" @click="props.onClose">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </span>
      <div class="cm-cols">
        <!-- 左侧会话信息栏：平台店铺/编号/时间/订单/消息数 + 命中问题类型编辑 -->
        <aside class="cm-side">
          <div class="cm-side-plat"><PlatLogo :platform="s.platform" /><span>{{ SHOP_NAME[s.platform] }}</span></div>
          <div class="cm-side-fields">
            <div class="cm-f"><i>会话编号</i><b>{{ s.id }}</b></div>
            <div class="cm-f"><i>会话时间</i><span>{{ s.startedAt }}</span></div>
            <div class="cm-f"><i>关联订单</i><span>{{ s.orderId }}</span></div>
            <div class="cm-f"><i>消息数</i><span>{{ s.messages.length }} 条</span></div>
          </div>
          <div class="cm-side-hits">
            <div class="cm-hits-label">命中问题类型</div>
            <div class="cm-side-tags">
              <template v-if="types.length">
                <span v-for="t in types" :key="t" class="tag red">
                  {{ t }}
                  <i class="cm-x" title="移除该问题类型" @click="props.onUpdateHits(s.id, s.hits.filter((h) => h.type !== t))">×</i>
                </span>
              </template>
              <span v-else class="tag green">无命中</span>
            </div>
            <span ref="addRef" class="cm-add">
              <a @click="openAdd">+ 添加</a>
            </span>
          </div>
          <!-- 客服打标：只读展示，同命中问题类型样式但不带删除/添加 -->
          <div v-if="csTag" class="cm-side-hits">
            <div class="cm-hits-label">客服打标</div>
            <div class="cm-side-tags">
              <span class="tag red">{{ csTag }}</span>
            </div>
          </div>
          <!-- 会话切换与导出锚定左栏底部，左栏上下皆有内容不留死白 -->
          <div class="cm-side-foot">
            <div class="cm-nav">
              <button type="button" :disabled="idx <= 0" @click="props.onNav(chain[idx - 1].id)">‹ 上一个</button>
              <span class="cm-idx">{{ idx + 1 }} / {{ chain.length }}</span>
              <button type="button" :disabled="idx >= chain.length - 1" @click="props.onNav(chain[idx + 1].id)">下一个 ›</button>
            </div>
            <button v-if="props.onExport" type="button" class="cm-export" @click="props.onExport">导出</button>
          </div>
        </aside>
        <div class="chat-modal-body">
          <!-- 命中小类快选：右侧顶部横向展示 -->
          <div v-if="showSub && subChips.length && !subFilter" class="cm-body-subs">
            <span class="b-sub" :class="{ on: !subSel }" @click="subSel = null">全部</span>
            <span
              v-for="c in subChips"
              :key="c.name"
              class="b-sub"
              :class="{ on: subSel === c.name }"
              @click="subSel = subSel === c.name ? null : c.name"
            >{{ c.name }}<b>{{ c.count }}</b></span>
          </div>
          <SessionBubbles :s="s" :show-sub="showSub" :sub-filter="effSub" :hide-subs="!!showSub" />
        </div>
      </div>
      <!-- 穿梭选择悬浮气泡：弹窗根节点子级，绝对定位覆盖内容层（锚点见 popStyle） -->
      <div v-if="addOpen" ref="shuttleRef" class="cm-shuttle" :style="popStyle">
        <!-- 已选小类白色气泡展示 -->
        <div v-if="pickSubs.length" class="cm-shuttle-selected">
          <span
            v-for="sub in pickSubs"
            :key="sub"
            class="cm-shuttle-tag"
            @click="toggleSub(sub)"
          >{{ sub }} ×</span>
        </div>
        <!-- 穿梭双列 -->
        <div class="cm-shuttle-cols">
          <div class="cm-shuttle-col">
            <div class="cm-shuttle-title">大类</div>
            <div class="cm-shuttle-list">
              <div
                v-for="t in QC_PROBLEM_TYPES"
                :key="t"
                class="cm-shuttle-item"
                :class="{ active: pickType === t }"
                @click="pickType = pickType === t ? null : t; pickSubs = []"
              >{{ t }}</div>
            </div>
          </div>
          <div class="cm-shuttle-col">
            <div class="cm-shuttle-title">小类（可多选）</div>
            <div class="cm-shuttle-list">
              <template v-if="pickType && pickableSubs.length">
                <div
                  v-for="sub in pickableSubs"
                  :key="sub"
                  class="cm-shuttle-item"
                  :class="{ checked: pickSubs.includes(sub) }"
                  @click="toggleSub(sub)"
                >
                  <span class="cm-shuttle-check">{{ pickSubs.includes(sub) ? '✓' : '' }}</span>
                  <span>{{ sub }}</span>
                </div>
              </template>
              <div v-else class="cm-shuttle-empty">{{ pickType ? '该大类小类已全部添加' : '请先选择大类' }}</div>
            </div>
          </div>
        </div>
        <!-- 底部按钮 -->
        <div class="cm-shuttle-foot">
          <button type="button" class="btn sm primary" :disabled="!pickSubs.length" @click="confirmAdd">添加</button>
          <button type="button" class="btn sm" @click="closePick">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

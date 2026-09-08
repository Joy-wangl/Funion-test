<script setup lang="ts">
/* =========================================================
   接待记录弹窗（大）：三栏 ① 客服列表 ② 会话列表 ③ 聊天区
   顶部查询行：公司/分组/客服三级联（客服下拉自带搜索） + 用户名搜索；两栏状态筛选为下划线 tab（单选含全部）；聊天区为头像 chip + 发送方·时间元信息行 + 气泡形式
   入口：宝妈接待表操作列「接待记录」（三维度预选该客服定位）
   公司行「接待记录」入口：仅预选公司，分组/客服默认全部
   ========================================================= */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { RC_AGENTS, RC_COMPANIES, RC_COMPANY_GROUPS, RC_ALL_GROUPS, type RcAgent } from './data';
import { RC_REPLY_META, RC_REPLY_TABS, rcSessionsOf, type RcSession } from './recordData';
import RcChat from './RcChat.vue';

const props = defineProps<{ agent?: RcAgent; company?: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

/* ---------- 三维度筛选（级联：分组跟随公司，客服跟随公司+分组） ---------- */
const fCompany = ref(props.agent?.company ?? props.company ?? '全部');
const fGroup = ref(props.agent?.group ?? '全部');
const fAgent = ref(props.agent?.name ?? '全部');
const companyOpts = computed(() => ['全部', ...RC_COMPANIES]);
const groupOpts = computed(() => ['全部', ...(fCompany.value === '全部' ? RC_ALL_GROUPS : RC_COMPANY_GROUPS[fCompany.value] ?? [])]);
const agentOpts = computed(() => ['全部', ...RC_AGENTS
  .filter((a) => (fCompany.value === '全部' || a.company === fCompany.value) && (fGroup.value === '全部' || a.group === fGroup.value))
  .map((a) => a.name)]);
const onCompany = (v: string) => {
  fCompany.value = v;
  if (!groupOpts.value.includes(fGroup.value)) fGroup.value = '全部';
  if (!agentOpts.value.includes(fAgent.value)) fAgent.value = '全部';
};
const onGroup = (v: string) => {
  fGroup.value = v;
  if (!agentOpts.value.includes(fAgent.value)) fAgent.value = '全部';
};

/* ---------- ① 客服栏：状态 tab 筛选（客服名搜索并入顶部客服下拉的菜单搜索） ---------- */
const STATUS_TABS = ['全部', '在线', '小休', '离线'];
const statusTab = ref('全部');
const scopedAgents = computed(() => RC_AGENTS.filter((a) =>
  (fCompany.value === '全部' || a.company === fCompany.value)
  && (fGroup.value === '全部' || a.group === fGroup.value)
  && (fAgent.value === '全部' || a.name === fAgent.value)));
const agentList = computed(() => scopedAgents.value.filter((a) => statusTab.value === '全部' || a.status === statusTab.value));

const curAgent = ref<RcAgent | null>(props.agent ?? null);
watch(agentList, (l) => {
  /* 列表变化后当前客服不在列表内时，回落到第一条 */
  if (curAgent.value && l.some((a) => a.id === curAgent.value?.id)) return;
  curAgent.value = l[0] ?? scopedAgents.value[0] ?? null;
}, { immediate: true });

/* ---------- ② 会话栏：回复状态 tab 筛选 + 搜索（搜索框在顶部查询行） ---------- */
const replyTab = ref('all');
const sessionKw = ref('');
const curSession = ref<RcSession | null>(null);
const allSessions = computed(() => (curAgent.value ? rcSessionsOf(curAgent.value) : []));
const sessions = computed(() => {
  const k = sessionKw.value.trim();
  return allSessions.value.filter((s) =>
    (replyTab.value === 'all' || s.reply === replyTab.value) && (!k || s.buyer.includes(k)));
});
watch(sessions, (l) => {
  if (curSession.value && l.some((s) => s.id === curSession.value?.id)) return;
  curSession.value = l[0] ?? null;
}, { immediate: true });

/* ---------- ③ 聊天栏：消息范围切换（本地 / 平台） ---------- */
const msgScope = ref('本地');

/** Esc 关闭弹窗 */
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close'); };
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="rcm-mask" @click.self="emit('close')">
    <div class="rcm-modal">
      <!-- 头部 -->
      <div class="rcm-head">
        <b>接待记录</b>
        <button type="button" class="rcm-x" title="关闭" @click="emit('close')">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none" />
          </svg>
        </button>
      </div>

      <!-- 三维度筛选 -->
      <div class="rcm-filters">
        <span class="rcm-f-item">
          <i>公司</i>
          <BubbleSelect class-name="select rcm-f-sel" :value="fCompany" :options="companyOpts" @change="onCompany" />
        </span>
        <span class="rcm-f-item">
          <i>分组</i>
          <BubbleSelect class-name="select rcm-f-sel" :value="fGroup" :options="groupOpts" @change="onGroup" />
        </span>
        <span class="rcm-f-item">
          <i>客服</i>
          <BubbleSelect class-name="select rcm-f-sel" searchable :value="fAgent" :options="agentOpts" @change="(v: string) => (fAgent = v)" />
        </span>
        <span class="rcm-f-item">
          <i>用户名</i>
          <input v-model="sessionKw" class="input rcm-f-search" placeholder="请输入用户名查找" />
        </span>
      </div>

      <!-- 三栏主体 -->
      <div class="rcm-body">
        <!-- ① 客服栏 -->
        <aside class="rcm-col rcm-agents">
          <div class="rcm-tabs">
            <button
              v-for="t in STATUS_TABS"
              :key="t"
              type="button"
              :class="{ on: statusTab === t }"
              @click="statusTab = t"
            >{{ t }}</button>
          </div>
          <div class="rcm-alist">
            <div v-if="agentList.length === 0" class="rcm-empty">无匹配客服</div>
            <div
              v-for="a in agentList"
              :key="a.id"
              class="rcm-agent"
              :class="{ on: curAgent?.id === a.id }"
              @click="curAgent = a"
            >
              <span class="rcm-ava">{{ a.name[0] }}<i class="rcm-sbadge" :class="{ on: a.status === '在线', rest: a.status === '小休' }" :title="a.status" /></span>
              <span class="rcm-ainfo">
                <!-- 公司/分组上下两行；状态为头像右下角圆形角标 -->
                <b>{{ a.name }}</b>
                <i>公司: {{ a.company }}</i>
                <i>小组: {{ a.group }}</i>
              </span>
            </div>
          </div>
        </aside>

        <!-- ② 会话栏 -->
        <section class="rcm-col rcm-sessions">
          <div class="rcm-tabs">
            <button
              v-for="t in RC_REPLY_TABS"
              :key="t.key"
              type="button"
              :class="{ on: replyTab === t.key }"
              @click="replyTab = t.key"
            >{{ t.label }}</button>
          </div>
          <div class="rcm-slist">
            <div v-if="sessions.length === 0" class="rcm-empty">暂无会话</div>
            <div
              v-for="s in sessions"
              :key="s.id"
              class="rcm-sess"
              :class="{ on: curSession?.id === s.id }"
              @click="curSession = s"
            >
              <div class="rcm-sess-top">
                <span class="rcm-buyer">{{ s.buyer }}</span>
                <span class="rcm-time">{{ s.time }}</span>
              </div>
              <!-- 预览文字与回复状态标签同排：文字左（临接标签前省略号截断）、标签右 -->
              <div class="rcm-sess-mid">
                <span class="rcm-preview">{{ s.preview }}</span>
                <span class="rcm-rtag" :class="RC_REPLY_META[s.reply].cls">{{ RC_REPLY_META[s.reply].label }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ③ 聊天栏 -->
        <section class="rcm-col rcm-chatcol">
          <template v-if="curSession && curAgent">
            <div class="rcm-chead">
              <span class="rcm-reddot" title="未读消息" />
              <b class="rcm-buyer">{{ curSession.buyer }}</b>
              <span class="rcm-plat">{{ curSession.plat }}</span>
              <span class="rcm-shop">{{ curSession.shop }}</span>
              <BubbleSelect
                class-name="select rcm-scope"
                :value="msgScope"
                :options="['本地', '平台']"
                @change="(v: string) => (msgScope = v)"
              />
            </div>
            <div class="rcm-cbody">
              <RcChat :msgs="curSession.msgs" :agent-name="curAgent.name" />
            </div>
          </template>
          <div v-else class="rcm-empty rcm-chat-empty">请选择左侧会话查看聊天记录</div>
        </section>
      </div>
    </div>
  </div>
</template>

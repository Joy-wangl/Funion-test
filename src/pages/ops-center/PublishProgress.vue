<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { publishTasks, publishVisible, clearPublishTasks, closePublishPanel, resolvePublishIntervene, resolvePublishRisk, cancelPublishRisk } from './publishStore';
import type { PublishItem, PublishTask } from './publishStore';
import { pushToast } from '../../components/toast';
import TcRiskModal from './TcRiskModal.vue';

const tasks = publishTasks;
const visible = publishVisible;

/* 任务列表按最近 > 最早展示（store 内为 push 顺序，展示时反转） */
const orderedTasks = computed(() => [...tasks.value].reverse());

const minimized = ref(false);
/* 每个任务的失败详情展开态 */
const expandedIds = ref<number[]>([]);
const isExpanded = (id: number) => expandedIds.value.includes(id);
const toggleTask = (id: number) => {
  const i = expandedIds.value.indexOf(id);
  if (i >= 0) expandedIds.value.splice(i, 1);
  else expandedIds.value.push(id);
};

/* 拖拽位置 */
const posX = ref(window.innerWidth - 400);
const posY = ref(80);
let dragging = false;
let dragMoved = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;

const onDragStart = (e: MouseEvent) => {
  dragging = true;
  dragMoved = false;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
};
const onDragMove = (e: MouseEvent) => {
  if (!dragging) return;
  /* 超过阈值才视为拖拽，避免与点击混淆 */
  if (!dragMoved && Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 3) dragMoved = true;
  if (!dragMoved) return;
  /* 边界按当前形态取值：悬浮球 48px / 展开面板 380x320 */
  const w = minimized.value ? 48 : 380;
  const h = minimized.value ? 48 : 320;
  posX.value = Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragOffsetX));
  posY.value = Math.max(0, Math.min(window.innerHeight - h, e.clientY - dragOffsetY));
};
const onDragEnd = () => {
  dragging = false;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
};
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
});

/* 悬浮球点击展开：拖拽后松手不展开 */
const onBallClick = () => {
  if (dragMoved) { dragMoved = false; return; }
  minimized.value = false;
  visible.value = true;
};

/* 悬浮球展示条件：收起态，或面板已关闭但仍有任务（保留重新打开入口） */
const ballVisible = computed(() => tasks.value.length > 0 && (minimized.value || !visible.value));

/* 新任务到达：强制展开面板（重置清空/关闭残留的 minimized 态） */
watch(() => tasks.value.length, (n, o) => {
  if (n > o) { minimized.value = false; visible.value = true; }
});

/* ===== 单任务统计（模板 v-for 调用） ===== */
const statsOf = (t: PublishTask) => {
  const total = t.items.length;
  const success = t.items.filter((i) => i.status === 'success').length;
  const failed = t.items.filter((i) => i.status === 'failed').length;
  const pending = t.items.filter((i) => i.status === 'pending').length;
  const confirm = t.items.filter((i) => i.status === 'confirm').length;
  const cancelled = t.items.filter((i) => i.status === 'cancelled').length;
  /* 待确认/风控取消均为终态或暂停态，计入已处理 */
  return { total, success, failed, pending, confirm, cancelled, done: total - pending };
};
const pctOf = (t: PublishTask) => {
  const s = statsOf(t);
  return {
    success: s.total ? (s.success / s.total) * 100 : 0,
    failed: s.total ? (s.failed / s.total) * 100 : 0,
    /* 风控取消灰段：任务级取消全段灰；条目级取消按占比灰 */
    cancelled: t.risk?.status === 'cancelled' ? 100 : (s.total ? (s.cancelled / s.total) * 100 : 0),
  };
};
const statusClassOf = (t: PublishTask) => {
  if (t.risk?.status === 'cancelled') return 'cancelled';
  const s = statsOf(t);
  if (t.risk?.status === 'confirm' || s.confirm > 0) return 'risk-confirm';
  if (t.intervene) return 'intervene';
  if (s.pending > 0) return 'running';
  if (s.failed > 0 || s.cancelled > 0) return 'partial';
  return 'success';
};
const statusTextOf = (t: PublishTask) => {
  if (t.risk?.status === 'cancelled') return `风控取消：${t.risk.reason}`;
  if (t.risk?.status === 'confirm') return '待确认：命中公司风险管控，需二次确认';
  const s = statsOf(t);
  if (s.confirm > 0) return `待确认：${s.confirm} 个店铺命中公司风险管控，需二次确认`;
  if (t.intervene) return `待人工介入：${t.intervene.shop} 弹出验证码`;
  if (s.pending > 0) return `发布中… ${s.done}/${s.total}`;
  if (s.cancelled > 0) return `风控取消 ${s.cancelled} 条${s.failed > 0 ? `，失败 ${s.failed} 条` : ''}${s.success > 0 ? `，成功 ${s.success} 条` : ''}`;
  if (s.failed > 0) return `成功 ${s.success} 条，失败 ${s.failed} 条`;
  return `全部成功（${s.success} 条）`;
};
/* 异常按原因归类：失败 / 风控取消 / 待确认（与任务中心失败原因 chips 同样式） */
const groupsOf = (t: PublishTask) => {
  const map = new Map<string, { kind: 'failed' | 'cancelled' | 'confirm'; reason: string; items: PublishItem[] }>();
  for (const item of t.items.filter((i) => i.status === 'failed' || i.status === 'cancelled' || i.status === 'confirm')) {
    const key = `${item.status}:${item.reason || '未知原因'}`;
    if (!map.has(key)) map.set(key, { kind: item.status as 'failed' | 'cancelled' | 'confirm', reason: item.reason || '未知原因', items: [] });
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values());
};
/* 任务时间 HH:MM */
const taskTime = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/* ===== 聚合统计（悬浮球） ===== */
const allItems = computed(() => tasks.value.flatMap((t) => t.items));
const totalAll = computed(() => allItems.value.length);
const pendingAll = computed(() => allItems.value.filter((i) => i.status === 'pending').length);
const failedAll = computed(() => allItems.value.filter((i) => i.status === 'failed').length);
const progressAll = computed(() => (totalAll.value ? ((totalAll.value - pendingAll.value) / totalAll.value) * 100 : 0));

/* 悬浮球文案：直接展示进度 x/n，环色表示状态 */
const ballText = computed(() => `${totalAll.value - pendingAll.value}/${totalAll.value}`);
const ballStatusClass = computed(() => {
  if (tasks.value.some((t) => t.risk?.status === 'confirm' || t.items.some((i) => i.status === 'confirm'))) return 'risk-confirm';
  if (tasks.value.some((t) => t.intervene)) return 'intervene';
  if (pendingAll.value > 0) return 'running';
  if (failedAll.value > 0) return 'partial';
  return 'success';
});

/* ===== 人工介入（RPA 发布遇验证码）：弹窗输验证码，通过后任务续跑 ===== */
const ivTask = ref<PublishTask | null>(null);
const ivCode = ref('');
const ivInput = ref('');
const openIv = (t: PublishTask) => {
  ivTask.value = t;
  ivCode.value = t.intervene?.code ?? '';
  ivInput.value = '';
};
/* 点击验证码刷新：重生成四位数字 */
const refreshIvCode = () => {
  ivCode.value = String(Math.floor(1000 + Math.random() * 9000));
  if (ivTask.value?.intervene) ivTask.value.intervene.code = ivCode.value;
};
const confirmIv = () => {
  const t = ivTask.value;
  if (!t) return;
  if (ivInput.value.trim().toLowerCase() !== ivCode.value.toLowerCase()) {
    pushToast('验证码错误，请重新输入', 'error');
    ivInput.value = '';
    refreshIvCode();
    return;
  }
  resolvePublishIntervene(t.id);
  ivTask.value = null;
  pushToast('验证成功，发布任务已恢复');
};

/* ===== 风控二次确认（条目级）：待确认条目弹窗，继续上架→恢复发布 / 取消任务→风控取消 ===== */
const riskTask = ref<PublishTask | null>(null);
const riskItem = ref<PublishItem | null>(null);
const openRisk = (t: PublishTask, item?: PublishItem) => {
  riskTask.value = t;
  riskItem.value = item ?? t.items.find((i) => i.status === 'confirm') ?? null;
};
const onRiskContinue = () => {
  const t = riskTask.value;
  riskTask.value = null;
  riskItem.value = null;
  if (!t) return;
  resolvePublishRisk(t.id);
  pushToast('已确认上架，发布任务已恢复');
};
const onRiskCancel = () => {
  const t = riskTask.value;
  const reason = t?.risk?.reason || riskItem.value?.reason || '商品命中公司风险管控，任务已取消';
  riskTask.value = null;
  riskItem.value = null;
  if (!t) return;
  cancelPublishRisk(t.id, reason);
  pushToast('任务已取消（风控）');
};
</script>

<template>
  <Teleport to="body">
    <!-- 悬浮球：收起态 -->
    <div
      v-if="ballVisible"
      class="pub-ball"
      :class="ballStatusClass"
      :style="{ left: posX + 'px', top: posY + 'px' }"
      @mousedown="onDragStart"
      @click="onBallClick"
    >
      <div class="pub-ball-ring">
        <svg viewBox="0 0 36 36" class="pub-ball-svg">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3" class="pub-ball-bg" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3"
            class="pub-ball-fg"
            :stroke-dasharray="`${progressAll} ${100 - progressAll}`"
            stroke-dashoffset="25"
          />
        </svg>
      </div>
      <span class="pub-ball-text">{{ ballText }}</span>
    </div>

    <!-- 面板：展开态（任务列表） -->
    <div
      v-if="visible && !minimized"
      class="pub-progress"
      :style="{ left: posX + 'px', top: posY + 'px' }"
    >
      <div class="pub-progress-head" @mousedown="onDragStart">
        <span class="pub-progress-title">发布进度<template v-if="tasks.length">（{{ tasks.length }}）</template></span>
        <div class="pub-progress-head-btns">
          <button v-if="tasks.length" class="pub-progress-clear" title="清空" @click.stop="clearPublishTasks()">清空</button>
          <button class="pub-progress-min" title="收起" @click.stop="minimized = true">─</button>
          <button class="pub-progress-close" title="关闭" @click.stop="closePublishPanel()">✕</button>
        </div>
      </div>

      <div v-if="!tasks.length" class="pub-progress-empty">暂无发布任务</div>

      <!-- 任务卡片列表 -->
      <div v-else class="pub-task-list">
        <div v-for="t in orderedTasks" :key="t.id" class="pub-task-card" :class="statusClassOf(t)">
          <div class="pub-task-card-head">
            <span class="pub-task-name" :title="t.productName">{{ t.productName }}</span>
            <span class="pub-task-time">{{ taskTime(t.createdAt) }}</span>
            <span class="pub-task-count">{{ statsOf(t).done }}/{{ statsOf(t).total }}</span>
          </div>
          <div class="pub-task-bar">
            <div class="pub-seg seg-cancelled" :style="{ width: pctOf(t).cancelled + '%' }" />
            <div class="pub-seg seg-success" :style="{ width: pctOf(t).success + '%' }" />
            <div class="pub-seg seg-failed" :style="{ width: pctOf(t).failed + '%' }" />
          </div>
          <div class="pub-task-foot">
            <span class="pub-task-status">{{ statusTextOf(t) }}</span>
            <span v-if="t.risk?.status === 'confirm' || statsOf(t).confirm > 0" class="pub-task-risk" @click="openRisk(t)">查看</span>
            <span v-else-if="t.intervene" class="pub-task-iv" @click="openIv(t)">处理</span>
            <span
              v-if="statsOf(t).failed + statsOf(t).cancelled + statsOf(t).confirm > 0"
              class="pub-task-toggle"
              @click="toggleTask(t.id)"
            >{{ isExpanded(t.id) ? '收起' : '详情' }}（{{ statsOf(t).failed + statsOf(t).cancelled + statsOf(t).confirm }}）</span>
          </div>
          <div v-if="isExpanded(t.id)" class="pub-task-fails">
            <div v-for="g in groupsOf(t)" :key="g.kind + g.reason" class="pub-fail-group">
              <div class="pub-fail-reason" :class="{ grey: g.kind === 'cancelled' }">
                <template v-if="g.kind === 'cancelled'">风控取消：{{ g.reason }}（{{ g.items.length }}）</template>
                <template v-else-if="g.kind === 'confirm'">待确认：命中公司风险管控（{{ g.items.length }}）</template>
                <template v-else>{{ g.reason }}（{{ g.items.length }}）</template>
                <span v-if="g.kind === 'confirm'" class="pub-group-risk" @click="openRisk(t, g.items[0])">查看</span>
              </div>
              <div class="pub-fail-shops">
                <span v-for="item in g.items" :key="item.id" class="pub-fail-shop-chip">
                  <span class="pub-fail-plat">{{ item.platform }}</span>{{ item.shop }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 人工介入弹窗：输入 RPA 弹出的验证码，验证通过后任务自动续跑 -->
    <div v-if="ivTask && ivTask.intervene" class="pub-iv-mask" @click.self="ivTask = null">
      <div class="pub-iv-modal">
        <div class="pub-iv-head">
          <b>需人工介入</b>
          <button type="button" title="关闭" @click="ivTask = null">✕</button>
        </div>
        <div class="pub-iv-body">
          <div class="pub-iv-kv"><span>店铺名称</span><b>{{ ivTask.intervene.shop }}</b></div>
          <div class="pub-iv-kv"><span>商品名称</span><b :title="ivTask.productName">{{ ivTask.productName }}</b></div>
          <div class="pub-iv-coderow">
            <span class="pub-iv-code" title="点击刷新" @click="refreshIvCode">{{ ivCode }}</span>
            <input v-model="ivInput" class="pub-iv-input" maxlength="4" placeholder="输入验证码" @keyup.enter="confirmIv" />
          </div>
        </div>
        <div class="pub-iv-foot">
          <button type="button" @click="ivTask = null">取消</button>
          <button type="button" class="primary" @click="confirmIv">确认</button>
        </div>
      </div>
    </div>

    <!-- 风控二次确认弹窗：继续上架→恢复发布 / 取消任务→风控取消 -->
    <TcRiskModal v-if="riskTask" :name="riskTask.productName" :reason="riskTask.risk?.reason || riskItem?.reason" @cancel="onRiskCancel" @continue="onRiskContinue" />
  </Teleport>
</template>

<style scoped>
.pub-progress {
  position: fixed;
  width: 380px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  overflow: hidden;
  user-select: none;
}

.pub-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: move;
}

.pub-progress-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.pub-progress-head-btns {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pub-progress-min,
.pub-progress-close {
  background: none;
  border: none;
  font-size: 14px;
  color: #8a94a6;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 4px;
}

.pub-progress-clear {
  background: none;
  border: none;
  font-size: 12px;
  color: #8a94a6;
  cursor: pointer;
  padding: 2px 8px;
  line-height: 1.4;
  border-radius: 4px;
}
.pub-progress-clear:hover {
  background: #f2f3f7;
  color: #f53f3f;
}

.pub-progress-min:hover,
.pub-progress-close:hover {
  background: #f2f3f7;
  color: #1d2129;
}

.pub-progress-empty {
  padding: 32px 16px;
  text-align: center;
  font-size: 13px;
  color: #8a94a6;
}

/* ===== 任务列表 ===== */
.pub-task-list {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: none;
}
.pub-task-list::-webkit-scrollbar { display: none; }

.pub-task-card {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.pub-task-card:last-child { border-bottom: none; }

.pub-task-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.pub-task-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pub-task-time {
  flex: none;
  font-size: 11px;
  color: #8a94a6;
}
.pub-task-count {
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: #8a94a6;
  min-width: 36px;
  text-align: right;
}

/* 分段进度条 */
.pub-task-bar {
  height: 5px;
  background: #f2f3f7;
  border-radius: 3px;
  overflow: hidden;
  display: flex;
  margin-bottom: 8px;
}
.pub-seg {
  height: 100%;
  transition: width 0.3s ease;
}
.pub-seg.seg-success { background: #00b42a; }
.pub-seg.seg-failed { background: #f53f3f; }
.pub-seg.seg-cancelled { background: #c9cdd4; }

.pub-task-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pub-task-status {
  font-size: 12px;
  color: #4e5969;
}
.pub-task-card.partial .pub-task-status { color: #f53f3f; }
.pub-task-card.success .pub-task-status { color: #00b42a; }
.pub-task-card.running .pub-task-status { color: #4f7cff; }
.pub-task-card.intervene .pub-task-status { color: #ff7d00; }
.pub-task-card.risk-confirm .pub-task-status { color: #ff7d00; }
.pub-task-card.cancelled .pub-task-status { color: #86909c; }

.pub-task-risk {
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: #ff7d00;
  cursor: pointer;
}
.pub-task-risk:hover { color: #d25f00; }

.pub-task-iv {
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: #ff7d00;
  cursor: pointer;
}
.pub-task-iv:hover { color: #d25f00; }

.pub-task-toggle {
  flex: none;
  font-size: 12px;
  color: #4f7cff;
  cursor: pointer;
}
.pub-task-toggle:hover { color: #3469ff; }

/* 失败分组 */
.pub-task-fails {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}
.pub-fail-group {
  padding: 6px 0;
}
.pub-fail-group:last-child { padding-bottom: 0; }
.pub-fail-reason {
  font-size: 12px;
  color: #f53f3f;
  line-height: 1.5;
  margin-bottom: 6px;
}
/* 风控取消组：灰字；待确认组内联「查看」入口 */
.pub-fail-reason.grey { color: #86909c; }
.pub-group-risk {
  margin-left: 8px;
  font-weight: 600;
  color: #ff7d00;
  cursor: pointer;
}
.pub-group-risk:hover { color: #d25f00; }
.pub-fail-shops {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pub-fail-shop-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #f7f8fa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  font-size: 12px;
  color: #4e5969;
}
.pub-fail-plat {
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  background: #f2f3f7;
  border-radius: 3px;
  font-size: 10px;
  color: #8a94a6;
}

/* ========== 悬浮球 ========== */
.pub-ball {
  position: fixed;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  cursor: move;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: box-shadow 0.2s;
}
.pub-ball:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); }

.pub-ball-ring {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pub-ball-svg {
  width: 48px;
  height: 48px;
  transform: rotate(-90deg);
}
.pub-ball-bg { stroke: #f2f3f7; }
.pub-ball.running .pub-ball-fg { stroke: #4f7cff; }
.pub-ball.partial .pub-ball-fg { stroke: #f53f3f; }
.pub-ball.success .pub-ball-fg { stroke: #00b42a; }
.pub-ball.intervene .pub-ball-fg { stroke: #ff7d00; }
.pub-ball.risk-confirm .pub-ball-fg { stroke: #ff7d00; }
.pub-ball-fg { transition: stroke-dasharray 0.3s ease, stroke 0.3s; }

.pub-ball-text {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 600;
  color: #1d2129;
  line-height: 1;
}

/* ========== 人工介入弹窗 ========== */
.pub-iv-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pub-iv-modal {
  width: 360px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.pub-iv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.pub-iv-head b { font-size: 14px; color: #1d2129; }
.pub-iv-head button {
  background: none;
  border: none;
  font-size: 14px;
  color: #8a94a6;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 4px;
}
.pub-iv-head button:hover { background: #f2f3f7; color: #1d2129; }

.pub-iv-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.pub-iv-kv { display: flex; gap: 12px; font-size: 13px; }
.pub-iv-kv span { flex: none; width: 60px; color: #8a94a6; }
.pub-iv-kv b {
  flex: 1;
  color: #1d2129;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pub-iv-coderow { display: flex; align-items: center; gap: 12px; }
.pub-iv-code {
  flex: none;
  width: 96px;
  padding: 8px 0 8px 6px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  font-style: italic;
  letter-spacing: 6px;
  color: #4f7cff;
  background: #f2f3f7;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
}
.pub-iv-input {
  flex: 1;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  font-size: 13px;
  color: #1d2129;
  outline: none;
}
.pub-iv-input:focus { border-color: #4f7cff; }

.pub-iv-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}
.pub-iv-foot button {
  padding: 6px 16px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #4e5969;
  cursor: pointer;
}
.pub-iv-foot button:hover { border-color: #c9cdd4; }
.pub-iv-foot button.primary { background: #4f7cff; border-color: #4f7cff; color: #fff; }
.pub-iv-foot button.primary:hover { background: #3f6cf2; border-color: #3f6cf2; }
</style>

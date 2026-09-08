<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { publishTasks, publishVisible, clearPublishTasks, closePublishPanel } from './publishStore';
import type { PublishItem, PublishTask } from './publishStore';

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
  return { total, success, failed, pending, done: total - pending };
};
const pctOf = (t: PublishTask) => {
  const s = statsOf(t);
  return {
    success: s.total ? (s.success / s.total) * 100 : 0,
    failed: s.total ? (s.failed / s.total) * 100 : 0,
  };
};
const statusClassOf = (t: PublishTask) => {
  const s = statsOf(t);
  if (s.pending > 0) return 'running';
  if (s.failed > 0) return 'partial';
  return 'success';
};
const statusTextOf = (t: PublishTask) => {
  const s = statsOf(t);
  if (s.pending > 0) return `发布中… ${s.done}/${s.total}`;
  if (s.failed > 0) return `成功 ${s.success} 条，失败 ${s.failed} 条`;
  return `全部成功（${s.success} 条）`;
};
/* 失败按原因归类 */
const groupsOf = (t: PublishTask) => {
  const map = new Map<string, PublishItem[]>();
  for (const item of t.items.filter((i) => i.status === 'failed')) {
    const key = item.reason || '未知原因';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([reason, items]) => ({ reason, items }));
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
  if (pendingAll.value > 0) return 'running';
  if (failedAll.value > 0) return 'partial';
  return 'success';
});
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
            <div class="pub-seg seg-success" :style="{ width: pctOf(t).success + '%' }" />
            <div class="pub-seg seg-failed" :style="{ width: pctOf(t).failed + '%' }" />
          </div>
          <div class="pub-task-foot">
            <span class="pub-task-status">{{ statusTextOf(t) }}</span>
            <span
              v-if="statsOf(t).failed > 0 && statsOf(t).pending === 0"
              class="pub-task-toggle"
              @click="toggleTask(t.id)"
            >{{ isExpanded(t.id) ? '收起' : '详情' }}（{{ statsOf(t).failed }}）</span>
          </div>
          <div v-if="isExpanded(t.id)" class="pub-task-fails">
            <div v-for="g in groupsOf(t)" :key="g.reason" class="pub-fail-group">
              <div class="pub-fail-reason">{{ g.reason }}（{{ g.items.length }}）</div>
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
.pub-ball-fg { transition: stroke-dasharray 0.3s ease, stroke 0.3s; }

.pub-ball-text {
  position: relative;
  z-index: 1;
  font-size: 11px;
  font-weight: 600;
  color: #1d2129;
  line-height: 1;
}
</style>

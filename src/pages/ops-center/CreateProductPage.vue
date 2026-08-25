<script setup lang="ts">
import { computed, ref } from 'vue';
import { createTaobaoRows, parentTasks } from './data';
import type { CreateRow, ParentTask } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import MoreActions from '../../components/MoreActions.vue';
import CreateDetailPage from './CreateDetailPage.vue';
import { useAnchorPop } from '../../hooks/useAnchorPop';
import { pushToast } from '../../components/toast';

/** 商品创建页 */
const rows = ref<CreateRow[]>(createTaobaoRows);
/* 详情态：复用内部商机/店铺商品详情样式 */
const detail = ref<CreateRow | null>(null);
/* 发布到：点击后气泡展示平台选项（滚动时跟随触发链接） */
const { pos: pubTip, open, close: closePubTip } = useAnchorPop();
/* 删除二次确认 */
const delRow = ref<CreateRow | null>(null);
/* 关联发布任务：选择执行中/队列中的任务批次 */
const linkRow = ref<CreateRow | null>(null);
const linkableTasks = computed(() => parentTasks.filter((t) => t.status !== 'done').slice(0, 6));
const linkTask = (t: ParentTask) => {
  linkRow.value = null;
  pushToast(`已关联发布任务「任务 #${t.id} · ${t.type}」`);
};

const openPubTip = (e: MouseEvent) => {
  e.stopPropagation();
  open(e.currentTarget as HTMLElement);
};

const copyRow = (row: CreateRow) => {
  rows.value = rows.value.flatMap((r) => (r.link === row.link ? [r, { ...r, link: `${row.link}-copy-${Date.now()}` }] : [r]));
};
const confirmDelete = () => {
  if (!delRow.value) return;
  const link = delRow.value.link;
  rows.value = rows.value.filter((r) => r.link !== link);
  delRow.value = null;
};
</script>

<template>
  <CreateDetailPage v-if="detail" :row="detail" @back="detail = null" />
  <div v-else class="create-page">
    <div class="ib-filters create-filter">
      <div class="ib-grid">
        <div class="ib-field">
          <label>商机来源</label>
          <BubbleSelect class-name="ib-select" default-value="全部" :options="['全部', '内部商机', '市场商机', '链接商品库']" />
        </div>
        <div class="ib-field">
          <label>来源平台</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="淘宝"
            :options="['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴']"
          />
        </div>
        <div class="ib-field">
          <label>链接商品ID</label>
          <input class="ib-input" placeholder="请输入链接商品ID" />
        </div>
        <div class="ib-field">
          <label>商品名称</label>
          <input class="ib-input" placeholder="请输入商品名称" />
        </div>
        <div class="ib-field">
          <label>状态</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="全部"
            :options="['全部', '已完善', '待完善']"
          />
        </div>
        <div class="ib-field">
          <label>发布店铺名</label>
          <input class="ib-input" placeholder="请输入发布店铺名" />
        </div>
        <div class="ib-field">
          <label>创建人名称</label>
          <input class="ib-input" placeholder="请输入创建人名称" />
        </div>
        <div class="ib-field">
          <label>创建时间</label>
          <div class="ib-range">
            <input class="ib-input" value="2026-08-13" />
            <span>→</span>
            <input class="ib-input" value="2026-08-13" />
          </div>
        </div>
        <div class="create-actions-inline">
          <div class="create-act-left">
            <button class="primaryBtn">快速铺货</button>
            <button class="primaryBtn">竞品导入</button>
          </div>
          <div class="create-act-right">
            <button class="lightBtn">重置</button>
            <button class="primaryBtn">查询</button>
          </div>
        </div>
      </div>
    </div>

    <div class="ib-table-card">
      <div class="ib-table-wrap">
        <table class="ib-table create-table">
          <thead>
            <tr>
              <th>商品信息</th>
              <th>上架店铺</th>
              <th>状态</th>
              <th>创建人 / 创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="row.link">
              <td>
                <div class="create-product">
                  <img class="create-thumb" :src="row.thumb" alt="thumb" />
                  <div>
                    <div class="create-product-title">
                      <span class="create-platform-badge taobao sm">
                        {{ row.platformBadge }}
                      </span>
                      <Ellipsis class-name="create-title-ell" :text="row.title" />
                    </div>
                    <div class="create-link">
                      竞品链接：<a href="#"><Ellipsis class-name="create-link-ell" :text="row.link" /></a>
                      <span>◉</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="create-store-text">{{ row.store }}</td>
              <td>
                <span class="sgd-tag" :class="i % 2 ? 'orange' : 'green'">{{ i % 2 ? '待完善' : '已完善' }}</span>
              </td>
              <td>
                <div class="create-person">{{ row.person }}</div>
                <div class="create-time">{{ row.time }}</div>
              </td>
              <td class="create-ops">
                <a href="#" @click.prevent="detail = row">详情</a>
                <a
                  href="#"
                  @click.prevent="openPubTip"
                >
                  发布到
                </a>
                <MoreActions
                  :items="[
                    { label: '关联发布任务', onClick: () => (linkRow = row) },
                    { label: '复制', onClick: () => copyRow(row) },
                    { label: '删除', danger: true, onClick: () => (delRow = row) },
                  ]"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 128 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn">2</button>
          <button class="ib-pagebtn">3</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="pubTip"
        class="add-pop"
        :style="{ left: `${pubTip.x}px`, top: `${pubTip.y}px` }"
        @mousedown.stop
      >
        <div class="add-pop-title">发布到指定店铺</div>
        <div v-for="t in ['淘宝心选店', '天猫Funion旗舰店', 'AAA小店']" :key="t" class="add-pop-item" @click="closePubTip()">
          {{ t }}
        </div>
      </div>

      <div v-if="delRow" class="cp-modal-mask">
        <div class="cp-modal">
          <div class="cp-modal-title">删除确认</div>
          <div class="cp-modal-text">商品模版删除后无法恢复，是否确认删除？</div>
          <div class="cp-modal-foot">
            <button class="cp-btn" @click="delRow = null">取消</button>
            <button
              class="cp-btn danger"
              @click="confirmDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>

      <div v-if="linkRow" class="cp-modal-mask">
        <div class="cp-modal">
          <div class="cp-modal-title">关联发布任务</div>
          <div class="cp-modal-text">将「{{ linkRow.title }}」关联到以下发布任务：</div>
          <div class="cp-task-list">
            <button v-for="t in linkableTasks" :key="t.id" type="button" class="cp-task-item" @click="linkTask(t)">
              <b>任务 #{{ t.id }}</b>
              <span>{{ t.type }} · {{ t.channel }}渠道</span>
              <em>{{ t.status === 'running' ? '执行中' : '队列中' }}</em>
            </button>
          </div>
          <div class="cp-modal-foot">
            <button class="cp-btn" @click="linkRow = null">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

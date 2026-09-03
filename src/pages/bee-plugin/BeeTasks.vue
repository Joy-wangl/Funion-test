<script setup lang="ts">
import { computed, ref } from 'vue';
import Ellipsis from '../../components/Ellipsis.vue';
import { pushToast } from '../../components/toast';
import { BEE_PLATFORM_LOGO, PUB_STATUS_META, beePubTasks, pubTaskMeta, retryFailed, retrySub } from './data';
import type { BeePubSub, BeePubTask } from './data';

const emit = defineEmits<{ (e: 'close'): void }>();

/* 筛选：商品名称搜索 + 任务状态分段，直接生效 */
const kw = ref('');
const status = ref('全部');
const STATUSES = ['全部', '发布中', '部分成功', '全部成功', '全部失败'];

const filtered = computed(() => beePubTasks.value.filter((t) => {
  if (kw.value.trim() && !t.title.includes(kw.value.trim())) return false;
  if (status.value !== '全部' && PUB_STATUS_META[pubTaskMeta(t).status].label !== status.value) return false;
  return true;
}));

/* 展开查看商品在各店铺的发布明细 */
const expanded = ref<Set<string>>(new Set());
const toggle = (id: string) => {
  const n = new Set(expanded.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  expanded.value = n;
};

const onRetrySub = (s: BeePubSub) => {
  retrySub(s);
  pushToast(`「${s.shopName}」重新发布已发起`);
};
const onRetryTask = (t: BeePubTask) => {
  const n = t.subs.filter((s) => s.status === 'failed').length;
  retryFailed(t);
  pushToast(`已对 ${n} 个失败店铺发起重试`);
};
</script>

<template>
  <div class="bp-page">
    <!-- 顶栏 -->
    <div class="bp-head">
      <span class="bee-logo">🐝</span>
      <span class="bp-title">蜜蜂搬家 · 任务管理</span>
      <div class="bp-head-r">
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="bp-body">
      <!-- 筛选栏 -->
      <div class="bp-filter">
        <div class="bp-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input v-model="kw" placeholder="搜索商品标题..." />
        </div>
        <div class="bp-seg">
          <button v-for="s in STATUSES" :key="s" :class="status === s ? 'active' : ''" @click="status = s">
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 任务列表：商品维度 -->
      <div class="bp-card">
        <table class="bp-table bt-table">
          <thead>
            <tr>
              <th style="width: 40px" />
              <th>商品信息</th>
              <th style="width: 90px">任务ID</th>
              <th style="width: 90px">目标店铺</th>
              <th style="width: 170px">发布进度</th>
              <th style="width: 100px">任务状态</th>
              <th style="width: 140px">创建时间</th>
              <th style="width: 130px">操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="t in filtered" :key="t.id">
              <tr class="bt-row" :class="{ open: expanded.has(t.id) }">
                <td>
                  <button class="bt-exp" :title="expanded.has(t.id) ? '收起明细' : '展开各店铺明细'" @click="toggle(t.id)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                </td>
                <td>
                  <div class="bt-goods">
                    <img :src="t.img" alt="" />
                    <div class="bt-gt">
                      <Ellipsis :text="t.title" />
                      <span class="bt-plat"><img :src="BEE_PLATFORM_LOGO[t.platform]" alt="" />{{ t.platform }}</span>
                    </div>
                  </div>
                </td>
                <td class="bp-time">{{ t.id }}</td>
                <td>{{ pubTaskMeta(t).total }} 个</td>
                <td>
                  <div class="bt-prog">
                    <div class="bt-bar"><i :style="{ width: `${(pubTaskMeta(t).ok / pubTaskMeta(t).total) * 100}%` }" /></div>
                    <span>{{ pubTaskMeta(t).ok }}/{{ pubTaskMeta(t).total }} 成功</span>
                  </div>
                </td>
                <td><span class="bp-tag" :class="PUB_STATUS_META[pubTaskMeta(t).status].cls">{{ PUB_STATUS_META[pubTaskMeta(t).status].label }}</span></td>
                <td class="bp-time">{{ t.createTime }}</td>
                <td>
                  <div class="bp-acts">
                    <a v-if="pubTaskMeta(t).fail > 0" href="javascript:void(0)" @click.prevent="onRetryTask(t)">重试失败</a>
                    <a href="javascript:void(0)" @click.prevent="toggle(t.id)">{{ expanded.has(t.id) ? '收起' : '明细' }}</a>
                  </div>
                </td>
              </tr>
              <!-- 展开：该商品发布到各店铺的子任务 -->
              <tr v-if="expanded.has(t.id)" :key="`${t.id}-subs`" class="bt-subrow">
                <td colspan="8">
                  <table class="bt-subtable">
                    <thead>
                      <tr>
                        <th style="width: 90px">平台</th>
                        <th>店铺</th>
                        <th style="width: 90px">发布状态</th>
                        <th>说明</th>
                        <th style="width: 140px">时间</th>
                        <th style="width: 70px">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="s in t.subs" :key="s.id">
                        <td><span class="bt-plat"><img :src="BEE_PLATFORM_LOGO[s.platform]" alt="" />{{ s.platform }}</span></td>
                        <td class="bt-shopname">{{ s.shopName }}</td>
                        <td>
                          <span class="bp-tag" :class="s.status === 'success' ? 'ok' : s.status === 'failed' ? 'fail' : 'run'">
                            {{ s.status === 'success' ? '成功' : s.status === 'failed' ? '失败' : '发布中' }}
                          </span>
                        </td>
                        <td class="bt-msg" :class="{ err: s.status === 'failed' }">{{ s.msg }}</td>
                        <td class="bp-time">{{ s.time }}</td>
                        <td>
                          <div class="bp-acts"><a v-if="s.status === 'failed'" href="javascript:void(0)" @click.prevent="onRetrySub(s)">重试</a><span v-else>-</span></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- 空态 -->
        <div v-if="filtered.length === 0" class="bp-empty">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8L12 3z" /></svg>
          <div class="bp-empty-t">暂无铺货任务</div>
          <div class="bp-empty-s">在选品库中勾选已完善商品，点击「发起铺货任务」即可创建</div>
        </div>
      </div>

      <div class="bp-pager"><span>共 {{ filtered.length }} 条任务</span></div>
    </div>
  </div>
</template>

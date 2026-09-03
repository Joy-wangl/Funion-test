<script setup lang="ts">
/* 令牌管理：应用令牌信息管理
   外层平台维度：平台卡片（账号数+最近更新时间），点击进入
   内层平台账号：账号令牌卡片（添加时间/最近更新）+ 删除二次确认
   新建令牌弹窗：平台选择默认跟随当前层 */
import { computed, ref } from 'vue';
import { pushToast } from '../../components/toast';
import {
  TOKEN_PLATFORMS, TOKEN_PLATFORM_LOGO,
  tokenRows, type TokenPlatform, type TokenRow,
} from './data';
import './TokenManage.css';

const rows = ref<TokenRow[]>([...tokenRows]);

/* ── 平台维度：外层平台卡，点击进入对应平台账号列表 ── */
const curPlat = ref<TokenPlatform | null>(null);
const platGroups = computed(() => TOKEN_PLATFORMS
  .map((p) => ({ platform: p, items: rows.value.filter((r) => r.platform === p) }))
  .filter((g) => g.items.length > 0));
const curGroup = computed(() => platGroups.value.find((g) => g.platform === curPlat.value) ?? null);
const latestOf = (items: TokenRow[]) => items.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), '');

/* ── 行操作：删除二次确认 ── */
const confirm = ref<TokenRow | null>(null);
const doConfirm = () => {
  if (!confirm.value) return;
  const row = confirm.value;
  rows.value = rows.value.filter((r) => r.id !== row.id);
  pushToast(`已删除「${row.name}」`);
  confirm.value = null;
};


</script>

<template>
  <div class="token-manage">
    <!-- 页头：标题 -->
    <div class="tm-head">
      <div>
        <h2>令牌管理</h2>
        <p>集中管理应用令牌信息与状态，令牌用于各平台开放接口调用鉴权</p>
      </div>
    </div>

    <!-- 外层：平台维度 -->
    <template v-if="!curPlat">
      <div class="tm-plat-grid">
        <button v-for="g in platGroups" :key="g.platform" class="tm-plat-card" @click="curPlat = g.platform">
          <img :src="TOKEN_PLATFORM_LOGO[g.platform]" alt="" />
          <div class="tm-plat-info">
            <b>{{ g.platform }}</b>
            <span>{{ g.items.length }} 个账号令牌 · 最近更新 {{ latestOf(g.items) }}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <div v-if="!platGroups.length" class="tm-empty">暂无令牌，点击右上角「新建令牌」创建</div>
      <div class="tm-count">共 {{ rows.length }} 条令牌</div>
    </template>

    <!-- 内层：平台下账号令牌 -->
    <template v-else>
      <div class="tm-crumb">
        <button class="tm-back" @click="curPlat = null">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          返回
        </button>
        <span class="tm-plat"><img :src="TOKEN_PLATFORM_LOGO[curPlat]" alt="" />{{ curPlat }}</span>
        <span class="tm-group-count">{{ curGroup?.items.length ?? 0 }} 个账号令牌</span>
      </div>
      <div v-if="curGroup" class="tm-grid">
        <div v-for="t in curGroup.items" :key="t.id" class="tm-item">
          <div class="tm-item-head">
            <span class="tm-name">ID: {{ t.id }}</span>
          </div>
          <div class="tm-meta">
            <div class="tm-meta-row"><span>创建人</span><b>{{ t.creator }}</b></div>
            <div class="tm-meta-row"><span>添加时间</span><b>{{ t.createdAt }}</b></div>
            <div class="tm-meta-row"><span>最近更新</span><b>{{ t.updatedAt }}</b></div>
          </div>
          <div class="tm-item-foot">
            <a class="tm-enter" href="#" @click.prevent="pushToast(`已进入「${t.name}」令牌配置`)">进入</a>
            <a href="#" @click.prevent="confirm = t">删除</a>
          </div>
        </div>
      </div>
      <div v-else class="tm-empty">该平台下暂无令牌</div>
      <div class="tm-count">共 {{ curGroup?.items.length ?? 0 }} 条</div>
    </template>

    <!-- 删除二次确认 -->
    <div v-if="confirm" class="tm-mask" @click.self="confirm = null">
      <div class="tm-dialog small">
        <div class="tm-dlg-head">
          <span>删除令牌</span>
          <button class="tm-ic" @click="confirm = null">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="tm-dlg-body">
          <p class="tm-confirm-tip">删除后「{{ confirm.name }}」不可恢复，关联调用将鉴权失败，确认删除？</p>
        </div>
        <div class="tm-dlg-foot">
          <button class="tm-btn" @click="confirm = null">取消</button>
          <button class="tm-btn danger" @click="doConfirm">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

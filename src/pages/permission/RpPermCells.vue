<script setup lang="ts">
import type { PermMenuItem } from './data';
import { IconCheck } from './permIcons';
import { scopeOf, scopeSummary } from './permScope';

/* ---------- 权限矩阵单元格（查看/管理/功能三列） ---------- */
defineProps<{ cfg: PermMenuItem; keyPrefix: string; scopeKey?: string }>();
const emit = defineEmits<{ (e: 'pick'): void; (e: 'pickScope', key: string, kind: 'view' | 'manage'): void }>();
</script>

<template>
  <td>
    <span v-if="!cfg.view" class="dash">–</span>
    <div v-else class="perm-list">
      <label v-for="(opt, i) in cfg.view.opts" :key="i" class="radio">
        <input type="radio" :name="keyPrefix + '_v'" :checked="i === cfg.view.sel" />
        <span class="dot"></span>
        {{ opt }}
        <span v-if="i === cfg.view.sel && cfg.view.link" class="link" @click="emit('pick')">{{ cfg.view.link }}</span>
      </label>
      <div v-if="cfg.scope && scopeKey" class="perm-scope">
        <span class="ps-label">可见平台/店铺</span>
        <span class="link" @click="emit('pickScope', scopeKey, 'view')">{{ scopeSummary(scopeOf(scopeKey).view) }}</span>
      </div>
    </div>
  </td>
  <td>
    <span v-if="!cfg.manage" class="dash">–</span>
    <div v-else class="perm-list">
      <label v-for="(opt, i) in cfg.manage.opts" :key="i" class="radio">
        <input type="radio" :name="keyPrefix + '_m'" :checked="i === cfg.manage.sel" />
        <span class="dot"></span>
        {{ opt }}
        <span v-if="i === cfg.manage.sel && cfg.manage.link" class="link" @click="emit('pick')">{{ cfg.manage.link }}</span>
      </label>
      <div v-if="cfg.scope && scopeKey" class="perm-scope">
        <span class="ps-label">可管理平台/店铺</span>
        <span class="link" @click="emit('pickScope', scopeKey, 'manage')">{{ scopeSummary(scopeOf(scopeKey).manage) }}</span>
      </div>
    </div>
  </td>
  <td>
    <span v-if="!cfg.func.length" class="dash">–</span>
    <div v-else :class="cfg.func.length > 3 ? 'func-list cols' : 'func-list'">
      <label v-for="f in cfg.func" :key="f" class="checkbox">
        <input type="checkbox" />
        <span class="box"><IconCheck /></span>
        {{ f }}
      </label>
    </div>
  </td>
</template>

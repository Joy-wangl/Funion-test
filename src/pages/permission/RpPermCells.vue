<script setup lang="ts">
import type { PermMenuItem } from './data';
import { IconCheck } from './permIcons';

/* ---------- 权限矩阵单元格（查看/管理/功能三列） ---------- */
defineProps<{ cfg: PermMenuItem; keyPrefix: string }>();
const emit = defineEmits<{ (e: 'pick'): void }>();
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

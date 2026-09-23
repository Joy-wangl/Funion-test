<script setup lang="ts">
import type { ColFieldState } from './colFields';

/* ---------- 列表字段管理入口：▦ 按钮＋气泡（勾选显隐＋拖拽排序＋左/右钉住） ----------
   智能运营中心二级路由列表页共用；仅列表字段，不含查询条件管理 */
const props = defineProps<{ st: ColFieldState }>();
/* 解构为顶层绑定：模板自动解包 ref（st 由 useColField 创建后身份不变，解构安全） */
const {
  pop, changed, orderedFields, dragKey, shown, toggle, onDrop,
  pinL, pinR, togglePinLeft, togglePinRight,
} = props.st;
</script>

<template>
  <span class="om-col-anchor">
    <button class="id-btn icon" :class="{ on: changed }" title="管理列表字段" @mousedown.stop @click="pop = !pop">▦</button>
    <!-- 气泡：absolute 锚定 ▦ 按钮（随页面滚动跟随、右缘对齐）；行=勾选(显隐)＋拖拽柄(排序)＋名称＋左钉/右钉双 icon -->
    <div v-if="pop" class="om-col-pop" @mousedown.stop>
      <div class="om-col-title">列表字段管理</div>
      <label
        v-for="c in orderedFields" :key="c.key"
        class="om-col-item" :class="{ dragging: dragKey === c.key }"
        draggable="true"
        @dragstart="dragKey = c.key"
        @dragover.prevent
        @drop.prevent="onDrop(c.key)"
      >
        <input type="checkbox" :checked="shown(c.key)" @change="toggle(c.key)">
        <svg class="om-col-grip" width="10" height="14" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="3" r="1.3" /><circle cx="7.5" cy="3" r="1.3" /><circle cx="2.5" cy="8" r="1.3" /><circle cx="7.5" cy="8" r="1.3" /><circle cx="2.5" cy="13" r="1.3" /><circle cx="7.5" cy="13" r="1.3" /></svg>
        <span class="om-col-name">{{ c.label }}</span>
        <button
          class="om-col-ico" :class="{ on: pinL.includes(c.key) }"
          :title="pinL.includes(c.key) ? '取消钉住' : '钉住到列表最左'"
          @click.prevent.stop="togglePinLeft(c.key)"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" /></svg>
        </button>
        <button
          class="om-col-ico r" :class="{ on: pinR.includes(c.key) }"
          :title="pinR.includes(c.key) ? '取消钉住' : '钉住到列表最右'"
          @click.prevent.stop="togglePinRight(c.key)"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" /></svg>
        </button>
      </label>
    </div>
  </span>
</template>

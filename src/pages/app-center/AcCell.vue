<script setup lang="ts">
/* 列表/我的应用共用行（1:1 移植自 AppCenter.tsx 的 renderCell + ActionBtn）
   caret=打开+展开（我的应用行/列表我创建的）；其余=添加/更新/打开 */
import { actKind, type AppItem } from './data';
import { IC } from './acHelpers';
import AcSvg from './AcSvg.vue';
import AcLogo from './AcLogo.vue';

defineProps<{
  app: AppItem;
  caret: boolean;
  loading: boolean;
  favOn: boolean;
  /** 行菜单已打开（caret 箭头朝上） */
  menuOpen: boolean;
  onOpen: () => void;
  onAct: (a: AppItem) => void;
  onToggleFav: (id: string) => void;
  onOpenMenu: (id: string, e: MouseEvent) => void;
}>();
</script>

<template>
  <div class="ap-cell" @click="onOpen()">
    <div class="ap-card-top">
      <AcLogo :icon="app.icon" />
      <span class="ap-row-name">{{ app.name }}<i v-if="app.publishMode === 'test'" class="ap-badge-test">测试中</i></span>
      <div v-if="caret" class="ap-open-wrap" @click.stop>
        <button type="button" class="ap-act plain" @click="onAct(app)">打开</button>
        <button type="button" class="ap-act caret" @click="onOpenMenu(app.id, $event)">
          <AcSvg :d="IC.caret" :size="12" :class-name="menuOpen ? 'up' : ''" />
        </button>
      </div>
      <template v-else>
        <span v-if="loading" class="ap-spin" />
        <button
          v-else
          type="button"
          class="ap-act"
          :class="actKind(app) === 'update' ? 'update' : 'plain'"
          @click.stop="onAct(app)"
        >
          {{ actKind(app) === 'add' ? '添加' : actKind(app) === 'update' ? '更新' : '打开' }}
        </button>
      </template>
    </div>
    <div class="ap-card-bottom">
      <span class="ap-row-desc">{{ app.desc }}</span>
      <button
        type="button"
        class="ap-fav"
        :class="{ on: favOn }"
        :title="favOn ? '取消收藏' : '收藏'"
        @click.stop="onToggleFav(app.id)"
      >
        <AcSvg :d="IC.starFill" :size="16" filled vb="0 0 1024 1024" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 商品营销›限时抢购：占位页（暂无数据，不虚构内容） */
</script>

<template>
  <div class="sg-page st-page">
    <!-- 页头 -->
    <div class="fs-head">
      <span class="fs-head-t">限时抢购</span>
    </div>

    <div class="sg-card">
      <div class="sg-empty">
        <div class="sg-empty-wrap">
          <div class="sg-empty-icon">◌</div>
          <div>暂无数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 页头：蓝竖条标题（同商品策略页头语言） */
.fs-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.fs-head-t {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #202532);
}

.fs-head-t::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-primary, #4f7cff);
  border-radius: 2px;
}
</style>

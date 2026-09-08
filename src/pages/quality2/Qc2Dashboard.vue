<script setup lang="ts">
/* ---------- 品控中心 2.0 · 标签概览
   结构：轻量化 hero → 本月时机推荐（独立大模块，逐条标注推荐原因）→ 大类命中占比（数据磁贴铺满，字号对齐品控中心 .qc-stat） ---------- */
import { computed } from 'vue';
import { CAT_COLOR, catStats, timingNow } from './qc2Data';

const props = defineProps<{
  onPickCat: (cat: string | null) => void;
  onPickLabel: (label: string | null) => void;
}>();

/* ---------- 大类命中占比（磁贴） ---------- */
const cats = computed(() => catStats().filter((c) => c.cat !== '补充分析项'));
const pieTotal = computed(() => cats.value.reduce((t, c) => t + c.hits, 0));

const timing = computed(() => timingNow());
</script>

<template>
  <div class="qc2-dash">
    <!-- 轻量化 hero：体系定位 + 本月时机入口 -->
    <div class="qc2-hero">
      <div class="qc2-hero-txt">
        <span class="qc2-hero-chip">商品标签体系</span>
        <h2>商品标签 · 什么时候能做什么品，一眼看清</h2>
        <p>标签命中 / 健康等级 / 时机建议 / AI 分析，一站式商品决策</p>
      </div>
      <div class="qc2-hero-art" aria-hidden="true"><i class="b1" /><i class="b2" /><i class="g1" /><i class="g2" /></div>
    </div>

    <!-- 本月时机推荐：独立大模块，标注每个标签的推荐原因，点击下钻编码列表 -->
    <section class="qc2-card">
      <div class="qc2-sec-head">
        <b>{{ timing.month }} 月时机推荐</b>
        <span>按季节与大促节点给出的备货 / 主推窗口 · 点击卡片下钻该标签编码列表</span>
      </div>
      <div v-if="timing.list.length" class="qc2-timing-grid">
        <button
          v-for="t in timing.list"
          :key="t.labelName"
          type="button"
          class="qc2-timing-item"
          @click="props.onPickLabel(t.labelName)"
        >
          <span class="qc2-timing-item-head">
            <b>{{ t.labelName }}</b>
            <!-- 大类标注与「大类命中占比」磁贴同款：方色点 + 辅助色文字 -->
            <span class="qc2-pie-tile-head"><i :style="{ background: CAT_COLOR[t.cat] }" />{{ t.cat }}</span>
          </span>
          <span class="qc2-timing-item-why">推荐理由：{{ t.why }}</span>
          <span class="qc2-timing-item-go">查看命中编码 →</span>
        </button>
      </div>
      <span v-else class="qc2-timing-empty">本月暂无明确时机推荐</span>
    </section>

    <!-- 大类命中占比：数据磁贴铺满（字号对齐品控中心 .qc-stat） -->
    <section class="qc2-card">
      <div class="qc2-sec-head">
        <b>大类命中占比</b>
        <span>点击大类下钻编码列表 · 统计全监控周期</span>
      </div>
      <div class="qc2-pie-tiles">
        <button v-for="c in cats" :key="c.cat" type="button" class="qc2-pie-tile" @click="props.onPickCat(c.cat)">
          <span class="qc2-pie-tile-head"><i :style="{ background: c.color }" />{{ c.cat }}</span>
          <span class="qc2-pie-tile-num">
            <b>{{ c.hits }}</b>
            <i>{{ pieTotal ? `${Math.round((c.hits / pieTotal) * 1000) / 10}%` : '0%' }}</i>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

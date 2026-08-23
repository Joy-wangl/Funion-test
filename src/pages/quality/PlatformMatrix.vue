<script setup lang="ts">
/* ---------- 平台数据矩阵 ---------- */
import { computed } from 'vue';
import { PLATFORMS, pct, rateCls, type Platform, type PlatformStat } from './data';
import PlatLogo from './PlatLogo.vue';
import ProbTags from './ProbTags.vue';

const props = withDefaults(defineProps<{
  stats: PlatformStat[];
  threshold: number;
  /** 各平台命中问题类型（类型 + 次数，降序） */
  problemHits?: Partial<Record<Platform, [string, number][]>>;
  /** 是否展示最近订单列 */
  showLastOrder?: boolean;
  /** 提供时展示操作列：聊天记录 */
  onChat?: (platform: Platform) => void;
  /** 提供时展示操作列：趋势图（平台维度） */
  onTrend?: (stat: PlatformStat) => void;
}>(), { showLastOrder: true });

const map = computed(() => new Map(props.stats.map((s) => [s.platform, s])));
</script>

<template>
  <table class="matrix">
    <thead>
      <tr>
        <th>平台</th>
        <th style="width: 90px">订单量</th>
        <th style="width: 90px">退款率</th>
        <th style="width: 90px">售后单</th>
        <th style="width: 100px">聊天风险</th>
        <th style="width: 90px">聊天风险率</th>
        <th>命中问题类型</th>
        <th v-if="showLastOrder">最近订单</th>
        <th v-if="onChat || onTrend" style="width: 90px">操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="pl in PLATFORMS" :key="pl" :class="map.get(pl) ? '' : 'off'">
        <td>
          <span class="plat-chip">
            <PlatLogo :platform="pl" :off="!map.get(pl)" />
            {{ pl }}
          </span>
        </td>
        <td>{{ map.get(pl) ? map.get(pl)!.orders.toLocaleString() : '—' }}</td>
        <td>
          <span v-if="map.get(pl)" class="rate" :class="rateCls(map.get(pl)!.refundRate, threshold)">{{ pct(map.get(pl)!.refundRate) }}</span>
          <template v-else>—</template>
        </td>
        <td>{{ map.get(pl) ? map.get(pl)!.afterSales : '—' }}</td>
        <td>
          <template v-if="map.get(pl)">
            <span v-if="map.get(pl)!.chatRisks" class="rate bad">{{ map.get(pl)!.chatRisks }}</span>
            <template v-else>0</template>
          </template>
          <template v-else>—</template>
        </td>
        <td>{{ map.get(pl) ? (map.get(pl)!.orders ? pct(map.get(pl)!.chatRisks / map.get(pl)!.orders) : '0.0%') : '—' }}</td>
        <td>
          <ProbTags v-if="map.get(pl) && problemHits?.[pl]?.length" :hits="problemHits![pl]!" />
          <template v-else>—</template>
        </td>
        <td v-if="showLastOrder" style="color: var(--text-3)">{{ map.get(pl) ? map.get(pl)!.lastOrderAt : '—' }}</td>
        <td v-if="onChat || onTrend">
          <div v-if="map.get(pl)" class="qc-op-col">
            <a v-if="onChat" class="op-a" @click="onChat(pl)">聊天记录</a>
            <a v-if="onTrend" class="op-a" @click="onTrend(map.get(pl)!)">趋势图</a>
          </div>
          <template v-else>—</template>
        </td>
      </tr>
    </tbody>
  </table>
</template>

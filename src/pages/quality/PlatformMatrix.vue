<script setup lang="ts">
/* ---------- 平台数据矩阵 ---------- */
import { computed } from 'vue';
import { PLATFORMS, pct, rateCls, type Platform, type PlatformStat } from './data';
import { CAT_COLOR, HEALTH_META, type TagBrief } from '../quality2/qc2Data';
import PlatLogo from './PlatLogo.vue';
import ProbTags from './ProbTags.vue';

const props = withDefaults(defineProps<{
  stats: PlatformStat[];
  threshold: number;
  /** 各平台命中问题类型（类型 + 次数，降序） */
  problemHits?: Partial<Record<Platform, [string, number][]>>;
  /** 各平台会话总数：提供时聊天风险率=聊天风险/会话总数（与列表行口径一致），缺省按订单量计 */
  chatTotals?: Partial<Record<Platform, number>>;
  /** 是否展示最近订单列 */
  showLastOrder?: boolean;
  /** 提供时追加健康等级 / 命中标签两列（按平台在售编码聚合） */
  tagBrief?: (pl: Platform) => TagBrief | null;
  /** 提供时展示操作列：聊天记录 */
  onChat?: (platform: Platform) => void;
  /** 提供时展示操作列：趋势图（平台维度） */
  onTrend?: (stat: PlatformStat) => void;
}>(), { showLastOrder: true });

const map = computed(() => new Map(props.stats.map((s) => [s.platform, s])));
const tb = (pl: Platform) => props.tagBrief?.(pl) ?? null;
</script>

<template>
  <table class="matrix">
    <thead>
      <tr>
        <th>平台</th>
        <th>订单量</th>
        <th>退款率</th>
        <th>售后单</th>
        <th>聊天风险</th>
        <th>聊天风险率</th>
        <th>命中问题类型</th>
        <th v-if="tagBrief">健康等级</th>
        <th v-if="tagBrief">命中标签</th>
        <th v-if="showLastOrder">最近订单</th>
        <th v-if="onChat || onTrend">操作</th>
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
        <td>{{ map.get(pl) ? (props.chatTotals?.[pl] ? pct(map.get(pl)!.chatRisks / props.chatTotals[pl]!) : (map.get(pl)!.orders ? pct(map.get(pl)!.chatRisks / map.get(pl)!.orders) : '0.0%')) : '—' }}</td>
        <td>
          <ProbTags v-if="map.get(pl) && problemHits?.[pl]?.length" :hits="problemHits![pl]!" />
          <template v-else>—</template>
        </td>
        <td v-if="tagBrief">
          <span
            v-if="tb(pl)?.health"
            class="qc-health-tag"
            :title="HEALTH_META[tb(pl)!.health!].label"
            :style="{ color: HEALTH_META[tb(pl)!.health!].color, borderColor: HEALTH_META[tb(pl)!.health!].color }"
          >{{ tb(pl)!.health }}</span>
          <span v-else style="color: var(--text-4)">-</span>
        </td>
        <td v-if="tagBrief">
          <div v-if="tb(pl)?.chips.length" class="prob-tags">
            <span
              v-for="l in tb(pl)!.chips"
              :key="l.id"
              class="tag"
              :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
            >{{ l.name }}</span>
            <span v-if="tb(pl)!.extra" class="tag prob-more">
              +{{ tb(pl)!.extra }}
              <span class="prob-bubble">
                <span
                  v-for="l in tb(pl)!.labels"
                  :key="l.id"
                  class="tag"
                  :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
                >{{ l.name }}</span>
              </span>
            </span>
          </div>
          <span v-else style="color: var(--text-4)">-</span>
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

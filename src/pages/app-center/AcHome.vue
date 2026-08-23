<script setup lang="ts">
/* 应用中心首页（1:1 移植自 AppCenter.tsx 的 renderHome） */
import { computed } from 'vue';
import { PLATFORM_NOTICES, RANK_RANGES, creatorDept, usageInRange, type AppItem, type FeedbackItem } from './data';
import { IC } from './acHelpers';
import BubbleSelect from '../../components/BubbleSelect.vue';
import AcSvg from './AcSvg.vue';
import AcLogo from './AcLogo.vue';
import AcCell from './AcCell.vue';

const props = defineProps<{
  apps: AppItem[];
  recent: { id: string; at: number }[];
  favIds: string[];
  loadingId: string | null;
  menuId: string | null;
  bannerIdx: number;
  rankRange: string;
  rankTab: 'person' | 'dept' | 'best';
  rankOpen: string | null;
  fbFilter: 'all' | 'pending' | 'replied';
  fbList: FeedbackItem[];
  onNotice: (id: string) => void;
  onBannerIdx: (i: number) => void;
  onOpenDetail: (id: string) => void;
  onGotoDash: () => void;
  onRankTab: (k: 'person' | 'dept' | 'best') => void;
  onRankRange: (v: string) => void;
  onRankOpen: (name: string | null) => void;
  onFbFilter: (k: 'all' | 'pending' | 'replied') => void;
  onNewFb: () => void;
  onFbDetail: (id: string) => void;
  onAct: (a: AppItem) => void;
  onToggleFav: (id: string) => void;
  onOpenMenu: (id: string, e: MouseEvent) => void;
}>();

const recentApps = computed(() => props.recent
  .map((r) => ({ app: props.apps.find((a) => a.id === r.id), at: r.at }))
  .filter((x): x is { app: AppItem; at: number } => Boolean(x.app)));
const favApps = computed(() => props.apps.filter((a) => props.favIds.includes(a.id)));

const releases = computed(() => {
  const now = Date.now();
  return props.apps
    .filter((a) => a.hasUpdate || now - new Date(a.release).getTime() <= 30 * 86400000)
    .sort((a, b) => b.release.localeCompare(a.release));
});

/* 贡献榜时间维度：个人/部门榜仅统计范围内上架的创作 */
const rankData = computed(() => {
  const now = Date.now();
  const rangeDays = props.rankRange === '近7天' ? 7 : props.rankRange === '近30天' ? 30 : 0;
  const rangedApps = rangeDays === 0 ? props.apps : props.apps.filter((a) => now - new Date(a.release).getTime() <= rangeDays * 86400000);
  const personMap = new Map<string, number>();
  rangedApps.forEach((a) => personMap.set(a.creator, (personMap.get(a.creator) ?? 0) + 1));
  const personRank = [...personMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const deptMap = new Map<string, number>();
  rangedApps.forEach((a) => {
    const d = creatorDept(a.creator);
    deptMap.set(d, (deptMap.get(d) ?? 0) + 1);
  });
  const deptRank = [...deptMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const personUsers = new Map<string, number>();
  rangedApps.forEach((a) => personUsers.set(a.creator, (personUsers.get(a.creator) ?? 0) + usageInRange(a, props.rankRange)));
  const deptUsers = new Map<string, number>();
  rangedApps.forEach((a) => {
    const d = creatorDept(a.creator);
    deptUsers.set(d, (deptUsers.get(d) ?? 0) + usageInRange(a, props.rankRange));
  });
  const deptCreators = new Map<string, Set<string>>();
  rangedApps.forEach((a) => {
    const d = creatorDept(a.creator);
    if (!deptCreators.has(d)) deptCreators.set(d, new Set());
    deptCreators.get(d)?.add(a.creator);
  });
  const bestApps = [...props.apps].sort((a, b) => usageInRange(b, props.rankRange) - usageInRange(a, props.rankRange)).slice(0, 10);
  return { personRank, deptRank, personUsers, deptUsers, deptCreators, bestApps };
});

const createdOf = (name: string) => props.apps.filter((a) => a.creator === name).sort((a, b) => b.users - a.users);

const fbShown = computed(() => props.fbList.filter((f) => {
  const replied = f.msgs.some((m) => m.role === 'admin');
  return props.fbFilter === 'all' || (props.fbFilter === 'replied') === replied;
}));
</script>

<template>
  <div class="ap-home">
    <div class="ap-home-banner-row">
      <div class="ap-banner" @click="onNotice(PLATFORM_NOTICES[bannerIdx].id)">
        <em class="ap-banner-tag">{{ PLATFORM_NOTICES[bannerIdx].tag }} · {{ PLATFORM_NOTICES[bannerIdx].date }}</em>
        <h3>{{ PLATFORM_NOTICES[bannerIdx].title }}</h3>
        <p>{{ PLATFORM_NOTICES[bannerIdx].content }}</p>
        <div class="ap-banner-dots" @click.stop>
          <button
            v-for="(n, i) in PLATFORM_NOTICES"
            :key="n.id"
            type="button"
            :class="i === bannerIdx ? 'on' : ''"
            @click="onBannerIdx(i)"
          />
        </div>
      </div>
      <section class="ap-home-card">
        <h3 class="ap-home-title"><AcSvg :d="IC.flame" :size="18" />应用上新（升级公告）</h3>
        <div class="ap-rel-list">
          <button v-for="a in releases" :key="a.id" type="button" class="ap-rel-item" @click="onOpenDetail(a.id)">
            <AcLogo :icon="a.icon" :size="32" />
            <span class="ap-rel-main">
              <b>{{ a.name }}</b>
              <i v-if="a.releaseNote" class="ap-rel-note">{{ a.releaseNote }}</i>
              <i>{{ a.hasUpdate ? '有新版本可更新' : `${a.release} 新上架` }}</i>
            </span>
            <em class="ap-rel-tag" :class="a.hasUpdate ? 'up' : 'new'">{{ a.hasUpdate ? '升级' : '上新' }}</em>
          </button>
          <div v-if="releases.length === 0" class="ap-empty">暂无上新与升级公告</div>
        </div>
      </section>
    </div>

    <section class="ap-home-card">
      <h3 class="ap-home-title"><AcSvg :d="IC.star" :size="18" />我收藏的应用</h3>
      <div v-if="favApps.length === 0" class="ap-empty">还没有收藏的应用，在应用列表行内点击星标即可收藏</div>
      <div v-else class="ap-grid">
        <AcCell
          v-for="app in favApps"
          :key="app.id"
          :app="app"
          :caret="app.mine"
          :loading="loadingId === app.id"
          :fav-on="favIds.includes(app.id)"
          :menu-open="menuId === app.id"
          :on-open="() => onOpenDetail(app.id)"
          :on-act="onAct"
          :on-toggle-fav="onToggleFav"
          :on-open-menu="onOpenMenu"
        />
      </div>
    </section>

    <section class="ap-home-card">
      <h3 class="ap-home-title"><AcSvg :d="IC.clock" :size="18" />最近使用</h3>
      <div v-if="recentApps.length === 0" class="ap-empty">暂无最近使用的应用，点击应用的「打开」后会自动记录在这里</div>
      <div v-else class="ap-grid">
        <AcCell
          v-for="{ app } in recentApps"
          :key="app.id"
          :app="app"
          :caret="app.mine"
          :loading="loadingId === app.id"
          :fav-on="favIds.includes(app.id)"
          :menu-open="menuId === app.id"
          :on-open="() => onOpenDetail(app.id)"
          :on-act="onAct"
          :on-toggle-fav="onToggleFav"
          :on-open-menu="onOpenMenu"
        />
      </div>
    </section>

    <div class="ap-home-rank-row">
      <section class="ap-home-card">
        <div class="ap-rank-head">
          <h3 class="ap-home-title"><AcSvg :d="IC.trophy" :size="18" />贡献榜</h3>
          <button type="button" class="ap-link" @click="onGotoDash()">全部数据</button>
        </div>
        <div class="ap-rank-bar">
          <div class="ap-rank-tabs">
            <button
              v-for="[k, label] in ([['person', '个人贡献榜'], ['dept', '部门贡献榜'], ['best', '最佳应用榜']] as const)"
              :key="k"
              type="button"
              :class="rankTab === k ? 'on' : ''"
              @click="onRankTab(k)"
            >
              {{ label }}
            </button>
          </div>
          <BubbleSelect :options="RANK_RANGES" :value="rankRange" @change="onRankRange" />
        </div>
        <div class="ap-rank-list">
          <template v-if="rankTab === 'person'">
            <div v-if="rankData.personRank.length === 0" class="ap-empty">该时间范围内暂无创作数据</div>
            <template v-else>
              <div v-for="([name, n], i) in rankData.personRank" :key="name" class="ap-rank-person">
              <button type="button" class="ap-rank-row" @click="onRankOpen(rankOpen === name ? null : name)">
                <b :class="i < 3 ? `no${i + 1}` : ''">{{ i + 1 }}</b>
                <span class="ap-rank-name">{{ name }}<i>{{ creatorDept(name) }}</i></span>
                <em>{{ n }} 个创作 · {{ rankData.personUsers.get(name) ?? 0 }} 人使用</em>
                <AcSvg :d="IC.caret" :size="14" :class-name="`ap-rank-caret${rankOpen === name ? ' open' : ''}`" />
              </button>
              <div v-if="rankOpen === name" class="ap-rank-apps">
                <button v-for="a in createdOf(name)" :key="a.id" type="button" class="ap-rank-app" @click="onOpenDetail(a.id)">
                  <AcLogo :icon="a.icon" :size="18" />
                  <span>{{ a.name }}</span>
                  <i>{{ a.users }} 人</i>
                </button>
              </div>
              </div>
            </template>
          </template>
          <template v-if="rankTab === 'dept'">
            <div v-if="rankData.deptRank.length === 0" class="ap-empty">该时间范围内暂无创作数据</div>
            <template v-else>
              <div v-for="([name, n], i) in rankData.deptRank" :key="name" class="ap-rank-row">
              <b :class="i < 3 ? `no${i + 1}` : ''">{{ i + 1 }}</b>
              <span class="ap-rank-name">{{ name }}<i>{{ rankData.deptCreators.get(name)?.size ?? 0 }} 位创作者</i></span>
              <em>{{ n }} 次创作 · {{ rankData.deptUsers.get(name) ?? 0 }} 人使用</em>
              </div>
            </template>
          </template>
          <template v-if="rankTab === 'best'">
            <button
              v-for="(a, i) in rankData.bestApps"
              :key="a.id"
              type="button"
              class="ap-rank-row"
              @click="onOpenDetail(a.id)"
            >
              <b :class="i < 3 ? `no${i + 1}` : ''">{{ i + 1 }}</b>
              <AcLogo :icon="a.icon" :size="32" />
              <span class="ap-rank-name">{{ a.name }}<i>{{ a.creator }} · {{ creatorDept(a.creator) }}</i></span>
              <em>{{ usageInRange(a, rankRange) }} 人次</em>
            </button>
          </template>
        </div>
      </section>

      <section class="ap-home-card ap-fb-card">
        <div class="ap-fb-head">
          <h3 class="ap-home-title"><AcSvg :d="IC.mail" :size="18" />意见反馈</h3>
        </div>
        <div class="ap-fb-bar">
          <div class="ap-fb-tabs">
            <button
              v-for="[k, label] in ([['all', '全部'], ['pending', '待回复'], ['replied', '已回复']] as const)"
              :key="k"
              type="button"
              :class="fbFilter === k ? 'on' : ''"
              @click="onFbFilter(k)"
            >
              {{ label }}
            </button>
          </div>
          <button type="button" class="ap-btn-blue" @click="onNewFb()">新建反馈</button>
        </div>
        <div class="ap-fb-list">
          <button v-for="f in fbShown" :key="f.id" type="button" class="ap-fb-item" @click="onFbDetail(f.id)">
            <div class="ap-fb-item-head">
              <em class="ap-fb-type" :class="f.type === '问题反馈' ? ' bug' : f.type === '体验优化' ? ' ux' : ''">{{ f.type }}</em>
              <b :class="f.msgs.some((m) => m.role === 'admin') ? 'st-done' : 'st-pending'">{{ f.msgs.some((m) => m.role === 'admin') ? '已回复' : '待回复' }}</b>
            </div>
            <p>{{ f.msgs[0].content }}</p>
            <div class="ap-fb-item-foot">
              <i>{{ f.at }}</i>
              <span class="ap-fb-replies"><AcSvg :d="IC.mail" :size="12" />{{ f.msgs.filter((m) => m.role === 'admin').length }} 条回复</span>
              <AcSvg :d="IC.caret" :size="12" class-name="ap-fb-go" />
            </div>
          </button>
          <div v-if="fbShown.length === 0" class="ap-empty">该状态下暂无反馈记录</div>
        </div>
      </section>
    </div>
  </div>
</template>

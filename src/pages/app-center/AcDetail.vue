<script setup lang="ts">
/* 应用详情（1:1 移植自 AppCenter.tsx 的 renderDetail） */
import { computed, onMounted, ref, watch } from 'vue';
import { actKind, creatorDept, versionOf, APP_FB_TYPES, type AppItem, type AppReview } from './data';
import { IC, agoText, featLinesOf } from './acHelpers';
import { pushToast } from '../../components/toast';
import AcSvg from './AcSvg.vue';
import AcLogo from './AcLogo.vue';
import AcPreviewCard from './AcPreviewCard.vue';
import AcCell from './AcCell.vue';

const props = defineProps<{
  app: AppItem;
  apps: AppItem[];
  reviews: AppReview[];
  favIds: string[];
  loadingId: string | null;
  menuId: string | null;
  onBack: () => void;
  onAct: (a: AppItem, e: MouseEvent) => void;
  onToggleFav: (id: string, e: MouseEvent) => void;
  onOpenRevAll: (id: string) => void;
  /** 提交意见反馈（隐私，仅开发者可见） */
  onSubmitFb: (app: AppItem, type: string, text: string, images: string[]) => void;
  onOpenVerHist: (id: string) => void;
  onOpenDevDrawer: (id: string) => void;
  /** 提交评价：返回 true 表示成功（子组件随即可重置表单） */
  onSubmitReview: (app: AppItem, stars: number, title: string, text: string, images: string[]) => boolean;
  onOpenDetail: (id: string) => void;
  onOpenMenu: (id: string, e: MouseEvent) => void;
}>();

/* 评分及评论：平均 + 星级分布 */
const rvs = computed(() => props.reviews.filter((r) => r.appId === props.app.id));
const rvAvg = computed(() => rvs.value.length ? rvs.value.reduce((s, r) => s + r.stars, 0) / rvs.value.length : 0);
const rvDist = computed(() => [5, 4, 3, 2, 1].map((s) => rvs.value.filter((r) => r.stars === s).length));
/* 当前用户对当前版本是否已评价（每个版本仅可评价一次） */
const myRev = computed(() => rvs.value.find((r) => r.user === '七妮妮' && r.version === versionOf(props.app)));
/* 类目使用人次排行 */
const rank = computed(() => props.apps.filter((a) => a.category === props.app.category).sort((a, b) => b.users - a.users).findIndex((a) => a.id === props.app.id) + 1);
/* 开发者信息：同创作者应用 */
const devApps = computed(() => props.apps.filter((a) => a.creator === props.app.creator).sort((a, b) => b.users - a.users));
const devUsers = computed(() => devApps.value.reduce((s, a) => s + a.users, 0));
/* 相关推荐：标签一致优先，不足 4 个用同类目补足，按使用人次降序 */
const related = computed(() => {
  const app = props.app;
  const tagMatch = props.apps.filter((a) => a.id !== app.id && a.tags.some((t) => app.tags.includes(t)));
  const sameCat = props.apps.filter((a) => a.id !== app.id && a.category === app.category && !tagMatch.includes(a));
  return [...tagMatch, ...sameCat].sort((a, b) => b.users - a.users).slice(0, 4);
});

/* 评价表单（切换详情/视图时组件重挂载自动重置，等价 React useEffect[view]） */
const rvStars = ref(0);
const rvTitle = ref('');
const rvText = ref('');
const rvOpen = ref(false);
const rvImages = ref<string[]>([]);
const submitReview = () => {
  const ok = props.onSubmitReview(props.app, rvStars.value, rvTitle.value, rvText.value, rvImages.value);
  if (ok) {
    rvStars.value = 0; rvTitle.value = ''; rvText.value = ''; rvOpen.value = false; rvImages.value = [];
  }
};
const onPickImages = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).slice(0, 3 - rvImages.value.length);
  files.forEach((f) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (rvImages.value.length >= 3) return;
      rvImages.value = [...rvImages.value, String(reader.result)];
    };
    reader.readAsDataURL(f);
  });
  input.value = '';
};

/* 意见反馈提交表单（详情页入口；提交后开发者在消息中心查看与回复） */
const fbOpen = ref(false);
const fbType = ref(APP_FB_TYPES[0]);
const fbText = ref('');
const fbImages = ref<string[]>([]);
const openFbForm = () => {
  fbType.value = APP_FB_TYPES[0]; fbText.value = ''; fbImages.value = [];
  fbOpen.value = true;
};
const submitFbForm = () => {
  const text = fbText.value.trim();
  if (!text) { pushToast('请先填写反馈内容'); return; }
  props.onSubmitFb(props.app, fbType.value, text, fbImages.value);
  fbOpen.value = false;
};
const onPickFbImages = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).slice(0, 3 - fbImages.value.length);
  files.forEach((f) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (fbImages.value.length >= 3) return;
      fbImages.value = [...fbImages.value, String(reader.result)];
    };
    reader.readAsDataURL(f);
  });
  input.value = '';
};

/* 评价横滑条：超出展示区域的左右滚动交互 */
const revStripRef = ref<HTMLDivElement | null>(null);
const revNav = ref({ l: false, r: false });
const updateRevNav = () => {
  const el = revStripRef.value;
  if (!el) { revNav.value = { l: false, r: false }; return; }
  revNav.value = { l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 };
};
onMounted(() => requestAnimationFrame(updateRevNav));
watch(() => props.reviews, () => requestAnimationFrame(updateRevNav));
</script>

<template>
  <div class="ap-detail">
    <button type="button" class="ap-back" @click="onBack()">
      <AcSvg :d="IC.back" :size="18" />
    </button>
    <div class="ap-detail-head">
      <AcLogo :icon="app.icon" :size="78" />
      <div class="ap-detail-info">
        <h2>{{ app.name }}<i v-if="app.publishMode === 'test'" class="ap-badge-test">测试中</i></h2>
        <p>{{ app.desc }}</p>
        <div class="ap-detail-actions">
          <button type="button" class="ap-btn-solid" @click="onAct(app, $event)">
            {{ actKind(app) === 'add' ? '添加' : actKind(app) === 'update' ? '更新' : '打开' }}
          </button>
        </div>
      </div>
      <div class="ap-detail-head-acts">
        <button type="button" class="ap-detail-fb" title="提交意见反馈 · 仅开发者可见" @click="openFbForm()">
          <span>意见反馈</span>
          <b><AcSvg :d="IC.edit" :size="16" /></b>
        </button>
        <button
          type="button"
          class="ap-detail-fav"
          :class="{ on: favIds.includes(app.id) }"
          :title="favIds.includes(app.id) ? '取消收藏' : '收藏'"
          @click="onToggleFav(app.id, $event)"
        >
          <span>收藏</span>
          <b><AcSvg :d="IC.starFill" :size="16" filled vb="0 0 1024 1024" /></b>
        </button>
      </div>
    </div>
    <div class="ap-detail-stats">
      <div class="ap-stat">
        <span>{{ rvs.length }} 个评分</span>
        <b>{{ rvAvg.toFixed(1) }}</b>
        <div class="ap-stat-stars">
          <AcSvg v-for="n in 5" :key="n" :d="IC.star" :size="11" filled :class-name="n <= Math.round(rvAvg) ? 'ap-star' : 'ap-star-dim'" />
        </div>
      </div>
      <div class="ap-stat"><span>排行榜</span><b>#{{ rank }}</b><em>{{ app.category }}</em></div>
      <div class="ap-stat"><span>开发者</span><b>{{ app.creator }}</b></div>
      <div class="ap-stat"><span>使用人次</span><b>{{ app.users }}</b></div>
      <div class="ap-stat"><span>当前版本</span><b>{{ versionOf(app) }}</b></div>
    </div>
    <div class="ap-detail-divider" />
    <h3 class="ap-detail-sub">预览</h3>
    <div class="ap-detail-previews">
      <AcPreviewCard v-for="(p, i) in app.previews" :key="i" :p="p" />
    </div>
    <div class="ap-detail-divider" />
    <h3 class="ap-detail-sub ap-sec-head">
      <span>新功能介绍</span>
      <button type="button" class="ap-link" @click="onOpenVerHist(app.id)">版本历史记录</button>
    </h3>
    <div class="ap-feat-entry">
      <div class="ap-feat-head">
        <b>常规</b>
        <div class="ap-feat-meta"><i>{{ agoText(app.release) }}</i><span>版本 {{ versionOf(app) }}</span></div>
      </div>
      <ul><li v-for="l in featLinesOf(app)" :key="l">{{ l }}</li></ul>
    </div>
    <div class="ap-detail-divider" />
    <h3 class="ap-detail-sub ap-sec-head">
      <span>评分及评论<em class="ap-vis pub">公开</em></span>
      <span v-if="rvs.length > 0" class="ap-sec-acts">
        <button type="button" class="ap-link" @click="onOpenRevAll(app.id)">查看全部</button>
      </span>
    </h3>
    <div v-if="rvs.length === 0" class="ap-empty">暂无评价</div>
    <template v-else>
      <div class="ap-rate-top">
        <div class="ap-rate-left">
          <b>{{ rvAvg.toFixed(1) }}</b>
          <span>满分 5 分</span>
          <i>{{ rvs.length }} 个评分</i>
        </div>
        <div class="ap-rate-hist">
          <div v-for="(c, i) in rvDist" :key="i" class="ap-hist-row">
            <AcSvg :d="IC.star" :size="10" filled class-name="ap-star" />
            <div class="ap-hist-track"><div :style="{ width: `${Math.round((c / rvs.length) * 100)}%` }" /></div>
          </div>
        </div>
      </div>
      <div class="ap-rev-wrap">
        <button v-if="revNav.l" type="button" class="ap-rev-arrow l" title="上一条" @click="revStripRef?.scrollBy({ left: -480, behavior: 'smooth' })">
          <AcSvg :d="IC.back" :size="22" />
        </button>
        <div ref="revStripRef" class="ap-rev-cards" @scroll="updateRevNav">
          <div v-for="r in rvs" :key="r.id" class="ap-rev-card">
            <div class="ap-rev-head">
              <b>{{ r.title }}</b>
              <div class="ap-rev-meta"><i>{{ agoText(r.date) }}</i><span>{{ r.user }}</span><em>v{{ r.version }}</em></div>
            </div>
            <div class="ap-rev-stars">
              <AcSvg v-for="n in ([1, 2, 3, 4, 5].filter((x) => x <= r.stars))" :key="n" :d="IC.star" :size="14" filled class-name="ap-star" />
            </div>
            <p>{{ r.text }}</p>
            <div v-if="r.images && r.images.length > 0" class="ap-rev-imgs">
              <img v-for="(src, i) in r.images" :key="i" :src="src" alt="">
            </div>
            <div v-if="r.reply" class="ap-rev-reply"><i>开发者回复</i><p>{{ r.reply.text }}</p></div>
          </div>
        </div>
        <button v-if="revNav.r" type="button" class="ap-rev-arrow r" title="下一条" @click="revStripRef?.scrollBy({ left: 480, behavior: 'smooth' })">
          <AcSvg :d="IC.chevR" :size="22" />
        </button>
      </div>
    </template>
    <template v-if="app.added">
      <div v-if="myRev" class="ap-rev-tip">已评价 v{{ myRev.version }}，应用更新后可再次评价</div>
      <div v-else-if="rvOpen" class="ap-rev-form">
        <div class="ap-rev-pick">
          <span>你的评分</span>
          <button v-for="n in 5" :key="n" type="button" :class="n <= rvStars ? 'on' : ''" @click="rvStars = n">
            <AcSvg :d="IC.star" :size="18" filled />
          </button>
        </div>
        <input v-model="rvTitle" :maxlength="20" placeholder="评论标题（选填）">
        <textarea v-model="rvText" rows="3" :maxlength="200" placeholder="写下你的评论，分享使用体验" />
        <div class="ap-rev-up">
          <span v-for="(src, i) in rvImages" :key="i" class="ap-rev-thumb">
            <img :src="src" alt="">
            <button type="button" title="移除图片" @click="rvImages = rvImages.filter((_, j) => j !== i)"><AcSvg :d="IC.clear" :size="10" /></button>
          </span>
          <label v-if="rvImages.length < 3" class="ap-rev-up-add">
            <AcSvg :d="IC.plus" :size="14" />
            <em>添加图片</em>
            <input type="file" accept="image/*" multiple @change="onPickImages">
          </label>
        </div>
        <div class="ap-rev-foot"><button type="button" class="ap-rev-collapse" @click="rvOpen = false">收起</button><button type="button" class="ap-btn-blue" @click="submitReview()">提交评价</button></div>
      </div>
      <button v-else type="button" class="ap-rev-form-closed" @click="rvOpen = true">
        <span>你的评分</span>
        <i v-for="n in 5" :key="n" :class="n <= rvStars ? 'on' : ''"><AcSvg :d="IC.star" :size="16" filled /></i>
        <em>点击写评价</em>
      </button>
    </template>
    <div class="ap-detail-divider" />
    <h3 class="ap-detail-sub">信息</h3>
    <div class="ap-info-grid">
      <div><i>提供者</i><b>{{ app.creator }}</b></div>
      <div><i>类别</i><b>{{ app.category }}</b></div>
      <div><i>应用类型</i><b>{{ app.appType ?? 'Web应用' }}</b></div>
      <div><i>当前版本</i><b>{{ versionOf(app) }}</b></div>
      <div><i>上线时间</i><b>{{ app.release }}</b></div>
      <div><i>使用人次</i><b>{{ app.users }}</b></div>
      <div><i>组织架构</i><b>{{ creatorDept('七妮妮') }}</b></div>
    </div>
    <div class="ap-detail-divider" />
    <h3 class="ap-detail-sub">开发者信息</h3>
    <button type="button" class="ap-dev" title="查看上架应用" @click="onOpenDevDrawer(app.id)">
      <span class="ap-dev-ava">{{ app.creator.slice(0, 1) }}</span>
      <div class="ap-dev-main">
        <b>{{ app.creator }}</b>
        <i>{{ creatorDept(app.creator) }}</i>
      </div>
      <div class="ap-dev-stats">
        <span><b>{{ devApps.length }}</b>上架应用</span>
        <span><b>{{ devUsers }}</b>总使用人次</span>
      </div>
      <AcSvg :d="IC.arrow" :size="14" class-name="ap-dev-go" />
    </button>
    <div class="ap-detail-divider" />
    <h3 class="ap-detail-sub">相关推荐</h3>
    <div v-if="related.length === 0" class="ap-empty">暂无相关推荐</div>
    <div v-else class="ap-grid">
      <AcCell
        v-for="a in related"
        :key="a.id"
        :app="a"
        :caret="a.mine"
        :loading="loadingId === a.id"
        :fav-on="favIds.includes(a.id)"
        :menu-open="menuId === a.id"
        :on-open="() => onOpenDetail(a.id)"
        :on-act="onAct"
        :on-toggle-fav="onToggleFav"
        :on-open-menu="onOpenMenu"
      />
    </div>

    <!-- 意见反馈提交抽屉（与系统反馈同构：类型 + 内容 + 配图） -->
    <Teleport to="body">
      <template v-if="fbOpen">
        <div class="ap-drawer-mask" @click="fbOpen = false" />
        <div class="ap-drawer">
          <div class="ap-drawer-head">
            <span>意见反馈<em class="ap-vis priv">隐私</em></span>
            <button type="button" @click="fbOpen = false"><AcSvg :d="IC.clear" :size="14" /></button>
          </div>
          <div class="ap-drawer-body">
            <div class="ap-fb-field-label">反馈类型</div>
            <div class="ap-fb-types">
              <button v-for="t in APP_FB_TYPES" :key="t" type="button" :class="fbType === t ? 'on' : ''" @click="fbType = t">{{ t }}</button>
            </div>
            <div class="ap-fb-field-label">反馈内容</div>
            <textarea v-model="fbText" class="ap-fb-input" rows="6" :maxlength="200" placeholder="描述你的使用体验、遇到的问题或新需求，提交后仅开发者可见…" />
            <div class="ap-fb-tip right">{{ fbText.length }}/200</div>
            <div class="ap-rev-up">
              <span v-for="(src, i) in fbImages" :key="i" class="ap-rev-thumb">
                <img :src="src" alt="">
                <button type="button" title="移除图片" @click="fbImages = fbImages.filter((_, j) => j !== i)"><AcSvg :d="IC.clear" :size="10" /></button>
              </span>
              <label v-if="fbImages.length < 3" class="ap-rev-up-add">
                <AcSvg :d="IC.plus" :size="14" />
                <em>添加图片</em>
                <input type="file" accept="image/*" multiple @change="onPickFbImages">
              </label>
            </div>
          </div>
          <div class="ap-drawer-foot">
            <button type="button" class="ap-btn-plain" @click="fbOpen = false">取 消</button>
            <button type="button" class="ap-btn-blue" @click="submitFbForm()">提交反馈</button>
          </div>
        </div>
      </template>
    </Teleport>
  </div>
</template>

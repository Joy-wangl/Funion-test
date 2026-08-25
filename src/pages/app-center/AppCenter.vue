<script setup lang="ts">
/* 应用中心（1:1 移植自 AppCenter.tsx）
   toast 接入全局 pushToast + ToastWrap（迁移约定，等价 React 本地 ap-toast 提示） */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  CATEGORIES, FORM_CATEGORIES, PLATFORM_NOTICES,
  FB_TYPES, INITIAL_FEEDBACKS,
  actKind, creatorDept, initialApps, seedAppFeedbacks, seedReviews, versionOf,
  type AppItem, type AppFeedback, type AppReview, type FeedbackItem,
} from './data';
import { CAT_ICONS, GLYPHS, IC, ICON_LIB, agoText, featLinesOf, isImgIcon, today, type AcForm, type CatDraft } from './acHelpers';
import { pushToast } from '../../components/toast';
import ToastWrap from '../../components/ToastWrap.vue';
import AcSvg from './AcSvg.vue';
import AcLogo from './AcLogo.vue';
import AcCell from './AcCell.vue';
import AcHome from './AcHome.vue';
import AcDetail from './AcDetail.vue';
import AcCreate from './AcCreate.vue';
import AcMsgDrawer from './AcMsgDrawer.vue';
import AppDashboard from './Dashboard.vue';
import './AppCenter.css';

type View =
  | { kind: 'home' }
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'mine' }
  | { kind: 'dash' }
  | { kind: 'create'; editId?: string };

/* 类目编辑输入自动聚焦（等价 React autoFocus） */
const vFocus = { mounted: (el: HTMLElement) => el.focus() };

const apps = ref<AppItem[]>(initialApps);
const search = ref('');
const category = ref<string | null>(null);
const sortKey = ref<'users' | 'release' | null>(null);
const sortDesc = ref(true);
const view = ref<View>({ kind: 'home' });
const detailBack = ref<View>({ kind: 'list' });
const recent = ref<{ id: string; at: number }[]>([]);
const favIds = ref<string[]>([]);
const noticeId = ref<string | null>(null);
const rankRange = ref('近30天');
const rankTab = ref<'person' | 'dept' | 'best'>('person');
const rankOpen = ref<string | null>(null);
const fbType = ref(FB_TYPES[0]);
const fbText = ref('');
const fbList = ref<FeedbackItem[]>(INITIAL_FEEDBACKS);
const fbCreate = ref(false);
const fbDetailId = ref<string | null>(null);
const fbNote = ref('');
const fbFilter = ref<'all' | 'pending' | 'replied'>('all');
const bannerIdx = ref(0);
const mineTab = ref<'created' | 'added'>('created');
const menu = ref<{ id: string; x: number; y: number } | null>(null);
const deleteId = ref<string | null>(null);
const updateId = ref<string | null>(null);
/* 评分及评论 */
const reviews = ref<AppReview[]>(seedReviews);
const revAllId = ref<string | null>(null);
const verHistId = ref<string | null>(null);
const msgOpen = ref(false);
const msgTab = ref<'app' | 'sys'>('app');
const msgAppFilter = ref('all');
const msgFbType = ref('all');
const msgStatus = ref<'all' | 'pending' | 'done'>('all');
const rvReplyId = ref<string | null>(null);
const rvReplyText = ref('');
const fbReplyId = ref<string | null>(null);
const fbReplyText = ref('');
/* 使用者反馈-意见反馈（应用级） */
const appFbList = ref<AppFeedback[]>(seedAppFeedbacks);
const msgSubTab = ref<'review' | 'feedback'>('review');
const afReplyId = ref<string | null>(null);
const afReplyText = ref('');
const devDrawerId = ref<string | null>(null);
const loadingId = ref<string | null>(null);
const backView = ref<View>({ kind: 'mine' });

/* 类目管理抽屉（草稿态：新增/修改/删除/拖动排序，保存生效） */
const cats = ref<string[]>(FORM_CATEGORIES);
const catIcons = ref<Record<string, string>>({});
const catDrawer = ref(false);
const draft = ref<CatDraft[]>([]);
const editIdx = ref<number | null>(null);
const editVal = ref('');
const dragIdx = ref<number | null>(null);
const pickIdx = ref<number | null>(null);

/* 平台公告 banner 自动轮播 */
let bannerTimer: number | undefined;
onMounted(() => {
  bannerTimer = window.setInterval(() => { bannerIdx.value = (bannerIdx.value + 1) % PLATFORM_NOTICES.length; }, 5000);
});
onBeforeUnmount(() => { if (bannerTimer !== undefined) window.clearInterval(bannerTimer); });

const mineActive = computed(() => view.value.kind === 'mine' || (view.value.kind === 'create' && backView.value.kind === 'mine'));

const listApps = computed(() => {
  let list = apps.value;
  if (search.value.trim()) {
    const kw = search.value.trim().toLowerCase();
    list = list.filter((a) => a.name.toLowerCase().includes(kw) || a.desc.toLowerCase().includes(kw));
  } else if (category.value) {
    const cat = category.value;
    list = list.filter((a) => a.category === cat);
  }
  if (sortKey.value) {
    const sk = sortKey.value;
    list = [...list].sort((a, b) => {
      const va = sk === 'users' ? a.users : a.release;
      const vb = sk === 'users' ? b.users : b.release;
      const r = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDesc.value ? -r : r;
    });
  } else if (category.value && !search.value.trim()) {
    /* 类目下默认按标签使用次数排序（标签关联应用数之和，降序） */
    const cat = category.value;
    const m = new Map<string, number>();
    apps.value.filter((a) => a.category === cat).forEach((a) => a.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    const score = (a: AppItem) => a.tags.reduce((s, t) => s + (m.get(t) ?? 0), 0);
    list = [...list].sort((a, b) => score(b) - score(a));
  }
  return list;
});

const listTitle = computed(() => {
  const kw = search.value.trim();
  return kw ? `“${kw}”搜索结果` : category.value ? `${category.value}（${listApps.value.length}）` : `全部应用（${listApps.value.length}）`;
});

const detailApp = computed(() => {
  const v = view.value;
  return v.kind === 'detail' ? apps.value.find((a) => a.id === v.id) ?? null : null;
});
const detailId = computed(() => (view.value.kind === 'detail' ? view.value.id : ''));
const editApp = computed(() => {
  const v = view.value;
  return v.kind === 'create' && v.editId ? apps.value.find((a) => a.id === v.editId) ?? null : null;
});
const createKey = computed(() => (view.value.kind === 'create' ? view.value.editId ?? 'new' : 'new'));
const mineList = computed(() => (mineTab.value === 'created' ? apps.value.filter((a) => a.mine) : apps.value.filter((a) => a.added && !a.mine)));

const patchApp = (id: string, patch: Partial<AppItem>) => {
  apps.value = apps.value.map((a) => (a.id === id ? { ...a, ...patch } : a));
};

/* ---------- 微动作气泡：收藏/打开/移除等卡片级动作反馈锚在动作点上方，自动消退 ---------- */
const bubble = ref<{ x: number; y: number; text: string } | null>(null);
let bubbleTimer: number | undefined;
const bubbleAt = (x: number, y: number, text: string) => {
  bubble.value = { x, y, text };
  if (bubbleTimer !== undefined) window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => { bubble.value = null; }, 1800);
};
const showBubble = (e: Event, text: string) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  bubbleAt(r.left + r.width / 2, r.top - 8, text);
};
/* 点击时先记录动作点坐标，添加等加载后才反馈的场景也能原位弹出 */
const anchorOf = (e?: Event) => {
  if (!e) return null;
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top - 8 };
};

/* 添加/更新：加载后落库；我创建的无添加操作，直接打开；打开即记入最近使用 */
const act = (app: AppItem, e?: Event) => {
  const kind = actKind(app);
  if (kind === 'open') {
    recent.value = [{ id: app.id, at: Date.now() }, ...recent.value.filter((r) => r.id !== app.id)].slice(0, 8);
    if (e) showBubble(e, `正在打开「${app.name}」`);
    return;
  }
  if (kind === 'update') {
    updateId.value = app.id;
    return;
  }
  const anchor = anchorOf(e);
  loadingId.value = app.id;
  window.setTimeout(() => {
    loadingId.value = null;
    patchApp(app.id, { added: true });
    if (anchor) bubbleAt(anchor.x, anchor.y, `已添加「${app.name}」`);
  }, 900);
};

const openMenu = (id: string, e: MouseEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  menu.value = { id, x: r.right - 116, y: r.bottom + 6 };
};

const openDetail = (id: string) => {
  detailBack.value = view.value;
  view.value = { kind: 'detail', id };
};

const toggleFav = (id: string, e?: Event) => {
  const on = favIds.value.includes(id);
  favIds.value = on ? favIds.value.filter((x) => x !== id) : [...favIds.value, id];
  if (e) showBubble(e, on ? '已取消收藏' : '已收藏，可在首页查看');
};

const removeAdded = (id: string, e?: Event) => {
  patchApp(id, { added: false });
  if (e) showBubble(e, '已移除应用');
};

const deleteApp = computed(() => (deleteId.value ? apps.value.find((a) => a.id === deleteId.value) ?? null : null));
const updateApp = computed(() => (updateId.value ? apps.value.find((a) => a.id === updateId.value) ?? null : null));
const menuApp = computed(() => {
  const m = menu.value;
  return m ? apps.value.find((a) => a.id === m.id) ?? null : null;
});

const confirmDelete = () => {
  const id = deleteId.value;
  if (!id) return;
  apps.value = apps.value.filter((a) => a.id !== id);
  deleteId.value = null;
  pushToast('应用已删除');
};

const openCreate = (editId?: string) => {
  backView.value = view.value;
  view.value = { kind: 'create', editId };
};

const submitCreate = (form: AcForm) => {
  if (!form.icon) { pushToast('请上传应用图标'); return; }
  const icon = form.icon;
  if (!form.type) { pushToast('请选择应用类型'); return; }
  if (form.type === 'Web应用' && form.deploy === 'link' && !form.link.trim()) { pushToast('请输入外部链接地址'); return; }
  if ((form.type === 'Web应用' && form.deploy === 'file') || form.type === 'EXE程序' || form.type === '浏览器插件') {
    if (!form.file) { pushToast('请上传应用文件'); return; }
  }
  if (form.type === 'EXE程序' && !form.run) { pushToast('请选择运行文件'); return; }
  const editId = view.value.kind === 'create' ? view.value.editId : undefined;
  const editing = !!editId;
  /* 更新已有应用才需填新版本号；上传新创作为上新，初始版本固定 v1.0.0 */
  if (editing && !form.version.trim()) { pushToast('请输入版本号'); return; }
  const extra = {
    appType: form.type,
    deployMode: form.type === 'Web应用' ? form.deploy : undefined,
    linkUrl: form.type === 'Web应用' && form.deploy === 'link' ? form.link.trim() : undefined,
    appFile: form.file || undefined,
    runFile: form.type === 'EXE程序' ? form.run : undefined,
    publishMode: form.publish,
    permScope: form.publish === 'online' ? form.perm : undefined,
    version: editing ? form.version.trim() : '1.0.0',
  };
  if (editing && editId) {
    const target = apps.value.find((a) => a.id === editId);
    patchApp(editId, {
      name: form.name.trim(), desc: form.desc.trim(), icon, previews: form.previews, category: form.cat, tags: form.tags,
      releaseNote: form.note.trim() || undefined, release: today(), hasUpdate: true,
      prevVersion: target?.hasUpdate ? target.prevVersion : target ? versionOf(target) : undefined, ...extra,
    });
    pushToast('应用已更新，首页「应用上新」将展示本次更新');
  } else {
    const app: AppItem = {
      id: `my-${Date.now()}`,
      name: form.name.trim(),
      desc: form.desc.trim() || '小蜜蜂干活很刻苦',
      icon,
      category: form.cat,
      added: false,
      mine: true,
      users: 0,
      release: today(),
      creator: '七妮妮',
      previews: form.previews,
      tags: form.tags,
      releaseNote: form.note.trim() || undefined,
      ...extra,
    };
    apps.value = [app, ...apps.value];
    pushToast(form.publish === 'test' ? '创作已提交（发布测试）' : '创作已上传');
  }
  if (!editing) mineTab.value = 'created';
  view.value = backView.value;
};

/* ---------- 类目管理：新增/修改/删除/拖动排序 ---------- */
const openCatDrawer = () => {
  draft.value = cats.value.map((n) => ({ n, ic: catIcons.value[n] ?? 'folder' }));
  editIdx.value = null;
  editVal.value = '';
  pickIdx.value = null;
  catDrawer.value = true;
};

const confirmEdit = (i: number) => {
  const name = editVal.value.trim();
  if (!name) { pushToast('请输入类目名称'); return; }
  draft.value = draft.value.map((c, idx) => (idx === i ? { ...c, n: name } : c));
  editIdx.value = null;
};

/* 失焦即保存：空名称时新建行移除、已有行还原 */
const blurEdit = (i: number) => {
  const name = editVal.value.trim();
  if (!name) {
    draft.value = draft.value[i].n ? draft.value : draft.value.filter((_, idx) => idx !== i);
    editIdx.value = null;
    return;
  }
  draft.value = draft.value.map((c, idx) => (idx === i ? { ...c, n: name } : c));
  editIdx.value = null;
};

const addCatRow = () => {
  if (editIdx.value !== null) { pushToast('请先完成当前编辑'); return; }
  draft.value = [...draft.value, { n: '', ic: 'folder' }];
  editIdx.value = draft.value.length - 1;
  editVal.value = '';
};

const removeCat = (i: number) => {
  draft.value = draft.value.filter((_, idx) => idx !== i);
  if (editIdx.value === i) editIdx.value = null;
  else if (editIdx.value !== null && editIdx.value > i) editIdx.value -= 1;
};

const saveCats = () => {
  const rows = editIdx.value !== null ? draft.value.map((c, idx) => (idx === editIdx.value ? { ...c, n: editVal.value.trim() } : c)) : draft.value;
  const names = rows.map((r) => r.n);
  if (names.some((n) => !n)) { pushToast('类目名称不能为空'); return; }
  if (new Set(names).size !== names.length) { pushToast('类目名称重复'); return; }
  cats.value = names;
  catIcons.value = Object.fromEntries(rows.map((r) => [r.n, r.ic]));
  /* 当前表单分类不在新类目内时的回落由 AcCreate 监听 cats 处理 */
  catDrawer.value = false;
  pushToast('类目已保存');
};

const onDragEnter = (i: number) => {
  const from = dragIdx.value;
  if (from === null || from === i) return;
  const n = [...draft.value];
  const [m] = n.splice(from, 1);
  n.splice(i, 0, m);
  draft.value = n;
  if (editIdx.value === from) editIdx.value = i;
  else if (editIdx.value === i) editIdx.value = from;
  dragIdx.value = i;
};

const pickIcon = (i: number, k: string) => {
  draft.value = draft.value.map((r, idx) => (idx === i ? { ...r, ic: k } : r));
  pickIdx.value = null;
};

const onPickCatIcon = (i: number, e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    draft.value = draft.value.map((r, idx) => (idx === i ? { ...r, ic: String(reader.result) } : r));
    pickIdx.value = null;
  };
  reader.readAsDataURL(f);
  input.value = '';
};

/* ---------- 首页：意见反馈（新建 / 补充 / 模拟官方回复） ---------- */
const fmtNow = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const scheduleAdminReply = (id: string) => {
  window.setTimeout(() => {
    fbList.value = fbList.value.map((f) => (f.id === id ? {
      ...f,
      msgs: [...f.msgs, { id: `${id}-r${Date.now()}`, role: 'admin' as const, by: '应用市场管理员', at: fmtNow(), content: '已收到你的反馈，我们会尽快跟进处理并在此回复，感谢支持！' }],
    } : f));
    pushToast('收到一条官方回复');
  }, 4000);
};
const submitFb = () => {
  const text = fbText.value.trim();
  if (!text) { pushToast('请先填写反馈内容'); return; }
  const id = `fb-${Date.now()}`;
  fbList.value = [{ id, type: fbType.value, at: fmtNow(), read: false, msgs: [{ id: `${id}-m1`, role: 'user' as const, by: '七妮妮', at: fmtNow(), content: text }] }, ...fbList.value];
  fbText.value = '';
  fbCreate.value = false;
  pushToast('反馈已提交');
  scheduleAdminReply(id);
};
const appendFbNote = (id: string) => {
  const text = fbNote.value.trim();
  if (!text) { pushToast('请先填写补充内容'); return; }
  fbList.value = fbList.value.map((f) => (f.id === id ? {
    ...f,
    msgs: [...f.msgs, { id: `${id}-m${Date.now()}`, role: 'user' as const, by: '七妮妮', at: fmtNow(), content: text }],
  } : f));
  fbNote.value = '';
  pushToast('补充已提交');
  scheduleAdminReply(id);
};

/* ---------- 消息中心：身份/维度/已读未读 ---------- */
const myReviews = computed(() => reviews.value.filter((r) => apps.value.some((a) => a.id === r.appId && a.mine)));
const myAppFbs = computed(() => appFbList.value.filter((f) => apps.value.some((a) => a.id === f.appId && a.mine)));
const unreadReviewCount = computed(() => myReviews.value.filter((r) => r.read === false).length);
const unreadAppFbCount = computed(() => myAppFbs.value.filter((f) => f.read === false).length);
const unreadUserCount = computed(() => unreadReviewCount.value + unreadAppFbCount.value);
const unreadFbCount = computed(() => fbList.value.filter((f) => f.read === false).length);
const msgCount = computed(() => unreadUserCount.value + unreadFbCount.value);

const markRevRead = (id: string) => { reviews.value = reviews.value.map((r) => (r.id === id ? { ...r, read: true } : r)); };
const markAppFbRead = (id: string) => { appFbList.value = appFbList.value.map((f) => (f.id === id ? { ...f, read: true } : f)); };
const markFbRead = (id: string) => { fbList.value = fbList.value.map((f) => (f.id === id ? { ...f, read: true } : f)); };
const markAllRead = () => {
  if (msgTab.value === 'app') {
    const ids = new Set(myReviews.value.map((r) => r.id));
    reviews.value = reviews.value.map((r) => (ids.has(r.id) ? { ...r, read: true } : r));
    const afIds = new Set(myAppFbs.value.map((f) => f.id));
    appFbList.value = appFbList.value.map((f) => (afIds.has(f.id) ? { ...f, read: true } : f));
  } else {
    fbList.value = fbList.value.map((f) => ({ ...f, read: true }));
  }
  pushToast('已全部标记为已读');
};

/* 应用渠道：创作者回复自己应用上的用户评价 */
const replyReview = (id: string) => {
  const text = rvReplyText.value.trim();
  if (!text) { pushToast('请先填写回复内容'); return; }
  reviews.value = reviews.value.map((r) => (r.id === id ? { ...r, reply: { text, date: today() } } : r));
  rvReplyId.value = null; rvReplyText.value = '';
  pushToast('回复已提交');
};

/* 应用级意见反馈：开发者回复使用者反馈 */
const replyAppFb = (id: string) => {
  const text = afReplyText.value.trim();
  if (!text) { pushToast('请先填写回复内容'); return; }
  appFbList.value = appFbList.value.map((f) => (f.id === id ? { ...f, reply: { text, date: today() } } : f));
  afReplyId.value = null; afReplyText.value = '';
  pushToast('回复已提交');
};

/* 详情页意见反馈提交：写入应用级反馈列表（开发者在消息中心-使用者反馈-意见反馈 查看与回复） */
const submitAppFb = (app: AppItem, type: string, text: string, images: string[]) => {
  appFbList.value = [{
    id: `af-${Date.now()}`, appId: app.id, user: '七妮妮', content: text,
    date: today(), version: versionOf(app), type, images: images.length ? images : undefined, read: false,
  }, ...appFbList.value];
  pushToast('反馈已提交，仅开发者可见');
};

/* 系统开发者：以应用市场管理员身份回复意见反馈 */
const replyFb = (id: string) => {
  const text = fbReplyText.value.trim();
  if (!text) { pushToast('请先填写回复内容'); return; }
  fbList.value = fbList.value.map((f) => (f.id === id ? {
    ...f,
    msgs: [...f.msgs, { id: `${id}-m${Date.now()}`, role: 'admin' as const, by: '应用市场管理员', at: fmtNow(), content: text }],
  } : f));
  fbReplyId.value = null; fbReplyText.value = '';
  pushToast('回复已提交');
};

/* 提交评价：仅已添加的应用可评（由 AcDetail 调用，返回是否成功） */
const submitReview = (app: AppItem, stars: number, title: string, text: string, images: string[]): boolean => {
  if (!app.added) { pushToast('添加应用后才可以评价'); return false; }
  if (!stars) { pushToast('请先选择星级'); return false; }
  if (!text.trim()) { pushToast('请填写评论内容'); return false; }
  reviews.value = [{ id: `rv-${Date.now()}`, appId: app.id, user: '七妮妮', stars, title: title.trim() || '用户评论', text: text.trim(), date: today(), version: versionOf(app), read: false, images: images.length ? images : undefined }, ...reviews.value];
  pushToast('评价已提交');
  return true;
};

/* 确认更新：加载后清除更新标记 */
const confirmUpdate = () => {
  const target = updateApp.value;
  if (!target) return;
  const { id, name } = target;
  const ver = versionOf(target);
  updateId.value = null;
  loadingId.value = id;
  window.setTimeout(() => {
    loadingId.value = null;
    patchApp(id, { hasUpdate: false });
    pushToast(`「${name}」已更新至 v${ver}`);
  }, 900);
};

/* ---------- 弹层派生数据 ---------- */
const fbDetail = computed(() => fbList.value.find((f) => f.id === fbDetailId.value) ?? null);
const fbReplies = computed(() => (fbDetail.value ? fbDetail.value.msgs.filter((m) => m.role === 'admin').length : 0));
const notice = computed(() => (noticeId.value ? PLATFORM_NOTICES.find((x) => x.id === noticeId.value) ?? null : null));
const verHistApp = computed(() => (verHistId.value ? apps.value.find((a) => a.id === verHistId.value) ?? null : null));
const revAllList = computed(() => reviews.value.filter((r) => r.appId === revAllId.value));
const devDrawerApp = computed(() => (devDrawerId.value ? apps.value.find((a) => a.id === devDrawerId.value) ?? null : null));
const devDrawerApps = computed(() => {
  const d = devDrawerApp.value;
  return d ? apps.value.filter((a) => a.creator === d.creator).sort((a, b) => b.users - a.users) : [];
});
const devDrawerUsers = computed(() => devDrawerApps.value.reduce((s, a) => s + a.users, 0));

/* ---------- 交互辅助 ---------- */
const onSort = (k: 'users' | 'release') => {
  if (sortKey.value === k) sortDesc.value = !sortDesc.value;
  else { sortKey.value = k; sortDesc.value = true; }
};
const toggleCategory = (c: string) => {
  category.value = category.value === c ? null : c;
  search.value = '';
  view.value = { kind: 'list' };
};
const onSearchInput = (e: Event) => {
  search.value = (e.target as HTMLInputElement).value;
  view.value = { kind: 'list' };
};
const gotoAppDetail = (appId: string) => {
  msgOpen.value = false;
  view.value = { kind: 'detail', id: appId };
};
const gotoFbDetail = (fbId: string) => {
  msgOpen.value = false;
  fbDetailId.value = fbId;
};
</script>

<template>
  <div class="ap-page">
    <aside class="ap-side">
      <nav class="ap-cats">
        <button type="button" @click="view = { kind: 'home' }">
          <AcSvg :d="IC.home" :size="15" class-name="ap-cat-ic" />
          首页
        </button>
        <div class="ap-side-div" />
        <div class="ap-search">
          <AcSvg :d="IC.search" :size="14" />
          <input placeholder="搜索" :value="search" @input="onSearchInput">
          <button v-if="search" type="button" class="ap-search-clear" @click="search = ''">
            <AcSvg :d="IC.clear" :size="12" />
          </button>
        </div>
        <button
          type="button"
          :class="!category && !search && view.kind === 'list' ? 'on' : ''"
          @click="category = null; search = ''; view = { kind: 'list' }"
        >
          <AcSvg :d="IC.all" :size="15" class-name="ap-cat-ic" />
          全部
        </button>
        <button
          v-for="c in CATEGORIES"
          :key="c"
          type="button"
          :class="category === c && !search ? 'on' : ''"
          @click="toggleCategory(c)"
        >
          <AcSvg :d="CAT_ICONS[c] ?? IC.cat" :size="15" class-name="ap-cat-ic" />
          {{ c }}
        </button>
      </nav>
      <div class="ap-side-bottom">
        <button type="button" class="ap-side-user" :class="mineActive ? ' on' : ''" title="我的应用" @click="view = { kind: 'mine' }">
          <span class="ap-avatar" />
          七妮妮
        </button>
        <button type="button" class="ap-bell" title="消息中心" @click="msgOpen = true">
          <AcSvg :d="IC.bell" :size="17" />
          <i v-if="msgCount > 0">{{ msgCount }}</i>
        </button>
      </div>
    </aside>

    <main class="ap-main">
      <AcHome
        v-if="view.kind === 'home'"
        :apps="apps"
        :recent="recent"
        :fav-ids="favIds"
        :loading-id="loadingId"
        :menu-id="menu?.id ?? null"
        :banner-idx="bannerIdx"
        :rank-range="rankRange"
        :rank-tab="rankTab"
        :rank-open="rankOpen"
        :fb-filter="fbFilter"
        :fb-list="fbList"
        :on-notice="(id) => (noticeId = id)"
        :on-banner-idx="(i) => (bannerIdx = i)"
        :on-open-detail="openDetail"
        :on-goto-dash="() => (view = { kind: 'dash' })"
        :on-rank-tab="(k) => (rankTab = k)"
        :on-rank-range="(v) => (rankRange = v)"
        :on-rank-open="(name) => (rankOpen = name)"
        :on-fb-filter="(k) => (fbFilter = k)"
        :on-new-fb="() => { fbText = ''; fbCreate = true; }"
        :on-fb-detail="(id) => { fbNote = ''; fbDetailId = id; }"
        :on-act="act"
        :on-toggle-fav="toggleFav"
        :on-open-menu="openMenu"
      />

      <template v-else-if="view.kind === 'list'">
        <div class="ap-list-head">
          <h2 class="ap-list-title">{{ listTitle }}</h2>
          <div class="ap-sorts">
            <button
              v-for="k in (['users', 'release'] as const)"
              :key="k"
              type="button"
              class="ap-sort"
              :class="sortKey === k ? ' on' : ''"
              @click="onSort(k)"
            >
              {{ k === 'users' ? '使用人数' : '上架时间' }}
              <AcSvg :d="IC.sort" :size="12" />
            </button>
          </div>
        </div>
        <div class="ap-grid">
          <AcCell
            v-for="a in listApps"
            :key="a.id"
            :app="a"
            :caret="a.mine"
            :loading="loadingId === a.id"
            :fav-on="favIds.includes(a.id)"
            :menu-open="menu?.id === a.id"
            :on-open="() => openDetail(a.id)"
            :on-act="act"
            :on-toggle-fav="toggleFav"
            :on-open-menu="openMenu"
          />
        </div>
      </template>

      <template v-else-if="view.kind === 'detail'">
        <AcDetail
          v-if="detailApp"
          :key="detailId"
          :app="detailApp"
          :apps="apps"
          :reviews="reviews"
          :fav-ids="favIds"
          :loading-id="loadingId"
          :menu-id="menu?.id ?? null"
          :on-back="() => (view = detailBack)"
          :on-act="act"
          :on-toggle-fav="toggleFav"
          :on-open-rev-all="(id) => (revAllId = id)"
          :on-submit-fb="submitAppFb"
          :on-open-ver-hist="(id) => (verHistId = id)"
          :on-open-dev-drawer="(id) => (devDrawerId = id)"
          :on-submit-review="submitReview"
          :on-open-detail="openDetail"
          :on-open-menu="openMenu"
        />
      </template>

      <template v-else-if="view.kind === 'mine'">
        <div class="ap-mine-head">
          <div class="ap-mine-tabs">
            <button type="button" :class="mineTab === 'created' ? 'on' : ''" @click="mineTab = 'created'">我的创作</button>
            <button type="button" :class="mineTab === 'added' ? 'on' : ''" @click="mineTab = 'added'">我添加的</button>
          </div>
          <button type="button" class="ap-btn-blue" @click="openCreate()">上传新创作</button>
        </div>
        <div class="ap-grid mine">
          <AcCell
            v-for="a in mineList"
            :key="a.id"
            :app="a"
            caret
            :loading="loadingId === a.id"
            :fav-on="favIds.includes(a.id)"
            :menu-open="menu?.id === a.id"
            :on-open="() => openDetail(a.id)"
            :on-act="act"
            :on-toggle-fav="toggleFav"
            :on-open-menu="openMenu"
          />
        </div>
      </template>

      <AppDashboard
        v-else-if="view.kind === 'dash'"
        :apps="apps"
        :reviews="reviews"
        :on-back="() => (view = { kind: 'home' })"
        :on-open-app="openDetail"
      />

      <AcCreate
        v-else-if="view.kind === 'create'"
        :key="createKey"
        :edit-app="editApp"
        :apps="apps"
        :cats="cats"
        :on-back="() => (view = backView)"
        :on-submit="submitCreate"
        :on-open-cat-drawer="openCatDrawer"
      />
    </main>

    <ToastWrap />

    <!-- 微动作气泡：锚在动作点上方自动消退（收藏/打开等卡片级反馈） -->
    <Teleport to="body">
      <div v-if="bubble" class="ap-bubble" :style="{ left: `${bubble.x}px`, top: `${bubble.y}px` }">{{ bubble.text }}</div>
    </Teleport>

    <!-- 行操作菜单（React createPortal → Teleport） -->
    <Teleport to="body">
      <template v-if="menu && menuApp">
        <div class="ap-menu-mask" @click="menu = null" />
        <div class="ap-menu" :style="{ left: `${menu.x}px`, top: `${menu.y}px` }">
          <template v-if="view.kind === 'mine' && mineTab === 'added'">
            <button type="button" @click="showBubble($event, '已添加到首页'); menu = null">添加到首页</button>
            <button type="button" class="danger" @click="removeAdded(menuApp.id, $event); menu = null">移除应用</button>
          </template>
          <template v-else-if="view.kind === 'mine'">
            <button type="button" @click="openCreate(menuApp.id); menu = null">编辑应用</button>
            <button type="button" @click="menu = null; pushToast('权限管理：演示')">权限管理</button>
            <button type="button" class="danger" @click="deleteId = menuApp.id; menu = null">删除应用</button>
          </template>
          <template v-else>
            <button type="button" @click="act(menuApp, $event); menu = null">打开</button>
            <button type="button" @click="menu = null; pushToast('权限管理：演示')">权限管理</button>
            <button type="button" @click="openCreate(menuApp.id); menu = null">编辑应用</button>
          </template>
        </div>
      </template>
    </Teleport>

    <!-- 类目管理抽屉 -->
    <Teleport to="body">
      <template v-if="catDrawer">
        <div class="ap-drawer-mask" @click="catDrawer = false" />
        <div class="ap-drawer">
          <div class="ap-drawer-head">
            <span>管理类目</span>
            <button type="button" @click="catDrawer = false"><AcSvg :d="IC.clear" :size="14" /></button>
          </div>
          <div class="ap-drawer-body">
            <div
              v-for="(c, i) in draft"
              :key="i"
              class="ap-cat-row"
              :class="dragIdx === i ? 'dragging' : ''"
              :draggable="editIdx !== i"
              @dragstart="dragIdx = i"
              @dragenter="onDragEnter(i)"
              @dragover.prevent
              @dragend="dragIdx = null"
            >
              <div class="ap-cat-icwrap">
                <button type="button" class="ap-cat-icon" title="更换图标" @click="pickIdx = pickIdx === i ? null : i">
                  <img v-if="isImgIcon(c.ic)" :src="c.ic" alt="">
                  <AcSvg v-else :d="GLYPHS[c.ic] ?? IC.folder" :size="16" />
                </button>
                <div v-if="pickIdx === i" class="ap-cat-pick">
                  <button
                    v-for="g in ICON_LIB"
                    :key="g.k"
                    type="button"
                    :class="c.ic === g.k ? 'on' : ''"
                    @click="pickIcon(i, g.k)"
                  >
                    <AcSvg :d="g.d" :size="16" />
                  </button>
                  <label class="ap-cat-pick-up" title="上传图标">
                    <AcSvg :d="IC.plus" :size="14" />
                    <input type="file" accept="image/*" @change="onPickCatIcon(i, $event)">
                  </label>
                </div>
              </div>
              <input
                v-if="editIdx === i"
                v-focus
                v-model="editVal"
                class="ap-cat-edit-input"
                placeholder="请输入类目名称"
                @keydown.enter="confirmEdit(i)"
                @blur="blurEdit(i)"
              >
              <template v-else>
                <span class="ap-cat-name" title="点击修改名称" @click="editIdx = i; editVal = c.n">{{ c.n }}</span>
                <button type="button" class="ap-cat-ic-btn danger" title="删除" @click="removeCat(i)">
                  <AcSvg :d="IC.trash" :size="15" />
                </button>
              </template>
            </div>
            <button type="button" class="ap-cat-new" @click="addCatRow()">+ 新建分类</button>
          </div>
          <div class="ap-drawer-foot">
            <button type="button" class="ap-btn-plain" @click="catDrawer = false">取 消</button>
            <button type="button" class="ap-btn-blue" @click="saveCats()">保 存</button>
          </div>
        </div>
      </template>
    </Teleport>

    <!-- 新建反馈抽屉 -->
    <Teleport to="body">
      <template v-if="fbCreate">
        <div class="ap-drawer-mask" @click="fbCreate = false" />
        <div class="ap-drawer">
          <div class="ap-drawer-head">
            <span>新建反馈</span>
            <button type="button" @click="fbCreate = false"><AcSvg :d="IC.clear" :size="14" /></button>
          </div>
          <div class="ap-drawer-body">
            <div class="ap-fb-field-label">反馈类型</div>
            <div class="ap-fb-types">
              <button
                v-for="t in FB_TYPES"
                :key="t"
                type="button"
                :class="fbType === t ? 'on' : ''"
                @click="fbType = t"
              >
                {{ t }}
              </button>
            </div>
            <div class="ap-fb-field-label">反馈内容</div>
            <textarea
              v-model="fbText"
              class="ap-fb-input"
              rows="6"
              :maxlength="200"
              placeholder="说说你的建议或遇到的问题，我们会认真跟进并回复…"
            />
            <div class="ap-fb-tip right">{{ fbText.length }}/200</div>
          </div>
          <div class="ap-drawer-foot">
            <button type="button" class="ap-btn-plain" @click="fbCreate = false">取 消</button>
            <button type="button" class="ap-btn-blue" @click="submitFb()">提交反馈</button>
          </div>
        </div>
      </template>
    </Teleport>

    <!-- 反馈详情抽屉 -->
    <Teleport to="body">
      <template v-if="fbDetail">
        <div class="ap-drawer-mask" @click="fbDetailId = null" />
        <div class="ap-drawer ap-drawer-fb">
          <div class="ap-drawer-head">
            <span>反馈详情</span>
            <button type="button" @click="fbDetailId = null"><AcSvg :d="IC.clear" :size="14" /></button>
          </div>
          <div class="ap-drawer-body">
            <div class="ap-fb-detail-meta">
              <div class="ap-fb-meta-top">
                <em class="ap-fb-type" :class="fbDetail.type === '问题反馈' ? 'bug' : fbDetail.type === '体验优化' ? 'ux' : ''">{{ fbDetail.type }}</em>
                <i>提交于 {{ fbDetail.at }}</i>
              </div>
              <div class="ap-fb-meta-status">
                <span>处理状态</span>
                <b :class="fbReplies > 0 ? 'st-done' : 'st-pending'">{{ fbReplies > 0 ? '已回复' : '待回复' }}</b>
                <em>{{ fbReplies > 0 ? `共 ${fbReplies} 条官方回复` : '等待官方处理中' }}</em>
              </div>
            </div>
            <div class="ap-fb-thread">
              <div v-for="m in fbDetail.msgs" :key="m.id" class="ap-fb-msg" :class="m.role">
                <div class="ap-fb-msg-head"><b>{{ m.role === 'admin' ? `官方 · ${m.by}` : m.by }}</b><i>{{ m.at }}</i></div>
                <p>{{ m.content }}</p>
              </div>
              <div v-if="fbReplies === 0" class="ap-fb-empty">暂无回复，官方处理后会在此回复你</div>
            </div>
            <div class="ap-fb-field-label mt">补充描述</div>
            <textarea
              v-model="fbNote"
              class="ap-fb-input"
              rows="3"
              :maxlength="200"
              placeholder="还有想补充的信息？写在这里…"
            />
          </div>
          <div class="ap-drawer-foot">
            <button type="button" class="ap-btn-plain" @click="fbDetailId = null">关 闭</button>
            <button type="button" class="ap-btn-blue" @click="appendFbNote(fbDetail.id)">提交补充</button>
          </div>
        </div>
      </template>
    </Teleport>

    <!-- 删除应用确认 -->
    <div v-if="deleteApp" class="ap-mask">
      <div class="ap-modal">
        <div class="ap-modal-head">
          <span>删除应用</span>
          <button type="button" @click="deleteId = null"><AcSvg :d="IC.clear" :size="14" /></button>
        </div>
        <div class="ap-modal-body">
          应用删除后，使用记录及关联数据将全部丢失，请谨慎操作，是否确认删除该应用？
        </div>
        <div class="ap-modal-foot">
          <button type="button" class="ap-btn-plain" @click="deleteId = null">取 消</button>
          <button type="button" class="ap-btn-blue" @click="confirmDelete()">确 定</button>
        </div>
      </div>
    </div>

    <!-- 更新应用确认 -->
    <div v-if="updateApp" class="ap-mask">
      <div class="ap-modal">
        <div class="ap-modal-head">
          <span>更新应用</span>
          <button type="button" @click="updateId = null"><AcSvg :d="IC.clear" :size="14" /></button>
        </div>
        <div class="ap-modal-body">
          <div class="ap-upd-ver">
            <span>v{{ updateApp.prevVersion ?? '1.0.0' }}</span>
            <AcSvg :d="IC.arrow" :size="14" />
            <b>v{{ versionOf(updateApp) }}</b>
          </div>
          <div class="ap-upd-note">
            <i>更新内容</i>
            <p>{{ updateApp.releaseNote ?? '性能优化与体验改进。' }}</p>
          </div>
        </div>
        <div class="ap-modal-foot">
          <button type="button" class="ap-btn-plain" @click="updateId = null">取 消</button>
          <button type="button" class="ap-btn-blue" @click="confirmUpdate()">立即更新</button>
        </div>
      </div>
    </div>

    <!-- 全部评价 -->
    <div v-if="revAllId" class="ap-mask">
      <div class="ap-modal ap-modal-lg">
        <div class="ap-modal-head">
          <span>全部评价（{{ revAllList.length }}）</span>
          <button type="button" @click="revAllId = null"><AcSvg :d="IC.clear" :size="14" /></button>
        </div>
        <div class="ap-modal-body ap-rev-list">
          <div v-for="r in revAllList" :key="r.id" class="ap-rev-item">
            <div class="ap-rev-head">
              <b>{{ r.title }}</b>
              <div class="ap-rev-meta"><i>{{ agoText(r.date) }}</i><span>{{ r.user }}</span><em>v{{ r.version }}</em></div>
            </div>
            <div class="ap-rev-stars">
              <AcSvg v-for="n in r.stars" :key="n" :d="IC.star" :size="13" filled class-name="ap-star" />
            </div>
            <p>{{ r.text }}</p>
            <div v-if="r.images && r.images.length > 0" class="ap-rev-imgs">
              <img v-for="(src, i) in r.images" :key="i" :src="src" alt="">
            </div>
            <div v-if="r.reply" class="ap-rev-reply"><i>开发者回复</i><p>{{ r.reply.text }}</p></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本历史记录 -->
    <div v-if="verHistId" class="ap-mask">
      <div class="ap-modal ap-modal-lg">
        <div class="ap-modal-head">
          <span>版本历史记录</span>
          <button type="button" @click="verHistId = null"><AcSvg :d="IC.clear" :size="14" /></button>
        </div>
        <div class="ap-modal-body ap-rev-list">
          <template v-if="verHistApp">
            <div class="ap-vh-item">
              <div class="ap-feat-head">
                <b>版本 {{ versionOf(verHistApp) }}</b>
                <div class="ap-feat-meta"><i>{{ agoText(verHistApp.release) }}</i><span>{{ verHistApp.release }}</span></div>
              </div>
              <ul><li v-for="l in featLinesOf(verHistApp)" :key="l">{{ l }}</li></ul>
            </div>
            <div v-if="verHistApp.prevVersion" class="ap-vh-item">
              <div class="ap-feat-head">
                <b>版本 {{ verHistApp.prevVersion }}</b>
                <div class="ap-feat-meta"><i>历史版本</i></div>
              </div>
              <ul><li>性能优化与体验改进。</li></ul>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 平台公告详情 -->
    <div v-if="notice" class="ap-mask">
      <div class="ap-modal">
        <div class="ap-modal-head">
          <span>{{ notice.title }}</span>
          <button type="button" @click="noticeId = null"><AcSvg :d="IC.clear" :size="14" /></button>
        </div>
        <div class="ap-modal-body ap-notice-body">
          <i>{{ notice.date }} · {{ notice.tag }}</i>
          <p>{{ notice.content }}</p>
        </div>
        <div class="ap-modal-foot">
          <button type="button" class="ap-btn-blue" @click="noticeId = null">我知道了</button>
        </div>
      </div>
    </div>

    <!-- 消息中心抽屉 -->
    <AcMsgDrawer
      v-if="msgOpen"
      :apps="apps"
      :my-reviews="myReviews"
      :app-fb-list="myAppFbs"
      :fb-list="fbList"
      :msg-tab="msgTab"
      :msg-sub-tab="msgSubTab"
      :msg-app-filter="msgAppFilter"
      :msg-fb-type="msgFbType"
      :msg-status="msgStatus"
      :rv-reply-id="rvReplyId"
      :rv-reply-text="rvReplyText"
      :fb-reply-id="fbReplyId"
      :fb-reply-text="fbReplyText"
      :on-close="() => (msgOpen = false)"
      :on-mark-all-read="markAllRead"
      :on-msg-tab="(t) => { msgTab = t; msgStatus = 'all'; }"
      :on-msg-sub-tab="(t) => { msgSubTab = t; msgStatus = 'all'; }"
      :on-msg-app-filter="(id) => (msgAppFilter = id)"
      :on-msg-fb-type="(t) => (msgFbType = t)"
      :on-msg-status="(s) => (msgStatus = s)"
      :on-mark-rev-read="markRevRead"
      :on-mark-af-read="markAppFbRead"
      :on-mark-fb-read="markFbRead"
      :on-goto-app="gotoAppDetail"
      :on-goto-fb="gotoFbDetail"
      :on-rv-reply-id="(id) => (rvReplyId = id)"
      :on-rv-reply-text="(v) => (rvReplyText = v)"
      :on-reply-review="replyReview"
      :af-reply-id="afReplyId"
      :af-reply-text="afReplyText"
      :on-af-reply-id="(id) => (afReplyId = id)"
      :on-af-reply-text="(v) => (afReplyText = v)"
      :on-reply-app-fb="replyAppFb"
      :on-fb-reply-id="(id) => (fbReplyId = id)"
      :on-fb-reply-text="(v) => (fbReplyText = v)"
      :on-reply-fb="replyFb"
    />

    <!-- 开发者上架应用抽屉 -->
    <template v-if="devDrawerApp">
      <div class="ap-drawer-mask" @click="devDrawerId = null" />
      <div class="ap-drawer">
        <div class="ap-drawer-head">
          <span>{{ devDrawerApp.creator }} 的上架应用</span>
          <button type="button" @click="devDrawerId = null"><AcSvg :d="IC.clear" :size="14" /></button>
        </div>
        <div class="ap-drawer-body">
          <div class="ap-dev">
            <span class="ap-dev-ava">{{ devDrawerApp.creator.slice(0, 1) }}</span>
            <div class="ap-dev-main">
              <b>{{ devDrawerApp.creator }}</b>
              <i>{{ creatorDept(devDrawerApp.creator) }}</i>
            </div>
            <div class="ap-dev-stats">
              <span><b>{{ devDrawerApps.length }}</b>上架应用</span>
              <span><b>{{ devDrawerUsers }}</b>总使用人次</span>
            </div>
          </div>
          <div class="ap-dev-apps">
            <button
              v-for="a in devDrawerApps"
              :key="a.id"
              type="button"
              class="ap-dev-app"
              @click="devDrawerId = null; view = { kind: 'detail', id: a.id }"
            >
              <AcLogo :icon="a.icon" :size="36" />
              <div class="ap-dev-app-main"><b>{{ a.name }}</b><i>{{ a.category }} · {{ a.users }} 人次使用</i></div>
              <em v-if="a.id === devDrawerApp.id" class="ap-dev-cur">当前</em>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

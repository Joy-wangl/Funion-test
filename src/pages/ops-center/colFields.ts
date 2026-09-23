import { computed, onBeforeUnmount, ref, watch } from 'vue';

/* =========================================================
   列表字段管理（▦ 气泡）共享能力：列显隐＋拖拽排序＋左/右钉住
   智能运营中心所有二级路由列表页共用；状态按 scope 键模块级保活（切页不丢）
   ========================================================= */

export interface ColField {
  key: string;
  /** 列名：固定列（勾选/序号）无列头文案可不传 */
  label?: string;
  /** 列宽（px）：钉住冻结偏移计算依据；百分比宽表不传并置 sticky=false */
  width?: number;
  /** 列宽（%）：百分比宽表列驱动后保持原 fixed 布局占比 */
  pct?: number;
}

export interface ColScopeCfg {
  /** 固定左列（不可管理，如勾选/商品信息） */
  fixedLeft: ColField[];
  /** 可管理字段（气泡全量清单，数组序即默认序） */
  fields: ColField[];
  /** 固定右列（不可管理，如操作） */
  fixedRight: ColField[];
  /** 钉住时是否 sticky 冻结（横向可滚表=true；百分比宽/不溢出表=false 仅置顶/置尾） */
  sticky?: boolean;
}

interface ColScopeState {
  hidden: string[];
  order: string[];
  pinL: string[];
  pinR: string[];
}
const store = new Map<string, ColScopeState>();

export function useColField(scope: string, cfg: ColScopeCfg) {
  if (!store.has(scope)) store.set(scope, { hidden: [], order: [], pinL: [], pinR: [] });
  const st = store.get(scope)!;
  const hidden = ref<string[]>([...st.hidden]);
  const order = ref<string[]>([...st.order]);
  const pinL = ref<string[]>([...st.pinL]);
  const pinR = ref<string[]>([...st.pinR]);
  const sync = () => {
    st.hidden = [...hidden.value];
    st.order = [...order.value];
    st.pinL = [...pinL.value];
    st.pinR = [...pinR.value];
  };
  watch([hidden, order, pinL, pinR], sync, { deep: true });

  const fieldOf = (k: string) => cfg.fields.find((f) => f.key === k);
  /* 生效列序：已存序中仍存在的字段＋新增字段追加（fields 支持 getter 动态列集，如市场商机按 tab 切列） */
  const visibleKeys = computed(() => {
    const ks = cfg.fields.map((f) => f.key);
    return [...order.value.filter((k) => ks.includes(k)), ...ks.filter((k) => !order.value.includes(k))];
  });
  /* 气泡清单：跟随拖拽序（含隐藏项） */
  const orderedFields = computed(() => visibleKeys.value.map(fieldOf).filter((f): f is ColField => !!f));
  /* 表中列序：左钉（钉住序）＋其余可见（拖拽序）＋右钉（钉住序） */
  const midCols = computed(() => {
    const mid = visibleKeys.value.filter((k) => !pinL.value.includes(k) && !pinR.value.includes(k) && !hidden.value.includes(k));
    return [...pinL.value, ...mid, ...pinR.value].map(fieldOf).filter((f): f is ColField => !!f);
  });
  /* 列是否可见（命名避开 on 前缀：Vue 会把 on* 键当事件监听器做类型变换） */
  const shown = (k: string) => !hidden.value.includes(k);

  const toggle = (k: string) => {
    const hiding = shown(k);
    hidden.value = hiding ? [...hidden.value, k] : hidden.value.filter((x) => x !== k);
    /* 隐藏的列不能继续钉住 */
    if (hiding) {
      pinL.value = pinL.value.filter((x) => x !== k);
      pinR.value = pinR.value.filter((x) => x !== k);
    }
  };
  const dragKey = ref('');
  const onDrop = (target: string) => {
    const base = visibleKeys.value;
    const from = base.indexOf(dragKey.value);
    const to = base.indexOf(target);
    if (from >= 0 && to >= 0 && from !== to) {
      const next = [...base];
      next.splice(from, 1);
      next.splice(to, 0, dragKey.value);
      order.value = next;
    }
    dragKey.value = '';
  };
  /* 钉住：左/右互斥；钉住即需可见 */
  const togglePinLeft = (k: string) => {
    if (pinL.value.includes(k)) pinL.value = pinL.value.filter((x) => x !== k);
    else {
      pinL.value = [...pinL.value, k];
      pinR.value = pinR.value.filter((x) => x !== k);
      hidden.value = hidden.value.filter((x) => x !== k);
    }
  };
  const togglePinRight = (k: string) => {
    if (pinR.value.includes(k)) pinR.value = pinR.value.filter((x) => x !== k);
    else {
      pinR.value = [...pinR.value, k];
      pinL.value = pinL.value.filter((x) => x !== k);
      hidden.value = hidden.value.filter((x) => x !== k);
    }
  };

  /* ---------- 钉住冻结：左冻结组＝固定左列＋左钉列，右冻结组＝右钉列＋固定右列；偏移＝组内前置列累计宽 ---------- */
  const sticky = cfg.sticky !== false;
  const leftGroup = computed(() => [...cfg.fixedLeft, ...pinL.value.map(fieldOf).filter((f): f is ColField => !!f)]);
  const rightGroup = computed(() => [...pinR.value.map(fieldOf).filter((f): f is ColField => !!f), ...cfg.fixedRight]);
  const pinActive = computed(() => sticky && (pinL.value.length > 0 || pinR.value.length > 0));
  const lIdx = (k: string) => leftGroup.value.findIndex((c) => c.key === k);
  const rIdx = (k: string) => rightGroup.value.findIndex((c) => c.key === k);
  const stickCls = (k: string) => {
    if (!pinActive.value) return undefined;
    if (lIdx(k) >= 0) return { 'cf-stick-l': true, 'cf-stick-edge': lIdx(k) === leftGroup.value.length - 1 };
    if (rIdx(k) >= 0) return { 'cf-stick-r': true, 'cf-stick-edge-r': rIdx(k) === 0 };
    return undefined;
  };
  const stickStyle = (k: string) => {
    if (!pinActive.value) return undefined;
    if (lIdx(k) >= 0) return { left: `${leftGroup.value.slice(0, lIdx(k)).reduce((s, c) => s + (c.width ?? 0), 0)}px` };
    if (rIdx(k) >= 0) return { right: `${rightGroup.value.slice(rIdx(k) + 1).reduce((s, c) => s + (c.width ?? 0), 0)}px` };
    return undefined;
  };
  /* fixed 布局保底宽：全部可见列宽合计（防列被压窄） */
  const tableMinWidth = computed(() => {
    if (!pinActive.value) return undefined;
    const midW = midCols.value.reduce((s, c) => s + (c.width ?? 150), 0);
    return leftGroup.value.reduce((s, c) => s + (c.width ?? 0), 0) + midW + rightGroup.value.reduce((s, c) => s + (c.width ?? 0), 0);
  });

  /* ---------- ▦ 气泡开合：外部 mousedown 关闭 ---------- */
  const pop = ref(false);
  const close = () => { pop.value = false; };
  watch(pop, (v) => {
    if (v) document.addEventListener('mousedown', close);
    else document.removeEventListener('mousedown', close);
  });
  onBeforeUnmount(() => document.removeEventListener('mousedown', close));

  /* ▦ 按钮高亮：存在隐藏列或钉住列（限当前列集内） */
  const changed = computed(() => {
    const ks = cfg.fields.map((f) => f.key);
    return hidden.value.some((k) => ks.includes(k)) || pinL.value.some((k) => ks.includes(k)) || pinR.value.some((k) => ks.includes(k));
  });

  return {
    hidden, order, pinL, pinR, dragKey, pop, changed,
    orderedFields, midCols, shown, toggle, onDrop, togglePinLeft, togglePinRight,
    pinActive, stickCls, stickStyle, tableMinWidth,
  };
}

export type ColFieldState = ReturnType<typeof useColField>;

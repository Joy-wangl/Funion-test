import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

/* 锚定气泡：fixed 定位但记录触发锚点，scroll/resize 时实时重算坐标，
   保证气泡始终跟随触发元素（表格滚动时不脱锚）。点击外部自动关闭。
   下方空间不足时自动翻转到触发元素上方，避免视口底部裁切。 */
export function useAnchorPop() {
  const pos = ref<{ x: number; y: number } | null>(null);
  let anchor: HTMLElement | null = null;
  let popW = 130;
  let popSel = '.add-pop';

  const place = () => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const x = Math.max(8, Math.min(r.left, window.innerWidth - popW));
    let y = r.bottom + 6;
    const popEl = document.querySelector(popSel) as HTMLElement | null;
    const popH = popEl ? popEl.offsetHeight : 0;
    if (popH && y + popH > window.innerHeight - 8 && r.top - 6 - popH >= 8) y = r.top - 6 - popH;
    pos.value = { x, y };
  };
  const close = () => {
    pos.value = null;
  };
  const onDown = () => close();

  watch(pos, (v) => {
    if (v) {
      document.addEventListener('mousedown', onDown);
      /* capture：表格内部滚动容器触发的 scroll 也能捕获 */
      window.addEventListener('scroll', place, true);
      window.addEventListener('resize', place);
    } else {
      anchor = null;
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    }
  });
  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onDown);
    window.removeEventListener('scroll', place, true);
    window.removeEventListener('resize', place);
  });

  const open = (el: HTMLElement, width = 130, selector = '.add-pop') => {
    anchor = el;
    popW = width;
    popSel = selector;
    place();
    /* 气泡落 DOM 后按真实高度再算一次，决定是否需要向上翻转 */
    nextTick(place);
  };
  return { pos, open, close };
}

import { onBeforeUnmount, ref, watch } from 'vue';

/* 锚定气泡：fixed 定位但记录触发锚点，scroll/resize 时实时重算坐标，
   保证气泡始终跟随触发元素（表格滚动时不脱锚）。点击外部自动关闭。 */
export function useAnchorPop() {
  const pos = ref<{ x: number; y: number } | null>(null);
  let anchor: HTMLElement | null = null;

  const place = () => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    pos.value = { x: Math.max(8, Math.min(r.left, window.innerWidth - 130)), y: r.bottom + 6 };
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

  const open = (el: HTMLElement) => {
    anchor = el;
    place();
  };
  return { pos, open, close };
}

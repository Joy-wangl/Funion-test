import { useEffect, useState } from 'react';

/**
 * 全局响应式断点（与 CSS 媒体查询保持一致）：
 * ≥1440  默认布局
 * 1200–1439  紧凑布局（Tab 间距收缩）
 * <1200  侧边栏抽屉化
 * <768   顶栏极简化
 */
export const BREAKPOINTS = {
  compact: '(max-width: 1439px)',
  narrow: '(max-width: 1199px)',
  mini: '(max-width: 767px)',
} as const;

/** 监听媒体查询条件是否成立 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

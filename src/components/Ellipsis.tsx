import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface EllipsisProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

/** 全局通用：单行省略展示，超出时鼠标悬浮白色气泡展示完整内容 */
export default function Ellipsis({ text, className, style }: EllipsisProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  return (
    <span
      ref={wrapRef}
      className={`ell-wrap${className ? ` ${className}` : ''}`}
      style={style}
      onMouseEnter={() => {
        const el = innerRef.current;
        const wrap = wrapRef.current;
        if (!el || !wrap || el.scrollWidth <= el.clientWidth) return;
        const r = wrap.getBoundingClientRect();
        /* fixed 定位 + portal 渲染，任何 overflow 容器都不裁切 */
        setTip({ x: Math.max(8, Math.min(r.left, window.innerWidth - 376)), y: r.bottom + 6 });
      }}
      onMouseLeave={() => setTip(null)}
    >
      <span className="ell-inner" ref={innerRef}>{text}</span>
      {tip &&
        createPortal(
          <span className="ell-tip" style={{ left: tip.x, top: tip.y }}>
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}

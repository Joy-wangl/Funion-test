import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface MoreActionItem {
  label: string;
  /** 危险操作（红色） */
  danger?: boolean;
  onClick: () => void;
}

/**
 * 操作列全局规范：最多直出两个操作，超出项收进「更多」，点击气泡展开。
 */
export default function MoreActions({ items }: { items: MoreActionItem[] }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pos]);

  return (
    <>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos({ x: Math.max(8, Math.min(r.left, window.innerWidth - 130)), y: r.bottom + 6 });
        }}
      >
        更多
      </a>
      {pos &&
        createPortal(
          <div className="add-pop" style={{ left: pos.x, top: pos.y }} onMouseDown={(e) => e.stopPropagation()}>
            {items.map((it) => (
              <div
                className={`add-pop-item${it.danger ? ' danger' : ''}`}
                key={it.label}
                onClick={() => {
                  setPos(null);
                  it.onClick();
                }}
              >
                {it.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

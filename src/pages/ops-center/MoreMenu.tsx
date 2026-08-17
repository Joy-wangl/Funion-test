import { useEffect, useRef, useState } from 'react';

interface MoreMenuProps {
  /** 折叠进下拉菜单的操作项 */
  items: string[];
}

/** 操作列「更多」下拉：默认折叠多余操作，点击展开，点击外部自动关闭 */
export default function MoreMenu({ items }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="more-wrap" ref={ref}>
      <a
        href="#"
        className="more-trigger"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        更多{open ? ' ▴' : ' ▾'}
      </a>
      {open && (
        <div className="more-menu">
          {items.map((it) => (
            <a key={it} href="#" onClick={() => setOpen(false)}>
              {it}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

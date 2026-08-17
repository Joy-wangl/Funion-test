import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProductRow } from './data';
import { PLATFORM_LOGO, platformOfStore } from './data';
import BubbleSelect from '../../components/BubbleSelect';
import Ellipsis from '../../components/Ellipsis';

interface ProductTableProps {
  rows: ProductRow[];
  /** 勾选列宽度：内部商机 48px，运营管理 56px（含加宽留白） */
  checkWidth: number;
  /** 序号列宽度：内部商机 52px，运营管理 60px */
  indexWidth: number;
  /** 行勾选状态（受控）；不传则为非受控原生 checkbox */
  checked?: boolean[];
  onCheckChange?: (index: number, checked: boolean) => void;
}

/** 内部商机 / 运营管理共用的 15 列商品表格 + 分页（与 preview.html 一致） */
export default function ProductTable({ rows, checkWidth, indexWidth, checked, onCheckChange }: ProductTableProps) {
  /* 添加到：点击后气泡展示平台选项 */
  const [addTip, setAddTip] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!addTip) return;
    const close = () => setAddTip(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [addTip]);

  return (
    <div className="ib-table-card">
      <div className="ib-table-wrap">
        <table className="ib-table">
          <thead>
            <tr>
              <th style={{ width: checkWidth }}>
                <input type="checkbox" className="ib-check" />
              </th>
              <th style={{ width: indexWidth }}>序号</th>
              <th>商品信息</th>
              <th>上架店铺</th>
              <th>商品类目</th>
              <th>近30天销量趋势</th>
              <th>云仓占比</th>
              <th>昨日销量</th>
              <th>近7日销量</th>
              <th>退款率</th>
              <th>发货后退款率</th>
              <th>库存数</th>
              <th>创建时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.pid}>
                <td>
                  <input
                    type="checkbox"
                    className="ib-check"
                    checked={checked ? checked[i] : undefined}
                    onChange={(e) => onCheckChange?.(i, e.target.checked)}
                  />
                </td>
                <td className="ib-center">{i + 1}</td>
                <td>
                  <div className="ib-product">
                    <img className="ib-thumb" src={row.thumb} />
                    <div>
                      <div className="ib-pname"><Ellipsis text={row.pname} /></div>
                      <div className="ib-meta">商品ID：{row.pid}</div>
                      <div className="ib-meta">
                        店铺：
                        <span className="store-logo">
                          <img src={PLATFORM_LOGO[platformOfStore(row.storeMeta.text)]} alt="" />
                        </span>
                        {row.storeMeta.text}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{row.storeCol}</td>
                <td>{row.category}</td>
                <td>
                  <svg className="spark" viewBox="0 0 90 32">
                    <polyline fill="none" stroke="#68a1ff" strokeWidth="2" points={row.spark} />
                  </svg>
                </td>
                <td>{row.cloudRatio}</td>
                <td>{row.yesterday}</td>
                <td>{row.week7}</td>
                <td>{row.refundRate}</td>
                <td>{row.refundAfter}</td>
                <td>
                  {row.stock} <span className="badge-red">库存紧张</span>
                </td>
                <td>{row.created}</td>
                <td>
                  <span className="badge-green">在售</span>
                </td>
                <td className="actions-col">
                  <a href="#">详情</a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setAddTip({ x: Math.max(8, Math.min(r.left, window.innerWidth - 130)), y: r.bottom + 6 });
                    }}
                  >
                    添加到
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ib-pagination">
        <div className="ib-pageinfo">共 15001662 条</div>
        <BubbleSelect className="ib-page-size" defaultValue="50条/页" options={['50条/页', '100条/页', '300条/页', '500条/页']} />
        <div className="ib-pages">
          <button className="ib-pagebtn nav">‹</button>
          <button className="ib-pagebtn active">1</button>
          <button className="ib-pagebtn">2</button>
          <button className="ib-pagebtn">3</button>
          <button className="ib-pagebtn">4</button>
          <button className="ib-pagebtn">5</button>
          <button className="ib-pagebtn">6</button>
          <button className="ib-pagebtn">…</button>
          <button className="ib-pagebtn">300034</button>
          <button className="ib-pagebtn nav">›</button>
        </div>
        <div className="ib-jump">
          <span>前往</span>
          <input className="ib-jump-input" defaultValue="1" />
          <span>页</span>
        </div>
      </div>
      {addTip &&
        createPortal(
          <div
            className="add-pop"
            style={{ left: addTip.x, top: addTip.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {['淘宝', '视频号'].map((t) => (
              <div className="add-pop-item" key={t} onClick={() => setAddTip(null)}>
                {t}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createTaobaoRows } from './data';
import type { CreateRow } from './data';
import BubbleSelect from '../../components/BubbleSelect';
import Ellipsis from '../../components/Ellipsis';
import MoreActions from '../../components/MoreActions';
import CreateDetailPage from './CreateDetailPage';

/** 商品创建页 */
export default function CreateProductPage() {
  const [rows, setRows] = useState<CreateRow[]>(createTaobaoRows);
  /* 详情态：复用内部商机/店铺商品详情样式 */
  const [detail, setDetail] = useState<CreateRow | null>(null);
  /* 发布到：点击后气泡展示平台选项 */
  const [pubTip, setPubTip] = useState<{ x: number; y: number } | null>(null);
  /* 删除二次确认 */
  const [delRow, setDelRow] = useState<CreateRow | null>(null);
  useEffect(() => {
    if (!pubTip) return;
    const close = () => setPubTip(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pubTip]);

  if (detail) return <CreateDetailPage row={detail} onBack={() => setDetail(null)} />;
  return (
    <div className="create-page">

      <div className="ib-filters create-filter">
        <div className="ib-grid">
          <div className="ib-field">
            <label>商机来源</label>
            <BubbleSelect className="ib-select" defaultValue="全部" options={['全部', '内部商机', '市场商机', '链接商品库']} />
          </div>
          <div className="ib-field">
            <label>来源平台</label>
            <BubbleSelect
              className="ib-select"
              defaultValue="淘宝"
              options={['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴']}
            />
          </div>
          <div className="ib-field">
            <label>链接商品ID</label>
            <input className="ib-input" placeholder="请输入链接商品ID" />
          </div>
          <div className="ib-field">
            <label>商品名称</label>
            <input className="ib-input" placeholder="请输入商品名称" />
          </div>
          <div className="ib-field">
            <label>状态</label>
            <BubbleSelect
              className="ib-select"
              defaultValue="全部"
              options={['全部', '已完善', '待完善']}
            />
          </div>
          <div className="ib-field">
            <label>发布店铺名</label>
            <input className="ib-input" placeholder="请输入发布店铺名" />
          </div>
          <div className="ib-field">
            <label>创建人名称</label>
            <input className="ib-input" placeholder="请输入创建人名称" />
          </div>
          <div className="ib-field">
            <label>创建时间</label>
            <div className="ib-range">
              <input className="ib-input" defaultValue="2026-08-13" />
              <span>→</span>
              <input className="ib-input" defaultValue="2026-08-13" />
            </div>
          </div>
          <div className="create-actions-inline">
            <div className="create-act-left">
              <button className="primaryBtn">快速铺货</button>
              <button className="primaryBtn">竞品导入</button>
            </div>
            <div className="create-act-right">
              <button className="lightBtn">重置</button>
              <button className="primaryBtn">查询</button>
            </div>
          </div>
        </div>
      </div>

      <div className="ib-table-card">
        <div className="ib-table-wrap">
          <table className="ib-table create-table">
            <thead>
              <tr>
                <th>商品信息</th>
                <th>上架店铺</th>
                <th>状态</th>
                <th>创建人 / 创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.link}>
                  <td>
                    <div className="create-product">
                      <img className="create-thumb" src={row.thumb} alt="thumb" />
                      <div>
                        <div className="create-product-title">
                          <span
                            className="create-platform-badge taobao"
                            style={{ height: 22, padding: '0 8px', fontSize: 11, marginRight: 8, verticalAlign: 'middle' }}
                          >
                            {row.platformBadge}
                          </span>
                          <Ellipsis className="create-title-ell" text={row.title} />
                        </div>
                        <div className="create-link">
                          竞品链接：<a href="#"><Ellipsis className="create-link-ell" text={row.link} /></a>
                          <span>◉</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="create-store-text">{row.store}</td>
                  <td>
                    <span className={`sgd-tag ${i % 2 ? 'orange' : 'green'}`}>{i % 2 ? '待完善' : '已完善'}</span>
                  </td>
                  <td>
                    <div className="create-person">{row.person}</div>
                    <div className="create-time">{row.time}</div>
                  </td>
                  <td className="create-ops">
                    <a href="#" onClick={(e) => { e.preventDefault(); setDetail(row); }}>详情</a>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setPubTip({ x: Math.max(8, Math.min(r.left, window.innerWidth - 130)), y: r.bottom + 6 });
                      }}
                    >
                      发布到
                    </a>
                    <MoreActions
                      items={[
                        {
                          label: '复制',
                          onClick: () =>
                            setRows((rs) =>
                              rs.flatMap((r) => (r.link === row.link ? [r, { ...r, link: `${row.link}-copy-${Date.now()}` }] : [r])),
                            ),
                        },
                        { label: '删除', danger: true, onClick: () => setDelRow(row) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ib-pagination">
          <div className="ib-pageinfo">共 128 条</div>
          <BubbleSelect className="ib-page-size" defaultValue="50条/页" options={['50条/页', '100条/页', '300条/页', '500条/页']} />
          <div className="ib-pages">
            <button className="ib-pagebtn nav">‹</button>
            <button className="ib-pagebtn active">1</button>
            <button className="ib-pagebtn">2</button>
            <button className="ib-pagebtn">3</button>
            <button className="ib-pagebtn nav">›</button>
          </div>
          <div className="ib-jump">
            <span>前往</span>
            <input className="ib-jump-input" defaultValue="1" />
            <span>页</span>
          </div>
        </div>
      </div>

      {pubTip &&
        createPortal(
          <div
            className="add-pop"
            style={{ left: pubTip.x, top: pubTip.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="add-pop-title">发布到指定店铺</div>
            {['淘宝心选店', '天猫Funion旗舰店', 'AAA小店'].map((t) => (
              <div className="add-pop-item" key={t} onClick={() => setPubTip(null)}>
                {t}
              </div>
            ))}
          </div>,
          document.body,
        )}

      {delRow &&
        createPortal(
          <div className="cp-modal-mask">
            <div className="cp-modal">
              <div className="cp-modal-title">删除确认</div>
              <div className="cp-modal-text">商品模版删除后无法恢复，是否确认删除？</div>
              <div className="cp-modal-foot">
                <button className="cp-btn" onClick={() => setDelRow(null)}>取消</button>
                <button
                  className="cp-btn danger"
                  onClick={() => {
                    setRows((rs) => rs.filter((r) => r.link !== delRow.link));
                    setDelRow(null);
                  }}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

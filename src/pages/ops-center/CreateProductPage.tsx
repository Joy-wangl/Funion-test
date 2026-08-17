import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createTaobaoRows, createVideoRows } from './data';
import type { CreateRow } from './data';
import BubbleSelect from '../../components/BubbleSelect';
import Ellipsis from '../../components/Ellipsis';
import MoreActions from '../../components/MoreActions';

interface CreateProductPageProps {
  /** taobao = 商品创建（淘宝），video = 商品创建（视频号） */
  variant: 'taobao' | 'video';
}

/** 商品创建页：淘宝 / 视频号两个变体（结构与 preview.html 一致） */
export default function CreateProductPage({ variant }: CreateProductPageProps) {
  const rowsInit = variant === 'taobao' ? createTaobaoRows : createVideoRows;
  const [rows, setRows] = useState<CreateRow[]>(rowsInit);
  /* 发布到：点击后气泡展示平台选项 */
  const [pubTip, setPubTip] = useState<{ x: number; y: number } | null>(null);
  /* 删除二次确认 */
  const [delRow, setDelRow] = useState<CreateRow | null>(null);

  useEffect(() => {
    setRows(variant === 'taobao' ? createTaobaoRows : createVideoRows);
  }, [variant]);

  useEffect(() => {
    if (!pubTip) return;
    const close = () => setPubTip(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pubTip]);
  return (
    <div className="create-page">
      <div className="page-header">
        <div className="page-title">
          <div className="create-title-row">
            <span className={`create-platform-badge ${variant}`}>{variant === 'taobao' ? '淘宝' : '视频号'}</span>
          </div>
          <p>商品模板配置后，可将配置好的模板信息一键发布至指定店铺，发布后支持快速拉取店铺内的商品信息。</p>
        </div>
      </div>

      <div className="ib-filters create-filter">
        <div className="ib-grid">
          <div className="ib-field">
            <label>竞品导入</label>
            <BubbleSelect className="ib-select" defaultValue="全部" options={['全部', '按链接导入', '按模板导入']} />
          </div>
          <div className="ib-field">
            <label>来源平台</label>
            <BubbleSelect
              className="ib-select"
              defaultValue={variant === 'taobao' ? '淘宝' : '微信视频号小店'}
              options={['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店']}
            />
          </div>
          <div className="ib-field">
            <label>版本名称</label>
            <input className="ib-input" placeholder="请输入版本名称" />
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
            <label>存在我的版本</label>
            <BubbleSelect
              className="ib-select"
              defaultValue={variant === 'taobao' ? '存在我的版本' : '全部'}
              options={['全部', '存在我的版本', '不存在我的版本']}
            />
          </div>
          <div className="ib-field">
            <label>发布店铺名</label>
            <input className="ib-input" placeholder="请输入发布店铺名" />
          </div>
          <div className="ib-field">
            <label>版本号</label>
            <input className="ib-input" placeholder="请输入版本号" />
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
            <div className="create-empty-tip">
              可按来源平台、版本名称、创建人、时间区间等维度快速筛选，整体视觉与网站保持统一。
            </div>
            <button className="primaryBtn">竞品导入</button>
            <button className="lightBtn">重置</button>
            <button className="primaryBtn">查询</button>
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
                            className={`create-platform-badge ${variant}`}
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
                    <a href="#">详情</a>
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
                    <MoreActions items={[{ label: '删除', danger: true, onClick: () => setDelRow(row) }]} />
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
            {['淘宝', '视频号'].map((t) => (
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

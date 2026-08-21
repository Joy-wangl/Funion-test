import { useMemo, useState } from 'react';
import BubbleSelect from '../../components/BubbleSelect';
import Ellipsis from '../../components/Ellipsis';
import { Modal, ToastWrap, useToasts } from '../permission/shared';
import { PLATFORM_LOGO } from './data';
import { sgProducts, sgDetail, SG_CHIPS, SG_STATUS_META } from './shopGoodsData';
import type { SgProduct } from './shopGoodsData';

type Tab = '视频号' | '淘宝' | '京喜' | '得物';

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};

/** 列表行操作：按商品状态给出 */
function rowActions(p: SgProduct): string[] {
  switch (p.status) {
    case 'selling':
    case 'auditFail':
      return ['商品详情', '下架'];
    case 'auditing':
      return ['商品详情', '撤销审核'];
    case 'offSystem':
    case 'offManual':
      return ['商品详情', '立即上架'];
    case 'draft':
      return ['商品详情', '发布'];
  }
}

/** 详情底部主操作：按商品状态给出 */
function footAction(p: SgProduct): { text: string; cls: string } {
  switch (p.status) {
    case 'selling':
    case 'auditFail':
      return { text: '下架', cls: 'warn' };
    case 'auditing':
      return { text: '撤销审核', cls: 'danger' };
    case 'offSystem':
    case 'offManual':
      return { text: '立即上架', cls: 'primary' };
    case 'draft':
      return { text: '发布上架', cls: 'primary' };
  }
}

/* ================= 批量调价 / 批量涨价弹窗 ================= */
type BpMode = 'adjust' | 'raise';
type BpMethod = 'rate' | 'profit';

/** 校验边界：利润 -5 ~ 999；利润率 -20% ~ 80% */
const BP_LIMIT: Record<BpMethod, { min: number; max: number }> = {
  rate: { min: -20, max: 80 },
  profit: { min: -5, max: 999 },
};

function BatchPriceModal({ count, onClose, onOk }: {
  count: number;
  onClose: () => void;
  onOk: (msg: string) => void;
}) {
  const [mode, setMode] = useState<BpMode>('adjust');
  const [method, setMethod] = useState<BpMethod>('rate');
  const [value, setValue] = useState('');
  const [err, setErr] = useState('');

  const modeText = mode === 'adjust' ? '批量调价' : '批量涨价';
  const methodLabel = mode === 'adjust' ? '调价方式' : '涨价方式';
  const limit = BP_LIMIT[method];

  const confirm = () => {
    const t = value.trim();
    if (!t) { setErr('请输入数值'); return; }
    const v = Number(t);
    if (!Number.isFinite(v)) { setErr('请输入有效数字'); return; }
    if (v < limit.min || v > limit.max) {
      setErr(
        method === 'rate'
          ? `利润率超出范围：最小 ${limit.min}%，最大 ${limit.max}%`
          : `利润超出范围：最小 ${limit.min}，最大 ${limit.max}`,
      );
      return;
    }
    onOk(`${modeText}成功：已对 ${count} 件出售中商品生效（${method === 'rate' ? `${t}%` : `${t} 元`}）`);
    onClose();
  };

  return (
    <Modal
      title={modeText}
      sub={`将对 ${count} 件出售中商品生效`}
      onClose={onClose}
      foot={
        <>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={confirm}>确定</button>
        </>
      }
    >
      <div className="bp-rows">
        <div className="bp-row">
          <span className="bp-label">模式</span>
          <div className="bp-opts">
            <span className={`bp-opt ${mode === 'adjust' ? 'on' : ''}`} onClick={() => { setMode('adjust'); setErr(''); }}>批量调价</span>
            <span className="bp-sep">/</span>
            <span className={`bp-opt ${mode === 'raise' ? 'on' : ''}`} onClick={() => { setMode('raise'); setErr(''); }}>批量涨价</span>
          </div>
        </div>
        <div className="bp-row">
          <span className="bp-label">{methodLabel}</span>
          <div className="bp-opts">
            <span className={`bp-opt ${method === 'rate' ? 'on' : ''}`} onClick={() => { setMethod('rate'); setErr(''); }}>
              {mode === 'adjust' ? '调整利润率' : '涨利润率'}
            </span>
            <span className="bp-sep">/</span>
            <span className={`bp-opt ${method === 'profit' ? 'on' : ''}`} onClick={() => { setMethod('profit'); setErr(''); }}>
              {mode === 'adjust' ? '调整利润' : '涨利润'}
            </span>
          </div>
        </div>
        <div className="bp-row">
          <span className="bp-label">{method === 'rate' ? '利润率' : '利润'}</span>
          <input
            className="sg-input bp-input"
            placeholder={method === 'rate' ? '如 8' : '如 5'}
            value={value}
            onChange={(e) => { setValue(e.target.value); setErr(''); }}
          />
          <span className="bp-unit">{method === 'rate' ? '%' : '元'}</span>
          <span className="bp-hint">{method === 'rate' ? '范围 -20% ~ 80%' : '范围 -5 ~ 999'}</span>
        </div>
        {err && <div className="bp-err">{err}</div>}
      </div>
    </Modal>
  );
}

export default function ShopGoodsPage() {
  const [tab, setTab] = useState<Tab>('视频号');
  const [chip, setChip] = useState('all');
  const [collapsed, setCollapsed] = useState(false);
  const [detail, setDetail] = useState<SgProduct | null>(null);
  /* 批量调价：勾选 + 弹窗 + toast */
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bpOpen, setBpOpen] = useState(false);
  const { toasts, pushToast } = useToasts();

  /* 筛选 */
  const emptyFilter = { store: '', title: '', goodsId: '', sku: '', tpl: '', linkId: '', source: '全部来源', publisher: '', strategy: '全部策略' };
  const [filter, setFilter] = useState({ ...emptyFilter });
  const [applied, setApplied] = useState({ ...emptyFilter });

  const rows = useMemo(() => {
    const chipDef = SG_CHIPS.find((c) => c.key === chip) ?? SG_CHIPS[0];
    return sgProducts[tab].filter((p) => {
      if (!chipDef.match(p.status)) return false;
      if (applied.store && !p.store.includes(applied.store)) return false;
      if (applied.title && !p.title.includes(applied.title)) return false;
      if (applied.goodsId && !p.id.includes(applied.goodsId)) return false;
      if (applied.linkId && !p.linkId.includes(applied.linkId)) return false;
      if (applied.publisher && !p.publisher.includes(applied.publisher)) return false;
      if (applied.source !== '全部来源' && p.source !== applied.source) return false;
      if (applied.strategy !== '全部策略' && p.strategy !== applied.strategy) return false;
      return true;
    });
  }, [tab, chip, applied]);

  const countOf = (key: string) => {
    const def = SG_CHIPS.find((c) => c.key === key)!;
    return sgProducts[tab].filter((p) => def.match(p.status)).length;
  };

  /* 批量调价除淘宝外各 TAB 提供，且仅「销售中」状态商品可勾选调价 */
  const canPrice = tab !== '淘宝';
  const sellingSel = sgProducts[tab].filter((p) => checked.has(p.id) && p.status === 'selling').length;
  const sellRows = rows.filter((p) => p.status === 'selling');
  const allChecked = sellRows.length > 0 && sellRows.every((p) => checked.has(p.id));
  const toggleCheck = (id: string) => setChecked((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleAll = () => setChecked((prev) => {
    const n = new Set(prev);
    sellRows.forEach((p) => { if (allChecked) n.delete(p.id); else n.add(p.id); });
    return n;
  });

  if (detail) return <SgDetailPage product={detail} onBack={() => setDetail(null)} />;

  const fields = (
    <>
      <div className="sg-field">
        <label>店铺名</label>
        <input className="sg-input" placeholder="请输入店铺名" value={filter.store} onChange={(e) => setFilter({ ...filter, store: e.target.value })} />
      </div>
      <div className="sg-field">
        <label>商品名</label>
        <input className="sg-input" placeholder="请输入商品名" value={filter.title} onChange={(e) => setFilter({ ...filter, title: e.target.value })} />
      </div>
      <div className="sg-field">
        <label>商品ID</label>
        <input className="sg-input" placeholder="请输入商品ID" value={filter.goodsId} onChange={(e) => setFilter({ ...filter, goodsId: e.target.value })} />
      </div>
      <div className="sg-field">
        <label>SKU名称</label>
        <input className="sg-input" placeholder="请输入SKU名称" value={filter.sku} onChange={(e) => setFilter({ ...filter, sku: e.target.value })} />
      </div>
      {!collapsed && (
        <>
          <div className="sg-field">
            <label>模板号</label>
            <input className="sg-input" placeholder="请输入模板号" value={filter.tpl} onChange={(e) => setFilter({ ...filter, tpl: e.target.value })} />
          </div>
          <div className="sg-field">
            <label>链接商品ID</label>
            <input className="sg-input" placeholder="请输入链接商品ID" value={filter.linkId} onChange={(e) => setFilter({ ...filter, linkId: e.target.value })} />
          </div>
          <div className="sg-field">
            <label>发布商品来源</label>
            <BubbleSelect className="sg-select" value={filter.source} onChange={(v) => setFilter({ ...filter, source: v })} options={['全部来源', '链接商品库', '内部商机', '市场商机']} />
          </div>
          <div className="sg-field">
            <label>发布人</label>
            <input className="sg-input" placeholder="请输入发布人" value={filter.publisher} onChange={(e) => setFilter({ ...filter, publisher: e.target.value })} />
          </div>
          <div className="sg-field">
            <label>关联策略</label>
            <BubbleSelect className="sg-select" value={filter.strategy} onChange={(v) => setFilter({ ...filter, strategy: v })} options={['全部策略', '未关联', '默认发布策略', '高利润策略']} />
          </div>
          <div className="sg-field">
            <label>发布开始时间</label>
            <div className="sg-range">
              <input className="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input className="sg-input" placeholder="结束时间" />
            </div>
          </div>
          <div className="sg-field">
            <label>上架开始时间</label>
            <div className="sg-range">
              <input className="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input className="sg-input" placeholder="结束时间" />
            </div>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="sg-page">
      <div className="sg-tabs">
        {(['视频号', '淘宝', '京喜', '得物'] as Tab[]).map((t) => (
          <button key={t} className={`sg-tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setChip('all'); setChecked(new Set()); }}>
            {t}
          </button>
        ))}
      </div>

      <div className="sg-statusbar">
        {SG_CHIPS.map((c) => (
          <button key={c.key} className={`sg-chip ${chip === c.key ? 'active' : ''}`} onClick={() => setChip(c.key)}>
            {c.label}({countOf(c.key)})
          </button>
        ))}
      </div>

      <div className="sg-filter">
        <div className="sg-grid">
          {fields}
          <div className="sg-actions">
            {canPrice && sellingSel > 0 && (
              <div className="sg-mini">已选 <b style={{ color: '#4f7cff' }}>{sellingSel}</b> 件出售中商品</div>
            )}
            {canPrice && (
              <button
                className="sg-btn primary"
                disabled={sellingSel === 0}
                title={sellingSel === 0 ? '请先勾选出售中的商品' : '对勾选的出售中商品批量调价'}
                onClick={() => setBpOpen(true)}
              >
                批量调价
              </button>
            )}
            <button className="sg-btn" onClick={() => setCollapsed((v) => !v)}>
              {collapsed ? '展开 ∨' : '收起 ∧'}
            </button>
            <button className="sg-btn" onClick={() => { setFilter({ ...emptyFilter }); setApplied({ ...emptyFilter }); }}>
              重置
            </button>
            <button className="sg-btn primary" onClick={() => setApplied({ ...filter })}>
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="sg-card">
        <div style={{ overflow: 'auto' }}>
          <table className="sg-table">
            <thead>
              <tr>
                {canPrice && (
                  <th style={{ width: 44 }}><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                )}
                <th>商品信息</th>
                <th style={{ width: 130 }}>商品状态</th>
                <th style={{ width: 120 }}>商品策略</th>
                <th style={{ width: 130 }}>商品数据 ⇅</th>
                <th style={{ width: 240 }}>发布信息 ⇅</th>
                <th style={{ width: 110 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const meta = SG_STATUS_META[p.status];
                return (
                  <tr key={p.id}>
                    {canPrice && (
                      <td>
                        {p.status === 'selling' && (
                          <input type="checkbox" checked={checked.has(p.id)} onChange={() => toggleCheck(p.id)} />
                        )}
                      </td>
                    )}
                    <td>
                      <div className="sg-goods">
                        <img className="sg-thumb" src={p.img} alt="" />
                        <div className="sg-ginfo">
                          <div className="sg-gtitle"><Ellipsis text={p.title} /></div>
                          <div className="sg-gid">
                            链接商品ID：<span>{p.linkId}</span>
                            <button className="sg-copy" title="复制" onClick={() => copy(p.linkId)}>⧉</button>
                          </div>
                          <div className="sg-gid">
                            商品ID：<span>{p.id}</span>
                            <button className="sg-copy" title="复制" onClick={() => copy(p.id)}>⧉</button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="sg-status">
                        <span className="sg-dot" style={{ background: meta.dot }} />
                        <span style={{ color: meta.color }}>{meta.label}</span>
                      </div>
                      {p.status === 'auditFail' && (
                        <div className="sg-failtag" title={p.rejectReason}>
                          审核未通过 <i className="sg-fail-i" title={p.rejectReason}>i</i>
                        </div>
                      )}
                    </td>
                    <td>{p.strategy}</td>
                    <td>
                      <div className="sg-kv">总销量：<b>{p.sales}</b></div>
                      <div className="sg-kv">评价数：<b>{p.reviews}</b></div>
                    </td>
                    <td>
                      <div className="sg-kv"><span className="sg-kv-l">发布人：</span><b>{p.publisher}</b></div>
                      <div className="sg-kv sg-kv-store">
                        <span className="sg-kv-l">发布店铺：</span>
                        <span className="store-logo"><img src={PLATFORM_LOGO[p.storePlatform]} alt="" /></span>
                        <b>{p.store}</b>
                      </div>
                      <div className="sg-kv"><span className="sg-kv-l">{p.shelfTime ? '上架时间：' : '发布时间：'}</span><b>{p.shelfTime ?? p.publishTime}</b></div>
                    </td>
                    <td>
                      <div className="sg-acts">
                        {rowActions(p).map((a) => (
                          <a
                            key={a}
                            className="sg-link"
                            href="javascript:void(0)"
                            onClick={(e) => { e.preventDefault(); if (a === '商品详情') setDetail(p); }}
                          >
                            {a}
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="sg-empty">
              <div className="sg-empty-wrap">
                <div className="sg-empty-icon">◌</div>
                <div>暂无数据，请调整筛选条件</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pm-page pm-host">
        {bpOpen && sellingSel > 0 && (
          <BatchPriceModal count={sellingSel} onClose={() => setBpOpen(false)} onOk={pushToast} />
        )}
        <ToastWrap toasts={toasts} />
      </div>
    </div>
  );
}

/* ================= 详情页 ================= */

export function SgDetailPage({ product: p, onBack, foot: footProp, hideEdit }: {
  product: SgProduct;
  onBack: () => void;
  /** 覆盖底部主操作（不传按商品状态推断；内部商机等复用场景传入，支持多个按钮） */
  foot?: { text: string; cls: string }[];
  /** 隐藏右上「编辑」按钮（商机等不可编辑场景） */
  hideEdit?: boolean;
}) {
  const [specOpen, setSpecOpen] = useState(true);
  const [skuShow, setSkuShow] = useState(true);
  const foot = footProp ?? [footAction(p)];

  const statusTag =
    p.status === 'selling' ? { text: '出售中', cls: 'green' }
    : p.status === 'auditing' ? { text: '审核中', cls: 'blue' }
    : p.status === 'auditFail' ? { text: '审核未通过', cls: 'red' }
    : p.status === 'draft' ? { text: '草稿', cls: 'orange' }
    : { text: '已下架', cls: 'gray' };

  const thumbs = [p.img, ...sgDetail.mainImgs.slice(0, 4)];

  return (
    <div className="sg-page sgd-page">
      <div className="sgd-hero">
      <div className="sgd-top">
        <div className="sgd-top-left">
          <button className="sgd-back" onClick={onBack} title="返回">←</button>
          <span className="sgd-top-title">商品详情</span>
        </div>
        {!hideEdit && <button className="sg-btn">编辑</button>}
      </div>

      <div className="sgd-cat">
        <span className="sgd-cat-label">当前类目<i>*</i></span>
        <span>{p.category.join(' / ')}</span>
      </div>
      <div className="sgd-head">
        <div className="sgd-gallery">
          <div className="sgd-thumbs">
            {thumbs.map((t, i) => (
              <img key={i} className={`sgd-thumb ${i === 0 ? 'active' : ''}`} src={t} alt="" />
            ))}
          </div>
          <img className="sgd-main" src={p.img} alt="" />
        </div>
        <div className="sgd-info">
          <h2>{p.title}</h2>
          <div className="sgd-fields">
            <div className="sgd-frow"><span>商品来源：</span><b>{p.source}</b></div>
            <div className="sgd-frow"><span>版本号：</span><b>{p.version}</b></div>
            <div className="sgd-frow"><span>商品ID：</span><b>{p.id}</b></div>
            <div className="sgd-frow"><span>操作人：</span><b>{p.operator}</b></div>
            {p.status !== 'draft' && p.status !== 'auditing' && (
              <div className="sgd-frow">
                <span>上架店铺：</span>
                <b className="sgd-store">
                  <span className="store-logo"><img src={PLATFORM_LOGO[p.storePlatform]} alt="" /></span>
                  {p.store}
                </b>
              </div>
            )}
            {p.shelfTime && <div className="sgd-frow"><span>上架时间：</span><b>{p.shelfTime}</b></div>}
            {p.submitTime && <div className="sgd-frow"><span>提交审核时间：</span><b>{p.submitTime}</b></div>}
            {p.createTime && <div className="sgd-frow"><span>创建时间：</span><b>{p.createTime}</b></div>}
            {p.offTime && <div className="sgd-frow"><span>下架时间：</span><b>{p.offTime}</b></div>}
            {p.offReason && <div className="sgd-frow"><span>下架原因：</span><b className="sgd-red">{p.offReason}</b></div>}
            {p.rejectReason && <div className="sgd-frow"><span>驳回原因：</span><b className="sgd-red">{p.rejectReason}</b></div>}
            <div className="sgd-frow">
              <span>商品状态：</span>
              <b><span className={`sgd-tag ${statusTag.cls}`}>{statusTag.text}</span></b>
            </div>
            {p.status !== 'draft' && (
              <div className="sgd-frow"><span>商品策略：</span><b>{p.strategy}</b></div>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="sgd-sec">
        <div className="sgd-sec-head">
          <div className="sgd-sec-title">商品规格</div>
          <button className="sgd-collapse" onClick={() => setSpecOpen((v) => !v)}>{specOpen ? '∨ 收起' : '∧ 展开'}</button>
        </div>
        {specOpen && (
          <div className="sgd-sec-body">
            <div className="sgd-spec-row">
              <span className="sgd-spec-label">颜色</span>
              <div className="sgd-spec-chips">{sgDetail.colors.map((c) => <span key={c} className="sgd-chip">{c}</span>)}</div>
            </div>
            <div className="sgd-spec-row">
              <span className="sgd-spec-label">规格</span>
              <div className="sgd-spec-chips">{sgDetail.styles.map((c) => <span key={c} className="sgd-chip">{c}</span>)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="sgd-sec">
        <div className="sgd-sec-head">
          <div className="sgd-sec-title">商品SKU</div>
          <label className="sgd-sku-toggle">
            <input type="checkbox" checked={skuShow} onChange={(e) => setSkuShow(e.target.checked)} />
            展开明细
          </label>
        </div>
        <div className="sgd-sec-body">
          {skuShow && (
            <table className="sg-table sgd-sku-table">
              <thead>
                <tr>
                  <th style={{ width: 76 }}>SKU图</th>
                  <th style={{ width: 76 }}>编码图片</th>
                  <th>颜色分类</th>
                  <th style={{ width: 120 }}>款式</th>
                  <th style={{ width: 160 }}>SKU名称</th>
                  <th style={{ width: 160 }}>商品编码</th>
                </tr>
              </thead>
              <tbody>
                {sgDetail.skus.map((s, i) => (
                  <tr key={i}>
                    <td><img className="sgd-sku-img" src={p.img} alt="" /></td>
                    <td><img className="sgd-sku-img" src={p.img} alt="" /></td>
                    <td>{i % 2 === 0 ? s.color : ''}</td>
                    <td>{s.style}</td>
                    <td>{s.name}</td>
                    <td><span className="sgd-code">{s.code}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="sgd-price">
            <span>一口价<i>*</i></span>
            <input className="sg-input sgd-price-input" defaultValue={sgDetail.price} readOnly />
          </div>
        </div>
      </div>

      <div className="sgd-sec">
        <div className="sgd-sec-head"><div className="sgd-sec-title">3:4主图</div></div>
        <div className="sgd-sec-body">
          <div className="sgd-note">最多上传5张图片，支持最小尺寸750*1000，固定宽高比例为3:4，大小20M以内</div>
          <div className="sgd-imgs ratio34">{sgDetail.mainImgs.map((m, i) => <img key={i} src={m} alt="" />)}</div>
        </div>
      </div>

      <div className="sgd-sec">
        <div className="sgd-sec-head"><div className="sgd-sec-title">商品详情</div></div>
        <div className="sgd-sec-body">
          <div className="sgd-note">宝贝详情图【高度≤2】，超出将被裁剪，建议宽度≥1440像素以确保清晰，拖动模块可排序</div>
          <div className="sgd-imgs">{sgDetail.detailImgs.map((m, i) => <img key={i} src={m} alt="" />)}</div>
        </div>
      </div>

      <div className="sgd-sec">
        <div className="sgd-sec-head"><div className="sgd-sec-title">商品视频</div></div>
        <div className="sgd-sec-body">
          <div className="sgd-note">视频要求：时长5秒~5分钟；宽高比支持1:1、3:4、9:16（9:16视频商品详情页不展示，可在首页推荐、微详情等展示）最多可上传5个</div>
          <div className="sgd-imgs">
            {sgDetail.videos.map((m, i) => (
              <span key={i} className="sgd-video"><img src={m} alt="" /><i className="sgd-play">▶</i></span>
            ))}
          </div>
        </div>
      </div>

      <div className="sgd-sec">
        <div className="sgd-sec-head"><div className="sgd-sec-title">通用商品白底图</div></div>
        <div className="sgd-sec-body">
          <div className="sgd-note">宽高800*800，所报名商品台的白底图，纯白边，图片饱满（上下贴边或左右贴边），将作为个性化素材展示</div>
          <div className="sgd-imgs"><img src={sgDetail.whiteImg} alt="" /></div>
        </div>
      </div>

      <div className="sgd-sec">
        <div className="sgd-sec-head"><div className="sgd-sec-title">通用商品场景图(非必填)</div></div>
        <div className="sgd-sec-body">
          <div className="sgd-note">基本要求：带有背景，无牛皮癣，主体清晰完整不变形、不拼图、不含图、不留白边，建议主体突出与背景和谐。背景不宜过于复杂，色调自然。格式要求：800*800px，JPG/JPEG、小于3M</div>
          <div className="sgd-imgs"><img src={sgDetail.sceneImg} alt="" /></div>
        </div>
      </div>

      <div className="sgd-foot">
        {foot.map((f) => (
          <button key={f.text} className={`sgd-foot-btn ${f.cls}`}>{f.text}</button>
        ))}
      </div>
    </div>
  );
}

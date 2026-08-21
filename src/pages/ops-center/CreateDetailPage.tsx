import { useMemo, useState } from 'react';
import BubbleSelect from '../../components/BubbleSelect';
import { createDetail, createVersions, type CreateRow, type CreateVersion } from './data';
import { ToastWrap, useToasts } from '../permission/shared';

const SHIP_OPTIONS = ['今日发', '24小时内发货', '48小时内发货', '大于48小时发货'];
const STUFF_OPTIONS = ['全新', '二手'];
const OTHER_COST_TIP = '包含 快递费、包材费、出仓成本、仓库房租、工费分摊、税费、预估推广费';

/** 图集/视频区块（编辑态追加「添加图片/视频」上传位） */
function MediaSec({ title, note, imgs, video, ratio34, editing, addLabel }: {
  title: string;
  note: string;
  imgs: string[];
  video?: boolean;
  ratio34?: boolean;
  editing: boolean;
  addLabel?: string;
}) {
  return (
    <div className="sgd-sec">
      <div className="sgd-sec-head"><div className="sgd-sec-title">{title}</div></div>
      <div className="sgd-sec-body">
        <div className="sgd-note">{note}</div>
        <div className={`sgd-imgs ${ratio34 ? 'ratio34' : ''}`}>
          {imgs.map((m, i) => (
            video ? (
              <span key={i} className="sgd-video"><img src={m} alt="" /><i className="sgd-play">▶</i></span>
            ) : (
              <img key={i} src={m} alt="" />
            )
          ))}
          {editing && addLabel && (
            <span className="cpd-upload">{addLabel}<i>本地上传</i></span>
          )}
        </div>
      </div>
    </div>
  );
}

/** 选择版本全屏页：筛选 + 版本列表（切换/复制/删除/新建版本） */
interface VerFilter { title: string; name: string; no: string; person: string; platform: string; d1: string; d2: string; }
const VER_EMPTY: VerFilter = { title: '', name: '', no: '', person: '', platform: '全部平台', d1: '', d2: '' };

function VersionPicker({ currentId, onSwitch, onClose, toast }: {
  currentId: string;
  onSwitch: (v: CreateVersion) => void;
  onClose: () => void;
  toast: (msg: string) => void;
}) {
  const [rows, setRows] = useState<CreateVersion[]>(createVersions);
  const [draft, setDraft] = useState<VerFilter>(VER_EMPTY);
  const [applied, setApplied] = useState<VerFilter>(VER_EMPTY);
  const list = useMemo(() => rows.filter((r) => {
    const day = r.time.slice(0, 10);
    return (
      (!applied.title || r.title.includes(applied.title)) &&
      (!applied.name || r.verName.includes(applied.name)) &&
      (!applied.no || r.versionNo.includes(applied.no)) &&
      (!applied.person || r.person.includes(applied.person)) &&
      (applied.platform === '全部平台' || r.platform === applied.platform) &&
      (!applied.d1 || day >= applied.d1) &&
      (!applied.d2 || day <= applied.d2)
    );
  }), [rows, applied]);

  return (
    <div className="cpd-ver-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cpd-ver-panel">
      <div className="cpd-ver-head">
        <span className="cpd-ver-h">选择版本</span>
        <button className="cpd-ver-close" onClick={onClose} title="关闭">✕</button>
      </div>
      <div className="cpd-ver-body">
        <div className="cpd-ver-top">
          <button className="primaryBtn" onClick={() => toast('已新建版本')}>新建版本</button>
        </div>
        <div className="cpd-ver-filter">
          <div className="cpd-ver-grid">
            <input className="ib-input" placeholder="商品标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input className="ib-input" placeholder="版本名称" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <input className="ib-input" placeholder="版本号" value={draft.no} onChange={(e) => setDraft({ ...draft, no: e.target.value })} />
            <input className="ib-input" placeholder="创建人" value={draft.person} onChange={(e) => setDraft({ ...draft, person: e.target.value })} />
          </div>
          <div className="cpd-ver-row2">
            <BubbleSelect
              className="ib-select cpd-ver-plat"
              value={draft.platform}
              onChange={(v) => setDraft({ ...draft, platform: v })}
              options={['全部平台', '淘宝', '视频号']}
            />
            <div className="ib-range cpd-ver-range">
              <input className="ib-input" placeholder="创建开始日期" value={draft.d1} onChange={(e) => setDraft({ ...draft, d1: e.target.value })} />
              <span>→</span>
              <input className="ib-input" placeholder="创建结束日期" value={draft.d2} onChange={(e) => setDraft({ ...draft, d2: e.target.value })} />
            </div>
            <div className="cpd-ver-spacer" />
            <button className="lightBtn" onClick={() => { setDraft(VER_EMPTY); setApplied(VER_EMPTY); }}>重置</button>
            <button className="primaryBtn" onClick={() => setApplied(draft)}>查询</button>
          </div>
        </div>
        <table className="ib-table cpd-ver-table">
          <thead>
            <tr>
              <th>商品模板信息</th>
              <th>版本信息</th>
              <th>发布信息</th>
              <th>创建人&创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="cpd-ver-tpl">
                    <img src={r.thumb} alt="" />
                    <div>
                      <div className="cpd-ver-ttitle" title={r.title}>{r.title}</div>
                      <div className="cpd-ver-no">版本号:{r.versionNo}</div>
                      <span className="cpd-plat-tag">{r.platform}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cpd-ver-name">{r.verName}</div>
                  <div className="cpd-ver-desc">{r.verDesc}</div>
                </td>
                <td>发布平台：{r.pubPlatform}</td>
                <td>
                  <div className="cpd-ver-name">{r.person}</div>
                  <div className="cpd-ver-desc">{r.time}</div>
                </td>
                <td>
                  <div className="cpd-ver-ops">
                    {r.id === currentId
                      ? <a className="muted">当前版本</a>
                      : <a onClick={() => onSwitch(r)}>切换</a>}
                    <a onClick={() => toast(`已复制版本 ${r.verName}`)}>复制</a>
                    <a
                      className="danger"
                      onClick={() => { setRows((rs) => rs.filter((x) => x.id !== r.id)); toast('版本已删除'); }}
                    >
                      删除
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="cpd-ver-empty">暂无匹配版本</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
}

/** 商品创建详情页：查看态/编辑态（样式复用店铺商品详情 sgd-*，字段按原型） */
export default function CreateDetailPage({ row, onBack }: { row: CreateRow; onBack: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [curVer, setCurVer] = useState<CreateVersion>(() => createVersions.find((v) => v.current) ?? createVersions[0]);
  const [verOpen, setVerOpen] = useState(false);
  const [specOpen, setSpecOpen] = useState(true);
  const [skuShow, setSkuShow] = useState(true);
  const [ship, setShip] = useState('48小时内发货');
  const [stuff, setStuff] = useState('全新');
  const { toasts, pushToast } = useToasts();
  const d = createDetail;

  return (
    <div className="sg-page sgd-page cpd-page">
      <div className="sgd-hero">
        <div className="sgd-top">
          <div className="sgd-top-left">
            <button className="sgd-back" onClick={onBack} title="返回">←</button>
            <span className="sgd-top-title">商品详情</span>
          </div>
          <div className="cpd-top-acts">
            {editing && (
              <button className="cpd-ver-btn" title="选择版本" onClick={() => setVerOpen(true)}>
                {curVer.verName}<span className="caret">⌄</span>
              </button>
            )}
            {editing ? (
              <>
                <button className="sg-btn" onClick={() => setEditing(false)}>取消编辑</button>
                <div className="cpd-saveas">
                  <button
                    className="sg-btn primary cpd-split-main"
                    onClick={() => { setEditing(false); pushToast('版本已保存'); }}
                  >
                    保存版本
                  </button>
                  <button className="sg-btn primary cpd-split-caret" onClick={() => setSaveOpen((v) => !v)}>⌄</button>
                  {saveOpen && (
                    <div className="cpd-saveas-menu">
                      <div onClick={() => { setSaveOpen(false); pushToast('已另存版本'); }}>另存版本</div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button className="sg-btn" onClick={() => setEditing(true)}>编辑</button>
            )}
          </div>
        </div>

        <div className="sgd-cat">
          <span className="sgd-cat-label">当前类目<i>*</i></span>
          <span>{d.category.join('/')}</span>
          {editing && <a className="cpd-cat-edit" href="#" onClick={(e) => e.preventDefault()}>修改</a>}
        </div>

        <div className="sgd-head">
          <div className="sgd-gallery">
            <div className="sgd-thumbs">
              {d.thumbs.map((t, i) => (
                <img key={i} className={`sgd-thumb ${i === 0 ? 'active' : ''}`} src={t} alt="" />
              ))}
            </div>
            <img className="sgd-main" src={row.thumb} alt="" />
          </div>
          <div className="sgd-info">
            <h2>{row.title}</h2>
            <div className="sgd-fields">
              <div className="sgd-frow"><span>版本名称：</span><b>{curVer.verName}</b></div>
              <div className="sgd-frow"><span>版本描述：</span><b>{curVer.verDesc}</b></div>
              <div className="sgd-frow"><span>版本号：</span><b>{curVer.versionNo}</b></div>
              <div className="sgd-frow"><span>创建时间：</span><b>{curVer.time}</b></div>
              <div className="sgd-frow"><span>创建人：</span><b>{curVer.person}</b></div>
              <div className="sgd-frow"><span>核验状态：</span><b><span className="sgd-tag red">{d.checkStatus}</span></b></div>
            </div>
          </div>
          <div className="cpd-side-acts">
            <button className="cpd-side-btn" onClick={() => pushToast('AI审查完成：未发现合规问题')}>
              <span className="ic">◉</span>AI审查
            </button>
            <button className="cpd-side-btn" onClick={() => pushToast('手机预览：演示环境暂不可用')}>
              <span className="ic">▯</span>手机预览
            </button>
          </div>
        </div>
      </div>

      {/* 商品规格 */}
      <div className="sgd-sec">
        <div className="sgd-sec-head">
          <div className="sgd-sec-title">商品规格</div>
          <button className="sgd-collapse" onClick={() => setSpecOpen((v) => !v)}>{specOpen ? '∨ 收起' : '∧ 展开'}</button>
        </div>
        {specOpen && (
          <div className="sgd-sec-body">
            {editing ? (
              <>
                {d.specs.map((sp) => (
                  <div className="cpd-spec-card" key={sp.name}>
                    <div className="cpd-spec-head">
                      <span className="cpd-drag">⋮</span>
                      <span>{sp.name}</span>
                      <span className="cpd-spec-ics"><i>✎</i><i className="danger">🗑</i></span>
                    </div>
                    <div className="cpd-spec-grid">
                      {sp.values.map((v) => (
                        <div className="cpd-spec-cell" key={v}>
                          <label>属性</label>
                          <div className="cpd-spec-input">
                            <input defaultValue={v} />
                            <i className="danger">🗑</i>
                            <i>◉</i>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="cpd-spec-add"><input placeholder="请输入" /></div>
                  </div>
                ))}
                <button className="cpd-add-spec" onClick={() => pushToast('已添加新规格')}>⊕ 添加规格</button>
              </>
            ) : (
              d.specs.map((sp) => (
                <div className="sgd-spec-row" key={sp.name}>
                  <span className="sgd-spec-label">{sp.name}</span>
                  <div className="sgd-spec-chips">{sp.values.map((v) => <span key={v} className="sgd-chip">{v}</span>)}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 商品SKU */}
      <div className="sgd-sec">
        <div className="sgd-sec-head">
          <div className="sgd-sec-title">商品SKU</div>
          <div className="cpd-sku-acts">
            {editing && (
              <button className="sg-btn primary cpd-sm" onClick={() => pushToast('一键匹配完成')}>一键匹配</button>
            )}
            <label className="sgd-sku-toggle">
              <input type="checkbox" checked={skuShow} onChange={(e) => setSkuShow(e.target.checked)} />
              展开明细
            </label>
          </div>
        </div>
        <div className="sgd-sec-body">
          {skuShow && (
            <div className="cpd-sku-wrap">
              <table className="sg-table cpd-sku-table">
                <thead>
                  <tr>
                    <th>SKU图</th>
                    <th>编码图片</th>
                    <th>颜色分类</th>
                    <th>款式</th>
                    <th>SKU名称</th>
                    <th>商品编码</th>
                    <th>系列编码</th>
                    <th>产品成本价</th>
                    <th title={OTHER_COST_TIP}>其它成本价 ⓘ</th>
                    <th>售价</th>
                    <th>利润</th>
                    <th>利润率</th>
                    <th>编辑</th>
                  </tr>
                </thead>
                <tbody>
                  {d.skus.map((s, i) => (
                    <tr key={i}>
                      <td><img className="sgd-sku-img" src={row.thumb} alt="" /></td>
                      <td><img className="sgd-sku-img" src={row.thumb} alt="" /></td>
                      <td>{i % 2 === 0 ? s.color : ''}</td>
                      <td>{s.style}</td>
                      <td>{editing ? <input className="cpd-cell-input" defaultValue={s.name} /> : s.name}</td>
                      <td><span className="sgd-code">{s.code}</span></td>
                      <td>{editing ? <input className="cpd-cell-input" defaultValue={s.series} /> : s.series}</td>
                      <td>{s.cost}</td>
                      <td>
                        {editing
                          ? <span className="cpd-cell-num"><input className="cpd-cell-input" defaultValue={s.other} /><i>元</i></span>
                          : `${s.other} 元`}
                      </td>
                      <td>
                        {editing
                          ? <span className="cpd-cell-num"><input className="cpd-cell-input" defaultValue={s.price} /><i>元</i></span>
                          : `${s.price} 元`}
                      </td>
                      <td>
                        {editing
                          ? <span className="cpd-cell-num"><input className="cpd-cell-input" defaultValue={s.profit} /><i>元</i></span>
                          : (s.profit ? `${s.profit} 元` : '-')}
                      </td>
                      <td>
                        {editing
                          ? <span className="cpd-cell-num"><input className="cpd-cell-input" defaultValue={s.rate} /><i>%</i></span>
                          : `${s.rate}%`}
                      </td>
                      <td className="cpd-row-ops">
                        <a href="#" onClick={(e) => e.preventDefault()}>查看</a>
                        {editing && <a className="danger" href="#" onClick={(e) => e.preventDefault()}>删除</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="sgd-price">
            <span>一口价<i>*</i></span>
            {editing ? <input className="sg-input sgd-price-input" defaultValue={d.price} /> : <b>{d.price}</b>}
          </div>
        </div>
      </div>

      <MediaSec
        title="3*4主图"
        note="最多上传10张图片，支持最小尺寸1:1 700*700，固定主图比例为3:4，大小3M以内"
        imgs={d.mainImgs}
        ratio34
        editing={editing}
        addLabel="添加图片"
      />
      <MediaSec
        title="商品详情*"
        note="宝贝详情图【高度≤2】，超出将被裁剪，建议宽度≥1440像素以确保清晰，拖动模块可排序"
        imgs={d.detailImgs}
        editing={editing}
        addLabel="添加图片"
      />
      <MediaSec
        title="商品视频"
        note="视频要求：时长5秒~60秒；宽高比支持1:1、3:4、9:16（9:16视频商品详情页不展示，可在首页推荐、微详情等展示）最多可上传5个"
        imgs={d.videos}
        video
        editing={editing}
        addLabel="添加视频"
      />
      <MediaSec
        title="通用商品白底图"
        note="宽高800*800，所报名商品台的白底图，纯白边，图片饱满（上下贴边或左右贴边），将作为个性化素材展示"
        imgs={[d.whiteImg]}
        editing={editing}
      />
      <MediaSec
        title="通用商品场景图(非必填)"
        note="基本要求：带有背景，无牛皮癣，主体清晰完整不变形、不拼图、不含图、不留白边，建议主体突出与背景和谐。背景不宜过于复杂，色调自然。格式要求：800*800px，JPG/JPEG、小于3M"
        imgs={[d.sceneImg]}
        editing={editing}
      />

      {/* 其它信息 */}
      <div className="sgd-sec">
        <div className="sgd-sec-head"><div className="sgd-sec-title">其它信息</div></div>
        <div className="sgd-sec-body">
          <div className="cpd-radio-row">
            <span className="cpd-radio-label">发货时效<i>*</i></span>
            <div className="cpd-radios">
              {SHIP_OPTIONS.map((t) => (
                <span
                  key={t}
                  className={`cpd-radio ${ship === t ? 'on' : ''} ${editing ? '' : 'ro'}`}
                  onClick={editing ? () => setShip(t) : undefined}
                >
                  <i className="cpd-rad" />{t}
                </span>
              ))}
            </div>
          </div>
          <div className="cpd-radio-row">
            <span className="cpd-radio-label">宝贝类型<i>*</i></span>
            <div className="cpd-radios">
              {STUFF_OPTIONS.map((t) => (
                <span
                  key={t}
                  className={`cpd-radio ${stuff === t ? 'on' : ''} ${editing ? '' : 'ro'}`}
                  onClick={editing ? () => setStuff(t) : undefined}
                >
                  <i className="cpd-rad" />{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pm-page pm-host"><ToastWrap toasts={toasts} /></div>
      {verOpen && (
        <VersionPicker
          currentId={curVer.id}
          onClose={() => setVerOpen(false)}
          onSwitch={(v) => { setCurVer(v); setVerOpen(false); pushToast(`已切换至版本 ${v.verName}`); }}
          toast={pushToast}
        />
      )}
    </div>
  );
}

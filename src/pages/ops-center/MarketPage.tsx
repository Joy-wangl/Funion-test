import { useMemo, useState } from 'react';
import BubbleSelect from '../../components/BubbleSelect';
import Ellipsis from '../../components/Ellipsis';
import { PLATFORM_LOGO } from './data';

interface MkRow {
  id: string;
  name: string;
  img: string;
  platform: string;
  realtime: number;
  week7: number;
  status: '待取样' | '已取样';
  category: string;
}

const rows: MkRow[] = [
  { id: '1', name: '水果刀削皮刀便携倒钩苹果去皮神器家用拼接款', img: '/products/main.png', platform: '快手', realtime: 0, week7: 12087, status: '待取样', category: '厨房/烹饪用具/刀具' },
  { id: '2', name: '益智魔块3d立体拼图3到6岁动物趣味恐龙拼装', img: '/products/serum.png', platform: '抖音', realtime: 12, week7: 11875, status: '已取样', category: '拼玩用品/礼品/创意' },
  { id: '3', name: 'PERDORA 玻尿酸修护精华液 补水保湿舒缓敏感肌 30ml 装', img: '/products/serum.png', platform: '淘宝', realtime: 86, week7: 9642, status: '待取样', category: '美妆个护/面部护理/精华液' },
  { id: '4', name: '德国指甲剪刀套装全套耳勺指甲刀指甲钳修剪专用斜口', img: '/products/main.png', platform: '天猫', realtime: 45, week7: 8210, status: '已取样', category: '家庭/个人清洁工具/美甲用品' },
  { id: '5', name: '多功能料理机家用小型榨汁机便携果汁杯', img: '/products/main.png', platform: '拼多多', realtime: 8, week7: 7455, status: '待取样', category: '厨房电器/料理机' },
  { id: '6', name: '厨房置物架台面调料收纳架免打孔', img: '/products/main.png', platform: '淘宝', realtime: 3, week7: 6120, status: '已取样', category: '厨房/烹饪用具/厨用收纳' },
  { id: '7', name: '保湿面霜补水滋润秋冬护肤乳液', img: '/products/serum.png', platform: '抖音', realtime: 21, week7: 5308, status: '待取样', category: '美妆个护/面部护理/乳液面霜' },
  { id: '8', name: '儿童积木大颗粒拼装男孩女孩益智玩具', img: '/products/serum.png', platform: '拼多多', realtime: 0, week7: 4217, status: '已取样', category: '拼玩用品/积木/拼装' },
];

/** 平台商机（外部商机-市场商机）：列表 + 查询条件 */
export default function MarketPage() {
  const empty = { name: '', platform: '全部平台', status: '全部', category: '' };
  const [filter, setFilter] = useState({ ...empty });
  const [applied, setApplied] = useState({ ...empty });

  /* 立即抓取抽屉 */
  type Pick = { on: boolean; qty: string };
  const initPicks = (): Record<string, Pick> => ({ 淘宝: { on: false, qty: '' }, 拼多多: { on: false, qty: '' }, 天猫: { on: false, qty: '' } });
  const [drawer, setDrawer] = useState<MkRow | null>(null);
  const [picks, setPicks] = useState<Record<string, Pick>>(initPicks);

  const list = useMemo(
    () =>
      rows.filter((r) => {
        if (applied.name && !r.name.includes(applied.name)) return false;
        if (applied.platform !== '全部平台' && r.platform !== applied.platform) return false;
        if (applied.status !== '全部' && r.status !== applied.status) return false;
        if (applied.category && !r.category.includes(applied.category)) return false;
        return true;
      }),
    [applied],
  );

  return (
    <div className="sg-page mk-page">
      <div className="sg-filter">
        <div className="sg-grid">
          <div className="sg-field">
            <label>商品名称</label>
            <input className="sg-input" placeholder="请输入商品名称" value={filter.name} onChange={(e) => setFilter({ ...filter, name: e.target.value })} />
          </div>
          <div className="sg-field">
            <label>平台</label>
            <BubbleSelect className="sg-select" value={filter.platform} onChange={(v) => setFilter({ ...filter, platform: v })} options={['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手']} />
          </div>
          <div className="sg-field">
            <label>状态</label>
            <BubbleSelect className="sg-select" value={filter.status} onChange={(v) => setFilter({ ...filter, status: v })} options={['全部', '待取样', '已取样']} />
          </div>
          <div className="sg-field">
            <label>类目</label>
            <input className="sg-input" placeholder="请输入类目" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} />
          </div>
          <div className="sg-actions">
            <button className="sg-btn" onClick={() => { setFilter({ ...empty }); setApplied({ ...empty }); }}>
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
          <table className="sg-table mk-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}><input type="checkbox" /></th>
                <th style={{ width: 60 }}>序号</th>
                <th>商品信息</th>
                <th style={{ width: 100 }}>实时销量</th>
                <th style={{ width: 110 }}>近7日销量</th>
                <th style={{ width: 100 }}>状态</th>
                <th style={{ width: 220 }}>类目</th>
                <th style={{ width: 100 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.id}>
                  <td><input type="checkbox" /></td>
                  <td>{i + 1}</td>
                  <td>
                    <div className="sg-goods">
                      <img className="sg-thumb" src={r.img} alt="" />
                      <div className="sg-ginfo">
                        <div className="sg-gtitle mk-gtitle"><Ellipsis text={r.name} /></div>
                        <div className="sg-gid mk-platform">
                          <span className="store-logo"><img src={PLATFORM_LOGO[r.platform]} alt="" /></span>
                          {r.platform}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{r.realtime}</td>
                  <td>{r.week7.toLocaleString()}</td>
                  <td>
                    <span className={`sgd-tag ${r.status === '已取样' ? 'green' : 'orange'}`}>{r.status}</span>
                  </td>
                  <td><Ellipsis text={r.category} /></td>
                  <td>
                    {r.status === '待取样' && (
                      <a
                        className="sg-link"
                        href="javascript:void(0)"
                        onClick={(e) => {
                          e.preventDefault();
                          setPicks(initPicks());
                          setDrawer(r);
                        }}
                      >
                        立即抓取
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <div className="sg-empty">
              <div className="sg-empty-wrap">
                <div className="sg-empty-icon">◌</div>
                <div>暂无数据，请调整筛选条件</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <div className="mk-mask" onClick={() => setDrawer(null)}>
          <div className="mk-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mk-drawer-head">
              <span>立即抓取</span>
              <button className="mk-close" onClick={() => setDrawer(null)}>×</button>
            </div>
            <div className="mk-drawer-body">
              <div className="sg-goods">
                <img className="sg-thumb" src={drawer.img} alt="" />
                <div className="sg-ginfo">
                  <div className="sg-gtitle mk-gtitle"><Ellipsis text={drawer.name} /></div>
                </div>
              </div>
              <div className="mk-drawer-sec">请选择平台</div>
              {(['淘宝', '拼多多', '天猫'] as const).map((pl) => (
                <div className="mk-plat-row" key={pl}>
                  <label className="mk-plat-check">
                    <input
                      type="checkbox"
                      checked={picks[pl].on}
                      onChange={(e) => setPicks({ ...picks, [pl]: { ...picks[pl], on: e.target.checked } })}
                    />
                    <span className="store-logo"><img src={PLATFORM_LOGO[pl]} alt="" /></span>
                    {pl}
                  </label>
                  <input
                    className="sg-input mk-qty"
                    type="number"
                    min={1}
                    placeholder="请输入链接数量"
                    value={picks[pl].qty}
                    disabled={!picks[pl].on}
                    onChange={(e) => setPicks({ ...picks, [pl]: { ...picks[pl], qty: e.target.value } })}
                  />
                </div>
              ))}
            </div>
            <div className="mk-drawer-foot">
              <button className="sg-btn" onClick={() => setDrawer(null)}>取消</button>
              <button className="sg-btn primary" onClick={() => setDrawer(null)}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

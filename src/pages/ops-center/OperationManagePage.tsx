import { useState } from 'react';
import { omProducts } from './data';
import ProductTable from './ProductTable';
import BubbleSelect from '../../components/BubbleSelect';

/** 通用选项 */
const PROFIT_OPTIONS = ['全部', '盈利', '亏损'];
const YES_NO_OPTIONS = ['全部', '是', '否'];
const RATE_OPTIONS = ['全部', '≥10%', '≥20%', '≥30%'];
const SHOP_OPTIONS = [...new Set(omProducts.map((r) => r.storeMeta.text))];
const CAT1_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[0]))];
const CAT2_OPTIONS = [...new Set(omProducts.map((r) => r.category.split('/')[1]).filter(Boolean))];

/** ID数据筛选器字段：标题仅作占位展示，不作为选择项 */
const idSelectFields = [
  { label: '选择平台', options: ['抖音', '快手', '拼多多', '淘宝', '天猫', '京东'] },
  { label: '店铺', options: SHOP_OPTIONS },
  { label: '采购', options: ['陈晓', '刘洋', '周敏'] },
  { label: '运营组', options: ['运营一组', '运营二组', '运营三组'] },
  { label: '运营专员', options: ['王芳', '李娜', '赵磊'] },
  { label: '运营助理', options: ['孙悦', '吴倩'] },
  { label: '发生毛利2', options: PROFIT_OPTIONS },
  { label: '发生毛利3', options: PROFIT_OPTIONS },
  { label: '发生毛利4', options: PROFIT_OPTIONS },
  { label: '发生净利润', options: PROFIT_OPTIONS },
  { label: '星星', options: ['全部', '1星', '2星', '3星', '4星', '5星'] },
  { label: '旗帜', options: ['全部', '红旗', '黄旗', '蓝旗', '绿旗', '紫旗'] },
];

const idSelectFields2 = [
  { label: '出仓利润', options: PROFIT_OPTIONS },
  { label: '禁用仓', options: YES_NO_OPTIONS },
  { label: '查看全仓', options: YES_NO_OPTIONS },
  { label: '请选择项目', options: ['全部项目', '新品项目', '爆品项目', '清仓项目'] },
  { label: '请选择爆品', options: YES_NO_OPTIONS },
];

const idSelectFields3 = [
  { label: '毛二利润率', options: RATE_OPTIONS },
  { label: '毛四利润率', options: RATE_OPTIONS },
  { label: '毛五利润率', options: RATE_OPTIONS },
  { label: '毛六利润率', options: RATE_OPTIONS },
  { label: '运营毛五利', options: RATE_OPTIONS },
  { label: '运营毛六利', options: RATE_OPTIONS },
  { label: '运营毛三（减税）', options: RATE_OPTIONS },
  { label: '运营毛四（减税）', options: RATE_OPTIONS },
  { label: '运营毛五（减税）', options: RATE_OPTIONS },
  { label: '运营毛六（减税）', options: RATE_OPTIONS },
];

/** 运营管理页：仅保留 ID数据模块 */
export default function OperationManagePage() {
  const [checked, setChecked] = useState<boolean[]>(() => omProducts.map(() => false));

  const onDelete = () => {
    if (!checked.some(Boolean)) {
      alert('请先选择商品');
      return;
    }
    window.confirm('是否确定删除商品');
  };

  const onLog = () => {
    alert('操作日志功能入口（演示）');
  };

  return (
    <div className="om-page">
      <div className="id-page">
        <div className="id-filter-card">
          <div className="id-grid">
              <div className="id-field">
                <label>明细</label>
                <BubbleSelect className="id-select" defaultValue="明细" options={['明细', '汇总']} />
              </div>
              <div className="id-field">
                <label>商品ID</label>
                <input className="id-input" placeholder="商品ID" />
              </div>
              <div className="id-field">
                <label>商品名称</label>
                <input className="id-input" placeholder="商品名称" />
              </div>
              <div className="id-field">
                <label>系列编码</label>
                <input className="id-input" placeholder="系列编码" />
              </div>
              <div className="id-field">
                <label>日期</label>
                <div className="id-range">
                  <input className="id-input" defaultValue="2026-08-12" />
                  <span>至</span>
                  <input className="id-input" defaultValue="2026-08-12" />
                </div>
              </div>
              <div className="id-field">
                <label>上架天数最小</label>
                <input className="id-input" placeholder="上架天数最小" />
              </div>
              <div className="id-field">
                <label>上架天数最大</label>
                <input className="id-input" placeholder="上架天数最大" />
              </div>
              {idSelectFields.map((f) => (
                <div className="id-field" key={f.label}>
                  <label>{f.label}</label>
                  <BubbleSelect className="id-select" defaultValue={f.label} options={f.options} />
                </div>
              ))}

              <div className="id-field">
                <label>连续</label>
                <div className="id-compact">
                  <input className="id-input" placeholder="连续" />
                  <span>日</span>
                  <BubbleSelect className="id-select" defaultValue="请选择" options={['大于', '等于', '小于']} />
                </div>
              </div>
              {idSelectFields2.map((f) => (
                <div className="id-field" key={f.label}>
                  <label>{f.label}</label>
                  <BubbleSelect className="id-select" defaultValue={f.label} options={f.options} />
                </div>
              ))}
              <div className="id-field">
                <label>请输入备注</label>
                <input className="id-input" placeholder="请输入备注" />
              </div>
              {idSelectFields3.map((f) => (
                <div className="id-field" key={f.label}>
                  <label>{f.label}</label>
                  <BubbleSelect className="id-select" defaultValue={f.label} options={f.options} />
                </div>
              ))}
              <div className="id-field">
                <label>总广告费 -</label>
                <input className="id-input" placeholder="-" />
              </div>
              <div className="id-field">
                <label>总广告费 +</label>
                <input className="id-input" placeholder="+" />
              </div>
              <div className="id-field">
                <label>经营大类</label>
                <BubbleSelect className="id-select" defaultValue="经营大类" options={CAT1_OPTIONS} />
              </div>

              <div className="id-field">
                <label>一级类目</label>
                <BubbleSelect className="id-select" defaultValue="一级类目" options={CAT1_OPTIONS} />
              </div>
              <div className="id-field">
                <label>二级类目</label>
                <BubbleSelect className="id-select" defaultValue="二级类目" options={CAT2_OPTIONS} />
              </div>
              <div className="id-field">
                <label>外仓率最小值 %</label>
                <input className="id-input" placeholder="外仓率最小值 %" />
              </div>
              <div className="id-field">
                <label>外仓率最大值 %</label>
                <input className="id-input" placeholder="外仓率最大值 %" />
              </div>
              <div className="id-field">
                <label>自动化标签</label>
                <BubbleSelect className="id-select" defaultValue="自动化标签" options={['全部', '爆款', '滞销', '清仓', '新品']} />
              </div>
            </div>

            <div className="id-actions">
              <button className="id-btn">重置</button>
              <button className="id-btn primary">查询</button>
              <button className="id-btn icon">▦</button>
            </div>

            <div className="om-toolbar">
              <BubbleSelect className="om-select" defaultValue="批量操作" options={['批量涨价', '批量降价']} />
              <button className="om-delete-btn" onClick={onDelete}>
                删除商品
              </button>
              <button className="om-log-btn" onClick={onLog}>
                操作日志
              </button>
            </div>

            <ProductTable
              rows={omProducts}
              checkWidth={42}
              indexWidth={60}
              checked={checked}
              onCheckChange={(i, v) =>
                setChecked((prev) => prev.map((c, idx) => (idx === i ? v : c)))
              }
            />
          </div>
        </div>
    </div>
  );
}

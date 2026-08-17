import { internalProducts } from './data';
import ProductTable from './ProductTable';
import BubbleSelect from '../../components/BubbleSelect';

/** 内部商机页（默认页） */
export default function InternalPage() {
  return (
    <>
      <div className="ib-filters">
        <div className="ib-grid">
          <div className="ib-field">
            <label>平台</label>
            <BubbleSelect
              className="ib-select"
              defaultValue="阿里巴巴"
              options={['阿里巴巴', '抖音', '京东', '快手', '拼多多', '淘宝', '天猫', '微信视频号小店']}
            />
          </div>
          <div className="ib-field">
            <label>店铺名称</label>
            <input className="ib-input" placeholder="请输入店铺名称" />
          </div>
          <div className="ib-field">
            <label>类目</label>
            <BubbleSelect className="ib-select" defaultValue="全部类目" options={['全部类目', '居家日用', '运动户外', '母婴用品']} />
          </div>
          <div className="ib-field">
            <label>是否顺买链接</label>
            <BubbleSelect className="ib-select" defaultValue="全部" options={['全部', '是', '否']} />
          </div>

          <div className="ib-field">
            <label>款式编码（系列编码）</label>
            <input className="ib-input" placeholder="请输入款式编码" />
          </div>
          <div className="ib-field">
            <label>商品ID</label>
            <input className="ib-input" placeholder="请输入商品ID" />
          </div>
          <div className="ib-field">
            <label>商品编码</label>
            <input className="ib-input" placeholder="请输入商品编码" />
          </div>
          <div className="ib-field">
            <label>商品标题</label>
            <input className="ib-input" placeholder="请输入商品标题" />
          </div>

          <div className="ib-field">
            <label>相似图查询</label>
            <div className="ib-inline">
              <input className="ib-input" placeholder="上传图片或输入图片地址" />
              <button className="lightBtn">📷</button>
            </div>
          </div>
          <div className="ib-field">
            <label>云仓占比</label>
            <div className="ib-range">
              <input className="ib-input" placeholder="最小值" />
              <span>至</span>
              <input className="ib-input" placeholder="最大值" />
            </div>
          </div>
          <div className="ib-field">
            <label>发货后退款率</label>
            <div className="ib-range">
              <input className="ib-input" placeholder="最小值" />
              <span>至</span>
              <input className="ib-input" placeholder="最大值" />
            </div>
          </div>
          <div className="ib-field">
            <label>创建时间</label>
            <div className="ib-range">
              <input className="ib-input" placeholder="开始时间" />
              <span>→</span>
              <input className="ib-input" placeholder="结束时间" />
            </div>
          </div>
        </div>

        <div className="ib-actions">
          <div className="ib-lefttips">共 300034 条商机数据，可按近7日销量、退款率、库存等进行综合筛选。</div>
          <div className="ib-rightacts">
            <BubbleSelect className="ib-select" style={{ width: 120 }} defaultValue="快速选品" options={['快速选品', '淘宝C店', '视频号']} />
            <button className="lightBtn">重置</button>
            <button className="primaryBtn">查询</button>
            <button className="lightBtn">⚙</button>
          </div>
        </div>
      </div>

      <ProductTable rows={internalProducts} checkWidth={48} indexWidth={52} />
    </>
  );
}

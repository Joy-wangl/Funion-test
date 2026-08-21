import { useState } from 'react';
import { internalProducts, platformOfStore, type ProductRow } from './data';
import ProductTable from './ProductTable';
import BubbleSelect from '../../components/BubbleSelect';
import { SgDetailPage } from './ShopGoodsPage';
import type { SgProduct } from './shopGoodsData';

/** 商机行 → 店铺商品详情模型（复用店铺商品详情页样式） */
const toSgProduct = (r: ProductRow): SgProduct => {
  const cats = r.category.split('/').map((s) => s.trim().replace(/\.{3}|…$/, ''));
  const t = r.created.replace(/\//g, '-');
  return {
    id: r.pid, title: r.pname, img: r.thumb, linkId: r.pid,
    status: 'selling', strategy: '未关联', sales: r.week7, reviews: '-',
    publisher: '-', store: r.storeMeta.text, storePlatform: platformOfStore(r.storeMeta.text),
    source: '内部商机', version: r.pid, operator: '-',
    category: [cats[0] || '-', cats[1] || '-', cats[2] || '-'],
    publishTime: t, shelfTime: t, createTime: t,
  };
};

/** 内部商机页（默认页） */
export default function InternalPage() {
  const [detail, setDetail] = useState<ProductRow | null>(null);
  if (detail) {
    return (
      <SgDetailPage
        product={toSgProduct(detail)}
        onBack={() => setDetail(null)}
        hideEdit
        foot={[{ text: '添加到淘宝', cls: 'primary' }, { text: '添加到视频号', cls: 'primary' }]}
      />
    );
  }
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
          <div className="ib-rightacts">
            <BubbleSelect className="ib-select" style={{ width: 120 }} defaultValue="快速选品" options={['快速选品', '淘宝C店', '视频号']} />
            <button className="lightBtn">重置</button>
            <button className="primaryBtn">查询</button>
            <button className="lightBtn">⚙</button>
          </div>
        </div>
      </div>

      <ProductTable rows={internalProducts} checkWidth={48} indexWidth={52} onDetail={setDetail} />
    </>
  );
}

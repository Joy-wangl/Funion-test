/* 验证：京麦商品创建详情页（JmCreateDetailPage）——展示形式与淘宝/视频号详情一致 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = {};

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  const sub = page.locator('.ops-center .side .subnav:has-text("京麦")');
  if (!(await sub.isVisible())) {
    await page.click('.ops-center .side .nav-parent:has-text("商品创建")');
    await sub.waitFor({ state: 'visible' });
  }
  await sub.click();
  /* 三个平台实例共存，限定可见 section 避免命中隐藏节点 */
  await page.waitForSelector('.page.show .create-page td.create-ops a');
  await page.locator('.page.show .create-page td.create-ops a:has-text("详情")').first().click();
  await page.waitForSelector('.jm-detail');

  /* 头部：平台标/标题/类目/画廊 */
  r.root = (await page.locator('.jm-detail').count()) === 1;
  r.platTag = (await page.locator('.jm-plat-tag').textContent())?.trim() === '京麦';
  r.topTitle = (await page.locator('.sgd-top-title').textContent())?.trim() === '商品详情';
  r.cat = ((await page.locator('.sgd-cat').textContent()) ?? '').includes('居家用品 / 厨房用具 / 刀具');
  r.heroThumbs = (await page.locator('.sgd-thumbs .sgd-thumb').count()) === 4;

  /* 区块顺序与淘宝/视频号同构：规格 → SKU → 素材图集 → 其它信息 */
  const titles = (await page.locator('.jm-detail .sgd-sec-title').allTextContents()).map((t) => t.trim());
  r.secTitles = JSON.stringify(titles) === JSON.stringify([
    '商品规格', '商品SKU', '主图（方图）*', '长图', '商品详情（PC端）*', '商品详情（APP端）*',
    '白底图', '透明图', '场景图(非必填)', '商品视频', '其它信息',
  ]);

  /* SKU 表：9 列 4 行，状态标签 3 上架 1 下架 */
  const ths = (await page.locator('.jm-sku-table thead th').allTextContents()).map((t) => t.trim());
  r.skuHead = JSON.stringify(ths) === JSON.stringify(['SKU图', 'SKU名称', '销售属性', '京东价', '市场价', '库存', '商品编码', '条码', '状态']);
  r.skuRows = (await page.locator('.jm-sku-table tbody tr').count()) === 4;
  r.skuTags = (await page.locator('.jm-sku-table .sgd-tag.green').count()) === 3
    && (await page.locator('.jm-sku-table .sgd-tag.gray').count()) === 1;

  /* 素材区块说明 8 条、视频位 2 个、其它信息 kv 6 项、发货时效单选 4 项 */
  r.notes = (await page.locator('.jm-detail .sgd-note').count()) === 8;
  r.videos = (await page.locator('.jm-detail .sgd-video').count()) === 2;
  r.kv = (await page.locator('.jm-kv').count()) === 6;
  r.radios = (await page.locator('.cpd-radio').count()) === 4;

  await page.screenshot({ path: `${OUT}/jm-detail-full.png`, fullPage: true });

  /* 预览：全屏暗幕 + 工具条（翻页/计数/缩放），与淘宝详情同范式 */
  await page.locator('.sgd-thumbs .sgd-thumb').first().click();
  await page.waitForSelector('.cpd-preview-mask');
  r.previewOpen = (await page.locator('.cpd-bar-count').textContent())?.trim() === '1 / 4';
  await page.locator('.cpd-bar-btn[title="下一张"]').click();
  r.previewNext = (await page.locator('.cpd-bar-count').textContent())?.trim() === '2 / 4';
  await page.locator('.cpd-bar-btn[title="放大"]').click();
  r.zoomIn = ((await page.locator('.cpd-preview-imgwrap').getAttribute('style')) ?? '').includes('scale(1.25)');
  await page.screenshot({ path: `${OUT}/jm-detail-preview.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  r.escClose = (await page.locator('.cpd-preview-mask').count()) === 0;

  /* 编辑态：规格卡片 + 上传位 + 素材按钮；取消后回查看态 */
  await page.locator('.cpd-top-acts .sg-btn:text-is("编辑")').click();
  await page.waitForTimeout(200);
  r.editSpec = (await page.locator('.cpd-spec-card').count()) === 2;
  r.editUpload = (await page.locator('.jm-detail .cpd-upload').count()) === 5;
  r.editMatBtn = (await page.locator('.cpd-side-btn:has-text("素材")').count()) === 1;
  await page.screenshot({ path: `${OUT}/jm-detail-edit.png` });
  await page.locator('.cpd-top-acts .sg-btn:text-is("取消编辑")').click();
  await page.waitForTimeout(200);
  r.viewSpec = (await page.locator('.sgd-spec-row').count()) === 2
    && (await page.locator('.cpd-spec-card').count()) === 0;

  /* 返回列表 */
  await page.locator('.sgd-back').click();
  await page.waitForSelector('.page.show .create-page td.create-ops a');
  r.back = true;

  r.errors = errors.length === 0;
  if (errors.length) console.log('CONSOLE ERRORS:', errors);
  const fail = Object.entries(r).filter(([, v]) => !v);
  console.log(fail.length ? `FAIL ${fail.length}:` : 'ALL PASS', JSON.stringify(r, null, 1));
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();

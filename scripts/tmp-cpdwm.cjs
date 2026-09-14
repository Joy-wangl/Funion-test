/* 验证：商品详情 全屏暗幕预览 + 底部悬浮工具条（翻页/缩放/全屏/一键去水印，无 1:1） */
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
  const count = page.locator('.cpd-bar-count');
  const wmBtn = page.locator('.cpd-bar-wm');
  const wrap = page.locator('.cpd-preview-imgwrap');
  const scaleOf = async () => ((await wrap.getAttribute('style')) || '').match(/scale\(([\d.]+)\)/)?.[1];
  /* 预览大图结果：失败红框；成功不做额外展示（按钮恢复可点 = 本轮结束） */
  const doneOrFail = async () => !(await wmBtn.isDisabled());

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  const subTaobao = page.locator('.ops-center .side .subnav:has-text("淘宝")');
  if (!(await subTaobao.isVisible())) {
    await page.click('.ops-center .side .nav-parent:has-text("商品创建")');
    await subTaobao.waitFor({ state: 'visible' });
  }
  await page.click('.ops-center .side .subnav:has-text("淘宝")');
  await page.waitForSelector('.page.show .create-table');
  await page.click('.page.show .create-ops a:has-text("详情")');
  await page.waitForSelector('.page.show .cpd-page');

  /* 右侧栏：素材下方一键去水印按钮（运行中文案会变，用末位定位） */
  const railBtn = page.locator('.cpd-side-acts .cpd-side-btn').last();
  r.railBtn = ((await railBtn.textContent()) || '').includes('一键去水印');

  /* 主图点击 → 全屏暗幕预览（单图：翻页禁用） */
  await page.click('.sgd-main');
  await page.waitForSelector('.cpd-preview-mask');
  r.countMain = ((await count.textContent()) || '').trim() === '1 / 1';
  r.navDisabled = (await page.locator('.cpd-bar-btn[title="上一张"]').isDisabled()) && (await page.locator('.cpd-bar-btn[title="下一张"]').isDisabled());
  /* 工具条无 1:1，含一键去水印 */
  r.noRatio = (await page.locator('.cpd-preview-bar >> text=1:1').count()) === 0;
  r.barWm = ((await wmBtn.textContent()) || '').includes('一键去水印');

  /* 缩放：放大两次 1.5 / 缩小一次 1.25 / 边界禁用 */
  await page.click('.cpd-bar-btn[title="放大"]');
  await page.click('.cpd-bar-btn[title="放大"]');
  r.zoomIn = (await scaleOf()) === '1.5';
  await page.click('.cpd-bar-btn[title="缩小"]');
  r.zoomOut = (await scaleOf()) === '1.25';

  /* 全屏切换 */
  await page.click('.cpd-bar-btn[title="全屏"]');
  await page.waitForTimeout(300);
  r.fullOn = await page.evaluate(() => !!document.fullscreenElement);
  r.fullIcon = (await page.locator('.cpd-bar-btn[title="退出全屏"]').count()) === 1;
  await page.click('.cpd-bar-btn[title="退出全屏"]');
  await page.waitForTimeout(300);
  r.fullOff = await page.evaluate(() => !document.fullscreenElement);

  /* 预览内去水印：仅当前图提交（遮罩单节点）→ 进行中 → 完成生成记录出现 → 无计数 chip */
  await wmBtn.click();
  await page.waitForTimeout(400);
  r.running = await page.locator('.cpd-preview-wming').isVisible();
  r.wmDisabled = await wmBtn.isDisabled();
  r.singleOnly = (await page.locator('.cpd-wm-mask').count()) === 1;
  await page.screenshot({ path: `${OUT}/cpd-preview-running.png` });
  await page.waitForTimeout(2400);
  r.doneTag = await doneOrFail();
  r.wmReady = !(await wmBtn.isDisabled());
  r.noChip = (await page.locator('.cpd-bar-result').count()) === 0;
  r.recsShown = (await page.locator('.cpd-preview-recs').count()) === 1;

  /* 完成后再次去水印（重复提交）→ 记录增至 3 个版本 */
  await wmBtn.click();
  await page.waitForTimeout(400);
  r.rerunRunning = await page.locator('.cpd-preview-wming').isVisible();
  await page.waitForTimeout(2400);
  r.rerunDone = await doneOrFail();
  r.recsGrow = ((await page.locator('.cpd-recs-head').textContent()) || '').includes('3 个版本');

  /* 生成记录：点击切换使用版本，角标跟随选中项；面板占比放大 */
  const recItems = page.locator('.cpd-recs-item');
  r.recBadge = (await page.locator('.cpd-recs-item.active .cpd-recs-badge').count()) === 1;
  await recItems.last().click();
  await page.waitForTimeout(200);
  r.recSwitch =
    ((await page.locator('.cpd-recs-item.active').textContent()) || '').includes('原图') &&
    (await page.locator('.cpd-recs-item.active .cpd-recs-badge').count()) === 1;
  r.recToast = (await page.locator('.toast-wrap .toast:has-text("已切换使用原图")').count()) >= 1;
  const recBox = await page.locator('.cpd-preview-recs').boundingBox();
  r.recsWide = !!recBox && recBox.width >= 280;
  await page.screenshot({ path: `${OUT}/cpd-preview-recs.png` });
  await recItems.first().click();
  await page.waitForTimeout(200);

  /* ESC 关闭 */
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  r.escClose = (await page.locator('.cpd-preview-mask').count()) === 0;

  /* 缩略图预览 + 工具条翻页 + 切图缩放复位 */
  await page.click('.sgd-thumb >> nth=2');
  await page.waitForSelector('.cpd-preview-mask');
  r.countThumb = ((await count.textContent()) || '').trim() === '3 / 6';
  await page.click('.cpd-bar-btn[title="放大"]');
  r.zoomBeforeStep = (await scaleOf()) === '1.25';
  await page.click('.cpd-bar-btn[title="下一张"]');
  await page.waitForTimeout(200);
  r.countNext = ((await count.textContent()) || '').trim() === '4 / 6';
  r.zoomReset = (await scaleOf()) === '1';
  /* 暗幕空白点击关闭 */
  await page.mouse.click(60, 500);
  await page.waitForTimeout(200);
  r.maskClose = (await page.locator('.cpd-preview-mask').count()) === 0;

  /* 图集区块图片可预览（3*4主图 4 张） */
  await page.click('.sgd-imgs .cpd-previewable >> nth=0');
  await page.waitForSelector('.cpd-preview-mask');
  r.countSec = ((await count.textContent()) || '').trim() === '1 / 4';
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  /* 右侧栏一键去水印：批量提交 → 执行中态（禁用+loading环+主色）→ 完成后可再次点击；失败仅红框无文字 */
  await railBtn.click();
  await page.waitForTimeout(300);
  r.batchToast = (await page.locator('.toast-wrap .toast:has-text("去水印任务已提交")').count()) >= 1;
  r.railRunning = (await railBtn.isDisabled()) && ((await railBtn.textContent()) || '').includes('去水印中');
  r.railBusy = (await page.locator('.cpd-side-acts .cpd-side-btn.wm-busy .cpd-wm-spin').count()) === 1;
  /* 缩略图处理中：轻量 loading 环，无百分比文字（防卡顿） */
  r.thumbSpin = (await page.locator('.cpd-wm-mask .cpd-wm-spin').count()) >= 1;
  /* 缩略图遮罩不出百分比文字（排队中文案为用户设计意图，保留） */
  const maskTexts = await page.locator('.cpd-wm-mask').allTextContents();
  r.thumbNoPct = maskTexts.every((t) => !t.includes('%'));
  await page.screenshot({ path: `${OUT}/cpd-wm-busy.png` });
  /* 批次含错峰延时（末位约 3.4s 开跑 + 1.5s 执行），留足等待 */
  await page.waitForTimeout(6500);
  r.railReady = !(await railBtn.isDisabled()) && ((await railBtn.textContent()) || '').includes('一键去水印');
  r.failBox = (await page.locator('.cpd-wmbox.wm-fail').count()) >= 1;
  r.failNoText = (await page.locator('.cpd-wm-corner.fail').count()) === 0;
  r.noOk = (await page.locator('.wm-ok').count()) === 0;
  r.noCorner = (await page.locator('.cpd-wm-corner').count()) === 0;
  await page.screenshot({ path: `${OUT}/cpd-wm-result.png` });
  await page.click('.sgd-main');
  await page.waitForSelector('.cpd-preview-mask');
  r.batchTag = await doneOrFail();
  await page.screenshot({ path: `${OUT}/cpd-preview-done.png` });

  await browser.close();
  r.errors = errors;
  console.log(JSON.stringify(r, null, 2));
  const pass = Object.entries(r).every(([k, v]) => (k === 'errors' ? v.length === 0 : v === true));
  console.log(pass ? 'ALL PASS' : 'HAS FAIL');
})().catch((e) => { console.error(e); process.exit(1); });

/* 验证：京麦详情预览 + 素材中心生成图查看器 接入共享 ImgSizeCrop（修改尺寸/自由裁剪） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  const gotoRoute = async (name) => {
    if (!(await page.locator(`.subnav:text-is("${name}")`).first().isVisible().catch(() => false))) {
      await page.click('.nav-text:has-text("商品创建")');
    }
    await page.click(`.subnav:text-is("${name}")`);
    await page.waitForSelector('section.page.show .create-table:visible');
  };

  /* ---------- A. 京麦详情：编辑 → 主图预览 → 修改尺寸 + 自由裁剪 ---------- */
  await gotoRoute('京麦');
  await page.locator('section.page.show a:text-is("详情")').first().click();
  await page.waitForSelector('.jm-detail .cpd-top-acts');
  await page.locator('.jm-detail .cpd-top-acts button:text-is("编辑")').click();
  await page.locator('.jm-detail img.sgd-main.cpd-previewable').click();
  await page.waitForSelector('.cpd-preview-mask');
  results['jm.barSize'] = await page.locator('.cpd-bar-size').isVisible();
  await page.click('.cpd-bar-size');
  await page.waitForSelector('.cpd-size-panel');
  const jmChips = await page.locator('.cpd-size-chip').allTextContents();
  results['jm.presets'] = jmChips.length === 8;
  /* 拖拽画框 */
  await page.locator('.cpd-size-croptoggle:text-is("选取裁剪区域")').click();
  await page.waitForSelector('.cpd-crop-layer');
  const wrap = await page.locator('.cpd-preview-imgwrap').boundingBox();
  const x0 = wrap.x + 50; const y0 = wrap.y + 50;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 200, y0 + 150, { steps: 6 });
  await page.mouse.up();
  await page.waitForSelector('.cpd-crop-box');
  const box = await page.locator('.cpd-crop-box').boundingBox();
  results['jm.cropDrawn'] = Math.abs(box.width - 200) < 4 && Math.abs(box.height - 150) < 4;
  results['jm.cropInfo'] = /选区 [1-9]\d*×[1-9]\d*/.test(await page.locator('.cpd-size-cropinfo').textContent());
  await page.screenshot({ path: `${OUT}/tmp-crop2-jm.png` });
  /* 选区 + 输出 300×200 裁剪 */
  await page.fill('.cpd-size-custom input[placeholder="输出宽"]', '300');
  await page.fill('.cpd-size-custom input[placeholder="输出高"]', '200');
  await page.locator('.cpd-size-apply:text-is("裁剪")').click();
  await page.waitForSelector('.toast:has-text("已修改尺寸为 300×200")');
  results['jm.applyWH'] = (await page.locator('.cpd-size-panel').count()) === 0;
  results['jm.imgReplaced'] = (await page.locator('.cpd-preview-imgwrap img').getAttribute('src')).startsWith('data:image');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.cpd-preview-mask', { state: 'detached' });
  await page.locator('.jm-detail .sgd-back').first().click();

  /* ---------- B. 素材中心：编辑 → 一键美化任务图查看器 → 修改尺寸 + 自由裁剪 ---------- */
  await gotoRoute('淘宝');
  await page.locator('section.page.show a:text-is("详情")').first().click();
  await page.waitForSelector('.cpd-top-acts');
  await page.locator('.cpd-top-acts button:text-is("编辑")').click();
  await page.locator('.cpd-side-btn:has-text("素材")').click();
  await page.waitForSelector('.mc-tab');
  await page.locator('.sg-btn.primary:text-is("编辑")').click();
  await page.locator('.mc-tab:text-is("一键美化")').click();
  await page.waitForSelector('.mc-task .mc-img');
  await page.locator('.mc-task .mc-img').first().click();
  await page.waitForSelector('.cpd-preview-mask .cpd-bar-size');
  await page.click('.cpd-bar-size');
  await page.waitForSelector('.cpd-size-panel');
  results['mc.presets'] = (await page.locator('.cpd-size-chip').count()) === 8;
  /* 拖拽画框 + 仅选区裁剪（按选区原尺寸输出） */
  await page.locator('.cpd-size-croptoggle:text-is("选取裁剪区域")').click();
  await page.waitForSelector('.cpd-crop-layer');
  const wrap2 = await page.locator('.cpd-preview-imgwrap').boundingBox();
  const a0 = wrap2.x + 40; const b0 = wrap2.y + 40;
  await page.mouse.move(a0, b0);
  await page.mouse.down();
  await page.mouse.move(a0 + 180, b0 + 140, { steps: 6 });
  await page.mouse.up();
  await page.waitForSelector('.cpd-crop-box');
  await page.screenshot({ path: `${OUT}/tmp-crop2-mc.png` });
  const natLabel = await page.locator('.cpd-crop-size').textContent();
  await page.locator('.cpd-size-apply:text-is("裁剪")').click();
  await page.waitForSelector(`.toast:has-text("已修改尺寸为 ${natLabel}")`);
  results['mc.applyNat'] = true;
  /* 回写源任务图：缩略图 src 已替换为裁剪结果 */
  await page.keyboard.press('Escape');
  await page.waitForSelector('.cpd-preview-mask', { state: 'detached' });
  const thumbSrc = await page.locator('.mc-task .mc-img img').first().getAttribute('src');
  results['mc.taskImgReplaced'] = thumbSrc.startsWith('data:image');

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

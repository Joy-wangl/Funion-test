/* 验证：修改尺寸面板新预设八项＋自由裁剪拖拽选区（画框/移动/缩放/按选区裁剪） */
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
  if (!(await page.locator('.subnav:text-is("淘宝")').first().isVisible().catch(() => false))) {
    await page.click('.nav-text:has-text("商品创建")');
  }
  await page.click('.subnav:text-is("淘宝")');
  await page.waitForSelector('section.page.show .create-table:visible');

  /* 详情 → 编辑态 → 主图预览 → 修改尺寸面板 */
  await page.locator('section.page.show a:text-is("详情")').first().click();
  await page.waitForSelector('.cpd-top-acts');
  await page.locator('.cpd-top-acts button:text-is("编辑")').click();
  await page.locator('img.cpd-previewable').first().click();
  await page.waitForSelector('.cpd-preview-mask');
  await page.click('.cpd-bar-size');
  await page.waitForSelector('.cpd-size-panel');

  /* 预设八项：尺寸＋比例 */
  const chips = await page.locator('.cpd-size-chip').allTextContents();
  results['presets.eight'] = chips.length === 8;
  results['presets.values'] = JSON.stringify(chips) === JSON.stringify([
    '800×8001:1', '750×10003:4', '1080×16202:3', '1280×72016:9',
    '750×7501:1', '640×6401:1', '1920×108016:9', '1080×60816:9',
  ]);

  /* 选取裁剪区域：拖拽画框 */
  await page.locator('.cpd-size-croptoggle:text-is("选取裁剪区域")').click();
  await page.waitForSelector('.cpd-crop-layer');
  results['crop.tip'] = await page.locator('.cpd-crop-tip').isVisible();
  const wrap = await page.locator('.cpd-preview-imgwrap').boundingBox();
  const x0 = wrap.x + 60; const y0 = wrap.y + 60;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 220, y0 + 180, { steps: 6 });
  await page.mouse.up();
  await page.waitForSelector('.cpd-crop-box');
  const box1 = await page.locator('.cpd-crop-box').boundingBox();
  results['crop.drawn'] = Math.abs(box1.width - 220) < 4 && Math.abs(box1.height - 180) < 4;
  const label1 = await page.locator('.cpd-crop-size').textContent();
  results['crop.label'] = /[1-9]\d*×[1-9]\d*/.test(label1);

  /* 框内拖动整体移动 */
  await page.mouse.move(box1.x + box1.width / 2, box1.y + box1.height / 2);
  await page.mouse.down();
  await page.mouse.move(box1.x + box1.width / 2 + 50, box1.y + box1.height / 2 + 40, { steps: 5 });
  await page.mouse.up();
  const box2 = await page.locator('.cpd-crop-box').boundingBox();
  results['crop.moved'] = Math.abs(box2.x - (box1.x + 50)) < 4 && Math.abs(box2.y - (box1.y + 40)) < 4
    && Math.abs(box2.width - box1.width) < 2;

  /* se 手柄缩放 */
  const hd = await page.locator('.cpd-crop-hd.hd-se').boundingBox();
  await page.mouse.move(hd.x + 5, hd.y + 5);
  await page.mouse.down();
  await page.mouse.move(hd.x + 5 + 70, hd.y + 5 + 50, { steps: 5 });
  await page.mouse.up();
  const box3 = await page.locator('.cpd-crop-box').boundingBox();
  results['crop.resized'] = Math.abs(box3.width - (box2.width + 70)) < 4 && Math.abs(box3.height - (box2.height + 50)) < 4;
  await page.screenshot({ path: `${OUT}/tmp-crop.png` });

  /* 选区＋输出宽高 400×300 裁剪 */
  await page.fill('.cpd-size-custom input[placeholder="输出宽"]', '400');
  await page.fill('.cpd-size-custom input[placeholder="输出高"]', '300');
  await page.locator('.cpd-size-apply:text-is("裁剪")').click();
  await page.waitForSelector('.toast:has-text("已修改尺寸为 400×300")');
  results['crop.applyWH'] = (await page.locator('.cpd-size-panel').count()) === 0;

  /* 重开面板：当前 400×300；仅选区不填宽高→按选区原尺寸输出 */
  await page.click('.cpd-bar-size');
  await page.waitForSelector('.cpd-size-panel');
  results['crop.origin400'] = (await page.locator('.cpd-size-head span').textContent()).includes('400×300');
  await page.locator('.cpd-size-croptoggle:text-is("选取裁剪区域")').click();
  const wrap2 = await page.locator('.cpd-preview-imgwrap').boundingBox();
  const a0 = wrap2.x + 40; const b0 = wrap2.y + 40;
  await page.mouse.move(a0, b0);
  await page.mouse.down();
  await page.mouse.move(a0 + 160, b0 + 160, { steps: 5 });
  await page.mouse.up();
  const natLabel = await page.locator('.cpd-crop-size').textContent();
  await page.locator('.cpd-size-apply:text-is("裁剪")').click();
  await page.waitForSelector(`.toast:has-text("已修改尺寸为 ${natLabel}")`);
  results['crop.applyNat'] = true;

  /* 预设芯片：1920×1080 居中裁 */
  await page.click('.cpd-bar-size');
  await page.waitForSelector('.cpd-size-panel');
  await page.locator('.cpd-size-chip', { hasText: '1920×1080' }).click();
  await page.waitForSelector('.toast:has-text("已修改尺寸为 1920×1080")');
  results['preset.apply'] = true;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

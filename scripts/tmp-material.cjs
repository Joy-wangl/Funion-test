/* 临时验证：商品详情编辑态素材入口 + 素材中心页面还原 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.subnav:has-text("竞价商品")');
  await page.waitForSelector('.ops-center .page.show .bd-table');

  /* 进入详情（查看态无素材入口） */
  await page.locator('.ops-center .page.show .bd-table tbody a:has-text("详情")').first().click();
  await page.waitForSelector('.sgd-top-title');
  results['entry.hiddenView'] = (await page.locator('.cpd-side-btn:has-text("素材")').count()) === 0;

  /* 编辑态出现素材入口，顺序：手机预览/AI审查/素材 */
  await page.click('.cpd-top-acts button:has-text("编辑")');
  const sideBtns = (await page.locator('.cpd-side-btn').allTextContents()).join('|');
  results['entry.editShow'] = (await page.locator('.cpd-side-btn:has-text("素材")').count()) === 1
    && /手机预览.*AI审查.*素材/.test(sideBtns.replace(/\s/g, ''));

  /* 进入素材中心 */
  await page.click('.cpd-side-btn:has-text("素材")');
  await page.waitForSelector('.mc-page');
  results['mc.title'] = ((await page.locator('.mc-title').textContent()) || '').includes('素材中心');
  results['mc.acts'] = (await page.locator('.mc-acts button:has-text("取消")').count()) === 1
    && (await page.locator('.mc-acts button:has-text("保存修改")').count()) === 1;

  /* 左栏 tab + 分区 */
  results['mc.tabs'] = (await page.locator('.mc-tab').count()) === 2
    && ((await page.locator('.mc-tab.active').textContent()) || '').includes('选图换图');
  const secs = (await page.locator('.mc-left-body .mc-sec-title').allTextContents()).join(',');
  results['mc.secs'] = secs.includes('商品主图') && secs.includes('SKU图片') && secs.includes('详情图') && secs.includes('商品视频') && secs.includes('通用商品白底图');

  /* 图片块数量：主图4 / 详情8 / 视频3 / 上传块4 / SKU行4 */
  const imgsGroups = page.locator('.mc-left-body .mc-imgs');
  results['mc.main4'] = (await imgsGroups.nth(0).locator('.mc-img').count()) === 4;
  results['mc.detail8'] = (await imgsGroups.nth(1).locator('.mc-img').count()) === 8;
  results['mc.video3'] = (await imgsGroups.nth(2).locator('.mc-img').count()) === 3;
  results['mc.upload4'] = (await page.locator('.mc-left-body .mc-upload').count()) === 4;
  results['mc.sku4'] = (await page.locator('.mc-sku-row').count()) === 4;

  /* hover 蒙层：查看/更换/删除；删除主图 → 3 */
  await imgsGroups.nth(0).locator('.mc-img').first().hover();
  const ops = ((await imgsGroups.nth(0).locator('.mc-img-ops').first().textContent()) || '').replace(/\s/g, '');
  results['mc.hoverOps'] = ops.includes('查看') && ops.includes('更换') && ops.includes('删除');
  await imgsGroups.nth(0).locator('.mc-img-ops a:has-text("删除")').first().click();
  results['mc.removeMain'] = (await imgsGroups.nth(0).locator('.mc-img').count()) === 3;

  /* 一键美化 tab 空态 + 切回 */
  await page.click('.mc-tab:has-text("一键美化")');
  results['mc.beautyEmpty'] = (await page.locator('.mc-beauty-empty').count()) === 1;
  await page.click('.mc-tab:has-text("选图换图")');

  /* 右栏素材库：标题/元信息/5图/收起展开 */
  results['lib.title'] = ((await page.locator('.mc-lib-title').textContent()) || '').includes('韩系波点缎面裙摆马尾抓夹');
  results['lib.meta'] = (await page.locator('.mc-lib-tag:has-text("淘宝")').count()) === 1
    && (await page.locator('.mc-lib-meta a:has-text("前往查看")').count()) === 1;
  results['lib.imgs5'] = (await page.locator('.mc-lib-imgs img').count()) === 5;
  await page.click('.mc-fold');
  results['lib.fold'] = (await page.locator('.mc-lib-imgs img').count()) === 0;
  await page.click('.mc-fold');
  results['lib.unfold'] = (await page.locator('.mc-lib-imgs img').count()) === 5;
  await page.screenshot({ path: `${OUT}/ops-verify-material.png` });

  /* 取消返回详情 */
  await page.click('.mc-acts button:has-text("取消")');
  await page.waitForSelector('.sgd-top-title');
  results['mc.back'] = (await page.locator('.sgd-top-title').count()) === 1;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

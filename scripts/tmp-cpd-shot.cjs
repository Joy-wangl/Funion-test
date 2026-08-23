/* 临时验证：商品创建详情（淘宝/视频号）按图删减+审核状态 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');

  const results = {};
  for (const [key, label, shot] of [['taobao', '淘宝', 'vue-verify-cpd-taobao.png'], ['video', '视频号', 'vue-verify-cpd-video.png']]) {
    await page.click(`.ops-center .side .subnav:has-text("${label}")`);
    await page.waitForSelector('.create-table');
    await page.click('.create-ops a:has-text("详情")');
    await page.waitForSelector('.cpd-page');
    await page.waitForTimeout(250);

    const text = await page.textContent('.cpd-page .sgd-hero');
    results[`${key}.verBtnGone`] = (await page.locator('.cpd-ver-btn').count()) === 0;
    results[`${key}.saveasGone`] = (await page.locator('.cpd-saveas').count()) === 0;
    results[`${key}.verRowsGone`] = !text.includes('版本名称') && !text.includes('版本描述') && !text.includes('版本号');
    results[`${key}.auditStatus`] = text.includes('审核状态') && text.includes('待审核') && !text.includes('核验状态');
    results[`${key}.keepTimePerson`] = text.includes('创建时间') && text.includes('创建人');

    // 编辑态：取消编辑+保存版本（无⌄分体）
    await page.click('.cpd-top-acts button:has-text("编辑")');
    await page.waitForTimeout(150);
    results[`${key}.editActs`] =
      (await page.locator('.cpd-top-acts button:has-text("取消编辑")').count()) === 1 &&
      (await page.locator('.cpd-top-acts button:has-text("保存版本")').count()) === 1 &&
      (await page.locator('.cpd-split-caret').count()) === 0;
    await page.screenshot({ path: `${OUT}/${shot}`, fullPage: false });
    await page.click('.sgd-back');
    await page.waitForSelector('.create-table');
  }

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'CPD VERIFY OK' : `CPD VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

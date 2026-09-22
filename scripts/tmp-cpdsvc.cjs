/* 验证：视频号商品详情新增服务保障三选项（假一赔三/换货/7天无理由）；查看态只读、编辑态可改；淘宝详情不出现 */
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

  /* 视频号详情：商品创建分组默认收起，先展开；:text-is 避免命中「视频号自动化」 */
  if (!(await page.locator('.subnav:text-is("视频号")').first().isVisible().catch(() => false))) {
    await page.click('.nav-text:has-text("商品创建")');
  }
  await page.click('.subnav:text-is("视频号")');
  await page.waitForSelector('section.page.show .create-table:visible');
  await page.locator('a:has-text("详情")').locator('visible=true').first().click();
  await page.waitForSelector('.cpd-page:visible');

  const detail = page.locator('.cpd-page').locator('visible=true').first();
  const txt = await detail.textContent();
  results['svc.hasFake3'] = txt.includes('是否假一赔三');
  results['svc.hasExchange'] = txt.includes('是否支持换货');
  results['svc.has7Day'] = txt.includes('7天无理由');
  /* 三张独立白卡，顺序在场景图之后 */
  results['svc.threeCards'] = (await detail.locator('.cpd-svc-title').count()) === 3;
  /* 默认值：不支持假一赔三 / 不支持换货 / 支持七天无理由 */
  results['svc.fake3Default'] = (await detail.locator('.cpd-radio.on:text-is("不支持假一赔三")').count()) === 1;
  results['svc.exchangeDefault'] = (await detail.locator('.cpd-radio.on:text-is("不支持换货")').count()) === 1;
  results['svc.sevenDefault'] = (await detail.locator('.cpd-svc-select .bselect-text').textContent()).includes('支持七天无理由');
  /* 查看态只读：radio 为 ro 且点击不切换；下拉 disabled */
  await detail.locator('.cpd-radio:text-is("支持假一赔三")').click();
  results['svc.roRadio'] = (await detail.locator('.cpd-radio.on:text-is("不支持假一赔三")').count()) === 1;
  results['svc.selectDisabled'] = await detail.locator('.cpd-svc-select .bselect-trigger').isDisabled();

  /* 编辑态可改 */
  await detail.locator('button:has-text("编辑")').click();
  await detail.locator('.cpd-radio:text-is("支持假一赔三")').click();
  results['svc.editRadio'] = (await detail.locator('.cpd-radio.on:text-is("支持假一赔三")').count()) === 1;
  await detail.locator('.cpd-svc-select .bselect-trigger').click();
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '不支持七天无理由' }).click();
  results['svc.editSelect'] = (await detail.locator('.cpd-svc-select .bselect-text').textContent()).includes('不支持七天无理由');
  await detail.screenshot({ path: `${OUT}/tmp-cpdsvc.png` });

  /* 淘宝详情不出现三选项 */
  await detail.locator('button:has-text("取消编辑")').click();
  await detail.locator('.sgd-back').click();
  await page.click('.subnav:text-is("淘宝")');
  await page.waitForSelector('section.page.show .create-table:visible');
  await page.locator('a:has-text("详情")').locator('visible=true').first().click();
  await page.waitForSelector('.cpd-page:visible');
  const tbTxt = await page.locator('.cpd-page').locator('visible=true').first().textContent();
  results['svc.taobaoNone'] = !tbTxt.includes('是否假一赔三') && !tbTxt.includes('7天无理由');

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

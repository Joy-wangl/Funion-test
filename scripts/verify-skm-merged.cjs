/* 京麦商品匹配合并工作区验收：左右主从命中报告（左命中ID列表＋右SKU明细、SKU维度选择）＋截图 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
  const out = {};
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('aside');
  await page.locator('aside').getByText('商品创建', { exact: true }).first().click();
  await page.locator('aside').getByText('京麦', { exact: true }).first().click();
  await page.locator('a:visible', { hasText: /^详情$/ }).first().click();
  await page.locator('a:visible', { hasText: /^查看$/ }).first().click();
  await page.waitForSelector('.skm-view');
  out.tabs = await page.locator('.skm-view .skm-tab').allTextContents();
  await page.locator('.skm-view .skm-tab', { hasText: '商品匹配' }).click();
  out.matchBtns = await page.locator('.skm-view .skm-srcbar .sg-btn.primary').allTextContents();
  await page.locator('.skm-view .skm-srcbar button', { hasText: /^商品匹配$/ }).click();
  await page.waitForSelector('.skm-view .skm-hitwrap');
  /* 左：命中 ID 列表（匹配度降序，无选择动作）；右：SKU 卡（命中度降序，SKU 维度选择） */
  out.groups = await page.locator('.skm-view .skm-hititem').count();
  out.groupScores = await page.locator('.skm-view .skm-hititem-score').allTextContents();
  out.scoreBands = await page.locator('.skm-view .skm-hititem-score').evaluateAll((els) => els.map((e) => (e.className.match(/skm-tone-\w/) || [''])[0]));
  out.skuBandsFirst = await page.locator('.skm-view .skm-skuitem').first().locator('.skm-skuitem-meta b').evaluateAll((els) => els.map((e) => (e.className.match(/skm-tone-\w/) || [''])[0]));
  out.leftHasPick = await page.locator('.skm-view .skm-hititem a.sg-link').count();
  out.skuCardsFirst = await page.locator('.skm-view .skm-skuitem').count();
  out.skuMetaFirst = (await page.locator('.skm-view .skm-skuitem').first().locator('.skm-skuitem-meta').innerText()).replace(/\s+/g, ' ');
  out.skuSimsFirst = await page.locator('.skm-view .skm-skuitem-meta b').allTextContents();
  /* SKU 维度选择：首张 SKU 卡选择进已选商品 */
  await page.locator('.skm-view .skm-skuitem').first().click();
  await page.waitForTimeout(200);
  out.sel = await page.locator('.skm-view .skm-sel').count();
  out.selBadge = await page.locator('.skm-view .skm-sel .skm-sim').first().innerText();
  out.selBadgeBand = await page.locator('.skm-view .skm-sel .skm-sim').first().evaluate((e) => (e.className.match(/simf-\w/) || [''])[0]);
  out.selKv = (await page.locator('.skm-view .skm-sel .skm-sel-main').innerText()).replace(/\s+/g, ' ');
  out.pickedCard = await page.locator('.skm-view .skm-skuitem').first().evaluate((e) => e.classList.contains('picked'));
  /* 切换第二个 ID：右侧 SKU 明细联动 */
  await page.locator('.skm-view .skm-hititem').nth(1).click();
  await page.waitForTimeout(200);
  out.skuCardsSecond = await page.locator('.skm-view .skm-skuitem').count();
  out.skuCodeSecond = await page.locator('.skm-view .skm-skuitem').first().locator('.skm-skuitem-meta > span').first().innerText();
  /* 搜索条件已移除：匹配结果区无筛选行；携带竞品信息勾选已移除 */
  out.filterRowInResult = await page.locator('.skm-view .sgd-sec').last().locator('.skm-filter').count();
  out.carryCheck = await page.locator('.skm-view .skm-check').count();
  /* 左卡：标题＋编码＋销量＋大号匹配度；SKU 行字段化元信息（编码/匹配度/成本价/销量/系列） */
  out.leftSubs = await page.locator('.skm-view .skm-hititem').first().locator('.skm-hititem-sub').allTextContents();
  out.skuMetaLabels = await page.locator('.skm-view .skm-skuitem').first().locator('.skm-skuitem-meta i').allTextContents();
  out.srcbar = (await page.locator('.skm-view .skm-srcbar').innerText()).replace(/\s+/g, ' ');
  /* 截图前滚到底，覆盖低匹配度色档（黄/红）行 */
  await page.locator('.skm-view .skm-body').evaluate((e) => { e.scrollTop = e.scrollHeight; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'D:/PM.funion/screenshots/skm-merged-jm.png' });
  await page.locator('.skm-view button', { hasText: /^保存$/ }).click();
  await page.waitForTimeout(400);
  out.closedAfterSave = (await page.locator('.skm-view').count()) === 0;
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });

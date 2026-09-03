/* 临时截图：市场商机 淘宝顺买 / 小店商机 两 tab */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.subnav:has-text("市场商机")');
  await page.waitForSelector('.ops-center .page.show .mk2-seg');

  const t1 = await page.locator('.ops-center .page.show .sg-table tbody tr').count();
  /* 图一：淘宝顺买 去除状态列 + 标题黑色 + 列宽均衡 */
  const ths1 = (await page.locator('.ops-center .page.show .sg-table thead th').allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
  console.log('taobao no-status:', !ths1.some((t) => t.includes('抓取状态')), '| ths6:', ths1.length === 6);
  const tcolor = await page.locator('.ops-center .page.show .mk-gtitle').first().evaluate((el) => getComputedStyle(el).color);
  console.log('title black:', tcolor === 'rgb(32, 37, 50)', tcolor);
  const w1 = await page.locator('.ops-center .page.show .sg-table tbody tr >> nth=0').evaluate((tr) => Array.from(tr.children).map((td) => Math.round(td.getBoundingClientRect().width)));
  console.log('taobao widths:', w1.join(','));
  const acts1 = ((await page.locator('.ops-center .page.show .actions-col').first().textContent()) || '').replace(/\s+/g, '');
  console.log('taobao acts no-detail:', !acts1.includes('详情'), '|', acts1);
  await page.screenshot({ path: `${OUT}/ops-verify-market-taobao.png` });

  await page.click('.ops-center .page.show .mk2-tab:has-text("小店商机")');
  await page.waitForTimeout(300);
  const t2 = await page.locator('.ops-center .page.show .sg-table tbody tr').count();
  /* 图二：小店商机 抓取人→创建人 / 抓取时间→创建时间（表头+查询条件） */
  const ths2 = (await page.locator('.ops-center .page.show .sg-table thead th').allInnerTexts()).map((t) => t.replace(/\s+/g, ''));
  console.log('xd renamed cols:', ths2.some((t) => t.includes('创建人')) && ths2.some((t) => t.includes('创建时间')) && ths2.some((t) => t.includes('抓取状态')), '| ths7:', ths2.length === 7);
  const flabels = (await page.locator('.ops-center .page.show .sg-filter label').allInnerTexts()).map((t) => t.trim());
  console.log('xd filter renamed:', flabels.includes('创建人') && flabels.includes('创建时间'), '|', flabels.join(','));
  const w2 = await page.locator('.ops-center .page.show .sg-table tbody tr >> nth=0').evaluate((tr) => Array.from(tr.children).map((td) => Math.round(td.getBoundingClientRect().width)));
  console.log('xd widths:', w2.join(','));
  const acts2 = ((await page.locator('.ops-center .page.show .actions-col').first().textContent()) || '').replace(/\s+/g, '');
  console.log('xd detail first:', acts2.startsWith('详情') && acts2.includes('全网搜索') && acts2.includes('导入到'), '|', acts2);
  await page.screenshot({ path: `${OUT}/ops-verify-market-xiaodian.png` });

  console.log('rows taobao =', t1, ', xiaodian =', t2);

  /* 操作列「全网搜索」跳转验证 */
  await page.locator('.ops-center .page.show .actions-col a:has-text("全网搜索")').first().click();
  await page.waitForTimeout(300);
  const nav = ((await page.locator('.ops-center .subnav.active').textContent()) || '').trim();
  console.log('nav active =', nav);
  await browser.close();
})();

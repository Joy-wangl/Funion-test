/* 验证：智能运营中心「商品策略」页接线 + 查询条件「是否有动销」 */
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

  /* 侧边栏路由存在并可点击进入 */
  const names = await page.locator('.ops-center .side .nav-text').allTextContents();
  results['st.navExists'] = names.some((t) => t.trim() === '商品策略');
  await page.click('.ops-center .side .nav:has-text("商品策略")');
  await page.waitForSelector('.ops-center .st-page');
  results['st.pageShow'] = await page.locator('.ops-center .st-page').isVisible();
  results['st.navActive'] = (await page.locator('.ops-center .side .nav.active .nav-text').textContent() || '').trim() === '商品策略';

  /* 页面结构：标题 / 策略 tab / 已选计数 / 表格默认 7 行 */
  results['st.head'] = ((await page.locator('.ops-center .st-head').textContent()) || '').includes('策略商品列表');
  const chips = await page.locator('.ops-center .st-page .sg-chip').allTextContents();
  results['st.tabs'] = chips.some((t) => t.includes('全部(1,254)')) && chips.some((t) => t.includes('默认发布策略(856)')) && chips.some((t) => t.includes('高利润策略(398)'));
  results['st.sel'] = ((await page.locator('.ops-center .st-sel').textContent()) || '').includes('已选 1/10000');
  const rowCount = () => page.locator('.ops-center .st-page .sg-table tbody tr').count();
  results['st.rowsDefault'] = (await rowCount()) === 7;

  /* 查询条件「是否有动销」：字段存在，下拉选项齐全 */
  const dxField = page.locator('.ops-center .st-page .sg-field', { hasText: '是否有动销' });
  results['st.dxField'] = await dxField.isVisible();
  await dxField.locator('.bselect-trigger').click();
  await page.locator('.bselect-menu:visible .bselect-opt').first().waitFor();
  const opts = await page.locator('.bselect-menu:visible .bselect-opt').allTextContents();
  results['st.dxOptions'] = ['全部', '有动销', '无动销'].every((o) => opts.some((t) => t.includes(o)));
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '有动销' }).click();

  /* 查询后仅动销商品（3 行），重置恢复 */
  await page.locator('.ops-center .st-page .sg-btn.primary', { hasText: '查询' }).click();
  results['st.filterDx'] = (await rowCount()) === 3;
  await page.locator('.ops-center .st-page .sg-btn', { hasText: '重置' }).click();
  results['st.reset'] = (await rowCount()) === 7 && ((await dxField.locator('.bselect-text').textContent()) || '').trim() === '全部';

  await page.screenshot({ path: `${OUT}/ops-verify-strategy.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

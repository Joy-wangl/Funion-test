/* 「是否优化过」查询条件验证：店铺商品 / 监控列表 / 店铺列表 三处计数互核（优化过+未优化过=全部） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const out = {};

  const gotoNav = async (nav) => {
    await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(900);
    await page.evaluate((t) => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === t)?.click(); }, nav);
    await page.waitForTimeout(900);
  };
  /* 设置「是否优化过」并点查询：先点空白处关掉可能滞留的气泡，再开该字段 trigger 点选项 */
  const setEver = async (val) => {
    await page.evaluate(() => { document.querySelector('.qc-center-page h2, .qc-center-page .sg-filter, body')?.click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const field = [...document.querySelectorAll('.sg-field')].find((f) => f.querySelector('label')?.textContent.trim() === '是否优化过');
      field?.querySelector('.bselect-trigger')?.click();
    });
    await page.waitForTimeout(350);
    await page.evaluate((v) => {
      const opt = [...document.querySelectorAll('.bselect-menu .bselect-opt')].find((o) => o.textContent.trim() === v);
      opt?.click();
    }, val);
    await page.waitForTimeout(250);
    await page.evaluate(() => { [...document.querySelectorAll('.sg-btn.primary')].find((b) => b.textContent.includes('查询'))?.click(); });
    await page.waitForTimeout(2200);
  };
  /* 计数：优先分页「共 N 条」，否则数当前 tbody 行 */
  const getCount = () => page.evaluate(() => {
    const info = document.querySelector('.ib-pageinfo');
    if (info) { const m = info.textContent.match(/共\s*(\d+)\s*条/); if (m) return Number(m[1]); }
    return document.querySelectorAll('tbody tr').length;
  });
  const run3 = async (shot) => {
    const r = {};
    r.all = await getCount();
    await setEver('优化过'); r.ever = await getCount();
    await page.screenshot({ path: 'D:/PM.funion/screenshots/ever-filter-' + shot + '.png' });
    await setEver('未优化过'); r.never = await getCount();
    r.parity = r.ever + r.never === r.all;
    return r;
  };

  /* ① 店铺商品 */
  await gotoNav('店铺商品');
  out.goods = await run3('goods');
  /* 保温杯（仅历史周期、无在途任务）应在「优化过」结果内 */
  await setEver('优化过');
  out.goods.hasThermos = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].some((t) => t.textContent.includes('保温杯')));

  /* ② 编码列表（编码监控·监控列表） */
  await gotoNav('编码列表');
  out.series = await run3('series');

  /* ③ 店铺列表（两级：看板 → 下钻列表） */
  await gotoNav('店铺列表');
  await page.evaluate(() => { document.querySelector('.flat-card[title="点击查看当前范围全部店铺"]')?.click(); });
  await page.waitForTimeout(900);
  out.shop = await run3('shop');

  out.errs = errs;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();

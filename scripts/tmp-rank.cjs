/* 临时验证：个人贡献榜按创作数降序、同创作数按使用人次降序 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-rank-list .ap-rank-person');

  const rows = await page.locator('.ap-rank-person .ap-rank-row').all();
  const data = [];
  for (const r of rows) {
    const name = (await r.locator('.ap-rank-name').evaluate((el) => (el.firstChild ? el.firstChild.textContent : '').trim()));
    const m = ((await r.locator('em').textContent()) || '').match(/(\d+)\s*个创作\s*·\s*([\d,]+)\s*人使用/);
    data.push({ name, n: Number(m?.[1] ?? 0), u: Number((m?.[2] ?? '0').replace(/,/g, '')) });
  }
  console.log(data.map((d) => `${d.name}(${d.n}创作/${d.u}人)`).join(' > '));

  const results = {};
  results['rank.rows'] = data.length > 0;
  results['rank.rule'] = data.every((d, i) => i === 0 || data[i - 1].n > d.n || (data[i - 1].n === d.n && data[i - 1].u >= d.u));
  const wi = data.findIndex((d) => d.name === '吴孝朝');
  const ci = data.findIndex((d) => d.name === '陈晓');
  results['rank.tieWuBeforeChen'] = wi === -1 || ci === -1 || (wi < ci && data[wi].n === data[ci].n && data[wi].u >= data[ci].u);

  await page.screenshot({ path: 'vue-verify-rank.png' });
  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'RANK VERIFY OK' : `RANK VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

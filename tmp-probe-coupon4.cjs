const { chromium } = require('./.playwright/package');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 2560, height: 1600 } });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const clickText = async (t) => {
    await page.evaluate((txt) => {
      const el = Array.from(document.querySelectorAll('*')).find((x) => x.children.length === 0 && x.textContent.trim() === txt);
      if (el) el.closest('a, button, div').click();
    }, t);
    await page.waitForTimeout(600);
  };

  await clickText('运营中心');
  await clickText('商品创建');
  await clickText('淘宝');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const a = [...document.querySelectorAll('.create-ops a')].find((x) => x.textContent.trim() === '发布到');
    if (a) a.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.cp-pub-strat')];
    const target = labels.find((l) => l.textContent.includes('8801'));
    if (target) target.querySelector('input').click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.cp-pub-foot button')].find((b) => b.textContent.trim() === '下一步');
    if (btn) btn.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const carets = [...document.querySelectorAll('.cp-pub-caret')];
    carets.forEach((c) => { if (c.textContent.includes('►')) c.click(); });
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const shop = [...document.querySelectorAll('.cp-pub-shop')].find((el) => !el.querySelector('input').disabled && el.querySelector('.name').textContent.trim() === '一点就到百货');
    if (shop) shop.querySelector('input').click();
  });
  await page.waitForTimeout(400);

  // expose Vue internals to read pubSel
  const before = await page.evaluate(() => {
    const app = document.querySelector('.create-page');
    const vue = app.__vueParentComponent;
    const sel = vue?.proxy?.pubSel;
    return sel ? sel.map((g) => ({ name: g.name, shops: g.shops, coupons: g.coupons })) : null;
  });
  console.log('BEFORE', JSON.stringify(before, null, 2));

  await page.evaluate(() => {
    const sel = document.querySelector('.cp-pub-coupon-sel .bselect-trigger');
    if (sel) sel.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.bselect-menu .bselect-opt')];
    const real = opts.find((o) => o.textContent.trim() !== '选择优惠券');
    if (real) real.click();
  });
  await page.waitForTimeout(800);

  const after = await page.evaluate(() => {
    const app = document.querySelector('.create-page');
    const vue = app.__vueParentComponent;
    const sel = vue?.proxy?.pubSel;
    return sel ? sel.map((g) => ({ name: g.name, shops: g.shops, coupons: g.coupons })) : null;
  });
  console.log('AFTER', JSON.stringify(after, null, 2));
  await browser.close();
  process.exit(0);
})();

const { chromium } = require('./.playwright/package');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 2560, height: 1600 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
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
  await clickText('商品策略');
  await clickText('商品策略');
  await page.waitForTimeout(800);
  await clickText('新建策略');
  await page.waitForTimeout(800);

  const formInfo = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.st-form-page .st-lb')].map((e) => e.textContent.replace(/\*/g, '').trim());
    const inputs = [...document.querySelectorAll('.st-form-page .st-sel')].length;
    return {
      labels,
      hasUseCoupon: labels.includes('是否使用优惠券'),
      hasCouponSelect: labels.includes('选择优惠券策略'),
      couponInputs: inputs,
    };
  });
  console.log('FORM', JSON.stringify(formInfo, null, 2));
  await page.screenshot({ path: 'D:/PM.funion/screenshots/strategy-form-coupon.png' });

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

  // 勾选第一个有券店铺（一点就到百货）
  await page.evaluate(() => {
    const shop = [...document.querySelectorAll('.cp-pub-shop')].find((el) => !el.querySelector('input').disabled && el.querySelector('.name').textContent.trim() === '一点就到百货');
    if (shop) shop.querySelector('input').click();
  });
  await page.waitForTimeout(400);

  const step2 = await page.evaluate(() => {
    const shops = [...document.querySelectorAll('.cp-pub-shop')].map((el) => ({
      name: el.querySelector('.name')?.textContent.trim() ?? '',
      disabled: el.querySelector('input')?.disabled ?? false,
      checked: el.querySelector('input')?.checked ?? false,
      hasCouponSel: !!el.querySelector('.cp-pub-coupon-sel'),
      hasNoCoupon: !!el.querySelector('.cp-pub-nocoupon'),
    }));
    const submit = [...document.querySelectorAll('.cp-pub-foot button')].find((b) => b.textContent.includes('立即发布'));
    return { shops: shops.slice(0, 8), submitDisabled: submit ? submit.disabled : null };
  });
  console.log('STEP2', JSON.stringify(step2, null, 2));

  // 选券
  await page.evaluate(() => {
    const sel = document.querySelector('.cp-pub-coupon-sel .bselect-trigger');
    if (sel) sel.click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.bselect-menu .bselect-opt')];
    const real = opts.find((o) => o.textContent.trim() !== '选择优惠券');
    if (real) real.click();
  });
  await page.waitForTimeout(400);
  const final = await page.evaluate(() => {
    const submit = [...document.querySelectorAll('.cp-pub-foot button')].find((b) => b.textContent.includes('立即发布'));
    return { submitDisabled: submit ? submit.disabled : null };
  });
  console.log('FINAL', JSON.stringify(final, null, 2));
  await page.screenshot({ path: 'D:/PM.funion/screenshots/cp-pub-coupon.png' });
  console.log('CONSOLE_ERRORS', JSON.stringify(errs));
  await browser.close();
  process.exit(0);
})();

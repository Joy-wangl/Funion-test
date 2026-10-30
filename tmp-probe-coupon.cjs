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

  // 策略表单断言
  const formInfo = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('.st-form-page .st-lb')].map((e) => e.textContent.trim());
    return {
      hasUseCoupon: labels.includes('是否使用优惠券'),
      hasCouponSelect: labels.includes('选择优惠券策略'),
      couponSec: [...document.querySelectorAll('.st-sec-t')].map((e) => e.textContent.trim()).includes('优惠券配置'),
    };
  });
  console.log('FORM', JSON.stringify(formInfo, null, 2));

  // 切到商品创建-淘宝
  await clickText('商品创建');
  await clickText('淘宝');
  await page.waitForTimeout(800);

  // 打开发布到抽屉
  await page.evaluate(() => {
    const a = [...document.querySelectorAll('.create-ops a')].find((x) => x.textContent.trim() === '发布到');
    if (a) a.click();
  });
  await page.waitForTimeout(800);

  // 第一步：选 8801（需优惠券）
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

  // 第二步：展开店铺分组
  await page.evaluate(() => {
    const carets = [...document.querySelectorAll('.cp-pub-caret')];
    carets.forEach((c) => { if (c.textContent.includes('►')) c.click(); });
  });
  await page.waitForTimeout(600);

  const step2 = await page.evaluate(() => {
    const shops = [...document.querySelectorAll('.cp-pub-shop')].map((el) => {
      const name = el.querySelector('.name')?.textContent.trim() ?? '';
      const disabled = el.querySelector('input')?.disabled ?? false;
      const hasSel = !!el.querySelector('.cp-pub-coupon-sel, .cp-pub-coupon');
      const noCoupon = !!el.querySelector('.cp-pub-nocoupon');
      return { name, disabled, hasSel, noCoupon };
    });
    const submit = [...document.querySelectorAll('.cp-pub-foot button')].find((b) => b.textContent.includes('立即发布'));
    return { shops: shops.slice(0, 8), submitDisabled: submit ? submit.disabled : null };
  });
  console.log('STEP2', JSON.stringify(step2, null, 2));

  // 为第一个可选店铺选券（若存在）
  const afterSelect = await page.evaluate(() => {
    const shop = [...document.querySelectorAll('.cp-pub-shop')].find((el) => el.querySelector('.cp-pub-coupon-sel'));
    if (!shop) return { picked: false };
    const sel = shop.querySelector('.cp-pub-coupon-sel .bselect-trigger');
    if (sel) sel.click();
    return { picked: true, shop: shop.querySelector('.name')?.textContent.trim() };
  });
  await page.waitForTimeout(500);
  if (afterSelect.picked) {
    await page.evaluate(() => {
      const opt = [...document.querySelectorAll('.bselect-menu .bselect-opt')].find((o) => o.textContent.trim() !== '选择优惠券');
      if (opt) opt.click();
    });
    await page.waitForTimeout(500);
    const submitState = await page.evaluate(() => {
      const submit = [...document.querySelectorAll('.cp-pub-foot button')].find((b) => b.textContent.includes('立即发布'));
      return { submitDisabled: submit ? submit.disabled : null };
    });
    console.log('AFTER_PICK', JSON.stringify(submitState, null, 2));
  }

  await page.screenshot({ path: 'D:/PM.funion/screenshots/cp-coupon-step2.png' });
  console.log('CONSOLE_ERRORS', JSON.stringify(errs));
  await browser.close();
  process.exit(0);
})();

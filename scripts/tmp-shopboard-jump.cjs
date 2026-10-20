/* 店铺列表看板·数据总览卡跳转核对（用户红框注释）：
   订单→售后单列表 / 聊天→商品列表 / 评价→评价列表 / 问题命中→店铺列表；并核 grade 带→店铺列表 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

const poll = async (page, fn, arg, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    if (await page.evaluate(fn, arg)) return true;
    await page.waitForTimeout(200);
  }
  return false;
};

const state = () => {
  const nav = document.querySelector('.qc-subnav.active .qc-nav-text');
  return {
    leaf: nav ? nav.textContent.trim() : null,
    asList: !!document.querySelector('.qc-as-head') && !document.querySelector('.qc-as-ov'),
    rvList: !!document.querySelector('.qc-ss-sec') && !document.querySelector('.qc-rv-ov'),
    slBoard: !!document.querySelector('.qc-sl-ov'),
    slList: !document.querySelector('.qc-sl-ov') && !!document.querySelector('.qc-as-back'),
    sgPage: !!document.querySelector('.qc-ss-page .sg-filter'),
  };
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  const out = {};

  const navTo = async (name) => {
    let ok = false;
    for (let i = 0; i < 75; i++) {
      if (await page.evaluate((n) => [...document.querySelectorAll('.qc-nav-text')].some((e) => e.textContent.trim() === n), name)) { ok = true; break; }
      await page.waitForTimeout(200);
    }
    if (!ok) throw new Error('nav not found ' + name);
    await page.evaluate((n) => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === n).click(), name);
    await page.waitForTimeout(500);
  };

  const clickCard = async (label) => {
    const ok = await poll(page, (t) => [...document.querySelectorAll('.qc-sl-ov .flat-card')].some((c) => (c.querySelector('.k') || {}).textContent.trim() === t), label);
    if (!ok) throw new Error('card not found ' + label);
    await page.evaluate((t) => [...document.querySelectorAll('.qc-sl-ov .flat-card')].find((c) => (c.querySelector('.k') || {}).textContent.trim() === t).click(), label);
    await page.waitForTimeout(600);
  };

  await navTo('店铺列表');
  await poll(page, () => !!document.querySelector('.qc-sl-ov'));
  out.cursor = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.qc-sl-ov .flat-card')].find((x) => (x.querySelector('.k') || {}).textContent.trim() === '订单数据');
    const g = document.querySelector('.qc-sl-grades .flat-card');
    return { overview: c ? getComputedStyle(c).cursor : null, grade: g ? getComputedStyle(g).cursor : null };
  });

  /* 订单数据 → 售后单列表 */
  await clickCard('订单数据');
  out.afterOrder = await page.evaluate(state);
  await page.screenshot({ path: `${OUT}/shopboard-jump-after.png` });

  /* 聊天数据 → 商品列表 */
  await navTo('店铺列表');
  await poll(page, () => !!document.querySelector('.qc-sl-ov'));
  await clickCard('聊天数据');
  out.goodsChat = await page.evaluate(state);
  await page.screenshot({ path: `${OUT}/shopboard-jump-goods.png` });

  /* 评价数据 → 评价列表 */
  await navTo('店铺列表');
  await poll(page, () => !!document.querySelector('.qc-sl-ov'));
  await clickCard('评价数据');
  out.reviewCard = await page.evaluate(state);
  await page.screenshot({ path: `${OUT}/shopboard-jump-review.png` });

  /* 问题命中次数 → 店铺列表（二级） */
  await navTo('店铺列表');
  await poll(page, () => !!document.querySelector('.qc-sl-ov'));
  await clickCard('问题命中次数');
  out.hitShopList = await page.evaluate(state);
  await page.screenshot({ path: `${OUT}/shopboard-jump-hitlist.png` });

  /* 分布卡（店铺数）→ 店铺列表（二级），既有行为复核：先由二级返回钮回一级看板 */
  await poll(page, () => !!document.querySelector('.qc-as-back'));
  await page.evaluate(() => document.querySelector('.qc-as-back').click());
  await poll(page, () => !!document.querySelector('.qc-sl-ov'));
  await page.evaluate(() => document.querySelector('.qc-sl-grades .flat-card').click());
  await page.waitForTimeout(500);
  out.gradeShopList = await page.evaluate(state);

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();

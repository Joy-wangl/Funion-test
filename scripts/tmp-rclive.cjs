/* 临时验证：实时客服接待样式重构—视觉升级且功能不变 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-page');
  await page.click('.rc-menu-item.child:has-text("实时客服接待")');
  await page.waitForSelector('.rc-live');

  const results = {};

  /* 样式：tab 主色 / 同区单主按钮 / 店铺卡阴影 / 账号卡悬浮 */
  const tabBg = await page.locator('.rc-live-tab.cur').evaluate((el) => getComputedStyle(el).backgroundColor);
  results['style.tabPrimary'] = tabBg === 'rgb(79, 124, 255)';
  results['style.singlePrimary'] =
    (await page.locator('.rc-live-actions .btn.primary').count()) === 1 &&
    (await page.locator('.rc-live-actions .btn:not(.primary):has-text("拉取全部未回复")').count()) === 1;
  const storeShadow = await page.locator('.rc-store').first().evaluate((el) => getComputedStyle(el).boxShadow);
  results['style.storeShadow'] = storeShadow !== 'none';
  const acc = page.locator('.rc-acc').first();
  const before = await acc.evaluate((el) => getComputedStyle(el).boxShadow + '|' + getComputedStyle(el).borderColor);
  await acc.hover();
  await page.waitForTimeout(250);
  const after = await acc.evaluate((el) => getComputedStyle(el).boxShadow + '|' + getComputedStyle(el).borderColor);
  results['style.accHover'] = before !== after;

  /* 布局：顶栏含 tab+统计 / 店铺流单列 / 未回复账号 danger 左条 */
  results['ux.topbarStats'] =
    (await page.locator('.rc-live-top .rc-live-tab').count()) >= 8 &&
    (await page.locator('.rc-live-top .rc-live-stat').count()) >= 6;
  const s0 = await page.locator('.rc-store').nth(0).boundingBox();
  const s1 = await page.locator('.rc-store').nth(1).boundingBox();
  results['ux.storeFeedSingleCol'] = !!s0 && !!s1 && Math.abs(s0.x - s1.x) <= 1 && s1.y > s0.y + s0.height - 4;
  const alertShadow = await page.locator('.rc-acc.alert').first().evaluate((el) => getComputedStyle(el).boxShadow).catch(() => '');
  results['ux.alertAccent'] = alertShadow.includes('inset');

  /* 布局：账号卡语义压缩—无线条分隔 / 状态圆点代替在线离线文案 / 数字前置作重心 */
  const swBar = await page.locator('.rc-acc .rc-acc-sw').first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return `${cs.borderTopStyle}|${cs.backgroundColor}`;
  });
  results['ux.noDashedLine'] = !swBar.startsWith('dashed') && swBar.split('|')[1] !== 'rgba(0, 0, 0, 0)';
  results['ux.netDots'] = (await page.locator('.rc-acc .rc-net').count()) >= 2;
  results['ux.noOfflineText'] = (await page.locator('.rc-acc :text("离线")').count()) === 0;
  const numSize = await page.locator('.rc-acc-stats b').first().evaluate((el) => getComputedStyle(el).fontSize);
  results['ux.numbersAnchor'] = numSize === '16px';

  /* 功能不变：平台切换 / 开关 / 查看更多 / 拉取未回复 */
  await page.click('.rc-live-tab:has-text("抖音")');
  await page.waitForTimeout(150);
  results['func.platformSwitch'] = (await page.locator('.rc-live-tab.cur:has-text("抖音")').count()) === 1;
  await page.click('.rc-live-tab:has-text("拼多多")');
  await page.waitForTimeout(150);
  const sw = page.locator('.rc-acc .rc-switch').first();
  const swOn = await sw.evaluate((el) => el.classList.contains('on'));
  await sw.click();
  results['func.switchToggle'] = (await sw.evaluate((el) => el.classList.contains('on'))) !== swOn;
  results['func.pullVisible'] = (await page.locator('.rc-pull:has-text("拉取")').count()) >= 1;
  const more = page.locator('.rc-more').first();
  if ((await more.count()) > 0) {
    const n0 = await page.locator('.rc-store').first().locator('.rc-acc').count();
    await more.click();
    await page.waitForTimeout(150);
    const n1 = await page.locator('.rc-store').first().locator('.rc-acc').count();
    results['func.moreExpand'] = n1 > n0;
  } else {
    results['func.moreExpand'] = true;
  }

  await page.screenshot({ path: `${OUT}/rc-live-refactor.png`, fullPage: false });
  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'RCLIVE VERIFY OK' : `RCLIVE VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

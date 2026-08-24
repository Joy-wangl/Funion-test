/* 临时验证：运营中心侧栏—收起按钮置底、收起态图标同轴居中、悬浮气泡二级路由可点击 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("运营中心")');
  await page.waitForSelector('.ops-center .side');

  const results = {};

  /* 展开态：品牌在导航之上；收起按钮在底部、与版本号留间距 */
  const brandBox = await page.locator('.ops-center .side-head .ops-brand-name').boundingBox();
  const navBox = await page.locator('.ops-center .side .nav:has-text("运营驾驶舱")').boundingBox();
  results['head.brandAboveNav'] = !!brandBox && !!navBox && brandBox.y < navBox.y;
  const footToggle = await page.locator('.ops-center .side-foot .ops-side-toggle').boundingBox();
  const verBox = await page.locator('.ops-center .side-foot .side-version').boundingBox();
  results['foot.toggleAboveVersion'] = !!footToggle && !!verBox && footToggle.y + footToggle.height <= verBox.y;
  results['foot.gap'] = !!footToggle && !!verBox && verBox.y - (footToggle.y + footToggle.height) >= 8;
  const sideTop = await page.locator('.ops-center .side').boundingBox();
  const topbarTop = await page.locator('.ops-center .ops-topbar').boundingBox();
  results['head.sideFlushTop'] = !!sideTop && !!topbarTop && Math.abs(sideTop.y - topbarTop.y) <= 2;
  await page.screenshot({ path: `${OUT}/vue-verify-sidelayout.png` });

  /* 收起：图标轨同轴居中 + logo 居中 */
  await page.click('.ops-center .side-foot .ops-side-toggle');
  await page.waitForSelector('.ops-center .side.collapsed');
  await page.waitForTimeout(300);
  const logoBox = await page.locator('.ops-center .side.collapsed .ops-brand-logo').boundingBox();
  const icoLeaf = await page.locator('.ops-center .side.collapsed .nav:has-text("运营驾驶舱") .nav-ico').boundingBox();
  const icoParent = await page.locator('.ops-center .side.collapsed .nav-parent:has-text("商机中心") .nav-ico').boundingBox();
  results['collapsed.logoVisible'] = !!logoBox;
  results['collapsed.iconsAligned'] =
    !!logoBox && !!icoLeaf && !!icoParent &&
    Math.abs((logoBox.x + logoBox.width / 2) - (icoLeaf.x + icoLeaf.width / 2)) <= 3 &&
    Math.abs((icoLeaf.x + icoLeaf.width / 2) - (icoParent.x + icoParent.width / 2)) <= 3;
  results['collapsed.toggleAtBottom'] = !!footToggle && (await page.locator('.ops-center .side.collapsed .side-foot .ops-side-toggle').isVisible());

  /* 悬浮分组图标：气泡展示二级路由，点击跳转且保持收起 */
  await page.hover('.ops-center .side.collapsed .nav-parent:has-text("商机中心")');
  await page.waitForSelector('.ops-rail-pop');
  results['pop.groupSubs'] = (await page.locator('.ops-rail-pop .rp-item').count()) === 3;
  results['pop.title'] = (await page.locator('.ops-rail-pop .rp-title:has-text("商机中心")').count()) === 1;
  await page.click('.ops-rail-pop .rp-item:has-text("内部商机")');
  await page.waitForTimeout(200);
  results['pop.clickNav'] = (await page.locator('.ops-center .side.collapsed .nav.active:has-text("运营驾驶舱")').count()) === 0
    && (await page.locator('.ops-rail-pop').count()) === 0
    && (await page.locator('.ops-center .side.collapsed').count()) === 1;
  await page.screenshot({ path: `${OUT}/vue-verify-sidelayout-collapsed.png` });

  /* 悬浮叶子图标：气泡仅展示路由名 */
  await page.hover('.ops-center .side.collapsed .nav:has-text("任务中心")');
  await page.waitForSelector('.ops-rail-pop');
  results['pop.leafSingle'] = (await page.locator('.ops-rail-pop .rp-item:has-text("任务中心")').count()) === 1
    && (await page.locator('.ops-rail-pop .rp-title').count()) === 0;
  await page.mouse.move(800, 500);
  await page.waitForTimeout(300);
  results['pop.autoClose'] = (await page.locator('.ops-rail-pop').count()) === 0;

  /* 收起态点分组图标：展开侧栏并打开该组 */
  await page.click('.ops-center .side.collapsed .nav-parent:has-text("商机中心")');
  await page.waitForSelector('.ops-center .side:not(.collapsed)');
  results['collapsed.parentExpands'] = await page.locator('.ops-center .subnav-wrap.show .subnav:has-text("内部商机")').isVisible();

  /* 底部按钮回切 */
  await page.click('.ops-center .side-foot .ops-side-toggle');
  await page.waitForSelector('.ops-center .side.collapsed');
  await page.click('.ops-center .side.collapsed .side-foot .ops-side-toggle');
  await page.waitForSelector('.ops-center .side:not(.collapsed)');
  results['toggle.roundtrip'] = true;

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'SIDELAYOUT VERIFY OK' : `SIDELAYOUT VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

/* 临时验证：运营中心侧栏布局—品牌+收起按钮入侧栏头部；收起态展示路由图标轨 */
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

  /* 展开态：品牌与收起按钮在侧栏头部，且位于运营驾驶舱之上 */
  const brandBox = await page.locator('.ops-center .side-head .ops-brand-name').boundingBox();
  const navBox = await page.locator('.ops-center .side .nav:has-text("运营驾驶舱")').boundingBox();
  results['head.brandAboveNav'] = !!brandBox && !!navBox && brandBox.y < navBox.y;
  results['head.toggleInSide'] = (await page.locator('.ops-center .side-head .ops-side-toggle').count()) === 1;
  results['head.topbarNoBrand'] = (await page.locator('.ops-center .ops-topbar .ops-brand').count()) === 0;
  /* 侧边栏顶到模块最上：与右侧顶栏同一起始线 */
  const sideTop = await page.locator('.ops-center .side').boundingBox();
  const topbarTop = await page.locator('.ops-center .ops-topbar').boundingBox();
  results['head.sideFlushTop'] = !!sideTop && !!topbarTop && Math.abs(sideTop.y - topbarTop.y) <= 2;
  await page.screenshot({ path: `${OUT}/vue-verify-sidelayout.png` });

  /* 收起：左侧保留路由图标轨 */
  await page.click('.ops-center .side-head .ops-side-toggle');
  await page.waitForSelector('.ops-center .side.collapsed');
  await page.waitForTimeout(300);
  const sideBox = await page.locator('.ops-center .side.collapsed').boundingBox();
  results['collapsed.railWidth'] = !!sideBox && sideBox.width >= 56 && sideBox.width <= 80;
  results['collapsed.textHidden'] = !(await page.locator('.ops-center .side.collapsed .nav-text').first().isVisible().catch(() => false));
  results['collapsed.iconsVisible'] = (await page.locator('.ops-center .side.collapsed .nav .nav-ico:visible').count()) >= 10;
  results['collapsed.toggleVisible'] = await page.locator('.ops-center .side.collapsed .ops-side-toggle').isVisible();
  /* 收起态：logo 可见且与路由图标居中对齐 */
  const logoBox = await page.locator('.ops-center .side.collapsed .ops-brand-logo').boundingBox();
  const icoBox = await page.locator('.ops-center .side.collapsed .nav .nav-ico').first().boundingBox();
  results['collapsed.logoVisible'] = !!logoBox;
  results['collapsed.logoCentered'] = !!logoBox && !!icoBox && Math.abs((logoBox.x + logoBox.width / 2) - (icoBox.x + icoBox.width / 2)) <= 3;
  await page.screenshot({ path: `${OUT}/vue-verify-sidelayout-collapsed.png` });

  /* 收起态点叶子路由：切页且保持收起 */
  await page.click('.ops-center .side.collapsed .nav:has-text("任务中心")');
  await page.waitForTimeout(200);
  results['collapsed.leafNav'] = (await page.locator('.ops-center .side.collapsed .nav.active:has-text("任务中心")').count()) === 1;

  /* 收起态点分组：展开侧栏并打开该组 */
  await page.click('.ops-center .side.collapsed .nav-parent:has-text("商机中心")');
  await page.waitForSelector('.ops-center .side:not(.collapsed)');
  results['collapsed.parentExpands'] = await page.locator('.ops-center .subnav-wrap.show .subnav:has-text("内部商机")').isVisible();

  /* 再收起→展开按钮回切 */
  await page.click('.ops-center .side-head .ops-side-toggle');
  await page.waitForSelector('.ops-center .side.collapsed');
  await page.click('.ops-center .side.collapsed .ops-side-toggle');
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

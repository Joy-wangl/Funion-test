/* 临时验证：应用详情-分享按钮，点击气泡展示分享 URL + 一键复制 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-home');

  /* 首页上新列表进入详情（无上新时走全部列表卡片） */
  if (await page.locator('.ap-rel-item').count()) {
    await page.click('.ap-rel-item');
  } else {
    await page.click('.ap-side-cat:has-text("全部"), .ap-side-item:has-text("全部")');
    await page.click('.ap-cell');
  }
  await page.waitForSelector('.ap-detail');

  /* 分享按钮存在且位于意见反馈左侧 */
  const shareBtn = page.locator('.ap-detail-head-acts button:has-text("分享")');
  results['share.btn'] = (await shareBtn.count()) === 1;
  results['share.first'] = await page.evaluate(() => {
    const acts = document.querySelector('.ap-detail-head-acts');
    const first = acts?.querySelector('button');
    return !!first && first.textContent?.includes('分享') === true;
  });

  /* 点击分享：气泡展示 URL */
  await shareBtn.click();
  await page.waitForSelector('.ap-share-pop');
  const url = await page.inputValue('.ap-share-pop input');
  results['share.url'] = /^https:\/\/.+\/app\/.+$/.test(url);

  /* 气泡锚在按钮下方且不溢出右缘 */
  results['share.anchor'] = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.ap-detail-head-acts button')].find((b) => b.textContent?.includes('分享'));
    const pop = document.querySelector('.ap-share-pop');
    if (!btn || !pop) return false;
    const b = btn.getBoundingClientRect();
    const p = pop.getBoundingClientRect();
    return p.top >= b.bottom && p.right <= window.innerWidth - 4;
  });

  /* 复制：toast 提示且气泡关闭 */
  await page.click('.ap-share-copy');
  await page.waitForTimeout(300);
  results['share.copyToast'] = (await page.getByText('分享链接已复制').count()) >= 1;
  results['share.closedAfterCopy'] = (await page.locator('.ap-share-pop').count()) === 0;

  /* 再次打开截图留证 */
  await page.waitForTimeout(2200);
  await shareBtn.click();
  await page.waitForSelector('.ap-share-pop');
  await page.screenshot({ path: `${OUT}/ac-verify-share.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

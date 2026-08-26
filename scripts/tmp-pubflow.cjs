/* 临时验证：个人商品库-发布到 两步抽屉（选择策略 → 选择店铺） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.click('.nav-parent:has-text("个人商品库")');
  await page.click('.subnav:has-text("淘宝")');
  await page.waitForSelector('.ops-center .page.show tbody tr');

  /* 打开发布到抽屉：第一步 选择策略 */
  await page.click('.ops-center .page.show a:has-text("发布到")');
  await page.waitForSelector('.cp-pub-drawer');
  results['s1.head'] = (await page.locator('.cp-pub-head:has-text("选择策略")').count()) === 1;
  results['s1.defaultNoStrategy'] = (await page.locator('.cp-pub-drawer .bselect-trigger:has-text("不使用策略发布")').count()) === 1;
  results['s1.radios'] = (await page.locator('.cp-pub-radios label').count()) === 2;
  results['s1.nextDisabled'] = await page.locator('.cp-pub-foot button:has-text("下一步")').isDisabled();
  await page.screenshot({ path: `${OUT}/ops-verify-pubstep1.png` });

  /* 选择策略 13245：展示发布/利润/推广信息，下一步启用 */
  await page.click('.cp-pub-drawer .bselect');
  await page.click('.bselect-menu .bselect-opt:has-text("13245")');
  await page.waitForTimeout(200);
  results['s2.secs'] = (await page.locator('.cp-pub-sec').allTextContents()).join(',') === '发布信息,利润信息,推广信息';
  results['s2.method'] = (await page.locator('.cp-pub-kv', { hasText: '发布方式' }).textContent() ?? '').includes('放入仓库');
  results['s2.rate'] = (await page.locator('.cp-pub-kv', { hasText: '利润率：' }).textContent() ?? '').includes('1%');
  results['s2.nextEnabled'] = !(await page.locator('.cp-pub-foot button:has-text("下一步")').isDisabled());
  await page.screenshot({ path: `${OUT}/ops-verify-pubstep2.png` });

  /* 切回不使用策略：发布方式 radio 必填后才可下一步 */
  await page.click('.cp-pub-drawer .bselect');
  await page.click('.bselect-menu .bselect-opt:has-text("不使用策略发布")');
  await page.waitForTimeout(200);
  results['s1b.nextDisabledAgain'] = await page.locator('.cp-pub-foot button:has-text("下一步")').isDisabled();
  await page.click('.cp-pub-radios label:has-text("放入仓库")');
  results['s1b.nextEnabledAfterRadio'] = !(await page.locator('.cp-pub-foot button:has-text("下一步")').isDisabled());

  /* 第二步：选择店铺 */
  await page.click('.cp-pub-foot button:has-text("下一步")');
  await page.waitForSelector('.cp-pub-head:has-text("批量铺货")');
  results['s3.title'] = (await page.locator('.cp-pub-head').textContent() ?? '').includes('批量铺货（1 件商品）');
  results['s3.shops14'] = (await page.locator('.cp-pub-shop').count()) === 14;
  results['s3.pubDisabled'] = await page.locator('.cp-pub-foot button:has-text("立即发布")').isDisabled();
  await page.screenshot({ path: `${OUT}/ops-verify-pubstep3.png` });

  /* 搜索过滤 */
  await page.fill('.cp-pub-search input', '百货');
  await page.waitForTimeout(200);
  results['s3.search7'] = (await page.locator('.cp-pub-shop').count()) === 7;

  /* 组头全选 → 立即发布 */
  await page.fill('.cp-pub-search input', '');
  await page.waitForTimeout(200);
  await page.click('.cp-pub-group-head label');
  await page.waitForTimeout(200);
  results['s3.allChecked'] = (await page.locator('.cp-pub-shop input:checked').count()) === 14;
  results['s3.pubEnabled'] = !(await page.locator('.cp-pub-foot button:has-text("立即发布")').isDisabled());
  await page.click('.cp-pub-foot button:has-text("立即发布")');
  await page.waitForTimeout(300);
  results['s3.toast'] = (await page.getByText('已发布到 14 个店铺').count()) >= 1;
  results['s3.closed'] = (await page.locator('.cp-pub-drawer').count()) === 0;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

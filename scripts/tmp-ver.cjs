/* 临时验证：上传新创作第二步展示版本号（默认 1.0.0，必填） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.click('.ap-side-user');
  await page.waitForSelector('.ap-mine-head');
  await page.click('.ap-btn-blue:has-text("上传新创作")');
  await page.waitForSelector('.ap-create');

  /* 第一步必填项 */
  await page.fill('.ap-create input[placeholder="请输入"]', '版本号验证');
  await page.click('.ap-upload.icon');
  await page.click('.ap-upload.main');
  await page.click('.ap-btn-blue:has-text("下一步")');
  await page.waitForSelector('.ap-create .bselect');

  /* 选择浏览器插件 */
  await page.click('.ap-create .bselect');
  await page.click('.bselect-menu .bselect-opt:has-text("浏览器插件")');
  await page.waitForTimeout(200);

  /* 版本号字段：存在、默认 1.0.0、位于上传应用文件之前 */
  const verLabel = page.locator('.ap-create .ap-label', { hasText: '版本号' });
  results['ver.label'] = (await verLabel.count()) === 1;
  const verInput = page.locator('.ap-create input[placeholder*="语义化版本"]');
  results['ver.default'] = (await verInput.inputValue()) === '1.0.0';
  results['ver.beforeFile'] = await page.evaluate(() => {
    const label = [...document.querySelectorAll('.ap-create .ap-label')].find((l) => l.textContent?.includes('版本号'));
    const file = [...document.querySelectorAll('.ap-create .ap-label')].find((l) => l.textContent?.includes('上传应用文件'));
    return !!label && !!file && label.getBoundingClientRect().y < file.getBoundingClientRect().y;
  });

  /* 清空版本号提交应被拦截（先上传文件越过文件校验） */
  await page.click('.ap-create .ap-upload-file');
  await verInput.fill('');
  await page.click('.ap-btn-blue:has-text("提交创作")');
  await page.waitForTimeout(200);
  results['ver.required'] = (await page.locator('.ap-toast, .toast-item', { hasText: '请输入版本号' }).count()) >= 1
    || (await page.getByText('请输入版本号').count()) >= 1;
  await verInput.fill('1.0.0');
  await page.waitForTimeout(2500); /* 等 toast 消失再截图 */

  await page.screenshot({ path: `${OUT}/ac-verify-version.png` });
  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });

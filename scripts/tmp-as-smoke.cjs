const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const cases = [
  { name: '换主体', action: '换主体', needUpload: true },
  { name: '换场景', action: '换场景', needUpload: false },
  { name: '单图复刻', action: '单图复刻', needUpload: true },
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await page.click('.top-tabs-item:has-text("AI作图中心")');
  await page.waitForSelector('.as-wb', { timeout: 30000 });

  for (const c of cases) {
    await page.locator('.as-act').filter({ hasText: c.action }).click();
    await page.waitForTimeout(600);
    await page.locator('.as-src-tile').filter({ hasText: '选择店铺商品' }).first().click();
    await page.waitForSelector('.as-pick-grid .as-pick-card', { timeout: 10000 });
    await page.locator('.as-pick-grid .as-pick-card').first().click();
    await page.waitForTimeout(200);
    await page.click('.modal-foot button:has-text("确认选择")');
    await page.waitForTimeout(400);

    if (c.needUpload && c.action === '单图复刻') {
      // 复刻：上传参考图
      const input = page.locator('input[type="file"]').first();
      await input.setInputFiles('screenshots/as-01-workbench.png');
      await page.waitForTimeout(800);
    } else if (c.needUpload && c.action === '换主体') {
      // 换主体：选择新主体
      await page.locator('.as-src-tile').filter({ hasText: '选择店铺商品' }).nth(1).click();
      await page.waitForSelector('.as-pick-grid .as-pick-card', { timeout: 10000 });
      await page.locator('.as-pick-grid .as-pick-card').nth(1).click();
      await page.waitForTimeout(200);
      await page.click('.modal-foot button:has-text("确认选择")');
      await page.waitForTimeout(400);
    }

    if (c.action !== '单图复刻') {
      await page.locator('.as-scene-card').first().click();
      await page.waitForTimeout(200);
      await page.locator('.as-style-card').first().click();
      await page.waitForTimeout(200);
    }

    const missing = await page.locator('.as-gen-hint').innerText().catch(() => '');
    const ready = await page.locator('.as-gen-btn').isEnabled().catch(() => false);
    await page.screenshot({ path: `${OUT}/as-smoke-${c.name}.png` });
    console.log(c.name, 'ready=', ready, 'hint=', missing);

    if (ready) {
      await page.click('.as-gen-btn');
      await page.waitForSelector('.as-res-head', { timeout: 30000 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/as-smoke-${c.name}-result.png` });
      console.log(c.name, 'generated ok');
    }

    // reset to changeTheme default for next case
    await page.locator('.as-act').filter({ hasText: '换主题' }).click();
    await page.waitForTimeout(400);
  }

  await browser.close();
})();

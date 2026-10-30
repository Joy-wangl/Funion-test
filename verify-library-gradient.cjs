const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.waitForSelector('.vs-home', { timeout: 10000 });

    // Navigate to knowledge base
    await page.evaluate(() => { location.hash = '#knowledge'; });
    await page.waitForTimeout(500);

    // Click on 语料库 tab (second tab in library section)
    const libTabs = await page.locator('.vs-lib2-views .vs-lib2-view').all();
    if (libTabs.length >= 2) {
      await libTabs[1].click();
      await page.waitForTimeout(500);
    }

    // Take screenshot
    await page.screenshot({ path: 'd:/PM.funion/screenshots/verify-library-gradient.png', fullPage: false });
    console.log('Screenshot saved');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

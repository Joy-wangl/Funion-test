const { chromium } = require('d:/PM.funion/.playwright/package/index.js');
const path = require('path');

const OUT = 'd:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5173/', { waitUntil: 'commit', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Take debug screenshot
  await page.screenshot({ path: path.join(OUT, 'verify-scene-debug2.png'), fullPage: false });
  console.log('Debug screenshot taken after load');

  // Use goApp to switch to knowledge tab
  await page.evaluate(() => {
    const app = document.querySelector('#app');
    if (app?.__vue_app__) {
      // Try to find the goApp function
    }
  });

  // Alternative: click the knowledge tab via the overflow menu
  // First check if knowledge tab is visible
  const allTabs = await page.$$('.top-tabs-item');
  let foundKnowledge = false;
  for (const tab of allTabs) {
    const text = await tab.textContent();
    if (text?.includes('知识库')) {
      await tab.click();
      foundKnowledge = true;
      break;
    }
  }

  if (!foundKnowledge) {
    // Click the overflow menu
    const moreBtn = await page.$('.top-tabs-more');
    if (moreBtn) {
      await moreBtn.click();
      await page.waitForTimeout(500);
      const popRows = await page.$$('.top-tabs-pop-row');
      for (const row of popRows) {
        const text = await row.textContent();
        if (text?.includes('知识库')) {
          await row.click();
          break;
        }
      }
    }
  }
  await page.waitForTimeout(1500);

  const items = await page.$$('.kb-nav-item');
  await items[1].click();
  await page.waitForTimeout(1000);

  const tcHead = await page.$('.sc2-tc-head');
  if (tcHead) await tcHead.click();
  await page.waitForTimeout(600);

  const scHead = await page.$('.sc2-sc-head');
  if (scHead) await scHead.click();
  await page.waitForTimeout(600);

  // Click "售前" to show gradient on non-default selection
  const chips = await page.$$('.sc2-fchip');
  // chips: [全部, 售前, 售中, 售后]
  if (chips[1]) await chips[1].click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(OUT, 'verify-scene-gradient售前.png'), fullPage: false });
  console.log('Screenshot: scene config with 售前 selected (gradient visible)');

  await browser.close();
  console.log('Done');
})();

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

  // Navigate to 素材中心 via sidebar
  // Click "系列编码知识库" to expand
  const navParent = await page.$('.nav-parent:has-text("系列编码知识库")');
  if (navParent) await navParent.click();
  await page.waitForTimeout(500);

  // Click "素材中心"
  const subnav = await page.$('.subnav:has-text("素材中心")');
  if (subnav) await subnav.click();
  await page.waitForTimeout(1000);

  // Click "语料库" button
  const libBtn = await page.$('.vs-libentry');
  if (libBtn) await libBtn.click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(OUT, 'verify-creator-info.png'), fullPage: false });
  console.log('Screenshot: corpus library with creator info');

  await browser.close();
  console.log('Done');
})();

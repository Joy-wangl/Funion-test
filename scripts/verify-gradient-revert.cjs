const { chromium } = require('d:/PM.funion/.playwright/package/index.js');
const path = require('path');

const OUT = 'd:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1500);

  // === 1) 语料库页：验证分段按钮已还原为普通边框样式 ===
  // 点击顶部"智能运营中心"tab
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForTimeout(800);

  // 展开"系列编码知识库"侧栏组
  await page.click('.nav-parent:has-text("系列编码知识库")');
  await page.waitForTimeout(400);

  // 点击"素材中心"子导航
  await page.click('.subnav:has-text("素材中心")');
  await page.waitForTimeout(1000);

  // 点击"语料库"按钮进入library视图
  await page.click('.vs-libentry');
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(OUT, 'verify-lib-revert.png'), fullPage: false });
  console.log('Screenshot 1: library view (stages reverted to bordered buttons)');

  // === 2) 场景配置页：验证场景阶段分段按钮有渐变 ===
  // 点击顶部"知识库"tab
  await page.click('.top-tabs-item:has-text("知识库")');
  await page.waitForTimeout(1000);

  // 点击左侧"场景配置"导航
  await page.click('.kb-nav-item:has-text("场景配置")');
  await page.waitForTimeout(1000);

  // 点击第一个类型组展开
  const tcHead = await page.$('.sc2-tc-head');
  if (tcHead) await tcHead.click();
  await page.waitForTimeout(600);

  // 点击第一个场景卡展开
  const scHead = await page.$('.sc2-sc-head');
  if (scHead) await scHead.click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(OUT, 'verify-scene-gradient.png'), fullPage: false });
  console.log('Screenshot 2: scene config with gradient on stage filter');

  await browser.close();
  console.log('Done');
})();

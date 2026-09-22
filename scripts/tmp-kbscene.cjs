/* 验证：知识库侧栏「场景配置」定版 V2——V1 入口/子入口下线，V2 左右结构占位 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://localhost:5173/#knowledge', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.kb-side', { timeout: 90000 });
  await page.waitForTimeout(600);

  const results = [];
  const chk = (name, ok) => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);

  /* 侧栏导航：仅两项，无 V2 子入口 */
  const navTexts = await page.locator('.kb-side .kb-nav .kb-nav-item').allTextContents();
  chk('nav items = [商品知识库 V2, 场景配置]', JSON.stringify(navTexts.map((t) => t.trim())) === JSON.stringify(['商品知识库 V2', '场景配置']));
  chk('no sub entry (kb-nav-sub)', (await page.locator('.kb-nav-sub').count()) === 0);

  /* 点「场景配置」→ V2 左右结构占位 */
  await page.locator('.kb-side .kb-nav .kb-nav-item', { hasText: '场景配置' }).click();
  await page.waitForTimeout(400);
  chk('sc2 wrap rendered', (await page.locator('.sc2-wrap').count()) === 1);
  const h2 = (await page.locator('.sc2-head h2').textContent() || '').trim();
  chk('head title = 场景配置', h2 === '场景配置');
  const crumb = (await page.locator('.sc2-head .kb-breadcrumb').textContent() || '').trim();
  chk('breadcrumb = 知识库 / 场景配置', crumb.replace(/\s+/g, ' ') === '知识库 / 场景配置');
  chk('left rail + right flow', (await page.locator('.sc2-rail').count()) === 1 && (await page.locator('.sc2-flow, .sc2-main, .sc2-body > :last-child').count()) >= 1);
  chk('no V1 leftover text', (await page.locator('.kb-app').textContent() || '').includes('场景配置 V2（左右结构）') === false);
  chk('active nav = 场景配置', (await page.locator('.kb-nav-item.active').textContent() || '').trim() === '场景配置');
  chk('console errors = 0', errs.length === 0);

  await page.screenshot({ path: `${OUT}/kb-scene-v2-final.png` });
  console.log(results.join('\n'));
  console.log(errs.length ? `CONSOLE: ${errs.slice(0, 3).join(' | ')}` : 'console clean');
  await browser.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();

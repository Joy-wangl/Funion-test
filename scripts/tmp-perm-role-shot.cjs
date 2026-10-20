/* 出图：品控-线上 权限管理下「角色管理 / 成员管理」，确认共用卡片壳的样式同步无破版 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickByText = (page, sel, text) =>
  page.evaluate(
    ([sel, text]) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
      if (!el) return 'miss:' + text;
      el.click();
      return 'ok';
    },
    [sel, text],
  );

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const shots = [];

  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-text, .qc-nav-group, span, div', '权限管理');
  await page.waitForTimeout(300);

  await clickByText(page, '.qc-nav-text', '角色管理');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/role-qc-online.png` });
  shots.push('role-qc-online.png');

  await clickByText(page, '.qc-nav-text', '成员管理');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/member-qc-online.png` });
  shots.push('member-qc-online.png');

  for (const f of shots) console.log(f, fs.statSync(`${OUT}/${f}`).size);
  await browser.close();
})();

/* 出图：命中问题管理 兜底小类「其它」点编辑 → 仅责任部门可编辑弹窗 */
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

  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-text', '命中问题管理');
  await page.waitForTimeout(700);

  const r = await page.evaluate(() => {
    const a = document.querySelector('.qc-hm-wrap .sc2-sub-card.fix .sc2-sc-ops a');
    if (!a) return 'miss-edit-link';
    a.click();
    return 'ok';
  });
  console.log('open-edit:', r);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/hitmanage-fix-edit-modal.png` });
  console.log('hitmanage-fix-edit-modal.png', fs.statSync(`${OUT}/hitmanage-fix-edit-modal.png`).size);
  await browser.close();
})();

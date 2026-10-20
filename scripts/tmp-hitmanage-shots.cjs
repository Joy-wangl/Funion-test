/* 出图：品控-线上 命中问题管理，验证每大类末尾系统兜底小类「其它」卡 */
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

const scrollCardsBottom = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('.qc-hm-wrap .sc2-cards')?.parentElement;
    const target = [...document.querySelectorAll('.qc-hm-wrap *')].find((n) => n.scrollHeight > n.clientHeight + 4 && n.querySelector('.sc2-cards'));
    const t = target || el;
    if (t) t.scrollTop = t.scrollHeight;
    return t ? t.className : 'none';
  });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const shots = [];

  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-text', '命中问题管理');
  await page.waitForTimeout(700);
  await scrollCardsBottom(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/hitmanage-other-shaofa.png` });
  shots.push('hitmanage-other-shaofa.png');

  await clickByText(page, '.sc2-type-card b', '质量问题');
  await page.waitForTimeout(500);
  await scrollCardsBottom(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/hitmanage-other-quality.png` });
  shots.push('hitmanage-other-quality.png');

  for (const f of shots) console.log(f, fs.statSync(`${OUT}/${f}`).size);
  await browser.close();
})();

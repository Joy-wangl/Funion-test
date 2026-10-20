/* 出图：三个壳的「部门管理」现状（品控-线上 / 品控中心 / 智能运营中心），排查样式与结构问题 */
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

  /* ---------- 品控-线上 ---------- */
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-text, .qc-nav-group, span, div', '权限管理');
  await page.waitForTimeout(300);
  await clickByText(page, '.qc-nav-text', '部门管理');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/dept-qc-online.png` });
  shots.push('dept-qc-online.png');

  /* ---------- 运维管理后台（qc-center 壳，非线上） ---------- */
  await clickByText(page, '.top-tabs-item', '运维管理后台');
  await page.waitForTimeout(500);
  await clickByText(page, '.qc-nav-text, .qc-nav-group, span, div', '权限管理');
  await page.waitForTimeout(300);
  await clickByText(page, '.qc-nav-text', '部门管理');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/dept-qc-center.png` });
  shots.push('dept-qc-center.png');

  /* ---------- 智能运营中心：设置组 → 部门管理 ---------- */
  await clickByText(page, '.top-tabs-item', '智能运营中心');
  await page.waitForTimeout(600);
  await clickByText(page, '.nav-parent', '设置');
  await page.waitForTimeout(400);
  await clickByText(page, '.subnav-wrap a, .subnav-wrap div, .subnav-wrap span, .subnav', '部门管理');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/dept-ops-center.png` });
  shots.push('dept-ops-center.png');

  for (const f of shots) console.log(f, fs.statSync(`${OUT}/${f}`).size);
  await browser.close();
})();

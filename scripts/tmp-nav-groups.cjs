/* 验证：品控-线上 编码监控/配置中心 为一级分组 + 二级子路由（同店铺分监控模式），页内无 tab 条 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const r = {};
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(600);

  /* 侧栏结构：编码监控/配置中心 为 parent 分组，各挂两个二级子路由 */
  const parents = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-side .qc-nav-parent .qc-nav-text')].map((e) => e.textContent.trim()),
  );
  console.log('parents:', JSON.stringify(parents));
  r['parent.code'] = parents.includes('编码监控');
  r['parent.conf'] = parents.includes('配置中心');
  const subsOf = (parentText) =>
    page.evaluate((pt) => {
      const p = [...document.querySelectorAll('.qc-side .qc-nav-parent')].find((e) => e.textContent.trim().startsWith(pt));
      const wrap = p && p.nextElementSibling;
      return wrap && wrap.classList.contains('qc-subnav-wrap')
        ? [...wrap.querySelectorAll('.qc-nav-text')].map((e) => e.textContent.trim())
        : [];
    }, parentText);
  const codeSubs = await subsOf('编码监控');
  const confSubs = await subsOf('配置中心');
  console.log('codeSubs:', JSON.stringify(codeSubs), 'confSubs:', JSON.stringify(confSubs));
  r['subs.code'] = codeSubs.length === 2 && codeSubs[0] === '数据概览' && codeSubs[1] === '监控列表';
  r['subs.conf'] = confSubs.length === 2 && confSubs[0] === '命中问题管理' && confSubs[1] === '问题商品定义';

  /* 页内无 tab 条 */
  r['no.pageTabs'] = (await page.locator('.qc-main > .pd-cfg-tabs').count()) === 0;

  /* 子路由切换：监控列表 */
  await clickByText(page, '.qc-side .qc-subnav', '监控列表');
  await page.waitForTimeout(500);
  r['list.rendered'] = (await page.locator('.qc-center-page tbody tr').count()) > 0;
  r['list.subActive'] = (await page.locator('.qc-side .qc-subnav.active .qc-nav-text').textContent()) === '监控列表';
  r['code.parentChild'] = (await page.locator('.qc-side .qc-nav-parent:has-text("编码监控")').getAttribute('class'))?.includes('child') === true;
  await page.screenshot({ path: `${OUT}/nav-group-code.png` });

  /* 父级收起/展开 */
  await clickByText(page, '.qc-side .qc-nav-parent', '编码监控');
  await page.waitForTimeout(300);
  r['code.collapsed'] = (await subsOf('编码监控')).length === 0;
  await clickByText(page, '.qc-side .qc-nav-parent', '编码监控');
  await page.waitForTimeout(300);
  r['code.reopened'] = (await subsOf('编码监控')).length === 2;

  /* 配置中心子路由：问题商品定义 */
  await clickByText(page, '.qc-side .qc-subnav', '问题商品定义');
  await page.waitForTimeout(500);
  r['pdef.rendered'] = (await page.locator('.qc-center-page .pd-panel').count()) > 0;
  r['conf.parentChild'] = (await page.locator('.qc-side .qc-nav-parent:has-text("配置中心")').getAttribute('class'))?.includes('child') === true;
  await page.screenshot({ path: `${OUT}/nav-group-conf.png` });
  await clickByText(page, '.qc-side .qc-subnav', '命中问题管理');
  await page.waitForTimeout(400);
  r['hit.rendered'] = (await page.locator('.qc-center-page .qc-hm-wrap').count()) > 0;

  /* 运维壳不变 */
  await clickByText(page, '.top-tabs-item', '运维管理后台');
  await page.waitForTimeout(600);
  const opsNav = await page.evaluate(() => {
    const side = [...document.querySelectorAll('.qc-side')].find((s) => s.textContent.includes('运维管理后台'));
    return side ? [...side.querySelectorAll('.qc-nav .qc-nav-text')].map((e) => e.textContent.trim()) : [];
  });
  console.log('opsNav:', JSON.stringify(opsNav));
  r['ops.unchanged'] = opsNav.includes('数据概览') && opsNav.includes('监控列表') && !opsNav.includes('编码监控') && !opsNav.includes('配置中心');

  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();

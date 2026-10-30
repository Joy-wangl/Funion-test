const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#cs-workbench', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  const clickByText = (sel, text) => page.evaluate(([s, t]) => {
    const el = [...document.querySelectorAll(s)].find((n) => n.textContent.trim() === t);
    if (el) el.click();
    return !!el;
  }, [sel, text]);
  const clickCat = (name) => page.evaluate((t) => {
    const el = [...document.querySelectorAll('.cwb-cat-item .cwb-cat-name')].find((n) => n.textContent.trim() === t);
    if (el) el.closest('.cwb-cat-tag')?.click();
    return !!el;
  }, name);

  // 1) single scroll body with three module cards
  const mods = await page.evaluate(() => {
    const body = document.querySelector('.cwb-board .cwb-body');
    const secs = [...document.querySelectorAll('.cwb-board .cwb-mod')];
    return {
      bodies: document.querySelectorAll('.cwb-board .cwb-body').length,
      titles: secs.map((s) => s.querySelector('.cwb-mod-t')?.textContent.trim()),
      rects: secs.map((s) => { const r = s.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }),
      navActive: [...document.querySelectorAll('.cwb-tabs button')].filter((b) => b.classList.contains('on')).map((b) => b.textContent.trim()),
      scrollable: body ? body.scrollHeight > body.clientHeight : false,
      confirmBtn: !!([...document.querySelectorAll('.cwb-board button')].find((b) => b.textContent.trim() === '确认打标')),
    };
  });
  await page.screenshot({ path: `${OUT}/cwb-merge-top.png` });

  // 2) click nav 标记会话 -> scroll + spy
  await clickByText('.cwb-tabs button', '标记会话');
  await page.waitForTimeout(900);
  const afterNavTag = await page.evaluate(() => {
    const body = document.querySelector('.cwb-board .cwb-body');
    const tag = document.querySelector('.cwb-mod[data-mod="tag"]');
    return {
      scrollTop: Math.round(body.scrollTop),
      clientH: body.clientHeight,
      scrollH: body.scrollHeight,
      tagTopRel: Math.round(tag.getBoundingClientRect().top - body.getBoundingClientRect().top),
      navActive: [...document.querySelectorAll('.cwb-tabs button')].filter((b) => b.classList.contains('on')).map((b) => b.textContent.trim()),
    };
  });
  await page.screenshot({ path: `${OUT}/cwb-merge-tag.png` });

  // 3) scroll to kb module -> spy follows + kb foot shows
  await page.evaluate(() => {
    const body = document.querySelector('.cwb-board .cwb-body');
    const kb = document.querySelector('.cwb-mod[data-mod="kb"]');
    body.scrollTop = kb.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 6;
  });
  await page.waitForTimeout(500);
  const spyKb = await page.evaluate(() => ({
    navActive: [...document.querySelectorAll('.cwb-tabs button')].filter((b) => b.classList.contains('on')).map((b) => b.textContent.trim()),
    kbFoot: !!document.querySelector('.cwb-kb-foot'),
  }));

  // back to tag module for tagging interactions
  await clickByText('.cwb-tabs button', '标记会话');
  await page.waitForTimeout(900);

  // 4) accordion: open 质量问题 then 物流问题
  await clickCat('质量问题');
  await page.waitForTimeout(300);
  const acc1 = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.cwb-cat-item')];
    return items.map((it) => ({
      name: it.querySelector('.cwb-cat-name')?.textContent.trim(),
      open: !!it.querySelector('.cwb-sub-row'),
      on: it.querySelector('.cwb-cat-tag')?.classList.contains('on'),
      subs: [...it.querySelectorAll('.cwb-sub')].map((s) => s.textContent.trim()),
    })).filter((x) => x.open || x.name === '质量问题' || x.name === '物流问题');
  });
  await clickCat('物流问题');
  await page.waitForTimeout(300);
  const acc2 = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.cwb-cat-item')];
    return items.map((it) => ({ name: it.querySelector('.cwb-cat-name')?.textContent.trim(), open: !!it.querySelector('.cwb-sub-row') }))
      .filter((x) => x.name === '质量问题' || x.name === '物流问题');
  });

  // 5) click a sub -> toast + grouped selected tags (3 codes selected by default)
  const subClicked = await page.evaluate(() => {
    const open = [...document.querySelectorAll('.cwb-cat-item')].find((it) => it.querySelector('.cwb-sub-row'));
    const sub = open?.querySelector('.cwb-sub');
    if (sub) { const t = sub.textContent.trim(); sub.click(); return t; }
    return null;
  });
  await page.waitForTimeout(300);
  const toast1 = await page.evaluate(() => [...document.querySelectorAll('.toast-wrap .toast .msg')].map((m) => m.textContent.trim()));
  const groups1 = await page.evaluate(() => [...document.querySelectorAll('.cwb-sel-group')].map((g) => ({
    title: g.querySelector('.cwb-code-gt')?.textContent.trim(),
    chips: [...g.querySelectorAll('.cwb-sel-tag')].map((c) => c.textContent.replace('×', '').trim()),
  })));
  await page.screenshot({ path: `${OUT}/cwb-merge-seltags.png` });

  // 6) narrow codes to FEN-24 only, pick another sub -> only FEN-24 group grows
  await clickByText('.cwb-code-tags .cwb-code-tag', 'FEN-23');
  await clickByText('.cwb-code-tags .cwb-code-tag', 'FEN-22');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const open = [...document.querySelectorAll('.cwb-cat-item')].find((it) => it.querySelector('.cwb-sub-row'));
    const subs = [...(open?.querySelectorAll('.cwb-sub') ?? [])];
    const sub = subs[1] ?? subs[0];
    if (sub) sub.click();
  });
  await page.waitForTimeout(300);
  const groups2 = await page.evaluate(() => [...document.querySelectorAll('.cwb-sel-group')].map((g) => ({
    title: g.querySelector('.cwb-code-gt')?.textContent.trim(),
    chips: [...g.querySelectorAll('.cwb-sel-tag')].map((c) => c.textContent.replace('×', '').trim()),
  })));
  const subOn = await page.evaluate(() => [...document.querySelectorAll('.cwb-cat-item')].find((it) => it.querySelector('.cwb-sub-row'))?.querySelectorAll('.cwb-sub.on').length);

  // 7) quick clear one chip
  await page.evaluate(() => document.querySelector('.cwb-sel-tag .cwb-tag-x')?.click());
  await page.waitForTimeout(200);
  const groups3 = await page.evaluate(() => [...document.querySelectorAll('.cwb-sel-group')].map((g) => ({
    title: g.querySelector('.cwb-code-gt')?.textContent.trim(),
    chips: [...g.querySelectorAll('.cwb-sel-tag')].map((c) => c.textContent.replace('×', '').trim()),
  })));
  await page.screenshot({ path: `${OUT}/cwb-merge-seltags-cleared.png` });

  console.log(JSON.stringify({ mods, afterNavTag, spyKb, acc1, acc2, subClicked, toast1, groups1, groups2, subOn, groups3, errors }, null, 2));
  await browser.close();
})();

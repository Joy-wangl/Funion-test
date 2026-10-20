/* 诊断：发起待办-最迟处理时间弹层可点性（层级/裁剪/遮挡） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 2000, height: 1130 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务')?.click());
  await page.waitForTimeout(1200);
  const dbg = await page.evaluate(() => ({
    nav: [...document.querySelectorAll('.qc-nav-text')].map((e) => e.textContent.trim()).slice(0, 12),
    newBtn: !!document.querySelector('.qc-todo-new'),
    title: document.querySelector('.qc-center-page h2, .qc-center-page .qc-page-title')?.textContent?.trim() ?? document.querySelector('.qc-center-page')?.innerText.slice(0, 40),
  }));
  console.log('dbg', JSON.stringify(dbg));
  const opened = await page.evaluate(() => {
    const b = document.querySelector('.qc-todo-new') ?? [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes('发起待办'));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  });
  await page.waitForSelector('.qc-todo-create', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.click('.qc-todo-create .qc-tc-dlbox .qc-tc-pickbox');
  await page.waitForTimeout(500);
  let has = await page.evaluate(() => !!document.querySelector('.qc-todo-create .qc-date-pop'));
  if (!has) {
    await page.click('.qc-todo-create .qc-tc-dlbox .qc-tc-pickbox');
    await page.waitForTimeout(500);
    has = await page.evaluate(() => !!document.querySelector('.qc-todo-create .qc-date-pop'));
  }
  console.log('popOpen=' + has);
  if (!has) { await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-dlpop-probe.png' }); await browser.close(); process.exit(2); }
  const info = await page.evaluate(() => {
    const pop = document.querySelector('.qc-todo-create .qc-date-pop');
    const body = document.querySelector('.qc-todo-create .drawer-body') ?? pop.closest('.drawer').children[1];
    const pr = pop.getBoundingClientRect();
    const br = body.getBoundingClientRect();
    const cs = getComputedStyle(body);
    const day = [...pop.querySelectorAll('.qc-cal-day')].find((b) => !b.disabled && b.textContent.trim() === '20') ?? [...pop.querySelectorAll('.qc-cal-day')].find((b) => !b.disabled);
    const dr = day.getBoundingClientRect();
    const atDay = document.elementFromPoint(dr.x + dr.width / 2, dr.y + dr.height / 2);
    const tm = pop.querySelector('.qc-tc-tm');
    const tmr = tm.getBoundingClientRect();
    const tcs = getComputedStyle(tm);
    const hourBtn = [...tm.querySelectorAll('.col')[0].children].find((b) => b.textContent.trim() === '05') ?? tm.querySelectorAll('.col')[0].children[5];
    const hr = hourBtn.getBoundingClientRect();
    const atHour = document.elementFromPoint(hr.x + hr.width / 2, hr.y + hr.height / 2);
    return {
      opened: true,
      popRect: { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height), bottom: Math.round(pr.bottom) },
      bodyRect: { y: Math.round(br.y), bottom: Math.round(br.bottom) },
      bodyOverflow: cs.overflowY,
      bodyScroll: { sh: body.scrollHeight, ch: body.clientHeight, st: body.scrollTop },
      popZ: getComputedStyle(pop).zIndex,
      popPos: getComputedStyle(pop).position,
      clippedBottom: Math.round(pr.bottom - br.bottom),
      clippedTop: Math.round(br.y - pr.y),
      dayRect: { y: Math.round(dr.y), bottom: Math.round(dr.bottom) },
      atDay: atDay ? `${atDay.tagName}.${atDay.className}` : null,
      dayIsBtn: atDay === day || day.contains(atDay),
      tmRect: { x: Math.round(tmr.x), y: Math.round(tmr.y), w: Math.round(tmr.width), h: Math.round(tmr.height) },
      tmOverflow: tcs.overflowY, tmPos: tcs.position, tmBg: tcs.background.slice(0, 40),
      hourRect: { y: Math.round(hr.y), bottom: Math.round(hr.bottom) },
      atHour: atHour ? `${atHour.tagName}.${atHour.className}` : null,
      hourIsBtn: atHour === hourBtn || hourBtn.contains(atHour),
      popParentChain: (() => { let e = pop, out = []; while (e && out.length < 6) { const s = getComputedStyle(e); out.push(`${e.tagName}.${(e.className || '').toString().slice(0, 24)}|ov=${s.overflowY}|z=${s.zIndex}|pos=${s.position}|tf=${s.transform !== 'none'}`); e = e.parentElement; } return out; })(),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  /* 实际点击：日 20 / 时 05 / 分 45（列内滚动后） */
  const clickRes = {};
  await page.evaluate(() => { const d = [...document.querySelectorAll('.qc-todo-create .qc-cal-day')].find((b) => !b.disabled && b.textContent.trim() === '20'); d.click(); });
  await page.waitForTimeout(200);
  clickRes.afterDay = await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-dlbox .qc-tc-pickbox span').textContent.trim());
  await page.evaluate(() => { const c = document.querySelectorAll('.qc-todo-create .qc-tc-tm .col')[0]; const b = [...c.children].find((x) => x.textContent.trim() === '05'); b.click(); });
  await page.waitForTimeout(200);
  clickRes.afterHour = await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-dlbox .qc-tc-pickbox span').textContent.trim());
  /* 真实鼠标点击（不滚动）：当前可见的分 45（先把分列滚到 45 可见） */
  await page.evaluate(() => {
    const c = document.querySelectorAll('.qc-todo-create .qc-tc-tm .col')[1];
    const b = [...c.children].find((x) => x.textContent.trim() === '45');
    b.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(250);
  const minBtn = await page.evaluate(() => {
    const c = document.querySelectorAll('.qc-todo-create .qc-tc-tm .col')[1];
    const b = [...c.children].find((x) => x.textContent.trim() === '45');
    const r = b.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, inView: r.y > 0 && r.bottom < innerHeight, at: at ? `${at.tagName}.${at.className}` : null, isBtn: at === b };
  });
  if (minBtn.inView && minBtn.isBtn) { await page.mouse.click(minBtn.x, minBtn.y); await page.waitForTimeout(250); }
  clickRes.minProbe = minBtn;
  clickRes.afterMin = await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-dlbox .qc-tc-pickbox span').textContent.trim());
  /* 真实鼠标点击日与时 */
  const dayPt = await page.evaluate(() => {
    const d = [...document.querySelectorAll('.qc-todo-create .qc-cal-day')].find((b) => !b.disabled && b.textContent.trim() === '21');
    const r = d.getBoundingClientRect();
    const at = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, isBtn: at === d };
  });
  if (dayPt.isBtn) { await page.mouse.click(dayPt.x, dayPt.y); await page.waitForTimeout(250); }
  clickRes.dayRealClick = dayPt;
  clickRes.afterDayReal = await page.evaluate(() => document.querySelector('.qc-todo-create .qc-tc-dlbox .qc-tc-pickbox span').textContent.trim());
  console.log(JSON.stringify(clickRes, null, 1));
  await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-dlpop-probe.png' });
  console.log('errs', JSON.stringify(errs.slice(0, 3)));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });

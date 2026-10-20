/* 验证：待办生命周期六条需求（撤销/重新提交回填/转交/驳回/处理流程节点/转交与驳回详情样式） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'D:/PM.funion/screenshots';
const r = {};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const say = (s) => { r.last = s; console.error('STEP ' + s); };
  const pill = async (label) => {
    await page.evaluate((t) => [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.includes(t)).click(), label);
    await page.waitForTimeout(250);
  };
  const act = async (label) => {
    await page.locator('.qc-todo-card .td-acts button', { hasText: label }).first().click();
    await page.waitForTimeout(250);
  };

  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务').click());
  await page.waitForSelector('.qc-todo-page');

  /* ---- 需求5/6：多人钻取 转交/驳回 详情样式 ---- */
  say('multi-drill');
  await pill('我发起');
  await page.locator('.qc-todo-card').nth(2).click({ position: { x: 300, y: 24 } });
  await page.waitForSelector('.qc-todo-handlers');
  await page.waitForTimeout(250);
  r.cnt = (await page.locator('.qh-cnt').textContent()).trim();

  await page.locator('.qh-card', { hasText: '鲁梦男' }).click();
  await page.waitForTimeout(250);
  r.transfer = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail');
    const labs = [...d.querySelectorAll('.qd-lab')];
    const vals = [...d.querySelectorAll('.qd-val')];
    return {
      chip: d.querySelector('.qd-st')?.textContent.trim() + '/' + d.querySelector('.qd-st')?.className,
      title: d.querySelector('.qd-title')?.textContent.trim().replace(/\s+/g, ' '),
      sender: d.querySelector('.qd-sender b')?.textContent.trim(),
      rows: labs.map((l, i) => l.textContent.trim() + '=' + (vals[i]?.textContent.trim() ?? '')),
      tabs: [...d.querySelectorAll('.qd-tabs button')].map((b) => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')),
      atts: d.querySelectorAll('.qd-att').length,
      foot: d.querySelectorAll('.qd-foot button').length,
    };
  });
  await page.click('.qc-todo-detail .qd-tabs button:has-text("处理流程")');
  await page.waitForTimeout(250);
  r.transferFlow = await page.evaluate(() => [...document.querySelectorAll('.qf-node')].map((n) => n.className.replace('qf-node ', '') + '|' + n.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)));
  await page.screenshot({ path: `${OUT}/todo-transfer-detail.png` });

  await page.locator('.qh-card', { hasText: '文杰' }).click();
  await page.waitForTimeout(250);
  r.reject = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-detail');
    const labs = [...d.querySelectorAll('.qd-lab')];
    const vals = [...d.querySelectorAll('.qd-val')];
    return {
      chip: d.querySelector('.qd-st')?.textContent.trim() + '/' + d.querySelector('.qd-st')?.className,
      sender: d.querySelector('.qd-sender b')?.textContent.trim(),
      rows: labs.map((l, i) => l.textContent.trim() + '=' + (vals[i]?.textContent.trim() ?? '')),
      tabs: [...d.querySelectorAll('.qd-tabs button')].map((b) => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')),
      reason: d.querySelector('.qd-text')?.textContent.trim(),
      foot: d.querySelectorAll('.qd-foot button').length,
    };
  });
  await page.screenshot({ path: `${OUT}/todo-reject-detail.png` });
  await page.click('.qc-todo-detail .qd-close');
  await page.waitForTimeout(250);

  /* ---- 需求4：单人详情处理流程时间轴（已处理） ---- */
  say('done-flow');
  await page.locator('.qc-todo-card').nth(1).click({ position: { x: 300, y: 24 } });
  await page.waitForSelector('.qc-todo-detail');
  await page.click('.qc-todo-detail .qd-tabs button:has-text("处理流程")');
  await page.waitForTimeout(250);
  r.doneFlow = await page.evaluate(() => [...document.querySelectorAll('.qf-node')].map((n) => n.className.replace('qf-node ', '') + '|' + n.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)));
  await page.screenshot({ path: `${OUT}/todo-flow-done.png` });
  await page.click('.qc-todo-detail .qd-close');
  await page.waitForTimeout(250);

  /* ---- 需求1：撤销（二次确认） ---- */
  say('revoke');
  await act('撤销');
  r.revokeModal = await page.locator('.modal').count();
  r.revokeText = await page.locator('.modal-body').first().textContent();
  await page.screenshot({ path: `${OUT}/todo-revoke-confirm.png` });
  await page.click('.modal-foot button:has-text("确认撤销")');
  await page.waitForTimeout(300);
  r.afterRevoke = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.qc-todo-card')].find((x) => x.textContent.includes('已撤销'));
    return c ? { chip: c.querySelector('.td-st')?.textContent.trim(), acts: [...c.querySelectorAll('.td-acts button')].map((b) => b.textContent.trim()) } : null;
  });
  await page.screenshot({ path: `${OUT}/todo-revoked.png` });

  /* ---- 需求2：重新提交回填 ---- */
  say('resubmit');
  await act('重新提交');
  await page.waitForSelector('.drawer.qc-todo-create');
  await page.waitForTimeout(250);
  r.prefill = await page.evaluate(() => {
    const d = document.querySelector('.drawer.qc-todo-create');
    return {
      title: d.querySelector('input.sg-input')?.value,
      body: d.querySelector('textarea')?.value.slice(0, 20),
      prioOn: d.querySelector('.qc-tc-prio button.on')?.textContent.trim(),
      files: d.querySelectorAll('.qc-tc-file').length,
      senders: d.querySelectorAll('.qc-tc-ava').length,
      dl: d.querySelector('.qc-tc-val')?.textContent.trim(),
      canSubmit: !d.querySelector('.drawer-foot button.primary')?.disabled,
    };
  });
  await page.screenshot({ path: `${OUT}/todo-resubmit-prefill.png` });
  await page.click('.drawer-foot button:has-text("发起")');
  await page.waitForTimeout(300);
  r.afterResubmit = await page.evaluate(() => {
    const c = [...document.querySelectorAll('.qc-todo-card')].find((x) => x.querySelector('.td-st')?.textContent.trim() === '处理中');
    return c ? { chip: c.querySelector('.td-st')?.textContent.trim(), acts: [...c.querySelectorAll('.td-acts button')].map((b) => b.textContent.trim()), bucket: '我发起' } : null;
  });

  /* ---- 需求3：接收人转交 ---- */
  say('transfer-pick');
  await pill('待处理');
  r.pendingBefore = await page.locator('.qc-todo-card').count();
  await act('转交');
  await page.waitForSelector('.member-transfer');
  await page.fill('.member-transfer-left input.input', '张三');
  await page.waitForTimeout(250);
  await page.locator('.member-transfer-left .mtr-row').first().click();
  await page.waitForTimeout(200);
  r.transferPick = (await page.locator('.mtr-head').last().textContent()).trim();
  await page.screenshot({ path: `${OUT}/todo-transfer-pick.png` });
  await page.click('.modal-foot button:has-text("确定")');
  await page.waitForTimeout(300);
  r.pendingAfterTransfer = await page.locator('.qc-todo-card').count();

  await pill('已处理');
  r.doneBucket = await page.evaluate(() => [...document.querySelectorAll('.qc-todo-card')].map((c) => c.querySelector('.td-st')?.textContent.trim()));
  await page.screenshot({ path: `${OUT}/todo-transferred-done.png` });

  /* ---- 需求3：接收人驳回（空原因拦截 → 填原因提交） ---- */
  say('reject');
  await pill('待处理');
  await act('驳回');
  await page.waitForSelector('.modal');
  await page.screenshot({ path: `${OUT}/todo-reject-modal.png` });
  await page.click('.modal-foot button:has-text("确认驳回")');
  await page.waitForTimeout(250);
  r.rejectEmptyBlocked = await page.locator('.modal').count();
  await page.fill('.modal textarea', '该问题不在本部门职责范围');
  await page.click('.modal-foot button:has-text("确认驳回")');
  await page.waitForTimeout(300);
  r.pendingAfterReject = await page.locator('.qc-todo-card').count();
  r.rejectCard = await page.evaluate(() => {
    const c = document.querySelector('.qc-todo-card');
    return c ? { chip: c.querySelector('.td-st')?.textContent.trim(), acts: [...c.querySelectorAll('.td-acts button')].map((b) => b.textContent.trim()) } : null;
  });
  await page.screenshot({ path: `${OUT}/todo-rejected.png` });

  r.errors = errors.slice(0, 6);
  fs.writeFileSync('D:/PM.funion/scripts/tmp-todo-life.json', JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch((e) => { console.error('FAIL at step:', r.last, '|', e.message.split('\n')[0]); console.log(JSON.stringify(r, null, 2)); process.exit(1); });

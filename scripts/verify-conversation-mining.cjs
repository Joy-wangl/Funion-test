const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const assert = require('node:assert/strict');
const OUT = 'D:/PM.funion/screenshots';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.clock.setFixedTime(new Date('2026-09-25T04:00:00Z'));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
    await page.locator('.top-tabs-more').waitFor({ timeout: 90000 });
    await page.locator('.top-tabs-more').click();
    await page.locator('.top-tabs-pop-row').filter({ has: page.getByText('知识库', { exact: true }) }).click();
    const nav = (name) => page.locator('.kb-nav-item').filter({ has: page.getByText(name, { exact: true }) });
    for (const name of ['商品知识库 V2', '场景配置', '会话挖掘', '智能回复路由']) assert.equal(await nav(name).count(), 1, `nav ${name}`);
    await nav('会话挖掘').click();
    const root = page.locator('.cm-wrap');
    await root.waitFor();
    assert.equal(await nav('会话挖掘').evaluate((el) => el.classList.contains('active')), true, 'mining nav active');
    assert.equal(await root.getByRole('heading', { name: '会话挖掘', exact: true }).count(), 1);
    const text = await root.innerText();
    assert.doesNotMatch(text, /\bKN\d+\b|\bFB\d+\b|SESSION-|MSG-|PREVIEW-|Trace\s*ID/i, 'no technical identifiers');
    assert.deepEqual(await root.locator('.cm-metrics b').allTextContents(), ['4', '71', '44', '1'], 'metrics aggregate pending clusters');
    assert.equal(await root.locator('.cm-table tbody tr').count(), 5);
    for (const label of ['代表问法', '发生次数', '涉及会话', '最近发生', '当前处理', '建议补充', '状态', '操作']) {
      assert.equal(await root.getByRole('columnheader', { name: label, exact: true }).count(), 1, `column ${label}`);
    }
    await page.screenshot({ path: `${OUT}/conversation-mining.png` });

    const rowOf = (question) => root.locator('.cm-table tbody tr').filter({ hasText: question });
    await root.locator('.cm-kw').fill('运费');
    assert.equal(await root.locator('.cm-table tbody tr').count(), 1, 'keyword filters clusters');
    await root.locator('.cm-kw').fill('');
    assert.equal(await root.locator('.cm-table tbody tr').count(), 5);
    await root.locator('.cm-seg button').filter({ hasText: '已补充' }).click();
    assert.equal(await root.locator('.cm-table tbody tr').count(), 1, 'status segment filters clusters');
    await root.locator('.cm-seg button').filter({ hasText: '全部' }).click();
    assert.equal(await root.locator('.cm-table tbody tr').count(), 5);

    // 一键新增场景：预填归属/细分名/问法/AI 提示语，保存后落场景配置并流转状态
    const scRow = rowOf('尺码不合适退换货运费谁出');
    await scRow.getByRole('link', { name: '一键新增场景', exact: true }).click();
    const editor = page.locator('.sc-drawer');
    await editor.waitFor();
    assert.equal(await editor.locator('.sc-d-head > b').innerText(), '新建场景');
    assert.equal(await editor.locator('.sc-base-grid .bselect-trigger').innerText(), '服务政策咨询', 'scene type prefilled');
    assert.equal(await editor.getByPlaceholder('如：物流到哪里了', { exact: true }).inputValue(), '退换运费咨询', 'scene name prefilled');
    assert.deepEqual(await editor.locator('.qa-simrow .qa-simbox').allInnerTexts(), ['尺码不合适退换货运费谁出', '退货要运费吗', '换货有运费险吗'], 'mined questions prefilled as prompts');
    assert.equal(await editor.locator('.sc-ai-prompt').inputValue(), '先说明退换时效与条件，再区分质量问题与个人原因的运费承担方，有运费险时补充理赔路径', 'AI prompt prefilled');
    await page.screenshot({ path: `${OUT}/conversation-mining-scene-prefill.png` });
    await editor.getByRole('button', { name: '保存', exact: true }).click();
    await editor.waitFor({ state: 'detached' });
    assert.match(await page.locator('.toast').last().innerText(), /场景「退换运费咨询」已新建/);
    assert.equal(await scRow.locator('.cm-state').innerText(), '已补充', 'cluster flips to filled after scene save');
    assert.equal(await scRow.locator('.cm-filled').innerText(), '已补充至场景配置 · 服务政策咨询');
    assert.equal(await scRow.getByRole('link', { name: '一键新增场景', exact: true }).count(), 0, 'filled cluster loses add actions');
    assert.deepEqual(await root.locator('.cm-metrics b').allTextContents(), ['3', '39', '23', '2'], 'metrics follow status flow');

    // 一键新增知识：预填归属/类型/问法/关键词/内容，校验拦截与落库
    const knRow = rowOf('脚宽要买大一码吗');
    await knRow.getByRole('link', { name: '一键新增知识', exact: true }).click();
    const modal = page.locator('.cm-kn-modal');
    await modal.waitFor();
    assert.equal(await modal.locator('.kb-modal-head > b').innerText(), '新增商品知识');
    assert.equal(await modal.locator('.bselect-trigger').first().innerText(), 'FEN-24 · 儿童轻便运动鞋系列', 'series code prefilled');
    assert.equal(await modal.locator('.bselect-trigger').nth(1).innerText(), '尺码选购', 'knowledge type prefilled');
    assert.deepEqual(await modal.locator('.cm-tags').first().locator('em').evaluateAll((els) => els.map((el) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim())), ['脚宽要买大一码吗', '脚偏宽选什么码', '有偏宽的尺码吗'], 'questions prefilled');
    assert.match(await modal.locator('.qa-textarea').inputValue(), /标准宽度/, 'knowledge content prefilled');
    await page.screenshot({ path: `${OUT}/conversation-mining-knowledge-prefill.png` });
    await modal.locator('.qa-textarea').fill('');
    await modal.getByRole('button', { name: '保存', exact: true }).click();
    assert.match(await page.locator('.toast').last().innerText(), /请填写知识内容/, 'empty content is blocked');
    await modal.locator('.qa-textarea').fill('该款鞋楦为标准宽度，脚型偏宽或需穿厚袜时建议加大一码。');
    await modal.getByRole('button', { name: '保存', exact: true }).click();
    await modal.waitFor({ state: 'detached' });
    assert.match(await page.locator('.toast').last().innerText(), /已新增商品知识「尺码选购」/);
    assert.equal(await knRow.locator('.cm-filled').innerText(), '已补充至商品知识库 · FEN-24');
    const saved = await page.evaluate(async () => {
      const { kbV2Products } = await import('/src/pages/knowledge/goodsKbV2Data.ts');
      const code = kbV2Products.find((p) => p.codes.some((c) => c.code === 'FEN-24'))?.codes.find((c) => c.code === 'FEN-24');
      const entry = code?.knowledge.find((k) => k.questions.includes('脚宽要买大一码吗'));
      return entry ? { type: entry.type, text: entry.text, keywords: entry.keywords } : null;
    });
    assert.ok(saved, 'mined knowledge lands in the product knowledge base seed');
    assert.equal(saved.type, '尺码选购');
    assert.deepEqual(saved.keywords, ['脚宽', '大一码']);

    // 补充后的聚类在场景配置/商品知识库可见（复用既有页面，不新建详情）
    await nav('场景配置').click();
    await page.locator('.sc2-wrap').waitFor();
    await page.locator('.sc2-type-card').filter({ hasText: '服务政策咨询' }).click();
    assert.equal(await page.locator('.sc2-sub-card').filter({ hasText: '退换运费咨询' }).count(), 1, 'new scene visible in scene config');
    await nav('会话挖掘').click();
    await root.waitFor();
    assert.equal(await root.locator('.cm-table tbody tr').count(), 5, 'status flow survives view switch');
    assert.deepEqual(errors, [], 'browser console errors');
    console.log('PASS: conversation mining list, filters, prefilled one-click scene/knowledge creation, status flow and cross-page visibility');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

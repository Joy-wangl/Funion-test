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
    const headerStyle = (el) => {
      const style = getComputedStyle(el);
      return Object.fromEntries(['fontFamily', 'fontSize', 'fontWeight', 'color', 'padding', 'backgroundColor', 'borderBottom', 'borderRadius', 'textAlign'].map((key) => [key, style[key]]));
    };
    const standardFirstHeader = await page.locator('.kb-table thead th').first().evaluate(headerStyle);
    const standardLastHeader = await page.locator('.kb-table thead th').last().evaluate(headerStyle);
    await page.locator('.kb-nav-item').filter({ hasText: '智能回复路由' }).click();
    const root = page.locator('.rr-page');
    const businessText = async (scope, label) => {
      const text = await scope.innerText();
      assert.doesNotMatch(text, /Trace\s*ID|\bID\b|PREVIEW-|SESSION-|MSG-|\bKN\d+\b|\bFB\d+\b|KNOWLEDGE_REPLY_SENT|SCENE_REPLY_SENT|SCENE_CONDITION_MISMATCH|SEND_FAILED|MODEL_TIMEOUT|GENERATION_IN_PROGRESS|HUMAN_TAKEOVER|(?:知识|类型|场景|查询|消息|会话|候选)\s*ID/i, `${label}: no visible technical identifiers or reason codes`);
      assert.doesNotMatch(text, /路由时间线|候选对比|上下文快照|准入|回执|命中结果|最终处置|链路耗时|待排查|查看链路|静态预览|接入记录|待确认/, `${label}: use business-facing labels`);
      return text;
    };
    await root.locator('.rr-table tbody tr').first().waitFor();
    assert.equal(await root.getByRole('heading', { name: '智能回复路由', exact: true }).count(), 1);
    assert.deepEqual(await root.locator('thead th').first().evaluate(headerStyle), standardFirstHeader, 'first header reuses existing knowledge-table styling');
    assert.deepEqual(await root.locator('thead th').last().evaluate(headerStyle), standardLastHeader, 'last header reuses existing knowledge-table styling');
    assert.equal(await root.locator('.rr-table tbody tr').count(), 7);
    assert.deepEqual(await root.locator('.rr-metrics strong').allTextContents(), ['7', '2', '1', '4', '3']);
    for (const label of ['匹配结果', '处理结果', '处理用时']) assert.equal(await root.getByRole('columnheader', { name: label, exact: true }).count(), 1);
    assert.equal(await root.locator('.rr-head-actions, .rr-source, .rr-head .rr-preview').count(), 0, 'header has no example notice or record-source switch');
    await businessText(root, 'monitor, all seven rows');
    await page.screenshot({ path: `${OUT}/reply-route-monitor.png` });

    for (const [width, height] of [[1920, 945], [1280, 900], [1280, 600]]) {
      await page.setViewportSize({ width, height });
      const content = root.locator('.rr-body');
      await content.hover({ position: { x: 8, y: 8 } });
      await page.mouse.wheel(0, -4000);
      await page.waitForFunction(() => document.querySelector('.rr-body').scrollTop === 0);
      assert.equal(await root.locator('.rr-table-scroll').evaluate((el) => el.scrollHeight <= el.clientHeight + 1), true, 'table must not have a nested vertical scroll area');
      const overflow = await content.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
      if (height === 600) assert.equal(overflow, true, 'short-height monitor must exercise real vertical scrolling');
      await root.locator('.rr-metrics').hover();
      await page.mouse.wheel(0, 420);
      if (overflow) await page.waitForFunction(() => document.querySelector('.rr-body').scrollTop > 0);
      else assert.equal(await content.evaluate((el) => el.scrollTop), 0, 'all seven shorter rows fit without forced scrolling');
      assert.equal(await root.locator('.rr-table-scroll').evaluate((el) => el.scrollTop), 0, 'scrolling statistics moves the page, not the table');
      const point = await root.locator('.rr-table-scroll').evaluate((el) => {
        const table = el.getBoundingClientRect();
        const body = document.querySelector('.rr-body').getBoundingClientRect();
        const top = Math.max(table.top, body.top);
        const bottom = Math.min(table.bottom, body.bottom);
        return { x: (Math.max(table.left, body.left) + Math.min(table.right, body.right)) / 2, y: (top + bottom) / 2 };
      });
      await page.mouse.move(point.x, point.y);
      assert.equal(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.rr-table-scroll'), point), true, 'wheel pointer is over table content');
      await page.mouse.wheel(0, 4000);
      if (overflow) await page.waitForFunction(() => {
        const el = document.querySelector('.rr-body');
        return el.scrollTop > 0 && Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 1;
      });
      else assert.equal(await content.evaluate((el) => el.scrollTop), 0);
      const reachable = [root.locator('tbody tr').last(), root.locator('.rr-pagination')];
      if (!overflow) reachable.unshift(root.locator('tbody tr').first());
      for (const target of reachable) {
        assert.equal(await target.evaluate((el) => {
          const box = el.getBoundingClientRect();
          const body = document.querySelector('.rr-body').getBoundingClientRect();
          return box.top >= body.top && box.bottom <= body.bottom + 1 && box.top >= 0 && box.bottom <= innerHeight + 1;
        }), true, `${width}x${height}: ${overflow ? 'last row and pagination are reachable by wheel' : 'first/last rows and pagination fit without scrolling'}`);
      }
      await page.screenshot({ path: `${OUT}/reply-route-scroll-${width}x${height}.png` });
      await page.mouse.wheel(0, -4000);
      await page.waitForFunction(() => document.querySelector('.rr-body').scrollTop === 0);
      assert.equal(await root.locator('.rr-query').evaluate((el) => el.getBoundingClientRect().top >= document.querySelector('.rr-body').getBoundingClientRect().top), true, 'reverse wheel returns to filters');
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    console.log('PASS: stock knowledge-table headers and overflow-aware wheel scrolling at 1920, 1280 and short-height viewports');

    const row = (id) => root.locator(`[data-trace="${id}"]`);
    const drawer = page.locator('.rr-drawer');
    const records = {
      'PREVIEW-001': { message: 'MSG-001', question: '鞋子码数准吗', time: '10:20:00', hit: '商品知识', match: '商品知识 · 尺码选购', outcome: 'AI 已回复', candidates: ['已采用'], reason: [/尺码/, /知识/, /匹配/, /发送成功|成功发送|已发送/] },
      'PREVIEW-002': { message: 'MSG-003', question: '有实体店吗', time: '10:21:00', hit: '场景', match: '场景 · 店铺地址咨询', outcome: 'AI 已回复', candidates: ['已采用'], reason: [/店铺地址/, /场景/, /匹配/, /发送成功|成功发送|已发送/] },
      'PREVIEW-003': { message: 'MSG-005', question: '能开发票吗', time: '10:22:00', hit: '未匹配', match: '未匹配', outcome: '转人工', candidates: ['未采用', '默认处理'], reason: [/发票/, /售后/, /已签收/, /未下单/, /转.*人工|人工.*接待/] },
      'PREVIEW-004': { message: 'MSG-008', question: '有实体店吗', time: '10:24:00', hit: '场景', match: '场景 · 店铺地址咨询', outcome: '发送失败', candidates: ['已采用'], reason: [/已生成|并生成回复|生成完成|生成了/, /平台/, /发送.*失败|未.*发送成功/] },
      'PREVIEW-005': { message: 'MSG-010', question: '那我想问一下怎么选码', time: '10:25:00', hit: '未进行匹配', match: '未进行匹配', outcome: '客服已接管', candidates: [], reason: [/李四已接管|客服.*接管/, /(?:不再|未|不).*匹配/, /(?:不再|未|不).*生成/] },
      'PREVIEW-006': { message: 'MSG-012', question: '有实体店吗', time: '10:26:00', hit: '场景', match: '场景 · 店铺地址咨询', outcome: '生成失败', candidates: ['已采用'], reason: [/30\s*秒/, /(?:未|没有|没能).*生成/, /回复/] },
      'PREVIEW-007': { message: 'MSG-013', question: '请问有实体店吗', time: '10:27:00', hit: '场景', match: '场景 · 店铺地址咨询', outcome: '处理中', candidates: ['已采用'], reason: [/店铺地址/, /匹配/, /AI.*(?:正在|还在).*生成/, /(?:尚未|还未|还没有).*发送/] },
    };
    const replyTitles = {
      'AI 已回复': '回复已发送给买家', '发送失败': '回复已生成，但未发送成功',
      '生成失败': '未生成回复内容', '处理中': '正在生成回复，尚未发送',
      '转人工': '已转人工接待', '客服已接管': '由客服继续接待',
    };
    const traceRecord = async (id) => {
      const expected = records[id];
      assert.ok(expected, `known record ${id}`);
      assert.equal(await drawer.getAttribute('aria-label'), '回复处理详情');
      assert.equal(await drawer.locator('section.rr-trace').getAttribute('data-record-id'), id, 'detail retains its programmatic record association');
      assert.equal(await drawer.getByRole('heading', { name: '回复详情', exact: true }).count(), 1);
      assert.equal(await drawer.getByRole('button', { name: '关闭回复详情', exact: true }).count(), 1);
      assert.equal(await drawer.locator('.rr-trace-summary .rr-trace-section-title').innerText(), expected.question, `${id}: corresponding buyer question`);
      assert.deepEqual(await drawer.locator('.rr-trace-summary-status .rr-trace-badge').allInnerTexts(), [expected.outcome, expected.match], `${id}: corresponding business status and named match result`);
      const reason = await drawer.locator('.rr-trace-summary .rr-trace-reason .rr-trace-text').innerText();
      for (const feature of expected.reason) assert.match(reason, feature, `${id}: business reason must explain the specific result`);
      assert.equal(await drawer.locator('.rr-trace-reply-title').innerText(), replyTitles[expected.outcome]);
      if (id !== 'PREVIEW-007') assert.match(await drawer.locator('.rr-trace-summary-top').innerText(), /\d+(?:\.\d+)?\s*(?:毫秒|秒)/, `${id}: total processing time uses Chinese units`);
      await businessText(drawer, `${id} detail`);
    };
    const contextRecord = async (id) => {
      const panel = drawer.locator('[role="tabpanel"]:visible');
      const text = await panel.innerText();
      assert.match(text, new RegExp(`2026-09-25\\s+${records[id].time}`), `${id}: original message time`);
      for (const feature of [/淘宝/, /童鞋旗舰店/, /FEN-24/, /售前/, /未下单/]) assert.match(text, feature, `${id}: business conversation context remains available`);
      if (id === 'PREVIEW-005') assert.match(text, /李四.*10:24:30|10:24:30.*李四/);
      await traceRecord(id);
    };
    const drawerLayout = async (label, requireOverflow = false) => {
      assert.deepEqual(page.viewportSize(), { width: 1280, height: 600 });
      assert.equal(await drawer.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const body = el.querySelector('.rr-trace-body');
        const bodyBox = body.getBoundingClientRect();
        const header = el.querySelector('.rr-trace-header').getBoundingClientRect();
        const close = el.querySelector('.rr-close').getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth + 1 && box.top >= 0 && box.bottom <= innerHeight + 1
          && el.scrollWidth <= el.clientWidth + 1 && body.scrollWidth <= body.clientWidth + 1
          && bodyBox.top >= box.top && bodyBox.bottom <= box.bottom + 1 && body.clientHeight > 0
          && header.top >= box.top && header.bottom <= box.bottom + 1
          && close.top >= box.top && close.bottom <= box.bottom + 1
          && Array.from(body.querySelectorAll('[role="tab"], [role="tabpanel"], .rr-trace-candidate, .rr-trace-evidence, .rr-trace-context, .rr-trace-snapshot, .rr-trace-reply')).filter((node) => node.getClientRects().length).every((node) => {
            const bounds = node.getBoundingClientRect();
            return bounds.left >= bodyBox.left - 1 && bounds.right <= bodyBox.right + 1 && node.scrollWidth <= node.clientWidth + 1;
          });
      }), true, `${label}: 1280x600 drawer, tabs and contents never overflow horizontally or escape the viewport`);
      const body = drawer.locator('.rr-trace-body');
      const distance = await body.evaluate((el) => el.scrollHeight + el.clientHeight);
      await body.hover({ position: { x: 8, y: 8 } });
      await page.mouse.wheel(0, -distance);
      await page.waitForFunction(() => document.querySelector('.rr-trace-body').scrollTop === 0);
      const overflow = await body.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
      if (requireOverflow) assert.equal(overflow, true, `${label}: exercise real short-height detail scrolling`);
      await page.mouse.wheel(0, distance);
      if (overflow) await page.waitForFunction(() => {
        const el = document.querySelector('.rr-trace-body');
        return el.scrollTop > 0 && Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 1;
      });
      else assert.equal(await body.evaluate((el) => el.scrollTop), 0);
      assert.equal(await body.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const last = el.lastElementChild.getBoundingClientRect();
        return last.bottom <= box.bottom + 1 && last.bottom > box.top;
      }), true, `${label}: final reply or historical config is reachable`);
      await page.mouse.wheel(0, -distance);
      await page.waitForFunction(() => document.querySelector('.rr-trace-body').scrollTop === 0);
      assert.equal(await drawer.locator('.rr-trace-tabs').evaluate((el) => {
        const box = el.getBoundingClientRect();
        return box.top >= 0 && box.bottom <= innerHeight + 1;
      }), true, `${label}: all three tabs remain reachable after reverse scrolling`);
    };
    for (const [id, expected] of Object.entries(records)) {
      assert.equal(await row(id).locator('td').nth(4).locator('.rr-cell > span').first().innerText(), expected.hit);
      assert.equal(await row(id).locator('td').nth(5).locator('.rr-state').innerText(), expected.outcome);
      if (id !== 'PREVIEW-007') assert.match(await row(id).locator('td').nth(6).innerText(), /\d+(?:\.\d+)?\s*(?:毫秒|秒)/);
    }
    const select = async (label, option) => {
      await root.locator('.kb-field').filter({ has: page.locator('label').filter({ hasText: new RegExp(`^${label}$`) }) }).locator('.bselect-trigger').click();
      await businessText(page.locator('.bselect-menu:visible'), `${label} filter options`);
      await page.locator('.bselect-menu .bselect-opt').getByText(option, { exact: true }).click();
    };
    await select('匹配结果', '未匹配');
    assert.equal(await root.locator('.rr-table tbody tr').count(), 7, 'filter must wait for query');
    await root.getByRole('button', { name: '查询', exact: true }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 1);
    await row('PREVIEW-003').getByRole('button', { name: '查看详情', exact: true }).click();
    assert.equal(await drawer.locator('.rr-trace-step').count(), 8);
    await traceRecord('PREVIEW-003');
    await drawer.getByRole('tab', { name: '匹配依据', exact: true }).click();
    assert.equal(await drawer.locator('.rr-trace-candidate').count(), 2);
    assert.match(await drawer.locator('.rr-trace-candidate').first().innerText(), /已签收/);
    assert.match(await drawer.locator('.rr-trace-candidate').first().innerText(), /未下单/);
    await businessText(drawer, 'invoice match evidence');
    await page.screenshot({ path: `${OUT}/reply-route-miss-evidence.png` });
    await drawer.getByRole('tab', { name: '当时会话信息', exact: true }).click();
    await contextRecord('PREVIEW-003');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.rr-drawer').count(), 0);
    assert.equal(await row('PREVIEW-003').getByRole('button', { name: '查看详情', exact: true }).evaluate((el) => el === document.activeElement), true);

    await root.getByRole('button', { name: '重置', exact: true }).click();
    await root.locator('#rr-keyword').fill('unknown-不存在');
    await root.getByRole('button', { name: '查询', exact: true }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 0);
    await root.getByRole('button', { name: '重置筛选', exact: true }).click();
    await root.locator('.rr-metrics button').filter({ hasText: '需要关注' }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 3);
    await root.locator('.rr-metrics button').filter({ hasText: '全部消息' }).click();
    await root.locator('.rr-size .bselect-trigger').click();
    await page.locator('.bselect-menu .bselect-opt').getByText('5 条 / 页', { exact: true }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 5);
    await root.getByRole('button', { name: '下一页', exact: true }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 2);
    await root.getByRole('button', { name: '上一页', exact: true }).click();
    await root.locator('.rr-size .bselect-trigger').click();
    await page.locator('.bselect-menu .bselect-opt').getByText('10 条 / 页', { exact: true }).click();

    // Source jumps unmount the monitor; exercise them only after the stateful monitor/chat checks.
    // Display labels change; the existing deferred-query and session filtering behavior must not.
    for (const [label, option, ids] of [
      ['匹配结果', '未进行匹配', ['PREVIEW-005']],
      ['AI 回复', '处理中', ['PREVIEW-007']],
      ['处理结果', '客服已接管', ['PREVIEW-005']],
      ['处理结果', 'AI 已回复', ['PREVIEW-002', 'PREVIEW-001']],
    ]) {
      await select(label, option);
      assert.equal(await root.locator('.rr-table tbody tr').count(), 7, `${label}: changes remain a draft until query`);
      await root.getByRole('button', { name: '查询', exact: true }).click();
      assert.deepEqual(await root.locator('.rr-table tbody tr').evaluateAll((els) => els.map((el) => el.dataset.trace)), ids);
      await businessText(root, `${label}: ${option}`);
      await root.getByRole('button', { name: '重置', exact: true }).click();
    }

    await page.setViewportSize({ width: 1280, height: 600 });
    const sourceKeys = { 尺码选购: 'knowledge:KN001', 店铺地址咨询: 'scene:FB01', 发票咨询: 'scene:FB04', 默认转人工: 'scene:FB12' };
    const historicalCandidates = new Map();
    for (const [id, expected] of Object.entries(records)) {
      await row(id).getByRole('button', { name: '查看详情', exact: true }).click();
      assert.deepEqual(await drawer.getByRole('tab').allInnerTexts(), ['处理过程', '匹配依据', '当时会话信息']);
      for (const tab of ['处理过程', '匹配依据', '当时会话信息']) {
        await drawer.getByRole('tab', { name: tab, exact: true }).click();
        assert.equal(await drawer.getByRole('tab', { name: tab, exact: true }).getAttribute('aria-selected'), 'true');
        assert.equal(await drawer.locator('[role="tabpanel"]:visible').count(), 1);
        await traceRecord(id);
        if (tab === '处理过程') {
          assert.equal(await drawer.locator('.rr-trace-step:visible').count(), 8);
          assert.equal(await drawer.locator('.rr-trace-step .rr-trace-duration:visible').count(), 0, 'per-step timings are no longer displayed');
          for (const heading of await drawer.locator('.rr-trace-step-heading').allInnerTexts()) assert.doesNotMatch(heading, /\d+(?:\.\d+)?\s*(?:毫秒|秒|ms\b|s\b)/, 'step headers must not reintroduce timing text');
          if (id === 'PREVIEW-005') assert.equal(await drawer.locator('.rr-trace-step-mark.rr-trace-state--skip').count(), 6);
          if (id === 'PREVIEW-007') {
            assert.equal(await drawer.locator('.rr-trace-step-mark.rr-trace-state--running').count(), 1);
            assert.equal(await drawer.locator('.rr-trace-step-mark.rr-trace-state--unknown').count(), 1);
          }
        } else if (tab === '匹配依据') {
          const candidates = drawer.locator('.rr-trace-candidate');
          assert.equal(await candidates.count(), expected.candidates.length);
          for (let index = 0; index < expected.candidates.length; index++) {
            const candidate = candidates.nth(index);
            assert.equal(await candidate.locator('.rr-trace-card-heading .rr-trace-badge').last().innerText(), expected.candidates[index]);
            assert.equal(await candidate.locator('.rr-trace-snapshot').getByRole('heading', { name: '当时的配置', exact: true }).count(), 1);
            const evidence = candidate.locator('.rr-trace-evidence-grid');
            assert.ok(await evidence.count() > 0, `${id}: preserve match evidence`);
            for (let item = 0; item < await evidence.count(); item++) {
              assert.deepEqual(await evidence.nth(item).locator('dt').allInnerTexts(), ['配置要求', '本次情况', '是否满足']);
              assert.match(await evidence.nth(item).locator('dd').last().innerText(), /^(?:满足|不满足|未判断)$/);
            }
            if (id === 'PREVIEW-003' && index === 0) {
              assert.equal(await candidate.locator('.rr-trace-evidence-grid dd').getByText('不满足', { exact: true }).count(), 2, 'invoice stage AND order status fail independently');
            }
            const name = await candidate.locator('.rr-trace-candidate-name').innerText();
            const key = sourceKeys[name];
            assert.ok(key, `${id}: known historical source`);
            assert.equal(await candidate.getByRole('button', { name: `查看当前配置：${name}`, exact: true }).getAttribute('data-source-key'), key);
            historicalCandidates.set(`${id}/${key}`, await candidate.innerText());
          }
          if (id === 'PREVIEW-005') assert.equal(await drawer.locator('[role="tabpanel"]:visible .rr-trace-empty').innerText(), '本次由人工接待，未进行知识或场景匹配。');
        } else await contextRecord(id);
        await businessText(drawer, `${id}: ${tab}`);
        await drawerLayout(`${id}: ${tab}`, tab === '处理过程');
        if (id === 'PREVIEW-007' && tab === '处理过程') {
          await drawer.locator('.rr-trace-reply-title').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${OUT}/reply-route-business-processing-1280x600.png` });
        }
        if (id === 'PREVIEW-007' && tab === '当时会话信息') await page.screenshot({ path: `${OUT}/reply-route-business-context-1280x600.png` });
      }
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 1600, height: 1000 });

    console.log('PASS: monitor, filters, pagination, seven business detail states, historical evidence and source buttons; 1280x600 drawer bounds and wheel reachability');
    const mask = page.locator('body > .rr-chat-mask');
    const chat = mask.locator('.rr-chat-modal');
    const chatBody = chat.locator('.chat-modal-body');
    const chatClose = chat.getByRole('button', { name: '关闭聊天记录', exact: true });
    const previousChat = chat.getByRole('button', { name: '‹ 上一个', exact: true });
    const nextChat = chat.getByRole('button', { name: '下一个 ›', exact: true });
    const focused = async (target, label) => {
      assert.equal(await target.evaluate((el) => el === document.activeElement), true, label);
    };
    const sessionMetadata = {
      'SESSION-01': { time: '10:20:00', count: 7 },
      'SESSION-02': { time: '10:24:00', count: 5 },
      'SESSION-03': { time: '10:26:00', count: 3 },
    };
    const selectedMessage = async (id) => {
      await chatBody.locator(`#rr-${id}.bubble-row.selected`).waitFor();
      assert.deepEqual(await chatBody.locator('.bubble-row.selected').evaluateAll((els) => els.map((el) => el.id)), [`rr-${id}`], 'exactly one selected message');
      const expected = id === 'MSG-004'
        ? { question: '我们是线上店铺，商品由仓库直接发出，您可以在店铺内选购。', time: '10:21:02' }
        : Object.values(records).find((record) => record.message === id);
      assert.ok(expected, `${id}: a known buyer question or delivered AI reply`);
      assert.equal(await chatBody.locator(`#rr-${id} .b-text`).innerText(), expected.question, 'selected message text, not just its technical association');
      assert.match(await chatBody.locator(`#rr-${id} .b-meta`).innerText(), new RegExp(expected.time));
      assert.equal(await chatBody.locator(`#rr-${id}`).evaluate((el) => {
        const body = el.closest('.chat-modal-body').getBoundingClientRect();
        const message = el.getBoundingClientRect();
        return message.top >= body.top - 1 && message.bottom <= body.bottom + 1;
      }), true, `${id} must be scrolled into the chat body`);
    };
    const chatState = async (session, buyer, agent, message, index, total) => {
      await chat.waitFor();
      assert.equal(await chat.count(), 1, 'only one chat modal');
      assert.equal(await root.locator('.rr-chat-modal').count(), 0, 'chat is teleported outside the monitor');
      assert.equal(await root.evaluate((el) => el.inert), true, 'monitor is inert while chat is open');
      assert.equal(await mask.evaluate((el) => el.inert), false, 'chat is interactive without a drawer');
      assert.equal(await chat.getAttribute('role'), 'dialog');
      assert.equal(await chat.getAttribute('aria-modal'), 'true');
      const metadata = chat.locator('.chat-modal-head .s-meta');
      assert.match(await metadata.filter({ hasText: '买家' }).innerText(), new RegExp(buyer));
      assert.match(await metadata.filter({ hasText: '客服' }).innerText(), new RegExp(agent));
      assert.equal(await chat.getAttribute('data-session-id'), session);
      assert.equal(await chat.locator('.chat-modal-head .s-id').count(), 0, 'session ID line is removed, not used as visible association evidence');
      const expected = sessionMetadata[session];
      assert.match(await metadata.filter({ hasText: '会话时间' }).innerText(), new RegExp(`2026-09-25\\s+${expected.time}`));
      assert.match(await metadata.filter({ hasText: '消息数' }).innerText(), new RegExp(`消息数\\s*${expected.count}\\s*条`));
      assert.equal(await chatBody.locator('.bubble-row').count(), expected.count);
      assert.match(await chat.locator('.chat-modal-head').innerText(), /童鞋旗舰店/);
      assert.equal(await chat.locator('.cm-idx').innerText(), `${index} / ${total}`);
      assert.equal(await previousChat.isDisabled(), index === 1, 'previous-session boundary');
      assert.equal(await nextChat.isDisabled(), index === total, 'next-session boundary');
      await selectedMessage(message);
      assert.ok(await chatBody.locator('.rr-message-route').count() > 0);
      for (const text of await chatBody.locator('.rr-message-route').allInnerTexts()) assert.match(text, /查看详情/);
      await businessText(chat, `${session} chat`);
    };
    const chatLayout = async (width) => {
      assert.equal(page.viewportSize().width, width);
      assert.equal(await chat.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const body = el.querySelector('.chat-modal-body');
        const footer = el.querySelector('.chat-modal-foot').getBoundingClientRect();
        return Math.abs(box.left + box.width / 2 - innerWidth / 2) <= 1
          && Math.abs(box.top + box.height / 2 - innerHeight / 2) <= 1
          && box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight
          && el.scrollWidth <= el.clientWidth + 1 && body.scrollWidth <= body.clientWidth + 1
          && footer.top >= box.top && footer.bottom <= box.bottom + 1;
      }), true, `${width}px chat must be centered, unclipped and without horizontal overflow`);
    };
    // Exercise actual Tab/Shift+Tab, including bubble/route buttons and disabled nav boundaries.
    const focusCycle = async (scope, label) => {
      const targets = scope.locator('button:not([disabled]):not([tabindex="-1"]):visible, [tabindex="0"]:visible');
      const count = await targets.count();
      assert.ok(count > 1, `${label}: focusable controls exist`);
      await focused(targets.first(), `${label}: initial focus`);
      await page.keyboard.press('Shift+Tab');
      await focused(targets.last(), `${label}: reverse wrap stays inside overlay`);
      await page.keyboard.press('Tab');
      await focused(targets.first(), `${label}: forward wrap stays inside overlay`);
      for (let i = 1; i < count; i++) {
        await page.keyboard.press('Tab');
        await focused(targets.nth(i), `${label}: Tab reaches control ${i + 1}/${count}`);
      }
      await page.keyboard.press('Tab');
      await focused(targets.first(), `${label}: full cycle returns to close button`);
    };
    const messageDrawer = async (message, selector, trace) => {
      const trigger = chatBody.locator(`#rr-${message} ${selector}`);
      await trigger.click();
      await drawer.waitFor();
      await traceRecord(trace);
      await businessText(chat, `${message}: chat retained beneath detail`);
      assert.equal(await chat.isVisible(), true, 'opening a drawer retains the chat');
      assert.equal(await mask.evaluate((el) => el.inert), true, 'underlying chat is inert');
      assert.equal(await root.evaluate((el) => el.inert), true, 'underlying monitor stays inert');
      assert.equal(await chat.getAttribute('aria-modal'), null, 'only the top drawer is aria-modal');
      assert.equal(await drawer.getAttribute('aria-modal'), 'true');
      await selectedMessage(message);
      await focused(drawer.getByRole('button', { name: '关闭回复详情', exact: true }), 'drawer receives focus');
      return trigger;
    };
    const escapeDrawer = async (trigger) => {
      await page.keyboard.press('Escape');
      assert.equal(await drawer.count(), 0, 'Escape closes only the top drawer');
      assert.equal(await chat.isVisible(), true, 'Escape must keep the underlying chat');
      assert.equal(await mask.evaluate((el) => el.inert), false);
      assert.equal(await root.evaluate((el) => el.inert), true);
      await focused(trigger, 'drawer returns focus to the exact chat trigger');
    };
    const chatClosed = async (entry) => {
      assert.equal(await mask.count(), 0, 'chat mask is removed');
      assert.equal(await drawer.count(), 0, 'closing chat must not reopen the drawer');
      assert.equal(await root.evaluate((el) => el.inert), false, 'monitor becomes interactive');
      await focused(entry, 'chat returns focus to its original monitor entry');
    };
    assert.equal(await root.locator('[role="tab"], [role="tablist"]').count(), 0, 'monitor has no page-level tabs');

    const originalEntry = row('PREVIEW-004').getByRole('button', { name: '聊天记录', exact: true });
    await originalEntry.click();
    await chatState('SESSION-02', '柚子', '李四', 'MSG-008', 2, 3);
    await focused(chatClose, 'opening chat focuses its close button');
    assert.equal(await chatBody.locator('.bubble-row.ai').count(), 0, 'failed send must not appear as delivered AI');
    assert.equal(await chatBody.locator('.bubble-row.system').count(), 1);
    assert.match(await chatBody.locator('#rr-MSG-009.system').innerText(), /AI 消息发送失败；李四接管会话/);
    assert.equal(await chatBody.locator('.system button, .support:not(.ai) button').count(), 0, 'system/agent messages have no route action');
    assert.equal(await chatBody.locator('.support:not(.ai)').count(), 2, 'human replies remain visible');
    const failedBubble = await messageDrawer('MSG-008', 'button.b-text', 'PREVIEW-004');
    assert.match(await drawer.locator('.rr-trace-reply').innerText(), /回复已生成，但未发送成功/);
    await focusCycle(drawer, 'drawer over chat');
    await escapeDrawer(failedBubble);
    const takeoverRoute = await messageDrawer('MSG-010', '.rr-message-route', 'PREVIEW-005');
    await traceRecord('PREVIEW-005');
    await escapeDrawer(takeoverRoute);

    await previousChat.click();
    await chatState('SESSION-01', '小鹿', '黄亚芳', 'MSG-001', 1, 3);
    assert.deepEqual(await chatBody.locator('.bubble-row.ai').evaluateAll((els) => els.map((el) => el.id)), ['rr-MSG-002', 'rr-MSG-004'], 'only delivered AI replies get .ai');
    assert.match(await chatBody.locator('#rr-MSG-006.system').innerText(), /未找到可用回复内容，已转人工接待/);
    await focusCycle(chat, 'chat at first-session boundary');
    const sameChat = await chat.elementHandle();
    await messageDrawer('MSG-004', 'button.b-text', 'PREVIEW-002');
    assert.match(await drawer.locator('.rr-trace-reply').innerText(), /回复已发送给买家/);
    await drawer.getByRole('tab', { name: '匹配依据', exact: true }).click();
    await drawer.getByRole('button', { name: '聊天记录', exact: true }).click();
    assert.equal(await drawer.count(), 0);
    assert.equal(await sameChat.evaluate((el) => el.isConnected && el === document.querySelector('.rr-chat-modal')), true, 'drawer returns to the same chat DOM');
    await sameChat.dispose();
    await chatState('SESSION-01', '小鹿', '黄亚芳', 'MSG-003', 1, 3);
    assert.equal(await chatBody.locator('#rr-MSG-003.selected.buyer').count(), 1, 'AI trace links back to the buyer message');
    await focused(chatClose, 'returning from drawer focuses chat close');
    const invoiceRoute = await messageDrawer('MSG-005', '.rr-message-route', 'PREVIEW-003');
    assert.match(await drawer.locator('.rr-trace-summary').innerText(), /转人工/);
    assert.equal(await drawer.getByRole('tab', { name: '处理过程', exact: true }).getAttribute('aria-selected'), 'true', 'a new message resets trace tab state');
    await escapeDrawer(invoiceRoute);
    await chatLayout(1600);
    await page.screenshot({ path: `${OUT}/reply-route-conversation.png` });

    await nextChat.click();
    await chatState('SESSION-02', '柚子', '李四', 'MSG-008', 2, 3);
    await page.keyboard.press('ArrowRight');
    await chatState('SESSION-03', '晴天', '黄亚芳', 'MSG-012', 3, 3);
    assert.equal(await chatBody.locator('.ai').count(), 0, 'timeout and processing are not delivered AI');
    assert.match(await chatBody.locator('#rr-MSG-012-S.system').innerText(), /AI 未能及时生成回复，未发出消息/);
    await focusCycle(chat, 'chat at last-session boundary');
    await page.keyboard.press('ArrowRight');
    await chatState('SESSION-03', '晴天', '黄亚芳', 'MSG-012', 3, 3);
    await page.keyboard.press('ArrowLeft');
    await chatState('SESSION-02', '柚子', '李四', 'MSG-008', 2, 3);
    await previousChat.click();
    await page.keyboard.press('ArrowLeft');
    await chatState('SESSION-01', '小鹿', '黄亚芳', 'MSG-001', 1, 3);
    await chatClose.click();
    await chatClosed(originalEntry);

    const traceEntry = row('PREVIEW-002').getByRole('button', { name: '查看详情', exact: true });
    await traceEntry.click();
    await drawer.getByRole('button', { name: '聊天记录', exact: true }).click();
    assert.equal(await drawer.count(), 0, 'row drawer is replaced by chat');
    await chatState('SESSION-01', '小鹿', '黄亚芳', 'MSG-003', 1, 3);
    await chat.getByRole('heading', { name: '聊天记录', exact: true }).click();
    assert.equal(await chat.isVisible(), true, 'clicking inside chat does not trigger mask click.self');
    await mask.click({ position: { x: 12, y: 12 } });
    await chatClosed(traceEntry);

    await select('AI 回复', '已回复');
    await root.getByRole('button', { name: '查询', exact: true }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 2);
    const repliedEntry = row('PREVIEW-001').getByRole('button', { name: '聊天记录', exact: true });
    await repliedEntry.click();
    await chatState('SESSION-01', '小鹿', '黄亚芳', 'MSG-001', 1, 1);
    await focusCycle(chat, 'single filtered session excludes both disabled nav buttons');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await chatState('SESSION-01', '小鹿', '黄亚芳', 'MSG-001', 1, 1);
    await page.keyboard.press('Escape');
    await chatClosed(repliedEntry);
    await root.getByRole('button', { name: '重置', exact: true }).click();
    console.log('PASS: teleported chat, delivery roles, message drawers, layered Escape, focus traps, close paths and session boundaries');

    // Observe UI state, not Vue internals; pending draft and applied filters must remain distinct.
    const monitorState = () => root.evaluate((el) => ({
      keyword: el.querySelector('#rr-keyword').value,
      fields: Array.from(el.querySelectorAll('.rr-query .bselect-trigger, .drp-trigger'), (node) => node.textContent.trim()),
      metrics: Array.from(el.querySelectorAll('.rr-metrics button'), (node) => [node.textContent.trim(), node.getAttribute('aria-pressed')]),
      pagination: el.querySelector('.rr-pagination').textContent.trim(),
      rows: Array.from(el.querySelectorAll('tbody tr'), (node) => node.dataset.trace),
      order: Array.from(el.querySelectorAll('.sort-th-ico path'), (node) => node.getAttribute('fill')),
      scroll: [el.querySelector('.rr-table-scroll').scrollLeft, el.querySelector('.rr-table-scroll').scrollTop],
    }));
    await root.locator('#rr-keyword').fill('有实体店吗');
    await root.getByRole('button', { name: '查询', exact: true }).click();
    await root.locator('.rr-metrics button').filter({ hasText: '需要关注' }).click();
    await root.locator('#rr-keyword').fill('pending-not-applied');
    const filteredState = await monitorState();
    assert.deepEqual(filteredState.rows, ['PREVIEW-006', 'PREVIEW-004']);
    const filteredEntry = row('PREVIEW-004').getByRole('button', { name: '聊天记录', exact: true });
    await filteredEntry.click();
    await chatState('SESSION-02', '柚子', '李四', 'MSG-008', 1, 2);
    await nextChat.click();
    await chatState('SESSION-03', '晴天', '黄亚芳', 'MSG-012', 2, 2);
    await page.keyboard.press('ArrowLeft');
    await chatState('SESSION-02', '柚子', '李四', 'MSG-008', 1, 2);
    await chatClose.click();
    await chatClosed(filteredEntry);
    assert.deepEqual(await monitorState(), filteredState, 'closing chat preserves keyword draft, applied filter and quick metric');
    await root.getByRole('button', { name: '查询', exact: true }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 0, 'pending keyword takes effect only after query');
    await root.getByRole('button', { name: '重置', exact: true }).click();

    await page.setViewportSize({ width: 1280, height: 900 });
    await root.locator('#rr-keyword').fill('SESSION');
    await root.getByRole('button', { name: '查询', exact: true }).click();
    await root.locator('.rr-size .bselect-trigger').click();
    await page.locator('.bselect-menu .bselect-opt').getByText('5 条 / 页', { exact: true }).click();
    await root.locator('th').filter({ hasText: '消息时间' }).click();
    await root.getByRole('button', { name: '下一页', exact: true }).click();
    await root.locator('#rr-keyword').fill('another-pending-keyword');
    const pagedEntry = row('PREVIEW-006').getByRole('button', { name: '聊天记录', exact: true });
    await pagedEntry.scrollIntoViewIfNeeded();
    const tableScroll = root.locator('.rr-table-scroll');
    assert.equal(await tableScroll.evaluate((el) => el.scrollWidth > el.clientWidth), true, '1280px table has real horizontal overflow');
    await tableScroll.hover();
    await page.mouse.wheel(1200, 0);
    await page.waitForFunction(() => {
      const el = document.querySelector('.rr-table-scroll');
      return el.scrollLeft > 0 && Math.abs(el.scrollLeft + el.clientWidth - el.scrollWidth) <= 1;
    });
    const pagedState = await monitorState();
    assert.deepEqual(pagedState.rows, ['PREVIEW-006', 'PREVIEW-007']);
    assert.match(pagedState.pagination, /2\s*\/\s*2/);
    assert.ok(pagedState.scroll[0] > 0, 'scroll retention must not be a zero-scroll no-op');
    await pagedEntry.click();
    await chatState('SESSION-03', '晴天', '黄亚芳', 'MSG-012', 3, 3);
    await previousChat.click();
    await chatState('SESSION-02', '柚子', '李四', 'MSG-008', 2, 3);
    await page.keyboard.press('Escape');
    await chatClosed(pagedEntry);
    assert.deepEqual(await monitorState(), pagedState, 'chat retains page 2, ascending order, draft/applied filters and table scroll');
    await root.getByRole('button', { name: '重置', exact: true }).click();
    await root.locator('.rr-size .bselect-trigger').click();
    await page.locator('.bselect-menu .bselect-opt').getByText('10 条 / 页', { exact: true }).click();
    await root.locator('th').filter({ hasText: '消息时间' }).click();
    await page.setViewportSize({ width: 1600, height: 1000 });
    console.log('PASS: filtered-session scope across pages and monitor draft/applied/quick/page/order/scroll preservation');

    await root.locator('th').filter({ hasText: '消息时间' }).click();
    assert.equal(await root.locator('.rr-table tbody tr').first().getAttribute('data-trace'), 'PREVIEW-001');
    await root.locator('th').filter({ hasText: '处理用时' }).click();
    assert.equal(await root.locator('.rr-table tbody tr').first().getAttribute('data-trace'), 'PREVIEW-006');
    await root.locator('th').filter({ hasText: '处理用时' }).click();
    assert.equal(await root.locator('.rr-table tbody tr').first().getAttribute('data-trace'), 'PREVIEW-005');
    assert.equal(await root.locator('.rr-table tbody tr').last().getAttribute('data-trace'), 'PREVIEW-007');
    await root.locator('th').filter({ hasText: '消息时间' }).click();
    await row('PREVIEW-002').getByRole('button', { name: '查看详情', exact: true }).click();
    await page.locator('.rr-overlay').click({ position: { x: 20, y: 200 } });
    assert.equal(await page.locator('.rr-drawer').count(), 0);
    assert.equal(await root.locator('.rr-head-actions, .rr-source, .rr-head .rr-preview').count(), 0, 'header has no example notice or record-source switch');

    await root.locator('.drp-trigger').click();
    await page.locator('.drp-pop').waitFor();
    await page.locator('.drp-cell').filter({ hasText: /^25$/ }).click();
    assert.equal(await root.getByRole('button', { name: '查询', exact: true }).isDisabled(), true);
    await page.locator('.drp-cell').filter({ hasText: /^25$/ }).click();
    await root.getByRole('button', { name: '查询', exact: true }).click();
    assert.equal(await root.locator('.rr-table tbody tr').count(), 7);
    await root.getByRole('button', { name: '重置', exact: true }).click();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${OUT}/reply-route-monitor-1280.png` });
    assert.equal(await root.evaluate((el) => el.getBoundingClientRect().right <= innerWidth + 1), true);
    const sourceEntry = row('PREVIEW-002').getByRole('button', { name: '聊天记录', exact: true });
    await sourceEntry.click();
    await chatState('SESSION-01', '小鹿', '黄亚芳', 'MSG-003', 1, 3);
    await chatLayout(1280);
    await page.screenshot({ path: `${OUT}/reply-route-chat-1280.png` });
    console.log('PASS: sorting, simplified header, date range and centered 1600px/1280px screenshots');

    await chatClose.click();
    await chatClosed(sourceEntry);

    // Dedicated cross-module checks: a successful source jump destroys the route, not its history.
    const nav = (name) => page.locator('.kb-nav-item').filter({ has: page.getByText(name, { exact: true }) });
    for (const name of ['商品知识库 V2', '场景配置', '智能回复路由']) assert.equal(await nav(name).count(), 1);
    const sources = [
      { trace: 'PREVIEW-002', key: 'scene:FB01', name: '店铺地址咨询', id: 'FB01' },
      { trace: 'PREVIEW-003', key: 'scene:FB04', name: '发票咨询', id: 'FB04' },
      { trace: 'PREVIEW-003', key: 'scene:FB12', name: '默认转人工', id: 'FB12' },
      { trace: 'PREVIEW-001', key: 'knowledge:KN001', name: '尺码选购', id: 'KN001' },
    ];
    const revisitRoute = async () => {
      await nav('智能回复路由').click();
      await root.locator('tbody tr').first().waitFor();
      assert.equal(await root.locator('#rr-keyword').inputValue(), '', 'v-if remount resets draft keyword');
      assert.deepEqual(await root.locator('tbody tr').evaluateAll((els) => els.map((el) => el.dataset.trace)), Object.keys(records).reverse(), 'remount resets filters, pagination and descending message order');
      assert.deepEqual(await root.locator('.rr-metrics strong').allTextContents(), ['7', '2', '1', '4', '3']);
      assert.equal(await root.locator('.rr-head-actions, .rr-source, .rr-head .rr-preview').count(), 0, 'header has no example notice or record-source switch');
      assert.equal(await root.locator('.rr-size .bselect-trigger').innerText(), '10 条 / 页');
      assert.equal(await root.evaluate((el) => el.inert), false);
      assert.equal(await page.locator('.rr-drawer, .rr-chat-mask, .sc2-wrap, .kb-drawer').count(), 0);
    };

    // CDP observes the real window/document listeners without patching application event methods.
    const cdp = await page.context().newCDPSession(page);
    const keyListeners = async () => {
      const keys = [];
      try {
        for (const expression of ['window', 'document']) {
          const { result } = await cdp.send('Runtime.evaluate', { expression, objectGroup: 'reply-route-listeners' });
          const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
          for (const listener of listeners.filter((item) => item.type === 'keydown')) {
            keys.push(`${expression}:${listener.scriptId}:${listener.lineNumber}:${listener.columnNumber}:${listener.useCapture}`);
          }
        }
        return keys;
      } finally {
        await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'reply-route-listeners' });
      }
    };
    const openSourceEvidence = async (source, stacked = false) => {
      const beforeKeys = await keyListeners();
      const entry = row(source.trace).getByRole('button', { name: stacked ? '聊天记录' : '查看详情', exact: true });
      await entry.click();
      let chatTrigger;
      if (stacked) {
        await chat.waitFor();
        chatTrigger = await messageDrawer(records[source.trace].message, '.rr-message-route', source.trace);
      }
      await drawer.getByRole('tab', { name: '匹配依据', exact: true }).click();
      await traceRecord(source.trace);
      const button = drawer.getByRole('button', { name: `查看当前配置：${source.name}`, exact: true });
      assert.equal(await button.getAttribute('data-source-key'), source.key);
      const candidate = drawer.locator('.rr-trace-candidate').filter({ has: page.locator(`[data-source-key="${source.key}"]`) });
      assert.equal(await candidate.innerText(), historicalCandidates.get(`${source.trace}/${source.key}`), 'reopening a route always retains the original candidate, evidence and historical configuration');
      const overlayKeys = (await keyListeners()).filter((key) => !beforeKeys.includes(key));
      assert.ok(overlayKeys.length > 0, 'listener check must observe an installed reply overlay handler');
      return { source, button, entry, chatTrigger, overlayKeys, rootHandle: await root.elementHandle(), drawerHandle: await drawer.elementHandle() };
    };
    const disposeSource = async (opened) => {
      await opened.rootHandle.dispose();
      await opened.drawerHandle.dispose();
    };
    const sourceUnmounted = async (opened, destination) => {
      await root.waitFor({ state: 'detached' });
      assert.equal(await page.locator('.rr-page, .rr-overlay, .rr-drawer, .rr-chat-mask, .rr-chat-modal').count(), 0, 'source navigation removes every route and teleported overlay');
      assert.equal(await opened.rootHandle.evaluate((el) => el.isConnected), false);
      assert.equal(await opened.drawerHandle.evaluate((el) => el.isConnected), false);
      assert.equal(await nav(destination).evaluate((el) => el.classList.contains('active')), true);
      assert.equal(await page.locator('[inert]').evaluateAll((els) => els.filter((el) => el.inert && el.getClientRects().length).length), 0, 'no stale inert content after leaving reply details');
      const remaining = await keyListeners();
      assert.deepEqual(opened.overlayKeys.filter((key) => remaining.includes(key)), [], 'reply focus-trap/keyboard listener is removed, including when trace was stacked on chat');
      await disposeSource(opened);
    };

    // Evaluate bounds before any hover/click/focus/scrollIntoView could repair a broken jump.
    const inVisibleArea = ({ selector, area }) => {
      const target = document.querySelector(selector);
      const region = document.querySelector(area);
      if (!target || !region) return false;
      const box = target.getBoundingClientRect();
      const bounds = region.getBoundingClientRect();
      let left = Math.max(0, bounds.left), right = Math.min(innerWidth, bounds.right);
      let top = Math.max(0, bounds.top), bottom = Math.min(innerHeight, bounds.bottom);
      for (let node = region; node; node = node.parentElement) {
        const style = getComputedStyle(node), rect = node.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) { left = Math.max(left, rect.left); right = Math.min(right, rect.right); }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) { top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom); }
      }
      return box.width > 0 && box.height > 0 && box.left >= left - 1 && box.right <= right + 1
        && box.top >= top - 1 && box.bottom <= bottom + 1 && target.scrollWidth <= target.clientWidth + 1;
    };
    const landed = async (selector, area, editSelector) => {
      await page.waitForFunction(inVisibleArea, { selector, area });
      await page.waitForFunction((selector) => document.querySelector(selector) === document.activeElement, editSelector);
      assert.equal(await page.evaluate(inVisibleArea, { selector: editSelector, area }), true, 'existing edit control is fully inside the visible target area');
      assert.equal(await page.locator(editSelector).evaluate((el) => !!el.closest('[inert]')), false);
      assert.deepEqual(await page.locator(editSelector).evaluate((el) => ['ArrowLeft', 'ArrowRight'].map((key) => {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      })), [false, false], 'destination keys are not intercepted by the old reply/chat handler');
    };
    const realJumpScroll = async (selector, area, scrollSelector) => {
      const scroll = page.locator(scrollSelector);
      const info = await scroll.evaluate((el) => ({ top: el.scrollTop, max: el.scrollHeight - el.clientHeight, distance: el.scrollHeight + el.clientHeight, bottom: Math.min(innerHeight, el.getBoundingClientRect().bottom) }));
      assert.ok(info.max > 1 && info.top > 0, `${selector}: source jump genuinely scrolls an overflowing destination`);
      const box = await page.locator(selector).boundingBox();
      assert.ok(box.y + box.height + info.top > info.bottom + 1, 'target would be clipped without the source jump scroll');
      await page.locator(selector).hover();
      await page.mouse.wheel(0, -info.distance);
      await page.waitForFunction((selector) => document.querySelector(selector).scrollTop === 0, scrollSelector);
      assert.equal(await page.evaluate(inVisibleArea, { selector, area }), false, 'reverse wheel proves the target does not already fit at scroll zero');
      await page.mouse.wheel(0, info.distance);
      await page.waitForFunction((selector) => {
        const el = document.querySelector(selector);
        return el.scrollTop > 0 && Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 1;
      }, scrollSelector);
      assert.equal(await page.evaluate(inVisibleArea, { selector, area }), true, 'forward wheel reaches the target again');
    };
    const tagTexts = (els) => els.map((el) => Array.from(el.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').trim());
    const jumpScene = async (opened, screenshot) => {
      const expected = await page.evaluate(async (id) => {
        const { fbScenes } = await import('/src/pages/knowledge/sceneConfigData.ts');
        const group = fbScenes.find((g) => g.subs.some((s) => s.id === id));
        const scene = group?.subs.find((s) => s.id === id);
        return scene ? JSON.parse(JSON.stringify({ ...scene, group: group.name })) : null;
      }, opened.source.id);
      assert.ok(expected, 'scene fixture exists');
      await opened.button.click();
      await page.locator('.sc2-wrap').waitFor();
      await sourceUnmounted(opened, '场景配置');
      assert.equal(await page.locator('.sc2-type-card.active').count(), 1);
      assert.equal(await page.locator('.sc2-type-card.active .sc2-tc-head > b').innerText(), expected.group);
      assert.equal(await page.locator('.kb-drawer, .kb-modal-mask').count(), 0, 'scene source jump must not automatically open any editor');
      const selector = `.sc2-sub-card[data-scene-id="${opened.source.id}"]`;
      const editSelector = `${selector} .sc2-sc-ops a.kb-link:not(.danger)`;
      const card = page.locator(selector);
      await landed(selector, '.sc2-cards', editSelector);
      assert.equal(await card.locator('.sc2-sc-head > b').innerText(), expected.name);
      assert.equal(await card.evaluate((el) => el.classList.contains('off')), !expected.enabled, 'disabled sources still resolve by ID');
      if (screenshot) await page.screenshot({ path: `${OUT}/${screenshot}` });
      if (opened.source.id === 'FB12' && page.viewportSize().height === 600) await realJumpScroll(selector, '.sc2-cards', '.sc2-main');
      await card.getByRole('link', { name: '编辑', exact: true }).click();
      const editor = page.locator('.sc-drawer');
      await editor.waitFor();
      assert.equal(await editor.locator('.sc-d-head > b').innerText(), '配置场景');
      assert.equal(await editor.locator('.sc-base-grid .bselect-trigger').innerText(), expected.group);
      assert.equal(await editor.getByPlaceholder('如：物流到哪里了', { exact: true }).inputValue(), expected.name);
      assert.deepEqual(await editor.locator('.qa-simrow .qa-simbox').allInnerTexts(), expected.questions);
      assert.deepEqual(await editor.locator('.qa-kwtags em.kb-scene-tag').evaluateAll(tagTexts), expected.kws);
      assert.equal(await editor.locator('.sc-act-pick button.active').innerText(), expected.act);
      if (expected.act === '智能回复') assert.equal(await editor.locator('.sc-ai-prompt').inputValue(), expected.aiPrompt);
      else assert.equal(await editor.locator('.sc-ai-prompt').count(), 0);
      await editor.getByRole('button', { name: '取消', exact: true }).click();
      await editor.waitFor({ state: 'detached' });
    };
    const jumpKnowledge = async (opened, screenshot) => {
      const expected = await page.evaluate(async () => {
        const { kbV2Products } = await import('/src/pages/knowledge/goodsKbV2Data.ts');
        const product = kbV2Products.find((p) => p.id === 'K001');
        const code = product?.codes.find((c) => c.code === 'FEN-24');
        const entry = code?.knowledge.find((k) => k.id === 'KN001');
        return entry ? JSON.parse(JSON.stringify({ product: product.name, codes: product.codes.map((c) => c.code), entry })) : null;
      });
      assert.ok(expected);
      assert.equal(expected.product, '儿童轻便运动鞋系列');
      await opened.button.click();
      const detail = page.locator('.kb-drawer');
      await detail.waitFor();
      await sourceUnmounted(opened, '商品知识库 V2');
      assert.equal(await detail.count(), 1);
      assert.equal(await detail.locator('.kb-d-title .n').innerText(), expected.product);
      assert.equal(await detail.locator('.kb-d-skurail').count(), 0, 'source opens series K001, not an item/SKU drawer');
      assert.deepEqual(await detail.locator('.kb-code .c').allInnerTexts(), expected.codes);
      assert.equal(await detail.locator('.kb-code.active .c').innerText(), 'FEN-24');
      assert.equal(await detail.locator('.kb-kn-tabs button.active').innerText(), '尺码选购');
      assert.equal(await page.locator('.kb-modal-mask, .sc-drawer').count(), 0, 'knowledge jump opens the existing detail, not the editing dialog');
      const selector = '.kb-kn[data-knowledge-id="KN001"]';
      const editSelector = `${selector} .kb-kn-acts button[title="编辑"]`;
      await landed(selector, '.kb-kn-list', editSelector);
      assert.equal(await page.locator(`${selector} .kb-kn-text`).innerText(), expected.entry.text);
      if (screenshot) await page.screenshot({ path: `${OUT}/${screenshot}` });
      await realJumpScroll(selector, '.kb-kn-list', '.kb-drawer');
      await page.locator(editSelector).click();
      const editor = page.locator('.kb-kn-modal');
      await editor.waitFor();
      assert.equal(await editor.locator('.kb-modal-head > b').innerText(), '编辑商品知识');
      assert.equal(await editor.locator('.bselect-trigger').first().innerText(), '尺码选购');
      assert.deepEqual(await editor.locator('.qa-simrow .qa-simbox').allInnerTexts(), expected.entry.questions);
      assert.deepEqual(await editor.locator('.qa-kwtags em.kb-scene-tag').evaluateAll(tagTexts), expected.entry.keywords);
      assert.equal(await editor.locator('textarea.kb-textarea').inputValue(), expected.entry.text);
      await editor.getByRole('button', { name: '取消', exact: true }).click();
      await editor.waitFor({ state: 'detached' });
      assert.equal(await detail.isVisible(), true, 'closing the editor retains the existing series drawer');
      await detail.locator('.kb-d-head button[title="关闭"]').click();
      await detail.waitFor({ state: 'detached' });
    };

    for (const viewport of [{ width: 1600, height: 1000 }, { width: 1280, height: 600 }]) {
      await page.setViewportSize(viewport);
      for (const source of sources) {
        // Leave non-default filters behind; revisiting the route must reset them, not preserve them.
        await root.locator('#rr-keyword').fill(records[source.trace].question);
        await root.getByRole('button', { name: '查询', exact: true }).click();
        await root.locator('#rr-keyword').fill('source-jump-unapplied-draft');
        const opened = await openSourceEvidence(source, source.id === 'FB01' || source.id === 'KN001');
        const suffix = viewport.height === 600 ? '-1280x600' : '';
        if (source.id === 'KN001') await jumpKnowledge(opened, `reply-route-knowledge-jump${suffix}.png`);
        else await jumpScene(opened, source.id === 'FB01' ? `reply-route-scene-jump${suffix}.png` : source.id === 'FB12' && viewport.height === 600 ? 'reply-route-scene-fallback-jump-1280x600.png' : null);
        await revisitRoute();
      }
    }
    console.log('PASS: direct scene/knowledge destinations, existing focused edit controls, editor prefills, real scrolling at normal/1280x600 viewports and stacked-chat cleanup');

    const missingSource = async (opened) => {
      const text = await drawer.innerText();
      const state = await monitorState();
      const url = page.url(), pages = page.context().pages().length;
      const priorToasts = await page.evaluateHandle(() => new Set(document.querySelectorAll('.toast')));
      try {
        await opened.button.click();
        await page.waitForFunction((before) => Array.from(document.querySelectorAll('.toast')).some((el) => !before.has(el)), priorToasts);
        const toast = await businessText(page.locator('.toast').last(), 'missing current source notification');
        assert.match(toast, /(?:配置|场景|知识).*(?:删除|不存在|不可用|未找到)|(?:未找到|找不到).*(?:配置|场景|知识)/, 'business toast explains the missing destination');
        assert.equal(await opened.rootHandle.evaluate((el) => el.isConnected && el === document.querySelector('.rr-page')), true);
        assert.equal(await opened.drawerHandle.evaluate((el) => el.isConnected && el === document.querySelector('.rr-drawer')), true, 'missing source leaves the original reply details mounted');
        assert.equal(await drawer.innerText(), text, 'deletion or failed navigation never rewrites historical evidence');
        assert.deepEqual(await monitorState(), state);
        assert.equal(await drawer.getByRole('tab', { name: '匹配依据', exact: true }).getAttribute('aria-selected'), 'true');
        assert.equal(await page.locator('.sc2-wrap, .kb-drawer, .kb-modal-mask').count(), 0, 'do not navigate or substitute another current configuration');
        assert.equal(await nav('智能回复路由').evaluate((el) => el.classList.contains('active')), true);
        assert.equal(page.url(), url);
        assert.equal(page.context().pages().length, pages);
        await focused(opened.button, 'failed source jump retains its source button focus');
        await traceRecord(opened.source.trace);
        if (opened.chatTrigger) {
          assert.equal(await chat.isVisible(), true);
          assert.equal(await mask.evaluate((el) => el.inert), true, 'missing source retains the original stacked chat');
          await escapeDrawer(opened.chatTrigger);
          await chatClose.click();
          await chatClosed(opened.entry);
        } else {
          await page.keyboard.press('Escape');
          await drawer.waitFor({ state: 'detached' });
          await focused(opened.entry, 'missing source details close normally');
        }
      } finally {
        await priorToasts.dispose();
        await disposeSource(opened);
      }
    };

    // In-memory fixtures only. Keep original objects, descriptors and complete array order;
    // never save an editor, replace a source object with a clone, or write a data file.
    await page.evaluate(async () => {
      const { fbScenes } = await import('/src/pages/knowledge/sceneConfigData.ts');
      const { kbV2Products } = await import('/src/pages/knowledge/goodsKbV2Data.ts');
      const group = fbScenes.find((g) => g.subs.some((s) => s.id === 'FB01'));
      const scene = group?.subs.find((s) => s.id === 'FB01');
      const code = kbV2Products.find((p) => p.id === 'K001')?.codes.find((c) => c.code === 'FEN-24');
      const entry = code?.knowledge.find((k) => k.id === 'KN001');
      if (!scene || !entry || window.__replyRouteRestore) throw new Error('Source mutation fixtures are unavailable or already in use');
      const objects = [scene, group.subs, code.knowledge];
      window.__replyRouteRestore = {
        fbScenes, kbV2Products, group, scene, code, entry,
        subs: [...group.subs], knowledge: [...code.knowledge],
        originals: objects.map((object) => ({ object, descriptors: Object.getOwnPropertyDescriptors(object), keys: Reflect.ownKeys(object) })),
        before: JSON.stringify([fbScenes, kbV2Products]),
      };
    });
    try {
      for (const change of [{ name: '店铺地址咨询（新名称）' }, { enabled: false }]) {
        await page.evaluate((change) => Object.assign(window.__replyRouteRestore.scene, change), change);
        const opened = await openSourceEvidence(sources[0]);
        await jumpScene(opened);
        await revisitRoute();
      }
      const deletedScene = await openSourceEvidence(sources[0]);
      const beforeDelete = await drawer.innerText();
      await page.evaluate(() => {
        const { group, scene } = window.__replyRouteRestore;
        group.subs.splice(group.subs.indexOf(scene), 1);
      });
      assert.equal(await drawer.innerText(), beforeDelete, 'deleting a current scene does not remove its historical trace candidate');
      await missingSource(deletedScene);
      // Explicit navigation away/back is test setup, never the outcome of clicking a deleted source.
      await nav('场景配置').click();
      await page.locator('.sc2-wrap').waitFor();
      await revisitRoute();
      await missingSource(await openSourceEvidence(sources[0]));

      const deletedKnowledge = await openSourceEvidence(sources[3], true);
      const beforeKnowledgeDelete = await drawer.innerText();
      await page.evaluate(() => {
        const { code, entry } = window.__replyRouteRestore;
        code.knowledge.splice(code.knowledge.indexOf(entry), 1);
      });
      assert.equal(await drawer.innerText(), beforeKnowledgeDelete, 'deleting current knowledge preserves its original question, match and snapshot');
      await missingSource(deletedKnowledge);
      await nav('商品知识库 V2').click();
      await root.waitFor({ state: 'detached' });
      await revisitRoute();
      await missingSource(await openSourceEvidence(sources[3]));
    } finally {
      const restored = await page.evaluate(() => {
        const saved = window.__replyRouteRestore;
        // Splice restores reactive array membership using the original objects in original order.
        saved.group.subs.splice(0, saved.group.subs.length, ...saved.subs);
        saved.code.knowledge.splice(0, saved.code.knowledge.length, ...saved.knowledge);
        for (const { object, descriptors, keys } of saved.originals) {
          for (const key of Reflect.ownKeys(object)) if (!keys.includes(key)) Reflect.deleteProperty(object, key);
          Object.defineProperties(object, descriptors);
        }
        const sameDescriptors = saved.originals.every(({ object, descriptors, keys }) => {
          const currentKeys = Reflect.ownKeys(object);
          return currentKeys.length === keys.length && currentKeys.every((key, i) => key === keys[i]) && keys.every((key) => {
            const actual = Object.getOwnPropertyDescriptor(object, key), expected = descriptors[key];
            return ['value', 'get', 'set', 'writable', 'enumerable', 'configurable'].every((field) => Object.is(actual[field], expected[field]));
          });
        });
        const matches = sameDescriptors && saved.group.subs.every((s, i) => s === saved.subs[i])
          && saved.code.knowledge.every((k, i) => k === saved.knowledge[i])
          && JSON.stringify([saved.fbScenes, saved.kbV2Products]) === saved.before;
        delete window.__replyRouteRestore;
        return matches;
      });
      assert.equal(restored, true, 'restore exact original source objects, array order, properties and complete data');
    }
    await cdp.detach();
    assert.equal(await root.locator('[role="tab"], [role="tablist"]').count(), 0, 'monitor still has no page-level tabs');
    assert.deepEqual(errors, [], 'browser console errors');
    console.log('PASS: renamed/disabled ID navigation, missing-source toasts without navigation, immutable history across remounts and exact fixture restoration; all reply-route checks passed.');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

/* 蜜蜂插件验证截图：无头 Chrome 直接落盘 screenshots/ 目录，无需人工保存 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("蜜蜂插件")');
  await page.waitForTimeout(500);

  /* 1. 默认不打开任何弹窗；未登录点击功能入口 → 品牌引导弹窗 → 点登录 → 扫码弹窗 */
  console.log('no dialog by default:', (await page.locator('.bee-mask.dialog').count()) === 0);
  await page.click('.bee-mitem:has-text("任务管理")');
  await page.waitForSelector('.bee-welcome');
  await page.screenshot({ path: `${OUT}/bee-shot-welcome.png` });
  await page.click('.bee-welcome button:has-text("钉钉扫码登录")');
  await page.waitForSelector('.bee-login .bl-card');
  await page.screenshot({ path: `${OUT}/bee-shot-login.png` });

  /* 1b. 账号密码登录方式：空提交三校验 → 错码拦截换码 → 点码刷新 → 填对截图 → 回扫码走主流程 */
  await page.click('.bl-tabs button:has-text("账号登录")');
  await page.waitForSelector('.bl-acct input');
  await page.click('.bl-acct .bl-btn');
  await page.waitForTimeout(150);
  console.log('pwd errs:', await page.locator('.bl-err').count());
  await page.fill('.bl-acct input >> nth=0', '蜜蜂用户');
  await page.fill('.bl-acct input >> nth=1', 'demo123');
  await page.fill('.bl-acct input >> nth=2', 'zzzz');
  await page.click('.bl-acct .bl-btn');
  await page.waitForTimeout(150);
  console.log('cap wrong:', (await page.locator('.bl-err').allInnerTexts()).includes('验证码不正确'));
  const cap1 = (await page.locator('.bl-cap').innerText()).replace(/\s+/g, '');
  await page.click('.bl-cap');
  await page.waitForTimeout(100);
  const cap2 = (await page.locator('.bl-cap').innerText()).replace(/\s+/g, '');
  console.log('cap refresh:', cap1.length === 4, cap2.length === 4, cap1 !== cap2);
  await page.fill('.bl-acct input >> nth=2', cap2);
  await page.screenshot({ path: `${OUT}/bee-shot-login-pwd.png` });
  await page.click('.bl-tabs button:has-text("扫码登录")');
  await page.waitForSelector('.bl-qr');

  /* 2. 模拟扫码成功 → 选品库弹窗 */
  await page.click('.bl-btn');
  await page.waitForSelector('.bee-dialog .bp-table');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/bee-shot-products.png` });

  /* 2b. 工具栏断言：选品动作不在列表内，铺货为出口 */
  const toolbar = await page.locator('.bp-toolbar').innerText();
  console.log('toolbar batch-pub:', toolbar.includes('批量铺货'), '| no-create:', !toolbar.includes('创建商品'), '| no-old:', !toolbar.includes('发起铺货任务') && !toolbar.includes('本地上传商品') && !toolbar.includes('批量复制') && !toolbar.includes('批量设标签'));
  const tbBtns = (await page.locator('.bp-toolbar button').allInnerTexts()).map((t) => t.trim());
  console.log('toolbar order ok:', tbBtns.join(',') === '批量铺货,批量删除,导出', '|', tbBtns.join(','));
  console.log('acts no-copy:', !(await page.locator('.bp-acts >> nth=0').innerText()).includes('复制链接'));
  console.log('copytip hidden:', (await page.locator('.bp-copytip').first().evaluate((el) => getComputedStyle(el).opacity)) === '0');
  await page.hover('.bp-linkwrap >> nth=0');
  await page.waitForTimeout(200);
  console.log('copytip shown:', (await page.locator('.bp-copytip').first().evaluate((el) => getComputedStyle(el).opacity)) === '1');

  /* 2f. 已登录态：悬浮用户行显现切换/退出 */
  console.log('out hidden by default:', await page.locator('.bee-m-out').first().evaluate((el) => getComputedStyle(el).opacity) === '0');
  await page.hover('.bee-plugin .bee-m-user');
  await page.waitForTimeout(250);
  console.log('user row:', (await page.locator('.bee-plugin .bee-m-user').innerText()).replace(/\s+/g, ' '));
  await page.locator('.bee-plugin .bee-bubble').screenshot({ path: `${OUT}/bee-shot-bubble-user.png` });

  /* 2g. 详情入口：铺货前 → 宽弹窗千牛发布式布局，ESC 关闭 */
  await page.click('.bp-acts a:has-text("详情") >> nth=0');
  await page.waitForSelector('.qd-sec');
  const dw = await page.locator('.bee-dialog.wide').boundingBox();
  const pw = await page.locator('.bp-page').boundingBox();
  console.log('detail width:', Math.round(dw.width), '> products width:', Math.round(pw.width), dw.width > pw.width);
  await page.screenshot({ path: `${OUT}/bee-shot-detail.png` });
  /* 查看态：来源信息顶部一排只读展示（meta 条存在、无独立分区）；编辑态隐藏 */
  console.log('view meta row:', (await page.locator('.qd-meta').count()) === 1, (await page.locator('.qd-meta .qd-link').count()) === 1, (await page.locator('.qd-sec-t:has-text("来源信息")').count()) === 0);
  /* SKU = 颜色分类 × 规格 笛卡尔积（4 行，首行名称为两维组合） */
  const skuNames = await page.locator('.qd-sku tbody tr').allInnerTexts();
  console.log('sku cartesian:', skuNames.length === 4, skuNames[0].replace(/\s+/g, ' ').includes('黑色 a款'));
  /* 详情头 AI 美化按钮（查看态与编辑按钮并存） */
  console.log('detail ai btn:', (await page.locator('.bp-head-r button:has-text("AI美化")').count()) === 1);
  /* 编辑态：千牛发布式表单（输入框/SKU 价格库存列/添加图位） */
  await page.click('.bp-head-r button:has-text("编辑")');
  await page.waitForSelector('.qd-sku input');
  console.log('edit no-meta:', (await page.locator('.qd-meta').count()) === 0);
  console.log('sku code editable:', (await page.locator('.qd-sku input.qd-input.code').count()) > 0);
  await page.locator('.qd-sku').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/bee-shot-detail-edit.png` });
  await page.click('.qd-foot button:has-text("取消")');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

    const noRowActs = await page.locator('.bp-table tbody tr:has(.bp-tag.no) .bp-acts').first().innerText();
  const okRowActs = await page.locator('.bp-table tbody tr:has(.bp-tag.ok) .bp-acts').first().innerText();
  console.log('acts: no-row no pub/complete:', !noRowActs.includes('发布') && !noRowActs.includes('完善'), '| ok-row pub renamed:', okRowActs.includes('发布') && !okRowActs.includes('铺货'));

/* 2c. 商品资料维护弹窗已下线：名称不可点、无该弹窗 */
  console.log('no edit-modal entry:', (await page.locator('.bp-name.edit').count()) === 0, (await page.locator('.bee-modal:has-text("商品资料")').count()) === 0);

  /* 2d. 发布：两步铺货弹窗（第一步选策略 → 第二步按策略平台选店铺） */
  await page.click('.bp-acts a:has-text("发布") >> nth=0');
  await page.waitForSelector('.bm-strats .bm-strat');
  console.log('pub step1 strats:', await page.locator('.bm-strats .bm-strat').count(), '| next disabled:', await page.locator('.bm-foot button:has-text("下一步")').isDisabled());
  await page.screenshot({ path: `${OUT}/bee-shot-pub-step1.png` });
  /* 选拼多多/抖音策略 → 第二步无已登录店铺，空态提示 */
  await page.click('.bm-strat:has-text("拼多多低价走量")');
  await page.click('.bm-foot button:has-text("下一步")');
  await page.waitForSelector('.bm-shops2');
  console.log('pub step2 pdd/dy shops:', await page.locator('.bm-shops2 .bm-shop').count(), '| empty tip:', (await page.locator('.bm-pubempty').count()) === 1);
  /* 回上一步改选淘宝策略 → 第二步仅淘宝已登录店铺 */
  await page.click('.bm-foot button:has-text("上一步")');
  await page.waitForSelector('.bm-strats .bm-strat');
  await page.click('.bm-strat:has-text("淘宝标准快速定价")');
  await page.click('.bm-foot button:has-text("下一步")');
  await page.waitForSelector('.bm-shops2 .bm-shop');
  console.log('pub groups:', await page.locator('.bm-pg-head').count(), '| shops:', await page.locator('.bm-shops2 .bm-shop').count());
  await page.fill('.bm-pubfilter input', '百货');
  await page.waitForTimeout(150);
  console.log('pub search 百货:', await page.locator('.bm-shops2 .bm-shop').count());
  await page.fill('.bm-pubfilter input', '');
  await page.waitForTimeout(150);
  await page.click('.bm-pg-head .caret >> nth=0');
  await page.waitForTimeout(150);
  const collapsedN = await page.locator('.bm-shops2 .bm-shop').count();
  await page.click('.bm-pg-head .caret >> nth=0');
  await page.waitForTimeout(150);
  const expandedN = await page.locator('.bm-shops2 .bm-shop').count();
  console.log('pub collapse ok:', collapsedN < expandedN, `(${collapsedN} < ${expandedN})`);
  await page.screenshot({ path: `${OUT}/bee-shot-pub.png` });
  await page.click('.bm-foot button:has-text("发起铺货")');
  await page.waitForTimeout(400);

  /* 2e. 批量铺货校验：勾选未完善商品应报错拦截 */
  await page.click('.bp-table tbody tr:has(.bp-tag.no) input[type="checkbox"] >> nth=0');
  await page.click('.bp-toolbar button:has-text("批量铺货")');
  await page.waitForSelector('.toast.error');
  const toastTxt = await page.locator('.toast.error').first().innerText();
  console.log('batch-pub-guard:', toastTxt);
  await page.screenshot({ path: `${OUT}/bee-shot-pub-guard.png` });
  await page.waitForTimeout(300);

  /* 2e2. 删除二次确认：单条取消保留；批量（2e 已勾 1 件）确认后移除 */
  const rowsBefore = await page.locator('.bp-table tbody tr').count();
  /* 删除链接位于表格最右，可能被气泡悬浮层遮挡，用 JS 触发点击 */
  await page.locator('.bp-table tbody tr').first().locator('.bp-acts a.del').evaluate((el) => el.click());
  await page.waitForSelector('.bee-modal.small');
  console.log('del-confirm single:', (await page.locator('.bee-modal.small .st-del-t').innerText()).includes('确认删除「'));
  await page.click('.bee-modal.small .bm-foot button:has-text("取消")');
  await page.waitForTimeout(200);
  console.log('del cancel kept:', (await page.locator('.bp-table tbody tr').count()) === rowsBefore);
  await page.click('.bp-toolbar button:has-text("批量删除")');
  await page.waitForSelector('.bee-modal.small');
  console.log('del-confirm batch:', (await page.locator('.bee-modal.small .st-del-t').innerText()).includes('1 件商品'));
  await page.screenshot({ path: `${OUT}/bee-shot-del-confirm.png` });
  await page.click('.bee-modal.small .bm-foot button:has-text("删除")');
  await page.waitForTimeout(300);
  console.log('del batch done:', (await page.locator('.bp-table tbody tr').count()) === rowsBefore - 1);

  /* 2h. 手动创建已下线：子菜单与工具栏均无创建入口 */
  await page.hover('.bee-plugin .bee-mitem:has-text("选品库")');
  await page.waitForTimeout(250);
  const subTxt = await page.locator('.bee-plugin .bee-mitem:has-text("选品库") .bee-sub').innerText();
  console.log('sub no-create:', !subTxt.includes('创建商品'), '| no-upload:', !subTxt.includes('本地上传商品'));
  console.log('toolbar no-create:', (await page.locator('.bp-toolbar button:has-text("创建商品")').count()) === 0);
  
    /* 2s. 策略管理：列表 → 新建表单（平台/定价卡片/条件单位/校验） → 保存入列表；删除二次确认 */
    await page.click('.bee-mitem:has-text("策略管理")');
    await page.waitForSelector('.st-table');
    console.log('strategy rows:', await page.locator('.st-table tbody tr').count());
    /* 发布方式列已删；创建人/创建时间列在位 */
    console.log('st cols:', (await page.locator('.st-table th:has-text("发布方式")').count()) === 0, (await page.locator('.st-table th:has-text("创建人")').count()) === 1, (await page.locator('.st-table th:has-text("创建时间")').count()) === 1);
    /* 创建时间排序：none → 降序 → 升序 → none */
    await page.click('.st-table th:has-text("创建时间")');
    await page.waitForTimeout(150);
    const sortDesc = (await page.locator('.st-table tbody tr >> nth=0').innerText()).includes('2026-08-20');
    await page.click('.st-table th:has-text("创建时间")');
    await page.waitForTimeout(150);
    const sortAsc = (await page.locator('.st-table tbody tr >> nth=0').innerText()).includes('2026-08-02');
    await page.click('.st-table th:has-text("创建时间")');
    await page.waitForTimeout(150);
    console.log('st time sort desc/asc:', sortDesc, sortAsc);
    await page.screenshot({ path: `${OUT}/bee-shot-strategy.png` });
    await page.click('.st-toolbar button:has-text("新建策略")');
    await page.waitForSelector('.st-form');
    await page.click('.st-foot button:has-text("保存")');
    await page.waitForTimeout(200);
    console.log('strategy errs:', await page.locator('.st-err').count());
    await page.click('.st-select .bselect-trigger');
    await page.waitForSelector('.st-plat-menu');
    await page.click('.st-plat-menu .bselect-opt:has-text("淘宝")');
    await page.click('.st-plat-menu .bselect-opt:has-text("天猫")');
    console.log('plat multi:', (await page.locator('.st-select .bselect-text').innerText()).includes('淘宝 / 天猫'));
    await page.click('.st-select .bselect-trigger');
    await page.waitForTimeout(150);
    await page.fill('.st-input.name', 'E2E测试策略');
    await page.click('.st-card >> nth=1');
    await page.waitForTimeout(150);
    console.log('profit unit yuan:', (await page.locator('.st-inputwrap .st-u').innerText()) === '元');
    await page.screenshot({ path: `${OUT}/bee-shot-strategy-form.png` });
    await page.click('.st-card >> nth=0');
    await page.fill('.st-inputwrap input', '25');
    await page.click('.st-foot button:has-text("保存")');
    await page.waitForSelector('.st-table');
    console.log('strategy created:', (await page.locator('.st-table tbody tr >> nth=0').innerText()).includes('E2E测试策略'));
    await page.click('.st-table .bp-acts a:has-text("删除") >> nth=0');
    await page.waitForSelector('.bee-modal.small');
    await page.click('.bee-modal.small button:has-text("取消")');
    await page.waitForTimeout(200);
    console.log('strategy kept after cancel:', await page.locator('.st-table tbody tr').count());

  /* 3. 气泡菜单切换 → 店铺管理弹窗（添加店铺入口/操作列已移除） */
  /* 并行页 Funion s 也有「选品库」.bee-mitem，须用 has-sub 锁定蜜蜂搬家气泡内的二级项 */
  const miSel = '.bee-plugin .bee-bubble .bee-mitem.has-sub:has-text("选品库")';
  await page.hover(miSel);
  await page.waitForTimeout(250);
  const mi3 = await page.locator(miSel).boundingBox();
  const sb3 = await page.locator(`${miSel} .bee-sub`).boundingBox();
  await page.mouse.move(mi3.x + mi3.width / 2, mi3.y + mi3.height / 2);
  /* 三段路径：本带内出间隙 → 泡外下移出桥接带（仅延迟关闭可救） → 斜入二级菜单底部 */
  await page.mouse.move(mi3.x - 5, mi3.y + mi3.height / 2, { steps: 3 });
  await page.mouse.move(mi3.x - 5, mi3.y + mi3.height + 45, { steps: 1 });
  await page.mouse.move(sb3.x + 24, sb3.y + sb3.height - 10, { steps: 4 });
  await page.waitForTimeout(200);
  console.log('gap-bridge(sub-left):', await page.locator(`${miSel} .bee-sub`).isVisible());
  await page.click('.bee-plugin .bee-bubble .bee-mitem:has-text("店铺管理")');
  await page.waitForSelector('.bs-page .bp-table');
  await page.waitForTimeout(300);
  console.log('shops no-add/no-acts:', (await page.locator('.bs-page button:has-text("添加店铺")').count()) === 0, (await page.locator('.bs-page .bp-acts').count()) === 0);
  await page.screenshot({ path: `${OUT}/bee-shot-shops.png` });

  /* 3b. 任务管理：商品维度列表 + 展开店铺明细（含铺货联动新任务） */
  await page.click('.bs-page .bp-head .bp-close');
  await page.waitForTimeout(300);
  await page.click('.bee-mitem:has-text("任务管理")');
  await page.waitForSelector('.bt-table');
  await page.waitForTimeout(400);
  const firstTask = await page.locator('.bt-row >> nth=0').innerText();
  console.log('first task row:', firstTask.replace(/\n/g, ' | ').slice(0, 120));
  await page.screenshot({ path: `${OUT}/bee-shot-tasks.png` });
  await page.click('.bt-exp >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/bee-shot-tasks-expand.png` });

/* 3c. AI图库独立账号体系：未登录徽标 → 登录卡校验 → 登录后图库 → 退出回登录卡 */
  await page.click('.bp-page .bp-head .bp-close');
  await page.waitForTimeout(300);
  console.log('ai state off:', (await page.locator('.bee-mitem:has-text("AI图库") .bee-m-state').innerText()) === '未登录');
  await page.click('.bee-mitem:has-text("AI图库")');
  await page.waitForSelector('.ail-acct');
  await page.click('.ail-acct .bl-btn');
  await page.waitForTimeout(150);
  console.log('ai login errs:', await page.locator('.ail-acct .bl-err').count());
  await page.screenshot({ path: `${OUT}/bee-shot-ailogin.png` });
  await page.fill('.ail-acct input >> nth=0', 'ai-demo');
  await page.fill('.ail-acct input >> nth=1', 'ai123456');
  await page.click('.ail-acct .bl-btn');
  await page.waitForSelector('.dw-wrap');
  console.log('ai state on:', (await page.locator('.bee-mitem:has-text("AI图库") .bee-m-state').innerText()) === '已登录');
  /* 重构：左栏加宽可操作，任务流/示例商品块已移除 */
  console.log('dw side wide:', Math.round((await page.locator('.dw-side').boundingBox()).width) >= 400, '| secrow removed:', (await page.locator('.dw-secrow').count()) === 0);
  /* 生成方式四选项 + 点选切换 */
  console.log('dw methods:', (await page.locator('.dw-methods button').count()) === 4);
  /* 创意灵感全方式通用：默认套图生成下灵感区也在 */
  console.log('dw ins under default:', (await page.locator('.dw-ins').count()) === 1, '| cats:', (await page.locator('.dw-cats-h a').count()) === 7);
  /* 单选视觉：选中项与未选中项底色一致（无 chip 高亮，不像多选） */
  const onBg = await page.locator('.dw-methods button.on').evaluate((el) => getComputedStyle(el).backgroundColor);
  const offBg = await page.locator('.dw-methods button:not(.on)').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log('dw radio not multiselect:', onBg === offBg);
  /* 套图生成默认：商品图片漂亮空状态 → 我的商品 picker → 主图/SKU图/详情图 */
  console.log('dw groups empty:', (await page.locator('.dw-side .dw-empty-g').count()) === 1);
  /* 按图：提示文案/解析按钮删除；生成方式单选 radio 样式；右侧上传区支持选品（选品库） */
  const sideTxt = await page.locator('.dw-side').innerText();
  console.log('dw hint removed:', !sideTxt.includes('有助于提升'), '| parse removed:', (await page.locator('.dw-linkrow button:has-text("解析")').count()) === 0);
  console.log('dw radio style:', (await page.locator('.dw-methods button .mic').first().evaluate((el) => getComputedStyle(el).borderRadius)) === '7px');
  console.log('dw up-main pick tip:', ((await page.locator('.dw-up-main').innerText()) || '').includes('选品库'));
  await page.screenshot({ path: `${OUT}/bee-shot-aiempty.png` });
  await page.click('.dw-side button:has-text("我的商品")');
  await page.waitForSelector('.dw-pick-list');
  await page.screenshot({ path: `${OUT}/bee-shot-picker.png` });
  await page.click('.dw-pick-row >> nth=0');
  await page.waitForSelector('.dw-g-grid img');
  console.log('dw groups imgs:', (await page.locator('.dw-g-grid img').count()) === 8);
  await page.screenshot({ path: `${OUT}/bee-shot-aigroups.png` });
  /* 图片美化：切换方式下方保持一致 */
  await page.click('.dw-methods button:has-text("图片美化")');
  console.log('dw method on:', (await page.locator('.dw-methods button.on').innerText()).trim() === '图片美化', '| cats-h:', (await page.locator('.dw-cats-h a').count()) === 7);
  /* 选择商品后的展示态全方式通用：切图片美化后 主图/SKU图/详情图 分组仍保留 */
  console.log('dw groups kept under beautify:', (await page.locator('.dw-g-grid img').count()) === 8);
  await page.screenshot({ path: `${OUT}/bee-shot-aibeauty.png` });
  /* 一致性：水印去除/图片复刻下 创意灵感+商品图片分组 原样保留 */
  for (const m of ['水印去除', '图片复刻']) {
    await page.click(`.dw-methods button:has-text("${m}")`);
    await page.waitForTimeout(150);
    console.log(`dw consistent under ${m}:`, (await page.locator('.dw-ins').count()) === 1, (await page.locator('.dw-g-grid img').count()) === 8);
  }
  /* 快捷创作：点模板选中并自动带入描述 */
  await page.click('.dw-tpl >> nth=0');
  console.log('dw tpl pick:', (await page.locator('.dw-tpl.on').count()) === 1, (await page.locator('.dw-ins-body textarea').inputValue()).length > 0);
  /* 高级创作：描述词点选追加 */
  await page.click('.dw-ins-tabs button:has-text("高级创作")');
  await page.click('.dw-words a >> nth=0');
  console.log('dw word add:', (await page.locator('.dw-ins-body textarea').inputValue()).includes('暗调石台'));
  /* 生成：骨架 → 历史记录 4 图，算力 10→2 */
  await page.click('.dw-gen');
  await page.waitForTimeout(300);
  console.log('dw generating:', (await page.locator('.dw-sk').count()) === 4);
  await page.waitForSelector('.dw-rec-imgs img');
  console.log('dw rec imgs:', (await page.locator('.dw-rec-imgs img').count()) === 4);
  console.log('dw credits:', (await page.locator('.dw-top-r .dw-pill').innerText()).includes('2'));
  await page.screenshot({ path: `${OUT}/bee-shot-aigallery.png` });
  /* 历史记录 pill 回工作台 */
  await page.click('.dw-top button.dw-pill');
  await page.waitForSelector('.dw-upcard');
  console.log('dw wide removed:', (await page.locator('.dw-up-sub.wide').count()) === 0);
  console.log('dw up preview:', (await page.locator('.dw-up-main img').count()) === 1);
  await page.screenshot({ path: `${OUT}/bee-shot-aiwork.png` });
  /* 退出 → 同一弹窗内回登录卡，徽标回未登录 */
  await page.click('.ag-out');
  await page.waitForSelector('.ail-acct');
  console.log('ai logout back:', (await page.locator('.bee-mitem:has-text("AI图库") .bee-m-state').innerText()) === '未登录');

  /* 4. 关闭弹窗 → 收起为豆包式圆标 */
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.click('.bee-plugin .bee-b-fold');
  await page.waitForSelector('.bee-plugin .bee-b-mini');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/bee-shot-mini.png` });

  /* 5. 展开并拖到最左 → 二级菜单自适应向右展开 */
  await page.click('.bee-plugin .bee-b-mini');
  await page.waitForSelector('.bee-plugin .bee-b-head');
  const host = await page.locator('.bee-plugin').boundingBox();
  const head = await page.locator('.bee-plugin .bee-b-head').boundingBox();
  await page.mouse.move(head.x + head.width / 2, head.y + 10);
  await page.mouse.down();
  await page.mouse.move(host.x + 40, host.y + 300, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await page.hover('.bee-plugin .bee-mitem:has-text("选品库")');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/bee-shot-sub-right.png` });

  /* 6. 热区桥接回归：从一级菜单缓慢穿过间隙移入二级菜单，hover 不得断（气泡靠左/二级右展） */
  const mi = await page.locator('.bee-plugin .bee-mitem:has-text("选品库")').boundingBox();
  const sb = await page.locator('.bee-plugin .bee-mitem:has-text("选品库") .bee-sub').boundingBox();
  await page.mouse.move(mi.x + mi.width / 2, mi.y + mi.height / 2);
  /* 三段路径：本带内出间隙 → 泡外下移出桥接带（仅延迟关闭可救） → 斜入二级菜单底部 */
  await page.mouse.move(mi.x + mi.width + 5, mi.y + mi.height / 2, { steps: 3 });
  await page.mouse.move(mi.x + mi.width + 5, mi.y + mi.height + 45, { steps: 1 });
  await page.mouse.move(sb.x + sb.width - 24, sb.y + sb.height - 10, { steps: 4 });
  await page.waitForTimeout(200);
  console.log('gap-bridge(sub-right):', await page.locator('.bee-plugin .bee-mitem:has-text("选品库") .bee-sub').isVisible());

  /* 7. 切换账号：悬浮用户行显现操作 → 点切换 → 登录弹窗 → 扫码成功后切换 */
  await page.hover('.bee-plugin .bee-m-user');
  await page.waitForTimeout(250);
  await page.click('.bee-m-out:has-text("切换")');
  await page.waitForSelector('.bee-login .bl-card');
  await page.screenshot({ path: `${OUT}/bee-shot-switch.png` });
  await page.click('.bl-btn');
  await page.waitForTimeout(1400);
  console.log('after switch:', (await page.locator('.bee-plugin .bee-m-user').innerText()).replace(/\s+/g, ' '));

  /* 8. Funion s：独立顶部 tab（蜜蜂插件 tab 后面），只做选品与 AI美化，登录走插件本身 */
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.click('.top-tabs-item:has-text("Funion s")');
  await page.waitForSelector('.fs-plugin .bee-bubble');
  await page.waitForTimeout(300);
  const fsHost = await page.locator('.fs-plugin').boundingBox();
  const fsB = await page.locator('.fs-plugin .bee-bubble').boundingBox();
  console.log('fs tab bubble right-top:', fsB.x + fsB.width > fsHost.x + fsHost.width - 60, Math.round(fsB.y - fsHost.y) === 48);
  await page.screenshot({ path: `${OUT}/bee-shot-fs-bubble.png` });
  /* 未登录点功能 → 插件自身登录卡（Funion s 品牌，非 AI图库独立登录） */
  await page.click('.fs-plugin .bee-mitem:has-text("AI美化")');
  await page.waitForSelector('.fs-plugin .bl-card');
  const fsBrand = await page.locator('.fs-plugin .bl-brand').innerText();
  console.log('fs login brand:', fsBrand.includes('Funion s'), '| no ail-acct:', (await page.locator('.fs-plugin .ail-acct').count()) === 0);
  /* 账号登录：读验证码填对 → 登录成功进选品库 */
  await page.click('.fs-plugin .bl-tabs button:has-text("账号登录")');
  await page.waitForSelector('.fs-plugin .bl-acct input');
  await page.fill('.fs-plugin .bl-acct input >> nth=0', 'fs-demo');
  await page.fill('.fs-plugin .bl-acct input >> nth=1', 'demo123');
  const fsCap = (await page.locator('.fs-plugin .bl-cap').innerText()).replace(/\s+/g, '');
  await page.fill('.fs-plugin .bl-acct input >> nth=2', fsCap);
  await page.click('.fs-plugin .bl-acct .bl-btn');
  await page.waitForSelector('.fs-plugin .bee-m-user');
  console.log('fs logged in:', (await page.locator('.fs-plugin .bee-m-user').innerText()).includes('fs-demo'));
  /* 菜单仅选品库/AI美化：无策略/任务/店铺管理，无 AI图库登录态 */
  const fsMenu = (await page.locator('.fs-plugin .bee-b-menu').innerText()).replace(/\s+/g, ' ');
  console.log('fs menu only-two:', fsMenu.includes('选品库') && fsMenu.includes('AI美化'), '| no extra:', !fsMenu.includes('策略') && !fsMenu.includes('任务') && !fsMenu.includes('店铺') && !fsMenu.includes('AI图库'));
  /* AI美化默认态：未选商品时右栏保留默认工作台，无任务图板 */
  await page.click('.fs-plugin .bee-mitem:has-text("AI美化")');
  await page.waitForSelector('.fs-plugin .dw-work');
  console.log('fs ai default:', (await page.locator('.fs-plugin .fb-board').count()) === 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  /* 选品库：同源 9 件商品，无任何铺货/发布相关内容 */
  await page.click('.fs-plugin .bee-mitem:has-text("选品库")');
  await page.waitForSelector('.fs-plugin .bp-table');
  const fsDlg = await page.locator('.fs-plugin .bee-mask.dialog').innerText();
  console.log('fs products rows:', await page.locator('.fs-plugin .bp-table tbody tr').count(), '| no pub:', !fsDlg.includes('铺货') && !fsDlg.includes('发布'));
  await page.screenshot({ path: `${OUT}/bee-shot-fs-products.png` });
  /* 详情：纯图片画廊——五类分区，无表单/编辑/铺货内容 */
  await page.click('.fs-plugin .bp-acts a:has-text("详情") >> nth=0');
  await page.waitForSelector('.fs-plugin .fsd-page');
  const fsNav = (await page.locator('.fs-plugin .fsd-nav').innerText()).replace(/\s+/g, ' ');
  const fsDet = await page.locator('.fs-plugin .fsd-page').innerText();
  console.log('fsd cats:', ['主图', 'SKU图', '详情图', '白底图', '场景图'].every((c) => fsNav.includes(c)),
    '| imgs only:', !fsDet.includes('基本信息') && !fsDet.includes('销售信息') && !fsDet.includes('商品标题') && !fsDet.includes('编辑'),
    '| no pub:', !fsDet.includes('铺货') && !fsDet.includes('发布'));
  console.log('fsd imgs:', await page.locator('.fs-plugin section[data-sec="main"] img').count(),
    await page.locator('.fs-plugin section[data-sec="sku"] figure').count(),
    await page.locator('.fs-plugin section[data-sec="desc"] img').count());
  /* 类目导航跳转 + 滚动联动 */
  await page.click('.fs-plugin .fsd-nav button:has-text("详情图")');
  await page.waitForTimeout(500);
  console.log('fsd nav jump:', ((await page.getAttribute('.fs-plugin .fsd-nav button:has-text("详情图")', 'class')) || '').includes('on'));
  await page.screenshot({ path: `${OUT}/bee-shot-fs-detail.png` });
  /* 详情 AI美化 → 携带商品与图片跳转 AI美化工作台 */
  await page.click('.fs-plugin .fsd-page .bp-btn.ai');
  await page.waitForSelector('.fs-plugin .dw-g-grid img');
  console.log('fsd ai carry:', (await page.locator('.fs-plugin .dw-g-grid img').count()) === 8,
    '| top pill hidden:', (await page.locator('.fs-plugin .dw-top').evaluate((el) => getComputedStyle(el).display)) === 'none',
    '| no ag-out:', (await page.locator('.fs-plugin .ag-out').count()) === 0,
    '| no inspire:', (await page.locator('.fs-plugin .dw-ins').count()) === 0);
  /* 生成范围与右侧任务标签对齐；输入框常驻，选图后上方展示已选图片；尺寸入口仅在单图且已选图时出现 */
  console.log('fs composer visible:', (await page.locator('.fs-plugin .dw-composer').count()) === 1);
  await page.click('.fs-plugin .dw-methods button:has-text("单图生成")');
  await page.waitForTimeout(120);
  console.log('fs single no chip before pick:', (await page.locator('.fs-plugin .dw-c-imgs .dw-c-img').count()) === 0);
  await page.click('.fs-plugin .dw-g-img >> nth=0');
  await page.waitForTimeout(120);
  console.log('fs single chip shown:', (await page.locator('.fs-plugin .dw-c-imgs .dw-c-img').count()) === 1,
    '| size btn:', (await page.locator('.fs-plugin .dw-c-size').count()) === 1);
  await page.click('.fs-plugin .dw-methods button:has-text("多图生成")');
  await page.waitForTimeout(120);
  await page.click('.fs-plugin .dw-g-img >> nth=0');
  await page.waitForTimeout(120);
  console.log('fs multi chip shown:', (await page.locator('.fs-plugin .dw-c-imgs .dw-c-img').count()) === 1,
    '| size btn hidden:', (await page.locator('.fs-plugin .dw-c-size').count()) === 0);
  await page.click('.fs-plugin .dw-methods button:has-text("整品生成")');
  await page.waitForTimeout(120);
  console.log('fs no size btn for set:', (await page.locator('.fs-plugin .dw-c-size').count()) === 0);
  /* 任务列表：三类场景 + 生成中/成功/部分完成/失败 四态 */
  const fbTxt = await page.locator('.fs-plugin .fb-board').innerText();
  console.log('fb kinds:', ['整品生成', '多图生成', '单图生成'].every((k) => fbTxt.includes(k)),
    '| states:', ['生成中', '成功', '部分完成', '失败'].every((s) => fbTxt.includes(s)));
  await page.screenshot({ path: `${OUT}/bee-shot-fs-ai-list.png` });
  /* 立即生成 → 列表置顶新任务 生成中 → 成功 */
  await page.click('.fs-plugin .dw-c-send', { force: true });
  await page.waitForTimeout(6500);
  console.log('fb new task done:', (await page.locator('.fs-plugin .fb-task >> nth=0 >> .fb-tag.done').count()) === 1);
  /* 点任务进详情：商品信息 + 套图生成按图片类型区分 */
  await page.click('.fs-plugin .fb-task >> nth=0');
  await page.waitForSelector('.fs-plugin .fb-detail');
  const fbDet = await page.locator('.fs-plugin .fb-detail').innerText();
  console.log('fb detail prod:', fbDet.includes('韩版珍珠发夹'),
    '| set labels:', ['主图', 'SKU图', '详情图', '白底图', '场景图'].every((l) => fbDet.includes(l)));
  /* 详情态顶部精简：无「生成任务」pill、无「历史生成记录」分隔 */
  console.log('fb detail clean top:', (await page.locator('.fs-plugin .dw-top .dw-pill:has-text("生成任务")').count()) === 0,
    '| no dw-div:', (await page.locator('.fs-plugin .fb-board .dw-div').count()) === 0,
    '| no top credits:', (await page.locator('.fs-plugin .dw-top-r').count()) === 0,
    '| no buy btn:', (await page.locator('.fs-plugin .dw-c-buy').count()) === 0);
  await page.screenshot({ path: `${OUT}/bee-shot-fs-ai-detail.png` });
  /* 替换闭环：详情有全部替换工具栏；全部替换后左侧商品图同步更新 */
  console.log('fb replace bar:', (await page.locator('.fs-plugin .fb-replace-bar').count()) === 1);
  const beforeImg = await page.locator('.fs-plugin .dw-g-img >> nth=1 >> img').getAttribute('src');
  await page.click('.fs-plugin .fb-replace-bar button:has-text("全部替换到商品")');
  await page.waitForTimeout(300);
  const afterImg = await page.locator('.fs-plugin .dw-g-img >> nth=1 >> img').getAttribute('src');
  console.log('fb replace all sync:', beforeImg !== afterImg);
  /* 生成结果大图预览 */
  await page.click('.fs-plugin .fb-card.done >> nth=0 >> .fb-img-acts button >> nth=0');
  await page.waitForSelector('.fs-plugin .img-preview img');
  console.log('fb preview open:', (await page.locator('.fs-plugin .img-preview img').count()) === 1);
  await page.click('.fs-plugin .img-preview');
  await page.waitForTimeout(200);
  /* 生成结果美化闭环：点击美化 → 下方输入框展示已选图片 chip → 发送后单图任务成功 */
  await page.click('.fs-plugin .fb-card.done >> nth=0 >> .fb-img-acts button >> nth=1');
  await page.waitForSelector('.fs-plugin .dw-c-imgs .dw-c-img');
  console.log('fb beautify chip:', (await page.locator('.fs-plugin .dw-c-imgs .dw-c-img').count()) === 1);
  await page.fill('.fs-plugin .dw-c-input', '背景更换为浅蓝色调，光线柔和');
  await page.click('.fs-plugin .dw-c-send', { force: true });
  await page.waitForTimeout(6500);
  await page.click('.fs-plugin .fb-back');
  await page.waitForTimeout(200);
  console.log('fb single beautify done:', (await page.locator('.fs-plugin .fb-task >> nth=0 >> .fb-tag.done').count()) === 1);
  /* 部分完成任务 → 详情重新生成 → 成功 */
  await page.click('.fs-plugin .fb-task:has-text("部分完成")');
  await page.waitForSelector('.fs-plugin .fb-detail .fb-re');
  await page.click('.fs-plugin .fb-detail .fb-re');
  await page.waitForTimeout(6500);
  console.log('fb regen done:', (await page.locator('.fs-plugin .fb-d-top').innerText()).includes('成功'));
  await page.screenshot({ path: `${OUT}/bee-shot-fs-ai.png` });
  /* 单图失败 → 卡片内重新生成 → 成功 */
  await page.click('.fs-plugin .fb-back');
  await page.waitForTimeout(200);
  await page.click('.fs-plugin .fb-task:has-text("全部图片生成失败")');
  await page.waitForSelector('.fs-plugin .fb-detail .fb-reone');
  await page.click('.fs-plugin .fb-detail .fb-reone');
  await page.waitForTimeout(6500);
  console.log('fb single fail regen done:', (await page.locator('.fs-plugin .fb-d-top').innerText()).includes('成功'));
  await page.waitForTimeout(300);
  /* 选品库行内 AI美化 同样直达工作台 */
  await page.click('.fs-plugin .bee-mitem:has-text("选品库")');
  await page.waitForSelector('.fs-plugin .bp-table');
  await page.click('.fs-plugin .bp-acts a:has-text("AI美化") >> nth=0');
  await page.waitForSelector('.fs-plugin .dw-g-grid img');
  console.log('fs ai preset imgs:', (await page.locator('.fs-plugin .dw-g-grid img').count()) === 8);
  /* 清除已选闭环：点清除钮 → 右栏回默认空状态 */
  await page.click('.fs-plugin .dw-clear');
  await page.waitForTimeout(300);
  console.log('fs clear back to default:', (await page.locator('.fs-plugin .dw-work').count()) === 1
    && (await page.locator('.fs-plugin .fb-board').count()) === 0
    && (await page.locator('.fs-plugin .dw-picked').count()) === 0
    && (await page.locator('.fs-plugin .dw-composer').count()) === 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await browser.close();
  console.log('bee shots done');
})().catch((e) => { console.error(e); process.exit(1); });

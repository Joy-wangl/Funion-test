/* 验证：部门管理-编辑运营归属弹窗（组长=新建组 / 专员=自动挂靠组长） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForTimeout(500);
  await page.click('.nav-parent:has-text("权限设置")');
  await page.waitForTimeout(300);
  await page.click('.subnav:has-text("部门管理")');
  await page.waitForTimeout(500);

  // 默认选中黄亚芳大组，直接打开编辑归属
  await page.click('text=编辑归属 >> visible=true >> nth=0');
  await page.waitForSelector('.og-edit-tabs');
  await page.waitForTimeout(300);

  // 职位 → 运营组长
  await page.click('.modal .form-item .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-opt:has-text("运营组长")');
  await page.waitForSelector('input[placeholder="请输入组名"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/pm-edit-1-leader.png` });

  // 职位 → 运营专员，选组后看自动挂靠提示
  await page.click('.modal .form-item .bselect-trigger >> nth=0');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-opt:has-text("运营专员")');
  await page.waitForTimeout(200);
  await page.click('.modal .form-item .bselect-trigger >> nth=1');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-opt >> nth=0');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/pm-edit-2-spec.png` });

  await browser.close();
  console.log('pm edit shots ok');
})().catch((e) => { console.error(e); process.exit(1); });

/* 应用中心原型页无头截图，输出到 public/prd-shots/，供语雀 PRD 嵌图使用 */
import { chromium } from 'file:///D:/Funion/.playwright/package/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/prd-shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
await page.goto('http://localhost:5173/index-vue.html', { waitUntil: 'networkidle' });
await page.click('text=应用中心');
await page.waitForSelector('.ap-bell');

/* 首页 */
await page.waitForSelector('.ap-home');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'ac-home.png') });

/* 全部应用列表 */
await page.click('.ap-cats button:has-text("全部")');
await page.waitForSelector('.ap-list-head');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, 'ac-list.png') });

/* 更新确认弹窗 */
await page.click('.ap-cell:has-text("小蜜蜂B") button.update');
await page.waitForSelector('.ap-upd-ver');
await page.screenshot({ path: path.join(OUT, 'ac-update.png') });
await page.click('.ap-mask .ap-modal-foot button:has-text("取 消")');

/* 我的应用 + 行菜单 */
await page.click('.ap-side-user');
await page.waitForSelector('.ap-mine-head');
await page.click('.ap-grid.mine .ap-act.caret');
await page.waitForSelector('.ap-menu');
await page.screenshot({ path: path.join(OUT, 'ac-mine.png') });
await page.click('.ap-menu-mask');

/* 上传新创作 步骤1 / 步骤2 */
await page.click('button:has-text("上传新创作")');
await page.waitForSelector('.ap-create');
await page.fill('.ap-create .ap-field input', 'PRD演示应用');
await page.click('.ap-upload.icon');
await page.click('.ap-upload.main');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, 'ac-create1.png') });
await page.click('button:has-text("下一步")');
await page.waitForSelector('.ap-create .ap-radio-line');
await page.screenshot({ path: path.join(OUT, 'ac-create2.png') });

/* 类目管理抽屉（回到步骤1进入） */
await page.click('button:has-text("上一步")');
await page.click('button:has-text("类目管理")');
await page.waitForSelector('.ap-cat-row');
await page.screenshot({ path: path.join(OUT, 'ac-cats.png') });
await page.click('.ap-drawer-foot button:has-text("取 消")');
await page.click('.ap-create-head .ap-back');

/* 应用详情（金蝶ERP：评价/预览/开发者信息齐全） */
await page.click('.ap-cats button:has-text("全部")');
await page.waitForSelector('.ap-list-head');
await page.click('.ap-cell:has-text("金蝶ERP")');
await page.waitForSelector('.ap-detail');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, 'ac-detail.png') });

/* 意见反馈提交抽屉（C 端入口，隐私） */
await page.click('.ap-detail-fb');
await page.waitForSelector('.ap-drawer .ap-fb-types');
await page.screenshot({ path: path.join(OUT, 'ac-fb-submit.png') });
await page.click('.ap-drawer-foot button:has-text("取 消")');
await page.click('.ap-detail .ap-back');

/* 消息中心：应用评价 / 意见反馈 / 系统反馈 */
await page.click('.ap-bell');
await page.waitForSelector('.ap-drawer-msg');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, 'ac-msg-rev.png') });
await page.click('.ap-msg-subtabs button:has-text("意见反馈")');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, 'ac-msg-af.png') });
await page.click('.ap-msg-tabs button:has-text("系统反馈")');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, 'ac-msg-sys.png') });
await page.click('.ap-drawer-mask', { position: { x: 60, y: 400 } });

/* 首页：新建反馈抽屉 / 反馈详情抽屉（C 端） */
await page.click('.ap-cats button:has-text("首页")');
await page.waitForSelector('.ap-home');
await page.click('button:has-text("新建反馈")');
await page.waitForSelector('.ap-drawer-head span:has-text("新建反馈")');
await page.screenshot({ path: path.join(OUT, 'ac-fb-new.png') });
await page.click('.ap-drawer-foot button:has-text("取 消")');
await page.click('.ap-fb-item');
await page.waitForSelector('.ap-drawer-fb');
await page.screenshot({ path: path.join(OUT, 'ac-fb-detail.png') });
await page.click('.ap-drawer-mask', { position: { x: 60, y: 400 } });

/* 数据看板 + 趋势图 */
await page.click('button:has-text("全部数据")');
await page.waitForSelector('.ap-dash');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, 'ac-dash.png') });
await page.click('.ap-dash-trendcell');
await page.waitForSelector('.ap-trend-modal');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'ac-trend.png') });

await browser.close();
console.log('shots done:', fs.readdirSync(OUT).filter((f) => f.startsWith('ac-')).join(', '));

/* 应用中心数据：业务域取自 PRD《一体化应用中心需求对接文档》业务域建设思维导图 */

export interface AppContact {
  name: string;
  role: '业务' | '运维';
}

export interface DomainInfo {
  /** 业务域（油田业务域） */
  name: string;
  /** 域长单位 */
  leaderUnit: string;
  /** 子业务分类 */
  subs: string[];
}

export const DOMAINS: DomainInfo[] = [
  { name: '油气勘探开发', leaderUnit: '勘探开发研究院', subs: ['油气勘探', '油气开发', '油气工程', '智能气田'] },
  { name: '生产营运与新能源', leaderUnit: '生产运行部', subs: ['生产营运与新能源'] },
  { name: '安全环保', leaderUnit: '安全环保部', subs: ['安全环保'] },
  { name: '财务经营管理', leaderUnit: '财务资产部', subs: ['财务管理', '外部市场', '土地管理'] },
  { name: '投资管理', leaderUnit: '计划投资部', subs: ['投资管理'] },
  { name: '物资供应', leaderUnit: '物资供应部', subs: ['物资供应'] },
  { name: '基建设备', leaderUnit: '基建设备部', subs: ['基建设备'] },
  { name: '科技信息', leaderUnit: '科技信息部', subs: ['科技信息'] },
  { name: '人力资源管理', leaderUnit: '人力资源部', subs: ['人力资源管理'] },
  { name: '风险与监督管理', leaderUnit: '企管法律部', subs: ['企管法律', '审计监督', '纪检监督'] },
  { name: '党建管理', leaderUnit: '党建工作部', subs: ['党建统筹', '党建宣传', '党委巡察', '群团工作'] },
  { name: '综合协同管理', leaderUnit: '综合办公室', subs: ['综合办公', '公共事业管理'] },
];

export const leaderUnits = DOMAINS.map((d) => d.leaderUnit);

export const leaderUnitOf = (domain: string) =>
  DOMAINS.find((d) => d.name === domain)?.leaderUnit ?? '—';

export interface AppItem {
  id: string;
  name: string;
  domain: string;
  /** 覆盖业务 */
  coverage: string[];
  /** 责任部门 */
  responsibleDept: string;
  /** 联系人：业务人 */
  businessContact: AppContact;
  /** 联系人：运维人 */
  opsContact: AppContact;
  /** 联系方式 */
  phone: string;
  email: string;
  /** 简介 */
  intro: string;
  status: 'online' | 'beta' | 'offline';
  /** 本月点击次数（使用情况） */
  clicks: number;
  /** 近 7 日点击分布 */
  weekly: number[];
  /** 当前用户是否已有权限（无权限走权限申请流程） */
  hasPermission: boolean;
}

export const apps: AppItem[] = [
  {
    id: 'app-01',
    name: 'EPBP 勘探开发一体化平台',
    domain: '油气勘探开发',
    coverage: ['油气勘探', '油气开发'],
    responsibleDept: '油藏工程研究所',
    businessContact: { name: '张伟', role: '业务' },
    opsContact: { name: '李强', role: '运维' },
    phone: '0393-4821101',
    email: 'epbp-kt@funion.com',
    intro: '集成勘探、开发一体化业务，提供井位部署、方案设计与动态跟踪全流程支持。',
    status: 'online',
    clicks: 4862,
    weekly: [620, 705, 688, 741, 690, 712, 706],
    hasPermission: true,
  },
  {
    id: 'app-02',
    name: '油气工程管理系统',
    domain: '油气勘探开发',
    coverage: ['油气工程'],
    responsibleDept: '工程技术部',
    businessContact: { name: '王芳', role: '业务' },
    opsContact: { name: '赵敏', role: '运维' },
    phone: '0393-4821102',
    email: 'ycgc@funion.com',
    intro: '覆盖钻井、压裂等工程施工计划、过程监督与质量验收管理。',
    status: 'online',
    clicks: 2210,
    weekly: [300, 322, 315, 298, 340, 320, 315],
    hasPermission: true,
  },
  {
    id: 'app-03',
    name: '智能气田运行平台',
    domain: '油气勘探开发',
    coverage: ['智能气田'],
    responsibleDept: '气田开发研究所',
    businessContact: { name: '刘洋', role: '业务' },
    opsContact: { name: '陈杰', role: '运维' },
    phone: '0393-4821103',
    email: 'znqt@funion.com',
    intro: '面向气田生产场景，提供智能巡检、产量预测与运行优化服务。',
    status: 'beta',
    clicks: 986,
    weekly: [120, 135, 142, 150, 141, 149, 149],
    hasPermission: false,
  },
  {
    id: 'app-04',
    name: '生产营运指挥系统',
    domain: '生产营运与新能源',
    coverage: ['生产营运与新能源'],
    responsibleDept: '生产调度中心',
    businessContact: { name: '孙丽', role: '业务' },
    opsContact: { name: '周涛', role: '运维' },
    phone: '0393-4821104',
    email: 'scyy@funion.com',
    intro: '生产经营日报、调度指令与新能源运行监控的统一指挥平台。',
    status: 'online',
    clicks: 3544,
    weekly: [480, 512, 505, 522, 498, 510, 517],
    hasPermission: true,
  },
  {
    id: 'app-05',
    name: '安全环保监管系统',
    domain: '安全环保',
    coverage: ['安全环保'],
    responsibleDept: '安全监督中心',
    businessContact: { name: '吴刚', role: '业务' },
    opsContact: { name: '郑辉', role: '运维' },
    phone: '0393-4821105',
    email: 'aqhb@funion.com',
    intro: '隐患排查治理、环境监测预警与应急资源调度一体化监管。',
    status: 'online',
    clicks: 2875,
    weekly: [390, 402, 415, 428, 410, 415, 415],
    hasPermission: true,
  },
  {
    id: 'app-06',
    name: '财务共享服务平台',
    domain: '财务经营管理',
    coverage: ['财务管理'],
    responsibleDept: '财务共享中心',
    businessContact: { name: '徐静', role: '业务' },
    opsContact: { name: '马云', role: '运维' },
    phone: '0393-4821106',
    email: 'cwgx@funion.com',
    intro: '报销、核算、资金结算集中处理，支撑财务经营管理一体化。',
    status: 'online',
    clicks: 4120,
    weekly: [560, 590, 601, 588, 602, 590, 589],
    hasPermission: true,
  },
  {
    id: 'app-07',
    name: '外部市场管理系统',
    domain: '财务经营管理',
    coverage: ['外部市场'],
    responsibleDept: '市场开发部',
    businessContact: { name: '朱婷', role: '业务' },
    opsContact: { name: '杨帆', role: '运维' },
    phone: '0393-4821107',
    email: 'wbsc@funion.com',
    intro: '外部市场项目立项、合同履约与收入结算全过程管理。',
    status: 'online',
    clicks: 764,
    weekly: [100, 108, 112, 105, 118, 110, 111],
    hasPermission: false,
  },
  {
    id: 'app-08',
    name: '土地管理信息系统',
    domain: '财务经营管理',
    coverage: ['土地管理'],
    responsibleDept: '土地管理部',
    businessContact: { name: '钱坤', role: '业务' },
    opsContact: { name: '黄磊', role: '运维' },
    phone: '0393-4821108',
    email: 'tdgl@funion.com',
    intro: '用地台账、征地补偿与土地证照的信息化管理。',
    status: 'offline',
    clicks: 132,
    weekly: [20, 18, 19, 21, 18, 18, 18],
    hasPermission: false,
  },
  {
    id: 'app-09',
    name: '投资计划管理平台',
    domain: '投资管理',
    coverage: ['投资管理'],
    responsibleDept: '计划投资部',
    businessContact: { name: '林峰', role: '业务' },
    opsContact: { name: '何平', role: '运维' },
    phone: '0393-4821109',
    email: 'tzjh@funion.com',
    intro: '投资计划编制、下达、执行跟踪与后评价管理。',
    status: 'online',
    clicks: 1580,
    weekly: [210, 226, 230, 224, 232, 228, 230],
    hasPermission: true,
  },
  {
    id: 'app-10',
    name: '物资供应链平台',
    domain: '物资供应',
    coverage: ['物资供应'],
    responsibleDept: '物资采购中心',
    businessContact: { name: '宋佳', role: '业务' },
    opsContact: { name: '曹阳', role: '运维' },
    phone: '0393-4821110',
    email: 'wzgy@funion.com',
    intro: '物资需求、采购、库存与配送全链条协同管理。',
    status: 'online',
    clicks: 2380,
    weekly: [330, 342, 336, 350, 341, 340, 341],
    hasPermission: true,
  },
  {
    id: 'app-11',
    name: '基建设备管理平台',
    domain: '基建设备',
    coverage: ['基建设备'],
    responsibleDept: '设备管理处',
    businessContact: { name: '谢薇', role: '业务' },
    opsContact: { name: '唐勇', role: '运维' },
    phone: '0393-4821111',
    email: 'jjsb@funion.com',
    intro: '基建项目与设备资产台账、检维修计划管理。',
    status: 'beta',
    clicks: 655,
    weekly: [88, 92, 95, 90, 96, 97, 97],
    hasPermission: false,
  },
  {
    id: 'app-12',
    name: '科技项目管理系统',
    domain: '科技信息',
    coverage: ['科技信息'],
    responsibleDept: '科研管理办公室',
    businessContact: { name: '韩梅', role: '业务' },
    opsContact: { name: '冯磊', role: '运维' },
    phone: '0393-4821112',
    email: 'kjxm@funion.com',
    intro: '科研项目申报、立项、执行到验收成果转化全过程管理。',
    status: 'online',
    clicks: 1245,
    weekly: [168, 175, 180, 178, 182, 180, 182],
    hasPermission: true,
  },
  {
    id: 'app-13',
    name: '统一身份认证平台',
    domain: '科技信息',
    coverage: ['科技信息'],
    responsibleDept: '信息平台运维中心',
    businessContact: { name: '李强', role: '业务' },
    opsContact: { name: '张伟', role: '运维' },
    phone: '0393-4821113',
    email: 'sso@funion.com',
    intro: '提供全油田应用单点登录与统一账号权限服务。',
    status: 'online',
    clicks: 5230,
    weekly: [720, 748, 760, 752, 765, 745, 740],
    hasPermission: true,
  },
  {
    id: 'app-14',
    name: '人力资源管理系统',
    domain: '人力资源管理',
    coverage: ['人力资源管理'],
    responsibleDept: '人力资源服务中心',
    businessContact: { name: '王芳', role: '业务' },
    opsContact: { name: '赵敏', role: '运维' },
    phone: '0393-4821114',
    email: 'rlzy@funion.com',
    intro: '组织、人事、薪酬、培训一体化人力资源管理。',
    status: 'online',
    clicks: 3120,
    weekly: [430, 445, 452, 448, 455, 445, 445],
    hasPermission: true,
  },
  {
    id: 'app-15',
    name: '企管法律综合系统',
    domain: '风险与监督管理',
    coverage: ['企管法律'],
    responsibleDept: '企管法律事务部',
    businessContact: { name: '刘洋', role: '业务' },
    opsContact: { name: '陈杰', role: '运维' },
    phone: '0393-4821115',
    email: 'qgfl@funion.com',
    intro: '制度管理、合同法律审查与合规风险防控。',
    status: 'online',
    clicks: 890,
    weekly: [120, 126, 130, 128, 132, 127, 127],
    hasPermission: false,
  },
  {
    id: 'app-16',
    name: '审计监督作业平台',
    domain: '风险与监督管理',
    coverage: ['审计监督'],
    responsibleDept: '审计部',
    businessContact: { name: '孙丽', role: '业务' },
    opsContact: { name: '周涛', role: '运维' },
    phone: '0393-4821116',
    email: 'sjjd@funion.com',
    intro: '审计计划、现场作业、问题整改闭环管理。',
    status: 'online',
    clicks: 486,
    weekly: [66, 70, 72, 68, 71, 70, 69],
    hasPermission: false,
  },
  {
    id: 'app-17',
    name: '智慧党建平台',
    domain: '党建管理',
    coverage: ['党建统筹', '党建宣传'],
    responsibleDept: '党建工作部',
    businessContact: { name: '吴刚', role: '业务' },
    opsContact: { name: '郑辉', role: '运维' },
    phone: '0393-4821117',
    email: 'zhdj@funion.com',
    intro: '党组织生活、党员教育与党建宣传一体化平台。',
    status: 'online',
    clicks: 1730,
    weekly: [236, 245, 250, 248, 252, 250, 249],
    hasPermission: true,
  },
  {
    id: 'app-18',
    name: '综合办公协同系统',
    domain: '综合协同管理',
    coverage: ['综合办公'],
    responsibleDept: '综合办公室',
    businessContact: { name: '徐静', role: '业务' },
    opsContact: { name: '马云', role: '运维' },
    phone: '0393-4821118',
    email: 'zhbg@funion.com',
    intro: '公文、会议、督查督办等综合办公协同服务。',
    status: 'online',
    clicks: 4480,
    weekly: [610, 635, 648, 640, 655, 646, 646],
    hasPermission: true,
  },
];

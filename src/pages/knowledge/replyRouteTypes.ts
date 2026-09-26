export type RouteStepState = 'pass' | 'miss' | 'skip' | 'error' | 'running' | 'unknown';
export type RouteHit = '商品知识' | '场景' | '未命中' | '未执行';
export type RouteOutcome = 'AI已回复' | '转人工' | '人工接管' | '生成失败' | '发送失败' | '处理中';

export interface RouteStep {
  name: string;
  state: RouteStepState;
  reason: string;
  ms?: number;
}

export interface RouteEvidence {
  field: string;
  expected: string;
  actual: string;
  result: '通过' | '不通过' | '未评估';
}

export type RouteConfigTarget =
  | { kind: 'knowledge'; id: string; productId: string; code: string }
  | { kind: 'scene'; id: string };

export type RouteCandidate = RouteConfigTarget & {
  name: string;
  parent: string;
  result: '采用' | '淘汰' | '兜底';
  reason: string;
  evidence: RouteEvidence[];
  snapshot: string;
};

export interface RouteMessage {
  id: string;
  side: 'buyer' | 'bot' | 'agent' | 'system';
  text: string;
  time: string;
  traceId?: string;
}

export interface RouteSession {
  id: string;
  buyer: string;
  shop: string;
  agent: string;
  messages: RouteMessage[];
}

export interface ReplyRouteRecord {
  id: string;
  sessionId: string;
  messageId: string;
  time: string;
  text: string;
  hit: RouteHit;
  outcome: RouteOutcome;
  reason: string;
  reasonCode: string;
  elapsed: number | null;
  reply: string;
  context: { field: string; value: string }[];
  steps: RouteStep[];
  candidates: RouteCandidate[];
}

export const ROUTE_HIT_LABELS: Record<RouteHit, string> = {
  商品知识: '商品知识',
  场景: '场景',
  未命中: '未匹配',
  未执行: '未进行匹配',
};

export const ROUTE_OUTCOME_LABELS: Record<RouteOutcome, string> = {
  AI已回复: 'AI 已回复',
  转人工: '转人工',
  人工接管: '客服已接管',
  生成失败: '生成失败',
  发送失败: '发送失败',
  处理中: '处理中',
};

export const formatRouteDuration = (ms: number | null) => ms === null ? '—' : ms < 1000 ? `${ms} 毫秒` : `${(ms / 1000).toFixed(2)} 秒`;

export const ROUTE_STEP_META: Record<RouteStepState, { label: string; mark: string }> = {
  pass: { label: '已完成', mark: '✓' },
  miss: { label: '未匹配', mark: '−' },
  skip: { label: '未执行', mark: '−' },
  error: { label: '失败', mark: '!' },
  running: { label: '进行中', mark: '…' },
  unknown: { label: '等待中', mark: '?' },
};

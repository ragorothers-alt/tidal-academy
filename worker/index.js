/* 潮汐小島 · 島民的心思（Cloudflare Worker）：遊戲把外面島民的情況送來，這裡用 OpenAI Decisions API（gpt-6-luna）替每位島民回答三題——
   接下來想做什麼、心情、想不想主動找玩家——再照 laya 的回答格式送回去，遊戲那邊（src/isle/mind.js）兩種後端共用同一套解讀。
   OpenAI 金鑰與通行碼都是 Worker 的 secret（npx wrangler secret put OPENAI_API_KEY／ACCESS_CODE），不會出現在前端或 repo。
   防盜用：要帶通行碼（Authorization: Bearer <通行碼>；ACCESS_CODE 可以用逗號放好幾組，少於 8 個字的不算）、只收 ORIGINS 列出的網站、
   題目與選項寫死在這裡（不能拿來問別的事）、每個 IP 每分鐘最多 PER_MINUTE 次、全站每天最多 DAILY_TOKENS 個 token（Limiter 記帳，超過回 429，UTC 0 點重算）。
     GET  /health  → {"status": "ok", "quota": "ok" | "out"}（通行碼對、金鑰有設；不花 token）
     POST /decide  {"villagers": ["情況描述", ...]}（1–16 筆，每筆最多 600 字）→ {"results": [{answers: {action, mood, greet}} | null, ...]}（照原本的順序） */

/** 島民可以選的事與心情：和 mind.js 的 ACTIONS、MOODS 同一份說明（「走過來跟玩家打招呼」不放進選項，由 greet 這題決定） */
export const ACTIONS = { stroll: '在島上隨意散步、到處看看', plaza: '到廣場大樹下，和大家待在一起', bench: '找一張長椅坐下來休息、看風景', flowers: '去花叢邊看花、聞花香', water: '到小溪或海邊看水、吹海風', friend: '去找另一位島民聊天', hobby: '待在原地做自己喜歡的事' };
export const MOODS = { happy: '開心、有活力', calm: '平靜、悠閒', sleepy: '有點睏', lonely: '有點寂寞、想找人說話', curious: '好奇、想到處看看' };
const choices = o => Object.entries(o).map(([value, description]) => ({ value, description }));
export const QUESTIONS = [
  { type: 'choice', name: 'action', instructions: '依照這位島民的個性與現在的情況，接下來幾分鐘他最想做哪一件事？', choices: choices(ACTIONS) },
  { type: 'choice', name: 'mood', instructions: '這位島民現在的心情？', choices: choices(MOODS) },
  { type: 'predicate', name: 'greet', instructions: '這位島民現在想主動走過去跟玩家說話嗎？' }
];
const MAX_ITEMS = 16, MAX_LEN = 600, MAX_BODY = 64 * 1024, EST = 400;   // EST：每位島民大約用掉的 token，先預留，回來再照實際用量補正

/** Decisions 的回答 → laya 的格式（action.probabilities 是 {key: 機率}、mood.choice、greet.noul）；「想做什麼」被拒答或缺了就回 null */
export function toLaya(j) {
  const a = {}; ((j && j.answers) || []).forEach(x => { if (x && x.name && x.type !== 'refusal') a[x.name] = x; });
  if (!a.action || !Array.isArray(a.action.probabilities)) return null;
  const probs = Object.fromEntries(a.action.probabilities.filter(p => p && p.value in ACTIONS).map(p => [p.value, +p.probability || 0]));
  return { answers: {
    action: { choice: a.action.choice, probabilities: probs },
    mood: a.mood && a.mood.choice in MOODS ? { choice: a.mood.choice } : null,
    greet: { noul: a.greet && typeof a.greet.probability === 'number' ? a.greet.probability : 0 }
  } };
}

const json = (status, data, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const cors = origin => ({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' });
const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const same = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };   // 逐字比完才回答，不讓比對時間洩漏通行碼
/** 帶來的通行碼（Authorization: Bearer …）對得上其中一組就回傳它，否則 null；沒設 ACCESS_CODE 時誰都不能用 */
function codeOf(req, env) {
  const m = /^Bearer (.+)$/.exec(req.headers.get('Authorization') || '');
  return m ? list(env.ACCESS_CODE).filter(c => c.length >= 8).find(c => same(c, m[1])) || null : null;
}
/** 給 OpenAI 的 safety_identifier：通行碼的雜湊（一組通行碼大致是一個人，不送出通行碼本身） */
async function who(code) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));
  return 'tidal-' + Array.from(h.slice(0, 12), b => b.toString(16).padStart(2, '0')).join('');
}
/** 替一位島民問一次 Decisions：回傳 { ok, result, tokens } */
async function decide(env, text, sid) {
  try {
    const r = await fetch((env.OPENAI_BASE || 'https://api.openai.com/v1') + '/decisions', {   // OPENAI_BASE 只在本機測試時指到假的伺服器
      method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL || 'gpt-6-luna', input: text, questions: QUESTIONS, safety_identifier: sid }),
      signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) return { ok: false, status: r.status, tokens: 0 };
    const j = await r.json();
    return { ok: true, result: toLaya(j), tokens: (j.usage && j.usage.input_tokens) || 0 };
  } catch (e) { return { ok: false, status: 0, tokens: 0 }; }   // 逾時或連不上
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    if (!list(env.ORIGINS).includes(origin)) return json(403, { error: 'origin not allowed' });
    const h = cors(origin);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const code = codeOf(req, env);
    if (!code) return json(401, { error: 'bad access code' }, h);
    if (!env.OPENAI_API_KEY) return json(503, { error: 'openai key not set' }, h);
    const cap = +env.DAILY_TOKENS || 5e6, stub = env.LIMITER.get(env.LIMITER.idFromName('global'));
    const ask = o => stub.fetch('https://limiter/', { method: 'POST', body: JSON.stringify(o) }).then(r => r.json());
    if (url.pathname === '/health' && req.method === 'GET') { const u = await ask({ op: 'peek' }); return json(200, { status: 'ok', quota: u.used < cap ? 'ok' : 'out' }, h); }
    if (url.pathname !== '/decide' || req.method !== 'POST') return json(404, { error: 'not found' }, h);
    if (+(req.headers.get('Content-Length') || 0) > MAX_BODY) return json(413, { error: 'body too large' }, h);
    let vs; try { vs = (await req.json()).villagers; } catch (e) { return json(400, { error: 'bad json' }, h); }
    if (!Array.isArray(vs) || !vs.length || vs.length > MAX_ITEMS || !vs.every(s => typeof s === 'string' && s.length && s.length <= MAX_LEN)) return json(422, { error: `'villagers' must be 1..${MAX_ITEMS} strings of at most ${MAX_LEN} chars` }, h);
    const est = EST * vs.length, r = await ask({ op: 'reserve', ip: req.headers.get('CF-Connecting-IP') || 'unknown', tokens: est });
    if (!r.ok) return json(429, { error: r.why }, h);   // rate：這個 IP 問太快；quota：今天的額度用完了
    const sid = await who(code), outs = await Promise.all(vs.map(text => decide(env, text, sid)));
    ctx.waitUntil(ask({ op: 'adjust', tokens: outs.reduce((n, o) => n + o.tokens, 0) - est }));   // 照實際用量補正預留的額度
    if (outs.every(o => !o.ok)) return json(502, { error: 'openai failed', status: outs[0].status }, h);
    return json(200, { results: outs.map(o => o.result || null) }, h);
  }
};

/** 全站共用一個的記帳員（Durable Object，免費方案用 SQLite 版）：每個 IP 一分鐘內的次數記在記憶體，當天用掉的 token 存起來
     {op: 'reserve', ip, tokens} → 沒超過就先記上去 {ok: true}，否則 {ok: false, why: 'rate' | 'quota'}
     {op: 'adjust', tokens}      → 補正（可以是負的）
     {op: 'peek'}                → {ok: true, used} */
export class Limiter {
  constructor(state, env) { this.state = state; this.env = env; this.ips = new Map(); this.usage = null; }
  async fetch(req) {
    const o = await req.json(), now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
    if (!this.usage) this.usage = (await this.state.storage.get('usage')) || { day, tokens: 0 };
    if (this.usage.day !== day) this.usage = { day, tokens: 0 };   // 過了 UTC 0 點：重新計算
    if (o.op === 'peek') return Response.json({ ok: true, used: this.usage.tokens });
    if (o.op === 'reserve') {
      let w = this.ips.get(o.ip); if (!w || now - w.t >= 60000) { w = { t: now, n: 0 }; this.ips.set(o.ip, w); }
      if (w.n >= (+this.env.PER_MINUTE || 6)) return Response.json({ ok: false, why: 'rate' });
      if (this.usage.tokens + o.tokens > (+this.env.DAILY_TOKENS || 5e6)) return Response.json({ ok: false, why: 'quota' });
      w.n++;
      if (this.ips.size > 5000) for (const [k, v] of this.ips) if (now - v.t >= 60000) this.ips.delete(k);
    }
    this.usage.tokens = Math.max(0, this.usage.tokens + (+o.tokens || 0));
    await this.state.storage.put('usage', this.usage);
    return Response.json({ ok: true, used: this.usage.tokens });
  }
}

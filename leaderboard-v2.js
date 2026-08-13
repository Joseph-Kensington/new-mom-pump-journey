(function () {
  "use strict";
  const CONFIG = window.__JOURNEY_LEADERBOARD_CONFIG__ || {};
  const STATE_KEY = "new-mother-journey-activity-v1";
  const ID_KEY = "new-mother-journey-leaderboard-v1:anonymous-id";
  const VERSION = CONFIG.gameVersion || "v9";

  function state() { try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); } catch (_) { return {}; } }
  function save(next) { const value = Object.assign({}, state(), next); localStorage.setItem(STATE_KEY, JSON.stringify(value)); return value; }
  function configured() { return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.supabaseUrl || "") && /^(eyJ|sb_publishable_)/.test(CONFIG.supabaseAnonKey || ""); }
  function anonymousId() {
    let id = localStorage.getItem(ID_KEY);
    if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const n = Math.random() * 16 | 0; return (c === "x" ? n : (n & 3 | 8)).toString(16); }); localStorage.setItem(ID_KEY, id); }
    return id;
  }
  function total(s) { return s.energy + s.calm + s.ready + s.team; }
  function escape(value) { const d = document.createElement("div"); d.textContent = value || "匿名旅人"; return d.innerHTML; }
  async function rpc(name, body) {
    if (!configured()) throw new Error("not configured");
    const response = await fetch(CONFIG.supabaseUrl + "/rest/v1/rpc/" + name, { method: "POST", headers: { "Content-Type": "application/json", apikey: CONFIG.supabaseAnonKey, Authorization: "Bearer " + CONFIG.supabaseAnonKey }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error("remote unavailable");
    return response.json();
  }
  function rows(currentId) { return rpc("get_journey_leaderboard", { p_anonymous_id: anonymousId(), p_game_version: VERSION, p_current_id: currentId || null }); }
  function submit(s, nickname) { return rpc("submit_journey_score", { p_anonymous_id: anonymousId(), p_nickname: nickname || "匿名旅人", p_energy: s.energy, p_calm: s.calm, p_ready: s.ready, p_team: s.team, p_game_version: VERSION }).then(r => r[0]); }
  function style() {
    if (document.getElementById("journey-rank-v2-style")) return;
    const tag = document.createElement("style"); tag.id = "journey-rank-v2-style";
    tag.textContent = ".journey-rank-home{width:min(455px,100%);margin:20px 0 8px;padding:15px 17px;border:1px solid rgba(255,255,255,.38);border-radius:16px;background:rgba(10,18,38,.4);color:#fff;backdrop-filter:blur(5px)}.journey-rank-home h3{margin:0 0 8px;font-size:18px}.journey-rank-home ol{margin:0;padding-left:24px;line-height:1.85}.journey-rank-home button{margin-top:10px;border:0;border-radius:999px;padding:9px 14px;background:#f6b585;color:#172033;font:inherit;font-weight:700;cursor:pointer}.journey-rank-final{margin:16px 0;padding:13px 14px;border-left:3px solid #f3ac7b;background:rgba(255,255,255,.1);color:#fff}.journey-rank-final p{margin:5px 0}.journey-rank-final strong{font-size:20px}.journey-rank-final small{opacity:.86}.ending-actions #journey-leaderboard-open{order:3;margin-left:auto;min-height:56px;padding:13px 23px!important;font-size:17px!important;font-weight:700;background:#f6b585!important;color:#172033!important;border:0!important}.rank-modal{position:fixed;inset:0;z-index:10070;display:grid;place-items:center;padding:20px;background:rgba(20,17,24,.72);backdrop-filter:blur(7px)}.rank-card{width:min(720px,100%);max-height:88vh;overflow:auto;border-radius:22px;background:#fffaf6;color:#352d37;padding:26px;box-shadow:0 24px 70px rgba(0,0,0,.28)}.rank-card h2{margin:0 0 8px;font-size:26px}.rank-close{float:right;border:0;background:transparent;font-size:24px;cursor:pointer}.rank-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.rank-stats span{background:#f3ece8;border-radius:12px;padding:9px;font-size:12px}.rank-stats b{display:block;margin-top:4px;font-size:20px}.rank-status{min-height:24px;color:#74596a}.rank-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}.rank-table th,.rank-table td{padding:9px 5px;border-bottom:1px solid #eadfd9;text-align:left}.rank-me{background:#f4e4d6}.rank-note{font-size:12px;color:#756b70;margin-top:15px}@media(max-width:680px){.ending-actions #journey-leaderboard-open{width:100%;order:-1;margin-left:0}.rank-stats{grid-template-columns:repeat(2,1fr)}}";
    document.head.appendChild(tag);
  }
  function table(list) {
    const top = list.filter(r => Number(r.rank) <= 100);
    return "<h3>全区排行榜（前 100 名）</h3><table class=\"rank-table\"><thead><tr><th>排名</th><th>昵称</th><th>总分</th><th>体/从/备/默</th></tr></thead><tbody>" + (top.map(r => "<tr class=\"" + (r.is_current ? "rank-me" : "") + "\"><td>" + r.rank + "</td><td>" + escape(r.nickname) + "</td><td>" + r.total_score + "</td><td>" + r.energy + "/" + r.calm + "/" + r.ready + "/" + r.team + "</td></tr>").join("") || "<tr><td colspan=\"4\">还没有人留下这一夜的记录，成为第一位吧。</td></tr>") + "</tbody></table>";
  }
  async function open(options) {
    style(); const old = document.querySelector(".rank-modal"); if (old) old.remove();
    const data = options || {}; const modal = document.createElement("div"); modal.className = "rank-modal";
    const cards = data.stats ? "<div class=\"rank-stats\"><span>体力<b>" + data.stats.energy + "</b></span><span>从容<b>" + data.stats.calm + "</b></span><span>准备<b>" + data.stats.ready + "</b></span><span>默契<b>" + data.stats.team + "</b></span></div><p><strong>" + escape(data.nickname) + " · 综合得分：" + total(data.stats) + "</strong></p>" : "";
    modal.innerHTML = "<section class=\"rank-card\" role=\"dialog\" aria-modal=\"true\"><button class=\"rank-close\" aria-label=\"关闭\">×</button><p class=\"chapter-mark\">互动体验记录</p><h2>" + (data.stats ? "这一夜留下的数字" : "全区排行榜") + "</h2>" + cards + "<div class=\"rank-status\">正在加载排行榜…</div><div class=\"rank-results\"></div><p class=\"rank-note\">排行榜只记录互动剧情中的选择结果，用于活动统计与奖品发放；不代表照护能力、父母优劣或标准答案。</p></section>";
    document.body.appendChild(modal); const close = () => modal.remove(); modal.querySelector(".rank-close").onclick = close; modal.onclick = e => { if (e.target === modal) close(); };
    try { const list = await rows(data.submissionId); const mine = list.find(r => r.is_current); modal.querySelector(".rank-status").textContent = mine ? "你的当前排名：第 " + mine.rank + " 名" : "按综合得分排序；同分时较早完成者在前。"; modal.querySelector(".rank-results").innerHTML = table(list); } catch (_) { modal.querySelector(".rank-status").textContent = "排行榜暂时无法加载，请稍后重试。"; }
  }
  async function addHome() {
    const cover = document.querySelector(".cover-screen"), actions = cover && cover.querySelector(".cover-actions");
    if (!cover || !actions || cover.querySelector(".journey-rank-home")) return;
    style(); const box = document.createElement("section"); box.className = "journey-rank-home"; box.innerHTML = "<h3>全区排行榜</h3><p>正在加载…</p>"; actions.insertAdjacentElement("afterend", box);
    try { const list = await rows(); const top = list.filter(r => Number(r.rank) <= 5); box.innerHTML = "<h3>全区排行榜</h3>" + (top.length ? "<ol>" + top.map(r => "<li><b>第 " + r.rank + " 名</b> · " + escape(r.nickname) + " · " + r.total_score + " 分</li>").join("") + "</ol>" : "<p>还没有人留下这一夜的记录，成为第一位吧。</p>") + "<button type=\"button\">查看完整排行榜</button>"; box.querySelector("button").onclick = () => open({}); } catch (_) { box.innerHTML = "<h3>全区排行榜</h3><p>排行榜暂时无法加载，请稍后再试。</p>"; }
  }
  function finalStats(ending) { const nums = Array.from(ending.querySelectorAll(".final-stats span b")).map(n => Number(n.textContent || 0)); return nums.length === 4 ? { energy: nums[0], calm: nums[1], ready: nums[2], team: nums[3] } : null; }
  function drawFinal(ending, result, note) {
    let card = ending.querySelector(".journey-rank-final"); if (!card) { card = document.createElement("section"); card.className = "journey-rank-final"; (ending.querySelector(".ending-copy") || ending).appendChild(card); }
    card.innerHTML = "<p>本次记录 · " + escape(result.nickname) + "</p><p><strong>综合得分：" + result.total + "</strong>" + (result.rank ? " · 当前第 " + result.rank + " 名" : "") + "</p><p>体力 " + result.stats.energy + " · 从容 " + result.stats.calm + " · 准备 " + result.stats.ready + " · 默契 " + result.stats.team + "</p><small>" + escape(note) + "</small>";
  }
  async function addFinal() {
    const ending = document.querySelector(".ending-screen"); if (!ending || ending.dataset.rankV2) return;
    const stats = finalStats(ending); if (!stats) return; ending.dataset.rankV2 = "1"; style();
    const original = state(); const result = { nickname: original.nickname || "匿名旅人", stats: stats, total: total(stats), completedAt: new Date().toISOString() }; save({ result: result }); drawFinal(ending, result, "正在保存这一次的体验记录…");
    const actions = ending.querySelector(".ending-actions"); let button = actions && actions.querySelector("#journey-leaderboard-open");
    if (!button && actions) { button = document.createElement("button"); button.id = "journey-leaderboard-open"; button.type = "button"; button.className = "outline-button"; button.textContent = "查看我的排名与排行榜"; actions.appendChild(button); }
    if (button) button.onclick = () => open(state().result || result);
    try { const saved = await submit(stats, result.nickname); result.submissionId = saved.submission_id; result.rank = saved.rank; save({ result: result }); drawFinal(ending, result, "已保存到活动排行榜；同分时较早完成者在前。"); } catch (_) { drawFinal(ending, result, "暂时无法同步云端，本地记录已保留。"); }
  }
  window.JourneyLeaderboard = Object.assign(window.JourneyLeaderboard || {}, { open: () => open(state().result || {}), openFull: open, getRows: rows });
  function observe() { addHome(); addFinal(); }
  new MutationObserver(observe).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", observe); observe();
}());
/* Keep the leaderboard out of the nine story scenes. */
(function () {
  function keepLeaderboardOnHomeOnly() {
    if (!document.querySelector(".story-screen")) return;
    document.querySelectorAll(".journey-rank-home").forEach(function (node) { node.remove(); });
  }
  new MutationObserver(keepLeaderboardOnHomeOnly).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", keepLeaderboardOnHomeOnly);
  keepLeaderboardOnHomeOnly();
}());

/* The original module may leave an obsolete duplicate entry beneath the ending actions. */
(function () {
  function removeLegacyEndingEntry() {
    if (!document.querySelector(".ending-screen")) return;
    document.querySelectorAll(".leaderboard-entry").forEach(function (node) { node.remove(); });
  }
  new MutationObserver(removeLegacyEndingEntry).observe(document.documentElement, { childList: true, subtree: true });
  removeLegacyEndingEntry();
}());

/* CSS fallback: never paint the home leaderboard inside a story scene. */
(function () {
  var style = document.createElement("style");
  style.textContent = ".story-screen .journey-rank-home{display:none!important}";
  document.head.appendChild(style);
}());

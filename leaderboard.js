(function () {
  "use strict";

  const CONFIG = window.__JOURNEY_LEADERBOARD_CONFIG__ || {};
  const STORAGE_PREFIX = "new-mother-journey-leaderboard-v1";
  const labels = { energy: "体力", calm: "从容", ready: "准备", team: "默契" };
  let endingPayload = null;
  let modal = null;

  function configured() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.supabaseUrl || "") &&
      /^(eyJ|sb_publishable_)/.test(CONFIG.supabaseAnonKey || "");
  }

  function anonymousId() {
    const key = STORAGE_PREFIX + ":anonymous-id";
    let value = localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 3 | 8)).toString(16);
      });
      localStorage.setItem(key, value);
    }
    return value;
  }

  function cleanNickname(value) {
    const cleaned = (value || "").trim().replace(/[<>]/g, "").replace(/[^\p{L}\p{N}_\- ]/gu, "").slice(0, 16);
    return cleaned || "匿名旅人";
  }

  function findStats() {
    const values = Array.from(document.querySelectorAll(".final-stats span"));
    const stats = { energy: 0, calm: 0, ready: 0, team: 0 };
    values.forEach(function (node, index) {
      const number = Number((node.querySelector("b") || {}).textContent || 0);
      const key = ["energy", "calm", "ready", "team"][index];
      if (key) stats[key] = Math.max(0, Math.min(100, number));
    });
    return values.length === 4 ? stats : null;
  }

  function score(stats) {
    return stats.energy + stats.calm + stats.ready + stats.team;
  }

  async function rpc(name, body) {
    const response = await fetch(CONFIG.supabaseUrl + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: CONFIG.supabaseAnonKey,
        Authorization: "Bearer " + CONFIG.supabaseAnonKey
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error("服务暂时不可用");
    return response.json();
  }

  function style() {
    if (document.getElementById("journey-leaderboard-style")) return;
    const tag = document.createElement("style");
    tag.id = "journey-leaderboard-style";
    tag.textContent = `
      .leaderboard-entry{margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .leaderboard-entry button{border:1px solid rgba(255,255,255,.62);background:rgba(255,255,255,.13);color:#fff;border-radius:999px;padding:11px 16px;font:inherit;cursor:pointer}
      .leaderboard-entry small{width:100%;color:rgba(255,255,255,.76)}
      .leaderboard-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(20,17,24,.7);backdrop-filter:blur(7px)}
      .leaderboard-card{width:min(650px,100%);max-height:88vh;overflow:auto;border-radius:22px;background:#fffaf6;color:#352d37;padding:26px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
      .leaderboard-card h2{font-size:26px;margin:0 0 7px}.leaderboard-card p{line-height:1.65}.leaderboard-close{float:right;border:0;background:transparent;font-size:24px;cursor:pointer}
      .leaderboard-score{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}.leaderboard-score span{background:#f3ece8;border-radius:12px;padding:9px;font-size:12px}.leaderboard-score b{display:block;font-size:20px;margin-top:4px}
      .leaderboard-form{display:flex;gap:8px;margin:16px 0}.leaderboard-form input{min-width:0;flex:1;border:1px solid #d8cac1;border-radius:10px;padding:10px;font:inherit}.leaderboard-primary{border:0;border-radius:10px;padding:10px 14px;background:#5c3d5c;color:#fff;font:inherit;cursor:pointer}
      .leaderboard-status{min-height:24px;color:#74596a}.leaderboard-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}.leaderboard-table th,.leaderboard-table td{padding:9px 5px;border-bottom:1px solid #eadfd9;text-align:left}.leaderboard-me{background:#f4e4d6}.leaderboard-note{font-size:12px;color:#756b70;margin-top:15px}
      @media(max-width:520px){.leaderboard-card{padding:20px 16px}.leaderboard-score{grid-template-columns:repeat(2,1fr)}.leaderboard-form{flex-direction:column}}
    `;
    document.head.appendChild(tag);
  }

  function openModal() {
    if (!endingPayload) return;
    style();
    if (modal) modal.remove();
    const stats = endingPayload.stats;
    const total = score(stats);
    modal = document.createElement("div");
    modal.className = "leaderboard-modal";
    modal.innerHTML = `
      <section class="leaderboard-card" role="dialog" aria-modal="true" aria-label="我的照护记录与排行榜">
        <button class="leaderboard-close" aria-label="关闭">×</button>
        <p class="chapter-mark">我的照护记录</p>
        <h2>这一夜留下的数字</h2>
        <p>它不是标准答案，也不衡量谁做得更好；只是这一次照护路径留下的一份记录。</p>
        <div class="leaderboard-score">
          <span>体力<b>${stats.energy}</b></span><span>从容<b>${stats.calm}</b></span><span>准备<b>${stats.ready}</b></span><span>默契<b>${stats.team}</b></span>
        </div>
        <p><strong>综合得分：${total}</strong></p>
        <div class="leaderboard-form"><input maxlength="16" aria-label="可选昵称" placeholder="昵称（可选，默认匿名旅人）"><button class="leaderboard-primary">查看我的排名</button></div>
        <div class="leaderboard-status" aria-live="polite"></div>
        <div class="leaderboard-results"></div>
        <p class="leaderboard-note">仅保存匿名标识、昵称（如填写）、四项状态、总分、版本与完成时间；不收集姓名、电话或邮箱。每个匿名设备与版本仅保留一条记录。</p>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelector(".leaderboard-close").onclick = function () { modal.remove(); modal = null; };
    modal.onclick = function (event) { if (event.target === modal) { modal.remove(); modal = null; } };
    modal.querySelector(".leaderboard-primary").onclick = submitAndShow;
  }

  function renderRows(rows) {
    const results = modal.querySelector(".leaderboard-results");
    const own = rows.find(function (row) { return row.is_current; });
    const list = rows.filter(function (row) { return row.rank <= 100; });
    const rowHtml = list.map(function (row) {
      return `<tr class="${row.is_current ? "leaderboard-me" : ""}"><td>${row.rank}</td><td>${escapeHtml(row.nickname)}</td><td>${row.total_score}</td><td>${row.energy}/${row.calm}/${row.ready}/${row.team}</td></tr>`;
    }).join("");
    results.innerHTML = `${own ? `<p><strong>你的当前排名：第 ${own.rank} 名</strong></p>` : ""}<h3>排行榜（前 100 名）</h3><table class="leaderboard-table"><thead><tr><th>排名</th><th>昵称</th><th>总分</th><th>体/从/备/默</th></tr></thead><tbody>${rowHtml || "<tr><td colspan='4'>还没有记录，成为第一位留下体验的人吧。</td></tr>"}</tbody></table>`;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value || "匿名旅人";
    return div.innerHTML;
  }

  async function submitAndShow() {
    const status = modal.querySelector(".leaderboard-status");
    const button = modal.querySelector(".leaderboard-primary");
    if (!configured()) {
      status.textContent = "排行榜正在准备中：管理员尚未完成云端配置。";
      return;
    }
    button.disabled = true;
    status.textContent = "正在保存匿名记录并计算排名…";
    try {
      const nickname = cleanNickname(modal.querySelector("input").value);
      await rpc("submit_journey_score", {
        p_anonymous_id: anonymousId(), p_nickname: nickname,
        p_energy: endingPayload.stats.energy, p_calm: endingPayload.stats.calm,
        p_ready: endingPayload.stats.ready, p_team: endingPayload.stats.team,
        p_game_version: CONFIG.gameVersion || "v9"
      });
      const rows = await rpc("get_journey_leaderboard", { p_anonymous_id: anonymousId(), p_game_version: CONFIG.gameVersion || "v9" });
      renderRows(rows);
      status.textContent = "已保存。排名相同时，较早完成者在前。";
    } catch (error) {
      status.textContent = "暂时无法连接排行榜，请稍后再试。";
    } finally {
      button.disabled = false;
    }
  }

  function addEntryButton() {
    const ending = document.querySelector(".ending-copy");
    const stats = findStats();
    if (!ending || !stats || ending.querySelector(".leaderboard-entry") || ending.querySelector("#journey-leaderboard-open")) return;
    endingPayload = { stats: stats };
    const entry = document.createElement("div");
    entry.className = "leaderboard-entry";
    entry.innerHTML = `<button type="button">查看我的排名与排行榜</button><small>匿名参与 · 记录会安全保存到已配置的云端排行榜</small>`;
    entry.querySelector("button").onclick = openModal;
    const actions = ending.querySelector(".ending-actions");
    (actions || ending).insertAdjacentElement("afterend", entry);
  }

  window.JourneyLeaderboard = { open: openModal };
  new MutationObserver(addEntryButton).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("journey:complete", function (event) {
    if (event.detail && event.detail.stats) endingPayload = event.detail;
    setTimeout(addEntryButton, 0);
  });
  document.addEventListener("DOMContentLoaded", addEntryButton);
}());

(function(){ if (!document.querySelector('script[data-journey-rank-v2]')) { var s=document.createElement('script'); s.src='./leaderboard-v2.js?v=4'; s.defer=true; s.dataset.journeyRankV2='1'; document.head.appendChild(s); } }());

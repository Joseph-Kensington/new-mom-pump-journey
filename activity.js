(function () {
  "use strict";

  const KEY = "new-mother-journey-activity-v1";
  const blocked = /(?:管理员|客服|微信|vx|qq|电话|手机号|傻|操|fuck|shit)/i;
  let startBypass = false;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { return {}; }
  }
  function write(next) {
    const state = Object.assign({}, read(), next);
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  }
  function cleanName(value) {
    return (value || "").trim().replace(/[<>]/g, "").replace(/[^\p{L}\p{N}_\- ]/gu, "").slice(0, 16);
  }
  function style() {
    if (document.getElementById("activity-style")) return;
    const css = document.createElement("style");
    css.id = "activity-style";
    css.textContent = [
      ".activity-layer{position:fixed;inset:0;z-index:10020;display:grid;place-items:center;padding:20px;background:rgba(10,12,22,.72);backdrop-filter:blur(8px)}",
      ".activity-card{width:min(470px,100%);border-radius:24px;background:#fffaf6;color:#372d37;padding:28px;box-shadow:0 30px 80px rgba(0,0,0,.35)}",
      ".activity-card h2{margin:8px 0 10px;font-size:30px}.activity-card p{line-height:1.65;color:#6f6268}.activity-card input{box-sizing:border-box;width:100%;border:1px solid #d8cac1;border-radius:12px;padding:14px;font:inherit;font-size:17px}.activity-card button{margin-top:14px;width:100%;border:0;border-radius:12px;padding:14px;background:#6b4067;color:#fff;font:inherit;font-size:17px;font-weight:700;cursor:pointer}.activity-error{min-height:22px;color:#aa4c50;font-size:13px}",
      ".activity-history{margin-top:12px!important;background:rgba(255,255,255,.12)!important;color:#fff!important;border:1px solid rgba(255,255,255,.5)!important;font-size:15px!important}",
      ".ending-actions #journey-leaderboard-open{order:3;min-height:56px;padding:13px 23px!important;font-size:17px!important;font-weight:700;background:#f6b585!important;color:#172033!important;border:0!important;box-shadow:0 8px 20px rgba(0,0,0,.16)}",
      ".top-stats div em{font-size:22px!important;font-weight:800}.top-stats div span{font-size:13px!important;font-weight:700}.top-stats div i{height:10px!important}.outcome-impact b{font-size:15px!important;padding:7px 9px!important}",
      "@media(max-width:680px){.ending-actions #journey-leaderboard-open{width:100%;order:-1}.activity-card{padding:22px}.top-stats div em{font-size:20px!important}}"
    ].join("");
    document.head.appendChild(css);
  }
  function removeModal() {
    const node = document.querySelector(".activity-layer");
    if (node) node.remove();
  }
  function openName(onDone) {
    style(); removeModal();
    const state = read();
    const layer = document.createElement("div");
    layer.className = "activity-layer";
    layer.innerHTML = '<section class="activity-card" role="dialog" aria-modal="true" aria-label="填写排行榜昵称"><p class="chapter-mark">活动参与</p><h2>先留下一个昵称</h2><p>昵称将用于排行榜与活动奖品联系，不建议填写手机号、真实姓名等敏感信息。</p><input maxlength="16" placeholder="填写 2–16 个字符的昵称" aria-label="排行榜昵称"><div class="activity-error" aria-live="polite"></div><button>开始我的故事</button></section>';
    document.body.appendChild(layer);
    const input = layer.querySelector("input");
    input.value = state.nickname || "";
    input.focus();
    layer.querySelector("button").onclick = function () {
      const nickname = cleanName(input.value);
      const error = layer.querySelector(".activity-error");
      if (nickname.length < 2 || blocked.test(nickname)) {
        error.textContent = "请填写 2–16 个合适的昵称。";
        return;
      }
      write({ nickname: nickname, updatedAt: new Date().toISOString() });
      removeModal();
      if (onDone) onDone(nickname);
    };
  }
  function showHistory() {
    const state = read();
    style(); removeModal();
    const result = state.result;
    const rows = result ? '<p><strong>' + escape(result.nickname || state.nickname || "匿名旅人") + ' · 综合得分 ' + result.total + '</strong></p><p>体力 ' + result.stats.energy + ' · 从容 ' + result.stats.calm + ' · 准备 ' + result.stats.ready + ' · 默契 ' + result.stats.team + '</p><p>完成于 ' + new Date(result.completedAt).toLocaleString() + '</p>' : "<p>你还没有完成过故事。</p>";
    const layer = document.createElement("div");
    layer.className = "activity-layer";
    layer.innerHTML = '<section class="activity-card" role="dialog" aria-modal="true"><h2>我的历史成绩</h2>' + rows + '<button>关闭</button></section>';
    document.body.appendChild(layer);
    layer.querySelector("button").onclick = removeModal;
  }
  function escape(value) { const d = document.createElement("div"); d.textContent = value; return d.innerHTML; }
  function observe() {
    style();
    const cover = document.querySelector(".cover-screen");
    if (cover) {
      const actions = cover.querySelector(".cover-actions");
      const state = read();
      if (actions && state.result && !actions.querySelector(".activity-history")) {
        const button = document.createElement("button");
        button.className = "activity-history";
        button.type = "button";
        button.textContent = "查看我的历史成绩";
        button.onclick = showHistory;
        actions.appendChild(button);
      }
    }
    const ending = document.querySelector(".ending-screen");
    if (ending) {
      const values = Array.from(ending.querySelectorAll(".final-stats span b")).map(function (n) { return Number(n.textContent || 0); });
      if (values.length === 4) {
        const state = read();
        write({ result: { nickname: state.nickname || "匿名旅人", stats: {energy:values[0], calm:values[1], ready:values[2], team:values[3]}, total: values.reduce(function(a,b){return a+b;},0), completedAt: new Date().toISOString() } });
      }
      const actions = ending.querySelector(".ending-actions");
      if (actions && !actions.querySelector("#journey-leaderboard-open")) {
        const rank = document.createElement("button");
        rank.id = "journey-leaderboard-open";
        rank.type = "button";
        rank.className = "outline-button";
        rank.textContent = "查看我的排名与排行榜";
        rank.onclick = function () {
          if (window.JourneyLeaderboard && window.JourneyLeaderboard.open) {
            window.JourneyLeaderboard.open();
            setTimeout(function () {
              const input = document.querySelector(".leaderboard-modal input");
              const state = read();
              if (input && state.nickname) input.value = state.nickname;
            }, 0);
          } else {
            alert("排行榜正在加载，请稍后再试。");
          }
        };
        actions.appendChild(rank);
      }
    }
  }
  document.addEventListener("click", function (event) {
    const start = event.target.closest && event.target.closest(".cover-screen .enter-button");
    if (!start || startBypass) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const state = read();
    if (state.nickname) {
      startBypass = true;
      start.click();
      setTimeout(function(){ startBypass = false; }, 0);
    } else {
      openName(function () {
        startBypass = true;
        start.click();
        setTimeout(function(){ startBypass = false; }, 0);
      });
    }
  }, true);
  new MutationObserver(observe).observe(document.documentElement, { childList:true, subtree:true });
  document.addEventListener("DOMContentLoaded", observe);
  observe();
}());

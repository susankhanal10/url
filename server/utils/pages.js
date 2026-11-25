// Small branded HTML pages shown to people who open a short link.
const BRAND = process.env.BRAND_NAME || 'LinkTrack';
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const shell = (inner, title = BRAND) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#e6ecf7;
background:radial-gradient(600px 400px at 85% -10%,#2b2f8f,transparent 70%),radial-gradient(500px 400px at 0% 110%,#075a73,transparent 70%),#0b1220}
.card{width:100%;max-width:440px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:32px 28px;text-align:center;backdrop-filter:blur(12px)}
.brand{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:15px;color:#fff;margin-bottom:22px}
.brand i{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#22d3ee);display:grid;place-items:center;font-style:normal;font-size:14px}
h1{font-size:21px;margin:0 0 8px;color:#fff}p{margin:0;color:#9fb0cc;font-size:14.5px;line-height:1.55}
.dest{display:flex;align-items:center;gap:12px;justify-content:center;margin:18px 0 20px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.07);font-weight:600;color:#fff;word-break:break-all}
.dest img{width:24px;height:24px;border-radius:6px;background:#fff}
.bar{height:5px;border-radius:99px;background:rgba(255,255,255,.12);overflow:hidden;margin:0 0 18px}
.bar b{display:block;height:100%;width:0;background:linear-gradient(90deg,#6366f1,#22d3ee);border-radius:99px;animation:fill linear forwards}
@keyframes fill{to{width:100%}}
a.go{display:inline-block;padding:11px 22px;border-radius:10px;background:#6366f1;color:#fff;text-decoration:none;font-weight:600;font-size:14.5px}
a.go:hover{filter:brightness(1.1)}
.foot{margin-top:22px;font-size:12px;color:#6f7f9c}
.big{font-size:42px;margin-bottom:6px}
@media (prefers-reduced-motion:reduce){.bar b{animation-duration:.01s!important}}
</style></head><body><main class="card"><div class="brand"><i>🔗</i>${esc(BRAND)}</div>${inner}
<div class="foot">Secure short link by ${esc(BRAND)}</div></main></body></html>`;

const messagePage = (emoji, heading, text) =>
  shell(`<div class="big">${emoji}</div><h1>${esc(heading)}</h1><p>${esc(text)}</p>`, heading);

function redirectPage({ url, host, delaySec, clickId }) {
  const safeUrl = JSON.stringify(url).replace(/</g, '\\u003c');
  return shell(`
<h1>Taking you to</h1>
<div class="dest"><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64" alt="" onerror="this.style.display='none'"><span>${esc(host)}</span></div>
<div class="bar"><b style="animation-duration:${delaySec}s"></b></div>
<a class="go" id="go" href="${esc(url)}" rel="noopener">Continue now</a>
<script>
var start=Date.now(),target=${safeUrl},id="${clickId}",sent=false;
function report(){if(sent)return;sent=true;
  try{navigator.sendBeacon("/track/"+id,new Blob([JSON.stringify({seconds:(Date.now()-start)/1000})],{type:"application/json"}));}catch(e){}}
window.addEventListener("pagehide",report);
document.getElementById("go").addEventListener("click",report);
setTimeout(function(){report();location.href=target;},${Math.round(delaySec * 1000)});
</script>`, `Redirecting to ${host}`);
}

module.exports = { messagePage, redirectPage };

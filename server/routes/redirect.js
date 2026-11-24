const router = require('express').Router();
const geoip = require('geoip-lite');
const { UAParser } = require('ua-parser-js');
const Link = require('../models/Link');
const Click = require('../models/Click');

const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LinkTrack</title>
<style>body{font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#0f172a;color:#fff;text-align:center}
.s{width:40px;height:40px;border:4px solid #334155;border-top-color:#38bdf8;border-radius:50%;animation:r 1s linear infinite;margin:0 auto 16px}
@keyframes r{to{transform:rotate(360deg)}}</style></head><body>${body}</body></html>`;

// beacon: visitor's browser reports how long it stayed on the page
router.post('/track/:id', async (req, res) => {
  const sec = Math.min(Number(req.body?.seconds) || 0, 3600);
  await Click.findByIdAndUpdate(req.params.id, { durationSec: sec }).catch(() => {});
  res.sendStatus(204);
});

// the short link itself
router.get('/:code', async (req, res) => {
  const link = await Link.findOne({ code: req.params.code });
  if (!link) return res.status(404).send(page('<div><h2>Link not found</h2><p>Check the address and try again.</p></div>'));
  if (!link.active || (link.expiresAt && link.expiresAt < new Date()))
    return res.status(410).send(page('<div><h2>This link is no longer available</h2><p>The owner has turned it off or it has expired.</p></div>'));

  const ip = (req.ip || '').replace('::ffff:', '');
  const geo = geoip.lookup(ip) || {};

  // Deep parse the User-Agent
  const ua = req.headers['user-agent'] || '';
  const parser = new UAParser(ua);
  const parsed = parser.getResult();

  // Determine device type
  let deviceType = 'desktop';
  if (parsed.device && parsed.device.type) {
    deviceType = parsed.device.type; // 'mobile', 'tablet', 'smarttv', etc.
  } else if (/bot|crawl|spider|slurp|mediapartners/i.test(ua)) {
    deviceType = 'bot';
  }

  const click = await Click.create({
    link: link._id,
    ip,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
    // Device details
    deviceType,
    deviceVendor: parsed.device?.vendor || null,
    deviceModel: parsed.device?.model || null,
    // OS details
    osName: parsed.os?.name || null,
    osVersion: parsed.os?.version || null,
    // Browser details
    browserName: parsed.browser?.name || null,
    browserVersion: parsed.browser?.version ? parsed.browser.version.split('.')[0] : null,
    userAgent: ua,
    referrer: req.headers.referer,
  });
  await Link.updateOne({ _id: link._id }, { $inc: { clicks: 1 } });

  const delay = (link.delaySec ?? 2) * 1000;
  if (delay === 0) return res.redirect(link.originalUrl); // instant redirect, no time-viewed data

  const safeUrl = JSON.stringify(link.originalUrl).replace(/</g, '\\u003c');
  res.send(page(`<div><div class="s"></div><p>Taking you to your destination...</p></div>
<script>
const start=Date.now(), target=${safeUrl}, id="${click._id}";
let sent=false;
function report(){ if(sent) return; sent=true;
  navigator.sendBeacon("/track/"+id, new Blob([JSON.stringify({seconds:(Date.now()-start)/1000})],{type:"application/json"})); }
window.addEventListener("pagehide", report);
setTimeout(()=>{ report(); location.href=target; }, ${delay});
</script>`));
});

module.exports = router;

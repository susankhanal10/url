const router = require('express').Router();
const { UAParser } = require('ua-parser-js');
const Link = require('../models/Link');
const Click = require('../models/Click');
const { clientIp, isPrivate, getPublicIp, lookupGeo } = require('../utils/geo');
const { messagePage, redirectPage } = require('../utils/pages');

router.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /\n'));
router.get('/favicon.ico', (req, res) => res.sendStatus(204));

// beacon: visitor's browser reports how long it stayed on the page
router.post('/track/:id', async (req, res) => {
  const sec = Math.min(Number(req.body?.seconds) || 0, 3600);
  await Click.findByIdAndUpdate(req.params.id, { durationSec: sec }).catch(() => {});
  res.sendStatus(204);
});

// Fill in country / city / coordinates / ISP AFTER the visitor was already redirected, so geolocation never slows the link down.
async function enrichClick(clickId, ip) {
  try {
    const local = isPrivate(ip);
    const lookupIp = local ? await getPublicIp() : ip; // localhost -> use this network's public IP
    if (!lookupIp) return;
    const g = await lookupGeo(lookupIp);
    const update = { ip: lookupIp, isLocal: local };
    if (g) {
      Object.assign(update, {
        country: g.country, countryName: g.countryName, region: g.region, city: g.city,
        lat: g.lat, lon: g.lon, timezone: g.timezone, isp: g.isp,
      });
    }
    await Click.updateOne({ _id: clickId }, update);
  } catch (e) { console.error('geo enrich failed:', e.message); }
}

// the short link itself
router.get('/:code', async (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
  const link = await Link.findOne({ code: req.params.code });
  if (!link) return res.status(404).send(messagePage('🔍', 'Link not found', 'This short link does not exist. Please check the address and try again.'));
  if (!link.active || (link.expiresAt && link.expiresAt < new Date()))
    return res.status(410).send(messagePage('⏳', 'This link is no longer available', 'The owner has turned it off or it has expired.'));

  const ip = clientIp(req);
  const ua = req.headers['user-agent'] || '';
  const parsed = new UAParser(ua).getResult();

  let deviceType = 'desktop';
  if (parsed.device?.type) deviceType = parsed.device.type;
  else if (/bot|crawl|spider|slurp|mediapartners|preview/i.test(ua)) deviceType = 'bot';

  const click = await Click.create({
    link: link._id,
    ip,
    isLocal: isPrivate(ip),
    deviceType,
    deviceVendor: parsed.device?.vendor || null,
    deviceModel: parsed.device?.model || null,
    osName: parsed.os?.name || null,
    osVersion: parsed.os?.version || null,
    browserName: parsed.browser?.name || null,
    browserVersion: parsed.browser?.version ? parsed.browser.version.split('.')[0] : null,
    userAgent: ua,
    language: (req.headers['accept-language'] || '').split(',')[0] || null,
    referrer: req.headers.referer,
  });
  await Link.updateOne({ _id: link._id }, { $inc: { clicks: 1 } });
  enrichClick(click._id, ip); // runs in the background

  const delaySec = link.delaySec ?? 2;
  if (delaySec === 0) return res.redirect(link.originalUrl); // instant redirect, no time-viewed data

  let host = link.originalUrl;
  try { host = new URL(link.originalUrl).hostname.replace(/^www\./, ''); } catch { /* keep raw */ }
  res.send(redirectPage({ url: link.originalUrl, host, delaySec, clickId: click._id }));
});

module.exports = router;

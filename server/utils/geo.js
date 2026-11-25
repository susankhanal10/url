// IP + geolocation helpers.
// 1) clientIp(): find the REAL visitor IP (works behind Cloudflare, Nginx, Render, Railway, Vercel...)
// 2) lookupGeo(): country / region / city / coordinates / ISP  (ipwho.is first, offline geoip-lite as a fallback)
// 3) getPublicIp(): when you test on localhost the visitor IP is 127.0.0.1, which has no location.
//    In that case we use this machine's public IP so the dashboard still shows real data.
const geoip = require('geoip-lite');

const cache = new Map();                 // ip -> geo result (kept in memory for 1 hour)
let publicIp = { ip: null, at: 0 };

const normalize = (ip = '') => {
  ip = String(ip).trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (ip === '::1') ip = '127.0.0.1';
  const m = ip.match(/^(\d+\.\d+\.\d+\.\d+):\d+$/); // strip :port
  return m ? m[1] : ip;
};

function clientIp(req) {
  const h = req.headers;
  const raw =
    h['cf-connecting-ip'] ||
    h['x-real-ip'] ||
    (h['x-forwarded-for'] || '').split(',')[0] ||
    req.socket?.remoteAddress ||
    req.ip ||
    '';
  return normalize(raw);
}

function isPrivate(ip) {
  if (!ip) return true;
  return (
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^(fc|fd|fe80)/i.test(ip) ||
    ip === 'localhost'
  );
}

async function getJson(url, ms = 3000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function getPublicIp() {
  if (publicIp.ip && Date.now() - publicIp.at < 10 * 60 * 1000) return publicIp.ip;
  try {
    const d = await getJson('https://api.ipify.org?format=json');
    if (d?.ip) publicIp = { ip: d.ip, at: Date.now() };
  } catch { /* offline: keep old value */ }
  return publicIp.ip;
}

async function lookupGeo(ip) {
  if (!ip) return null;
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < 3600 * 1000) return hit.data;

  let data = null;
  try {
    const d = await getJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (d?.success) {
      data = {
        country: d.country_code,
        countryName: d.country,
        region: d.region,
        city: d.city,
        lat: d.latitude,
        lon: d.longitude,
        timezone: d.timezone?.id,
        isp: d.connection?.isp || d.connection?.org,
        source: 'ipwho.is',
      };
    }
  } catch { /* fall through to offline database */ }

  if (!data) {
    const g = geoip.lookup(ip);
    if (g) {
      data = {
        country: g.country, region: g.region, city: g.city,
        lat: g.ll?.[0], lon: g.ll?.[1], timezone: g.timezone, source: 'geoip-lite',
      };
    }
  }
  if (data) cache.set(ip, { data, at: Date.now() });
  return data;
}

module.exports = { clientIp, isPrivate, getPublicIp, lookupGeo };

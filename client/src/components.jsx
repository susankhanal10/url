import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'flag-icons/css/flag-icons.min.css';
import { FaApple, FaWindows, FaAndroid, FaLinux, FaChrome, FaFirefoxBrowser, FaSafari, FaEdge, FaOpera,
  FaMobileScreen, FaDesktop, FaTabletScreenButton, FaRobot, FaTv, FaGlobe, FaLocationDot, FaCopy } from 'react-icons/fa6';
import { SiSamsung, SiXiaomi, SiHuawei, SiOneplus, SiGoogle, SiApple, SiOppo, SiVivo, SiMotorola, SiSony, SiLg,
  SiNokia, SiAsus, SiLenovo, SiDell, SiHp, SiBrave } from 'react-icons/si';

/* ---------- plain helpers ---------- */
export const fmtTime = (s = 0) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`);
export const host = (u) => { try { return new URL(u).hostname.replace('www.', ''); } catch { return u; } };
export const countryName = (c) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(c); } catch { return c; } };
export const osOf = (ua = '') => /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Other';
export const browserOf = (ua = '') => /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) ? 'Safari' : 'Other';
export const timeAgo = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d)) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
};
export const deviceTypeLabel = (c) => { const t = c.deviceType || 'desktop'; return t.charAt(0).toUpperCase() + t.slice(1); };
export const deviceLabel = (c) => {
  if (c.deviceVendor && c.deviceModel) return `${c.deviceVendor} ${c.deviceModel}`;
  if (c.deviceVendor) return c.deviceVendor;
  if (c.deviceType === 'desktop' || !c.deviceType) return c.osName ? `${c.osName} computer` : 'Computer';
  return c.osName || osOf(c.userAgent);
};
export const osLabel = (c) => (c.osName ? `${c.osName}${c.osVersion ? ' ' + c.osVersion : ''}` : osOf(c.userAgent));
export const browserLabel = (c) => (c.browserName ? `${c.browserName}${c.browserVersion ? ' ' + c.browserVersion : ''}` : browserOf(c.userAgent));
export const placeLabel = (c) => [c.city, c.region].filter(Boolean).join(', ') || (c.country ? c.countryName || countryName(c.country) : 'Unknown location');

/* ---------- logos ---------- */
const VENDORS = {
  apple: [SiApple, 'currentColor'], samsung: [SiSamsung, '#1428a0'], xiaomi: [SiXiaomi, '#ff6900'], huawei: [SiHuawei, '#cf0a2c'],
  oneplus: [SiOneplus, '#f5010c'], google: [SiGoogle, '#4285f4'], oppo: [SiOppo, '#1d8b4f'], vivo: [SiVivo, '#415fff'],
  motorola: [SiMotorola, '#5c92fa'], sony: [SiSony, 'currentColor'], lg: [SiLg, '#a50034'], nokia: [SiNokia, '#124191'],
  asus: [SiAsus, '#00539b'], lenovo: [SiLenovo, '#e2231a'], dell: [SiDell, '#007db8'], hp: [SiHp, '#0096d6'],
};
const OSES = [
  [/windows/i, FaWindows, '#0078d4'], [/ios|mac/i, FaApple, 'currentColor'], [/android/i, FaAndroid, '#3ddc84'],
  [/chrome ?os/i, FaChrome, '#4285f4'], [/linux|ubuntu|fedora|debian|mint/i, FaLinux, '#e9a800'],
];
const BROWSERS = [
  [/edge/i, FaEdge, '#0078d7'], [/opera/i, FaOpera, '#ff1b2d'], [/brave/i, SiBrave, '#fb542b'], [/samsung/i, SiSamsung, '#1428a0'],
  [/firefox/i, FaFirefoxBrowser, '#ff7139'], [/safari/i, FaSafari, '#0fb5ee'], [/chrom/i, FaChrome, '#4285f4'],
];
const TYPES = { mobile: FaMobileScreen, tablet: FaTabletScreenButton, bot: FaRobot, smarttv: FaTv, desktop: FaDesktop };
const find = (table, name = '') => table.find(([re]) => re.test(name));

export function Logo({ icon: Icon, color, size = 18, title }) {
  return <Icon size={size} color={color} title={title} aria-label={title} style={{ flex: 'none' }} />;
}
/** Brand logo of the visitor's device (Apple, Samsung, Xiaomi ...); falls back to the OS logo, then a generic device icon. */
export function DeviceLogo({ c, size = 18 }) {
  const v = VENDORS[(c.deviceVendor || '').toLowerCase()];
  if (v) return <Logo icon={v[0]} color={v[1]} size={size} title={c.deviceVendor} />;
  if ((c.deviceType || 'desktop') !== 'bot') {
    const os = find(OSES, c.osName || osOf(c.userAgent));
    if (os) return <Logo icon={os[1]} color={os[2]} size={size} title={c.osName} />;
  }
  return <Logo icon={TYPES[c.deviceType] || FaDesktop} color="currentColor" size={size} title={deviceTypeLabel(c)} />;
}
export function OsLogo({ name, size = 16 }) {
  const m = find(OSES, name); return m ? <Logo icon={m[1]} color={m[2]} size={size} title={name} /> : <Logo icon={FaDesktop} color="currentColor" size={size} />;
}
export function BrowserLogo({ name, size = 16 }) {
  const m = find(BROWSERS, name); return m ? <Logo icon={m[1]} color={m[2]} size={size} title={name} /> : <Logo icon={FaGlobe} color="currentColor" size={size} />;
}
/** Country flag image (bundled SVGs, so it also works on Windows where flag emojis do not). */
export function Flag({ code, size = 18 }) {
  if (!code || !/^[a-z]{2}$/i.test(code)) return <FaGlobe size={size} style={{ flex: 'none', opacity: 0.6 }} />;
  return <span className={`fi fi-${code.toLowerCase()} flag`} style={{ fontSize: size }} title={countryName(code.toUpperCase())} />;
}

/* ---------- small display components ---------- */
export function Place({ c }) {
  return (
    <span className="place">
      <Flag code={c.country} />
      <span><b>{placeLabel(c)}</b>{c.country && <span className="sub">{c.countryName || countryName(c.country)}</span>}</span>
    </span>
  );
}
export function Device({ c }) {
  return (
    <span className="device-cell">
      <DeviceLogo c={c} size={20} />
      <span><span className="device-name">{deviceLabel(c)}</span><span className="device-type-pill">{deviceTypeLabel(c)}</span></span>
    </span>
  );
}
/** Professional short-link display:  lnk.example.com/ k7m2xq  [copy] */
export function ShortLink({ link, toast, big }) {
  const full = link.displayUrl || link.shortUrl.replace(/^https?:\/\//, '');
  const i = full.lastIndexOf('/');
  const copy = () => { navigator.clipboard.writeText(link.shortUrl); toast && toast('Link copied'); };
  return (
    <span className={'short' + (big ? ' big' : '')}>
      <a href={link.shortUrl} target="_blank" rel="noreferrer" title="Open short link">
        <span className="dom">{full.slice(0, i + 1)}</span><b>{full.slice(i + 1)}</b>
      </a>
      <button type="button" className="copybtn" onClick={copy} aria-label="Copy short link" title="Copy short link"><FaCopy size={13} /></button>
    </span>
  );
}

/* ---------- map of visitors (Leaflet + free, key-less tile providers) ---------- */
const esc = (s = '') => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTR = 'Tiles &copy; Esri';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
// All of these work without an API key.
const MAP_STYLES = {
  auto: { label: 'Auto (light/dark)' },
  light: { label: 'Light gray', url: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, maxZoom: 16, attribution: ESRI_ATTR },
  dark: { label: 'Dark gray', url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, maxZoom: 16, attribution: ESRI_ATTR },
  streets: { label: 'Streets (OSM)', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: OSM_ATTR },
  esri: { label: 'Streets (Esri)', url: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, maxZoom: 19, attribution: ESRI_ATTR },
  satellite: { label: 'Satellite', url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, maxZoom: 18, attribution: `${ESRI_ATTR}, Maxar, Earthstar Geographics` },
  topo: { label: 'Terrain (OpenTopoMap)', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', maxZoom: 17, subdomains: 'abc', attribution: `${OSM_ATTR}, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>` },
};
const FALLBACK = 'streets';

export function VisitorMap({ clicks, theme = 'light', height = 340 }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), tiles = useRef(null);
  const [style, setStyle] = useState(() => {
    const saved = localStorage.getItem('mapStyle');
    return MAP_STYLES[saved] ? saved : 'auto';
  });
  const located = clicks.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lon));

  useEffect(() => {
    if (map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false, worldCopyJump: true, minZoom: 1 }).setView([20, 10], 2);
    layer.current = L.layerGroup().addTo(map.current);
    // keep the map sized correctly when the window / panel is resized or zoomed
    const ro = new ResizeObserver(() => map.current && map.current.invalidateSize());
    ro.observe(el.current);
    setTimeout(() => map.current && map.current.invalidateSize(), 200);
    return () => { ro.disconnect(); map.current && map.current.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    if (tiles.current) tiles.current.remove();
    const key = style === 'auto' ? (theme === 'dark' ? 'dark' : 'light') : style;
    const make = (k) => {
      const d = MAP_STYLES[k];
      let errors = 0;
      const t = L.tileLayer(d.url, { maxZoom: d.maxZoom, subdomains: d.subdomains || 'abc', attribution: d.attribution });
      // if a provider is blocked / down, fall back to OpenStreetMap automatically
      t.on('tileerror', () => {
        if (++errors === 4 && k !== FALLBACK && map.current && tiles.current === t) {
          t.remove();
          tiles.current = make(FALLBACK);
        }
      });
      return t.addTo(map.current);
    };
    tiles.current = make(key);
  }, [theme, style]);

  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers();
    const groups = {};
    located.forEach((c) => {
      const k = `${c.lat.toFixed(1)},${c.lon.toFixed(1)}`;
      (groups[k] = groups[k] || { lat: c.lat, lon: c.lon, n: 0, c }).n++;
    });
    const pts = Object.values(groups);
    pts.forEach((g) => {
      L.circleMarker([g.lat, g.lon], { radius: Math.min(8 + g.n * 2, 26), color: '#4f46e5', weight: 2, fillColor: '#6366f1', fillOpacity: 0.55 })
        .bindPopup(`<b>${esc(g.c.city || g.c.countryName || g.c.country || 'Unknown')}</b><br>${esc(g.c.countryName || g.c.country || '')}<br>${g.n} click${g.n > 1 ? 's' : ''}`)
        .addTo(layer.current);
    });
    if (pts.length === 1) map.current.setView([pts[0].lat, pts[0].lon], 5);
    else if (pts.length > 1) map.current.fitBounds(pts.map((g) => [g.lat, g.lon]), { padding: [40, 40], maxZoom: 6 });
  }, [clicks.length, located.length]);

  return (
    <div className="mapbox" style={{ height }}>
      <div ref={el} style={{ height: '100%', borderRadius: 12 }} />
      <select className="mapstyle" aria-label="Map style" value={style}
        onChange={(e) => { setStyle(e.target.value); localStorage.setItem('mapStyle', e.target.value); }}>
        {Object.entries(MAP_STYLES).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
      </select>
      {located.length === 0 && <div className="maphint"><FaLocationDot /> Visitor locations will appear here after the first click.</div>}
    </div>
  );
}

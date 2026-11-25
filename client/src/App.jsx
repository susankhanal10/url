import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { FaQrcode, FaArrowUpRightFromSquare, FaShareNodes } from 'react-icons/fa6';
import { fmtTime, host, countryName, osOf, browserOf, timeAgo, deviceTypeLabel, osLabel, browserLabel, placeLabel,
  Flag, Place, Device, DeviceLogo, OsLogo, BrowserLogo, ShortLink, VisitorMap } from './components.jsx';

/* ---------- helpers ---------- */
async function api(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const countBy = (arr, fn) => {
  const m = {}; arr.forEach((x) => { const k = fn(x) || 'Unknown'; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};
const statusOf = (l) => (!l.active ? 'Disabled' : l.expiresAt && new Date(l.expiresAt) < new Date() ? 'Expired' : 'Active');
const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#e5484d', '#8b5cf6'];


/* ---------- small UI pieces ---------- */
const Switch = ({ checked, onChange, label }) => (
  <label className="sw"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} /><span /></label>
);

function Modal({ onClose, children }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div></div>;
}

function BarChart({ clicks, days }) {
  const list = [...Array(days)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1 - i)); return d; });
  const counts = list.map((d) => clicks.filter((c) => new Date(c.createdAt).toDateString() === d.toDateString()).length);
  const max = Math.max(...counts, 1);
  const W = 560, H = 170, pad = 24, bw = (W - pad * 2) / days, step = Math.ceil(days / 7);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Clicks in the last ${days} days`}>
      {[0, 0.5, 1].map((t) => <line key={t} x1={pad} x2={W - pad} y1={H - 24 - t * (H - 44)} y2={H - 24 - t * (H - 44)} stroke="var(--line)" />)}
      {counts.map((n, i) => {
        const h = (n / max) * (H - 44);
        return (
          <g key={i}>
            <rect x={pad + i * bw + 2} y={H - 24 - h} width={Math.max(bw - 4, 2)} height={Math.max(h, 2)} rx="3" fill={n ? 'var(--accent)' : 'var(--line)'}>
              <title>{list[i].toLocaleDateString()}: {n} clicks</title>
            </rect>
            {i % step === 0 && <text x={pad + i * bw + bw / 2} y={H - 8} textAnchor="middle">{list[i].getDate()}/{list[i].getMonth() + 1}</text>}
          </g>
        );
      })}
      <text x={pad} y="12">{max} max</text>
    </svg>
  );
}

function Donut({ rows }) {
  const total = rows.reduce((s, r) => s + r[1], 0);
  if (!total) return <p className="muted">No data yet.</p>;
  const R = 40, C = 2 * Math.PI * R; let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" width="130" height="130" role="img" aria-label="Breakdown chart">
        <g transform="rotate(-90 50 50)">
          {rows.slice(0, 6).map(([k, n], i) => {
            const len = (n / total) * C;
            const el = <circle key={k} cx="50" cy="50" r={R} fill="none" stroke={COLORS[i]} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
            acc += len; return el;
          })}
        </g>
        <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor">{total}</text>
      </svg>
      <div className="legend">
        {rows.slice(0, 6).map(([k, n], i) => <div key={k}><i style={{ background: COLORS[i] }} />{k}<span>{Math.round((n / total) * 100)}%</span></div>)}
      </div>
    </div>
  );
}

function Bars({ rows, label = (k) => k, icon, empty = 'No data yet.' }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  const max = rows[0][1];
  return rows.slice(0, 6).map(([k, n]) => (
    <div className="bar-row" key={k}>
      <span className="name" title={label(k)}>{icon && icon(k)}{label(k)}</span>
      <div className="track"><div className="fill" style={{ width: `${(n / max) * 100}%` }} /></div>
      <span>{n}</span>
    </div>
  ));
}

const RangeBox = ({ days, setDays }) => (
  <div className="rangebox">
    <span>Last {days} days</span>
    <input type="range" min="7" max="30" value={days} onChange={(e) => setDays(+e.target.value)} aria-label="Number of days" />
  </div>
);

function HourChart({ clicks }) {
  const counts = [...Array(24)].map((_, h) => clicks.filter((c) => new Date(c.createdAt).getHours() === h).length);
  const max = Math.max(...counts, 1), W = 560, H = 120, bw = W / 24;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Clicks by hour of day">
      {counts.map((n, h) => {
        const bh = (n / max) * (H - 30);
        return (
          <g key={h}>
            <rect x={h * bw + 3} y={H - 18 - bh} width={bw - 6} height={Math.max(bh, 2)} rx="3" fill={n === max && n > 0 ? 'var(--mint)' : n ? 'var(--accent)' : 'var(--line)'}><title>{h}:00 – {h}:59 · {n} clicks</title></rect>
            {h % 3 === 0 && <text x={h * bw + bw / 2} y={H - 4} textAnchor="middle">{h}h</text>}
          </g>
        );
      })}
    </svg>
  );
}

const Row = ({ label, children }) => <div className="drow"><dt>{label}</dt><dd>{children}</dd></div>;

/* ---------- one visitor, all the details ---------- */
function ClickModal({ c, onClose, toast }) {
  return (
    <Modal onClose={onClose}>
      <div className="mhead"><Flag code={c.country} size={30} /><div><h2>{placeLabel(c)}</h2><span className="muted">{c.countryName || (c.country ? countryName(c.country) : 'Location unknown')} · {new Date(c.createdAt).toLocaleString()}</span></div></div>
      <div className="dgrid">
        <div>
          <h4>Visitor</h4>
          <dl>
            <Row label="IP address"><span className="ip-badge">{c.ip || '—'}</span>{c.isLocal && <span className="pill grey" title="This click came from the same computer as the server, so this network's public IP is shown." style={{ marginLeft: 6 }}>local test</span>}</Row>
            <Row label="Country"><Flag code={c.country} /> {c.countryName || (c.country ? countryName(c.country) : '—')}</Row>
            <Row label="City / region">{[c.city, c.region].filter(Boolean).join(', ') || '—'}</Row>
            <Row label="Coordinates">{Number.isFinite(c.lat) ? <a href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=10/${c.lat}/${c.lon}`} target="_blank" rel="noreferrer">{c.lat.toFixed(3)}, {c.lon.toFixed(3)}</a> : '—'}</Row>
            <Row label="Timezone">{c.timezone || '—'}</Row>
            <Row label="Internet provider">{c.isp || '—'}</Row>
            <Row label="Language">{c.language || '—'}</Row>
          </dl>
        </div>
        <div>
          <h4>Device</h4>
          <dl>
            <Row label="Device"><DeviceLogo c={c} /> {c.deviceVendor ? `${c.deviceVendor} ${c.deviceModel || ''}` : deviceTypeLabel(c)}</Row>
            <Row label="Type">{deviceTypeLabel(c)}</Row>
            <Row label="System"><OsLogo name={c.osName || osOf(c.userAgent)} /> {osLabel(c)}</Row>
            <Row label="Browser"><BrowserLogo name={c.browserName || browserOf(c.userAgent)} /> {browserLabel(c)}</Row>
          </dl>
          <h4 style={{ marginTop: 16 }}>Visit</h4>
          <dl>
            <Row label="Time viewed">{fmtTime(c.durationSec)}</Row>
            <Row label="Came from">{c.referrer ? host(c.referrer) : 'Direct'}</Row>
          </dl>
        </div>
      </div>
      {c.userAgent && <p className="ua">{c.userAgent}</p>}
      <div className="foot">
        {c.ip && <button className="btn plain" onClick={() => { navigator.clipboard.writeText(c.ip); toast('IP copied'); }}>Copy IP</button>}
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

const Globe = () => (
  <svg className="float" viewBox="0 0 220 160" width="100%" style={{ maxWidth: 340 }} role="img" aria-label="Globe with tracked clicks">
    <circle cx="110" cy="80" r="62" fill="#1b2a41" stroke="#4f46e5" strokeWidth="3" />
    <ellipse cx="110" cy="80" rx="28" ry="62" fill="none" stroke="#38bdf8" strokeWidth="2" opacity=".7" />
    <path d="M48 80h124M60 50h100M60 110h100" stroke="#38bdf8" strokeWidth="2" opacity=".5" fill="none" />
    <path d="M86 62 Q112 28 138 96" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="4 4" />
    <g fill="#f59e0b"><circle cx="86" cy="62" r="6" /><circle cx="138" cy="96" r="6" /><circle cx="118" cy="46" r="5" /></g>
    <rect x="6" y="18" width="70" height="26" rx="13" fill="#4f46e5" /><text x="18" y="35" fill="#fff" fontSize="11">sho.rt/ab3x</text>
    <rect x="148" y="118" width="66" height="26" rx="13" fill="#10b981" /><text x="160" y="135" fill="#fff" fontSize="11">+1 click</text>
  </svg>
);

/* ---------- Login / Register ---------- */
function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      const d = await api('/auth/' + mode, 'POST', { email, password });
      localStorage.setItem('token', d.token); localStorage.setItem('email', d.email); onLogin();
    } catch (err) { setError(err.message); }
  };
  return (
    <div className="auth">
      <div className="brand">
        <div className="logo" style={{ padding: 0 }}><i>🔗</i>LinkTrack</div>
        <Globe />
        <h1>Know who opens the links you share.</h1>
        <p>Shorten a link, send it anywhere, and see where in the world it gets clicked.</p>
      </div>
      <div className="form">
        <form onSubmit={submit}>
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="sub">{mode === 'login' ? 'Log in to see your links.' : 'It takes a few seconds.'}</p>
          <input className="field" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div style={{ position: 'relative' }}>
            <input className="field" type={show ? 'text' : 'password'} placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="btn plain sm" style={{ position: 'absolute', right: 6, top: 5 }} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          </div>
          {error && <p className="err">{error}</p>}
          <button className="btn wide" type="submit">{mode === 'login' ? 'Log in' : 'Create account'}</button>
          <div className="switch">
            {mode === 'login' ? 'New here? ' : 'Already registered? '}
            <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Log in'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Overview ---------- */
function Overview({ goLinks, openStats, theme }) {
  const [links, setLinks] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [days, setDays] = useState(14);
  const [live, setLive] = useState(true);
  const load = () => {
    api('/links').then(setLinks);
    api('/links/overview/summary').then((d) => setClicks(d.clicks));
  };
  useEffect(load, []);
  useEffect(() => { if (!live) return; const t = setInterval(load, 8000); return () => clearInterval(t); }, [live]);
  if (!links) return <p className="muted">Loading…</p>;
  const total = links.reduce((s, l) => s + l.clicks, 0);
  const active = links.filter((l) => statusOf(l) === 'Active').length;
  const timed = clicks.filter((c) => c.durationSec > 0);
  const avg = timed.length ? timed.reduce((s, c) => s + c.durationSec, 0) / timed.length : 0;
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const topLinks = [...links].sort((a, b) => b.clicks - a.clicks).filter((l) => l.clicks > 0).slice(0, 5);
  const email = localStorage.getItem('email') || '';
  const byId = Object.fromEntries(links.map((l) => [l._id, l]));
  const countryRows = countBy(clicks, (c) => c.country);
  const cityRows = countBy(clicks.filter((c) => c.city), (c) => `${c.city}|${c.country || ''}`);
  const countryCount = countryRows.filter(([k]) => k !== 'Unknown').length;

  return (
    <>
      <div className="page-head"><h1>{hello}, {email.split('@')[0]} 👋</h1><p>Here is how your links are doing.</p></div>
      <div className="tiles">
        <div className="tile"><div className="ic i">🔗</div><div><div className="v">{links.length}</div><div className="l">Links created</div></div></div>
        <div className="tile"><div className="ic m">👆</div><div><div className="v">{total}</div><div className="l">Total clicks</div></div></div>
        <div className="tile"><div className="ic a">🌍</div><div><div className="v">{countryCount}</div><div className="l">Countries reached</div></div></div>
        <div className="tile"><div className="ic r">⏱️</div><div><div className="v">{fmtTime(avg)}</div><div className="l">Avg time viewed</div></div></div>
      </div>
      {links.length === 0 ? (
        <div className="panel empty"><div style={{ fontSize: 42 }}>🌍</div><b>Nothing to track yet</b>Create your first short link to start seeing clicks.<br /><br /><button className="btn" onClick={goLinks}>Create a link</button></div>
      ) : (
        <>
          <div className="panel">
            <div className="top"><h3>Where your visitors are</h3><label className="livetoggle"><span className={'dot' + (live ? ' on' : '')} />Live<Switch checked={live} onChange={setLive} label="Live updates" /></label></div>
            <VisitorMap clicks={clicks} theme={theme} />
          </div>
          <div className="cols eq">
            <div className="panel">
              <h3>Live activity</h3>
              {clicks.length === 0 && <p className="muted">No clicks yet. Share a link and visits show up here.</p>}
              {clicks.slice(0, 6).map((c) => (
                <button className="feed" key={c._id} onClick={() => openStats(c.link)}>
                  <Flag code={c.country} size={22} />
                  <span className="grow"><b>{placeLabel(c)}</b><span className="sub">{byId[c.link]?.title || host(byId[c.link]?.originalUrl || '') || 'Link'}</span></span>
                  <DeviceLogo c={c} />
                  <span className="when">{timeAgo(c.createdAt)}</span>
                </button>
              ))}
            </div>
            <div className="panel"><h3>Top countries</h3><Bars rows={countryRows} icon={(k) => (k === 'Unknown' ? null : <Flag code={k} size={15} />)} label={(k) => (k === 'Unknown' ? 'Unknown' : countryName(k))} empty="No clicks yet." /></div>
          </div>
          <div className="panel">
            <div className="top"><h3>Clicks over time</h3><RangeBox days={days} setDays={setDays} /></div>
            <BarChart clicks={clicks} days={days} />
          </div>
          <div className="cols eq">
            <div className="panel"><h3>Top cities</h3><Bars rows={cityRows} icon={(k) => <Flag code={k.split('|')[1]} size={15} />} label={(k) => k.split('|')[0]} empty="Cities appear after the first located click." /></div>
            <div className="panel"><h3>Operating systems</h3><Donut rows={countBy(clicks, (c) => c.osName || osOf(c.userAgent))} /></div>
          </div>
          <div className="panel">
            <h3>Top links</h3>
            {topLinks.length === 0 && <p className="muted">No clicks yet. Share a link and it will show up here.</p>}
            {topLinks.map((l) => (
              <div className="link first" key={l._id} style={{ padding: '10px 0' }}>
                <div className="favi">{host(l.originalUrl)[0]}</div>
                <div className="info"><b>{l.title || host(l.originalUrl)}</b><span className="orig">{l.displayUrl}</span></div>
                <div className="clicks">{l.clicks} clicks</div>
                <button className="btn soft sm" onClick={() => openStats(l._id)}>Stats</button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ---------- Manage modal (QR + settings) ---------- */
function Manage({ link, onClose, onSaved, toast }) {
  const [title, setTitle] = useState(link.title || '');
  const [active, setActive] = useState(link.active);
  const [delay, setDelay] = useState(link.delaySec ?? 2);
  const [exp, setExp] = useState('keep');
  const [qr, setQr] = useState('');
  useEffect(() => { QRCode.toDataURL(link.shortUrl, { width: 300, margin: 1 }).then(setQr); }, [link.shortUrl]);
  const save = async () => {
    const body = { title, active, delaySec: delay };
    if (exp !== 'keep') body.expiresInDays = Number(exp);
    try { await api('/links/' + link._id, 'PATCH', body); toast('Changes saved'); onSaved(); onClose(); }
    catch (e) { toast(e.message); }
  };
  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: 16 }}>Manage link</h2>
      <div className="grid">
        <div className="qr">
          {qr && <img src={qr} alt={`QR code for ${link.shortUrl}`} />}
          <a className="btn soft sm" style={{ display: 'inline-block', marginTop: 10 }} href={qr} download={`qr-${link.code}.png`}>Download QR</a>
          <p className="muted" style={{ fontSize: 13 }}>Scanning it opens your short link.</p>
        </div>
        <div>
          <div className="f"><label className="lb">Name</label><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Link name" /></div>
          <div className="rowsw"><div><b>Link is on</b><div className="muted" style={{ fontSize: 13 }}>Turn off to stop redirecting</div></div><Switch checked={active} onChange={setActive} label="Link is on" /></div>
          <div className="f">
            <label className="lb">Redirect page shows for {delay === 0 ? '0s (instant, no time data)' : `${delay}s`}</label>
            <input type="range" min="0" max="10" step="0.5" value={delay} onChange={(e) => setDelay(+e.target.value)} />
          </div>
          <div className="f">
            <label className="lb">Expiry {link.expiresAt && `(now: ${new Date(link.expiresAt).toLocaleDateString()})`}</label>
            <select className="field" value={exp} onChange={(e) => setExp(e.target.value)}>
              <option value="keep">Keep as it is</option><option value="0">Never expires</option>
              <option value="1">Expires in 1 day</option><option value="7">Expires in 7 days</option><option value="30">Expires in 30 days</option>
            </select>
          </div>
        </div>
      </div>
      <div className="foot">
        <button className="btn plain" onClick={() => { navigator.clipboard.writeText(link.shortUrl); toast('Link copied'); }}>Copy link</button>
        <button className="btn plain" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={save}>Save changes</button>
      </div>
    </Modal>
  );
}

/* ---------- My links ---------- */
function Links({ openStats, toast }) {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState(''); const [title, setTitle] = useState('');
  const [more, setMore] = useState(false);
  const [alias, setAlias] = useState(''); const [exp, setExp] = useState('0'); const [delay, setDelay] = useState(2);
  const [error, setError] = useState('');
  const [q, setQ] = useState(''); const [sort, setSort] = useState('new'); const [filter, setFilter] = useState('All');
  const [manage, setManage] = useState(null);
  const [created, setCreated] = useState(null);

  const load = () => api('/links').then(setLinks).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault(); setError('');
    try {
      const l = await api('/links', 'POST', { url, title, alias, expiresInDays: exp, delaySec: delay });
      setUrl(''); setTitle(''); setAlias(''); setCreated(l); toast('Link shortened'); load();
    } catch (err) { setError(err.message); }
  };
  const remove = async (l) => { if (confirm('Delete this link and all its click data?')) { await api('/links/' + l._id, 'DELETE'); toast('Link deleted'); load(); } };
  const toggle = async (l, on) => { await api('/links/' + l._id, 'PATCH', { active: on }); toast(on ? 'Link turned on' : 'Link turned off'); load(); };

  let shown = links.filter((l) => (filter === 'All' || statusOf(l) === filter) &&
    `${l.title || ''} ${l.originalUrl} ${l.code}`.toLowerCase().includes(q.toLowerCase()));
  if (sort === 'clicks') shown = [...shown].sort((a, b) => b.clicks - a.clicks);
  if (sort === 'old') shown = [...shown].reverse();

  return (
    <>
      <div className="page-head"><h1>My links</h1><p>Create, search and manage every short link.</p></div>
      <form className="panel" onSubmit={create}>
        <h3>Shorten a link</h3>
        <div className="shorten">
          <input className="field" placeholder="Paste a long URL, e.g. https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <input className="field" placeholder="Name (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn" type="submit">Shorten link</button>
        </div>
        <button type="button" className="linkbtn" onClick={() => setMore(!more)}>{more ? 'Hide options' : 'More options'}</button>
        {more && (
          <div className="adv">
            <div><label className="lb">Custom ending (optional)</label><input className="field" placeholder="my-event" value={alias} onChange={(e) => setAlias(e.target.value)} /></div>
            <div><label className="lb">Expires</label>
              <select className="field" value={exp} onChange={(e) => setExp(e.target.value)}>
                <option value="0">Never</option><option value="1">In 1 day</option><option value="7">In 7 days</option><option value="30">In 30 days</option>
              </select></div>
            <div><label className="lb">Redirect page shows for {delay}s</label><input type="range" min="0" max="10" step="0.5" value={delay} onChange={(e) => setDelay(+e.target.value)} /></div>
          </div>
        )}
        {error && <p className="err" style={{ marginTop: 10, marginBottom: 0 }}>{error}</p>}
      </form>

      {created && (
        <div className="panel success">
          <div className="top"><h3>🎉 Your short link is ready</h3><button className="btn plain sm" onClick={() => setCreated(null)}>Dismiss</button></div>
          <ShortLink link={created} toast={toast} big />
          <div className="orig" style={{ margin: '6px 0 14px' }}>{created.originalUrl}</div>
          <div className="row-actions">
            <button className="btn sm" onClick={() => { navigator.clipboard.writeText(created.shortUrl); toast('Link copied'); }}>Copy link</button>
            <a className="btn soft sm" href={created.shortUrl} target="_blank" rel="noreferrer"><FaArrowUpRightFromSquare size={12} /> Open</a>
            <button className="btn soft sm" onClick={() => setManage(created)}><FaQrcode size={12} /> QR code</button>
            {navigator.share && <button className="btn soft sm" onClick={() => navigator.share({ title: created.title || 'Link', url: created.shortUrl }).catch(() => {})}><FaShareNodes size={12} /> Share</button>}
            <button className="btn soft sm" onClick={() => openStats(created._id)}>View stats</button>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="toolbar">
          <input className="field" placeholder="Search links" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search links" />
          <select className="field" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort links">
            <option value="new">Newest first</option><option value="old">Oldest first</option><option value="clicks">Most clicks</option>
          </select>
          <div className="chips">{['All', 'Active', 'Disabled', 'Expired'].map((f) => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
        </div>
        {shown.length === 0 && (
          <div className="empty"><div style={{ fontSize: 40 }}>🔗</div><b>{links.length ? 'No links match' : 'No links yet'}</b>{links.length ? 'Try a different search or filter.' : 'Paste a URL above to create your first short link.'}</div>
        )}
        {shown.map((l, i) => {
          const st = statusOf(l);
          return (
            <div className={'link' + (i === 0 ? ' first' : '')} key={l._id}>
              <div className="favi">{host(l.originalUrl)[0]}</div>
              <div className="info">
                <b>{l.title || host(l.originalUrl)}</b>
                <ShortLink link={l} toast={toast} />
                <div className="orig">{l.originalUrl}</div>
              </div>
              <span className={'pill ' + (st === 'Active' ? 'green' : st === 'Expired' ? 'red' : 'grey')}>{st}</span>
              <div className="clicks">{l.clicks} {l.clicks === 1 ? 'click' : 'clicks'}</div>
              <div className="actions">
                <Switch checked={l.active} onChange={(on) => toggle(l, on)} label={`Turn ${l.title || l.code} on or off`} />
                <button className="btn plain sm" onClick={() => setManage(l)}>QR & edit</button>
                <button className="btn soft sm" onClick={() => openStats(l._id)}>Stats</button>
                <button className="btn plain sm warn" onClick={() => remove(l)}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
      {manage && <Manage link={manage} onClose={() => setManage(null)} onSaved={load} toast={toast} />}
    </>
  );
}

/* ---------- Stats for one link ---------- */
function Stats({ id, onBack, toast, theme }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(14);
  const [live, setLive] = useState(false);
  const [detail, setDetail] = useState(null);
  const [q, setQ] = useState('');
  const [dev, setDev] = useState('All');
  const load = () => api(`/links/${id}/stats`).then(setData);
  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (!live) return; const t = setInterval(load, 5000); return () => clearInterval(t); }, [live, id]);
  if (!data) return <p className="muted">Loading stats…</p>;
  const { link, summary, clicks } = data;
  const last = clicks[0];

  const exportCsv = () => {
    const rows = [
      ['When', 'IP Address', 'Country', 'Country code', 'Region', 'City', 'Latitude', 'Longitude', 'Timezone', 'ISP', 'Device Type', 'Device Vendor', 'Device Model', 'OS', 'OS Version', 'Browser', 'Browser Version', 'Seconds viewed', 'Referrer'],
      ...clicks.map((c) => [
        new Date(c.createdAt).toISOString(), c.ip || '', c.countryName || '', c.country || '', c.region || '', c.city || '',
        c.lat ?? '', c.lon ?? '', c.timezone || '', c.isp || '', c.deviceType || 'desktop', c.deviceVendor || '', c.deviceModel || '',
        c.osName || osOf(c.userAgent), c.osVersion || '', c.browserName || browserOf(c.userAgent), c.browserVersion || '',
        c.durationSec || 0, c.referrer || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `clicks-${link.code}.csv`; a.click(); toast('CSV downloaded');
  };

  const needle = q.trim().toLowerCase();
  const rowsShown = clicks.filter((c) => (dev === 'All' || (c.deviceType || 'desktop') === dev) &&
    (!needle || [c.ip, c.city, c.region, c.countryName, c.country, c.deviceVendor, c.deviceModel, c.osName, c.browserName, c.isp].join(' ').toLowerCase().includes(needle)));
  const types = ['All', ...new Set(clicks.map((c) => c.deviceType || 'desktop'))];
  const cityRows = countBy(clicks.filter((c) => c.city), (c) => `${c.city}|${c.country || ''}`);

  return (
    <>
      <button className="btn plain back" onClick={onBack}>‹ Back</button>
      <div className="head-row">
        <div>
          <h1>{link.title || host(link.originalUrl)}</h1>
          <ShortLink link={link} toast={toast} big />
          <div className="muted" style={{ marginTop: 4 }}>→ {link.originalUrl}</div>
        </div>
        <div className="head-actions">
          <label className="livetoggle"><span className={'dot' + (live ? ' on' : '')} />Live<Switch checked={live} onChange={setLive} label="Live updates" /></label>
          <button className="btn soft sm" onClick={exportCsv} disabled={!clicks.length}>Export CSV</button>{' '}
          <button className="btn sm" onClick={() => { load(); toast('Stats refreshed'); }}>Refresh</button>
        </div>
      </div>

      <div className="tiles">
        <div className="tile"><div className="ic i">👆</div><div><div className="v">{summary.totalClicks}</div><div className="l">Total clicks</div></div></div>
        <div className="tile"><div className="ic a">👤</div><div><div className="v">{summary.uniqueVisitors}</div><div className="l">Unique visitors</div></div></div>
        <div className="tile"><div className="ic m">⏱️</div><div><div className="v">{fmtTime(summary.totalTimeSec)}</div><div className="l">Total time viewed</div></div></div>
        <div className="tile"><div className="ic r">📊</div><div><div className="v">{fmtTime(summary.avgTimeSec)}</div><div className="l">Average per visit</div></div></div>
      </div>
      {last && (
        <div className="lastbar"><span className="dot on" /> Last click <b>{timeAgo(last.createdAt)}</b> from <Flag code={last.country} /> <b>{placeLabel(last)}</b> on <DeviceLogo c={last} size={16} /> {osLabel(last)}</div>
      )}

      <div className="panel">
        <div className="top"><h3>Visitor map</h3><span className="muted" style={{ fontSize: 13 }}>Click a circle for details</span></div>
        <VisitorMap clicks={clicks} theme={theme} />
      </div>

      <div className="panel">
        <div className="top"><h3>Clicks over time</h3><RangeBox days={days} setDays={setDays} /></div>
        <BarChart clicks={clicks} days={days} />
      </div>

      <div className="cols three">
        <div className="panel"><h3>Countries</h3><Bars rows={countBy(clicks, (c) => c.country)} icon={(k) => (k === 'Unknown' ? null : <Flag code={k} size={15} />)} label={(k) => (k === 'Unknown' ? 'Unknown' : countryName(k))} empty="No clicks yet." /></div>
        <div className="panel"><h3>Cities</h3><Bars rows={cityRows} icon={(k) => <Flag code={k.split('|')[1]} size={15} />} label={(k) => k.split('|')[0]} empty="No city data yet." /></div>
        <div className="panel"><h3>Operating systems</h3><Donut rows={countBy(clicks, (c) => c.osName || osOf(c.userAgent))} /></div>
        <div className="panel"><h3>Browsers</h3><Bars rows={countBy(clicks, (c) => c.browserName || browserOf(c.userAgent))} icon={(k) => <BrowserLogo name={k} size={15} />} /></div>
        <div className="panel"><h3>Device brands</h3><Bars rows={countBy(clicks, (c) => c.deviceVendor || (c.osName || osOf(c.userAgent)))} icon={(k) => <OsLogo name={k} size={15} />} /></div>
        <div className="panel"><h3>Traffic sources</h3><Bars rows={countBy(clicks, (c) => (c.referrer ? host(c.referrer) : 'Direct'))} /></div>
      </div>

      <div className="panel">
        <div className="top"><h3>Busiest hours <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(your local time)</span></h3></div>
        <HourChart clicks={clicks} />
      </div>

      <div className="panel">
        <div className="top">
          <h3>Recent clicks</h3>
          <div className="toolbar" style={{ margin: 0 }}>
            <input className="field" placeholder="Search IP, city, country, device…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search clicks" />
            <div className="chips">{types.map((t) => <button key={t} className={dev === t ? 'on' : ''} onClick={() => setDev(t)}>{t === 'All' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</button>)}</div>
          </div>
        </div>
        {clicks.length === 0 ? (
          <div className="empty"><div style={{ fontSize: 40 }}>📭</div><b>No clicks yet</b>Share your short link and visits will appear here.</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>When</th><th>IP address</th><th>Location</th><th>Device</th><th>OS</th><th>Browser</th><th>Time viewed</th><th>Came from</th></tr></thead>
              <tbody>
                {rowsShown.slice(0, 100).map((c) => (
                  <tr key={c._id} className="clickable" onClick={() => setDetail(c)} title="Click for full details">
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(c.createdAt).toLocaleString()}<span className="sub">{timeAgo(c.createdAt)}</span></td>
                    <td><span className="ip-badge">{c.ip || '—'}</span>{c.isLocal && <span className="tz-badge" title="Opened from the same computer as the server; this network's public IP is shown">local test</span>}</td>
                    <td><Place c={c} />{c.timezone && <span className="tz-badge" title="Timezone">{c.timezone}</span>}</td>
                    <td><Device c={c} /></td>
                    <td><span className="device-cell"><OsLogo name={c.osName || osOf(c.userAgent)} />{osLabel(c)}</span></td>
                    <td><span className="device-cell"><BrowserLogo name={c.browserName || browserOf(c.userAgent)} />{browserLabel(c)}</span></td>
                    <td>{fmtTime(c.durationSec)}</td>
                    <td>{c.referrer ? host(c.referrer) : <span className="muted">Direct</span>}</td>
                  </tr>
                ))}
                {rowsShown.length === 0 && <tr><td colSpan="8" className="muted" style={{ textAlign: 'center' }}>No clicks match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {detail && <ClickModal c={detail} onClose={() => setDetail(null)} toast={toast} />}
    </>
  );
}

/* ---------- App shell ---------- */
export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const [page, setPage] = useState('overview');
  const [statsId, setStatsId] = useState(null);
  const [msg, setMsg] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme); }, [theme]);
  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(''), 1800); };
  const logout = () => { const t = localStorage.getItem('theme'); localStorage.clear(); localStorage.setItem('theme', t); setLoggedIn(false); setPage('overview'); };
  const openStats = (id) => { setStatsId(id); setPage('stats'); };

  if (!loggedIn) return <Auth onLogin={() => setLoggedIn(true)} />;
  const nav = [['overview', '📈', 'Overview'], ['links', '🔗', 'My links']];

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><i>🔗</i>LinkTrack</div>
        <nav>{nav.map(([k, ic, name]) => <button key={k} className={'nav-item' + (page === k ? ' on' : '')} onClick={() => setPage(k)}>{ic} {name}</button>)}</nav>
        <div className="who">
          <b>{localStorage.getItem('email')}</b>
          <div className="row2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}</button>
            <button onClick={logout}>Log out</button>
          </div>
        </div>
      </aside>
      <main className="main">
        {page === 'overview' && <Overview goLinks={() => setPage('links')} openStats={openStats} theme={theme} />}
        {page === 'links' && <Links openStats={openStats} toast={toast} />}
        {page === 'stats' && <Stats id={statsId} onBack={() => setPage('links')} toast={toast} theme={theme} />}
      </main>
      <div className="bottom">{nav.map(([k, ic, name]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}>{ic}<br />{name}</button>)}</div>
      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}

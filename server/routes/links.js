const router = require('express').Router();
const { nanoid } = require('nanoid');
const auth = require('../middleware/auth');
const Link = require('../models/Link');
const Click = require('../models/Click');

router.use(auth);

const RESERVED = ['api', 'track'];
const withShort = (l) => ({ ...l.toObject(), shortUrl: `${process.env.BASE_URL}/${l.code}` });
const clampDelay = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Math.min(10, Math.max(0, Number(v))) : fallback);
const daysFromNow = (d) => new Date(Date.now() + Number(d) * 86400000);

// create short link (optional custom alias, expiry, redirect delay)
router.post('/', async (req, res) => {
  let { url, title, alias, expiresInDays, delaySec } = req.body;
  try {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'Please enter a valid URL' });
  }
  let code = nanoid(7);
  if (alias) {
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(alias) || RESERVED.includes(alias.toLowerCase()))
      return res.status(400).json({ error: 'Custom name: 3-30 letters, numbers, - or _' });
    if (await Link.findOne({ code: alias })) return res.status(400).json({ error: 'That custom name is already taken' });
    code = alias;
  }
  const link = await Link.create({
    owner: req.userId, originalUrl: url, title, code,
    delaySec: clampDelay(delaySec, 2),
    expiresAt: Number(expiresInDays) > 0 ? daysFromNow(expiresInDays) : undefined,
  });
  res.json(withShort(link));
});

// list my links
router.get('/', async (req, res) => {
  const links = await Link.find({ owner: req.userId }).sort({ createdAt: -1 });
  res.json(links.map(withShort));
});

// all my clicks of the last 30 days (for the overview charts)
router.get('/overview/summary', async (req, res) => {
  const ids = (await Link.find({ owner: req.userId }).select('_id')).map((l) => l._id);
  const since = new Date(Date.now() - 30 * 86400000);
  const clicks = await Click.find({ link: { $in: ids }, createdAt: { $gte: since } })
    .select('link country userAgent osName deviceType createdAt durationSec').sort({ createdAt: -1 }).limit(5000).lean();
  res.json({ clicks });
});

// edit a link: title, on/off, redirect delay, expiry
router.patch('/:id', async (req, res) => {
  const link = await Link.findOne({ _id: req.params.id, owner: req.userId });
  if (!link) return res.status(404).json({ error: 'Link not found' });
  const { title, active, delaySec, expiresInDays } = req.body;
  if (title !== undefined) link.title = title;
  if (active !== undefined) link.active = !!active;
  if (delaySec !== undefined) link.delaySec = clampDelay(delaySec, link.delaySec);
  if (expiresInDays !== undefined) link.expiresAt = Number(expiresInDays) > 0 ? daysFromNow(expiresInDays) : undefined;
  await link.save();
  res.json(withShort(link));
});

// stats for one link
router.get('/:id/stats', async (req, res) => {
  const link = await Link.findOne({ _id: req.params.id, owner: req.userId });
  if (!link) return res.status(404).json({ error: 'Link not found' });
  const clicks = await Click.find({ link: link._id }).sort({ createdAt: -1 }).limit(1000).lean();
  const totalTime = clicks.reduce((s, c) => s + (c.durationSec || 0), 0);
  const countries = {};
  clicks.forEach((c) => { const k = c.country || 'Unknown'; countries[k] = (countries[k] || 0) + 1; });
  res.json({
    link: withShort(link),
    summary: {
      totalClicks: link.clicks,
      totalTimeSec: Math.round(totalTime),
      avgTimeSec: clicks.length ? +(totalTime / clicks.length).toFixed(1) : 0,
      countries,
    },
    clicks,
  });
});

router.delete('/:id', async (req, res) => {
  const link = await Link.findOneAndDelete({ _id: req.params.id, owner: req.userId });
  if (link) await Click.deleteMany({ link: link._id });
  res.json({ ok: true });
});

module.exports = router;

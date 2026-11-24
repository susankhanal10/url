const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6)
    return res.status(400).json({ error: 'Email and a password of 6+ characters required' });
  if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already registered' });
  const user = await User.create({ email, password: await bcrypt.hash(password, 10) });
  res.json({ token: sign(user), email: user.email });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(400).json({ error: 'Invalid email or password' });
  res.json({ token: sign(user), email: user.email });
});

module.exports = router;

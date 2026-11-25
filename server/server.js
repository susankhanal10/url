require('dotenv').config();
require('express-async-errors'); // lets async route errors reach the error handler instead of crashing the server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', true); // so the real IP is read correctly behind proxies / load balancers
app.use(cors());
app.use(express.json());

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in a few minutes' } }), require('./routes/auth'));
app.use('/api/links', require('./routes/links'));

// visiting the bare short domain sends people to the dashboard
app.get('/', (req, res) => res.redirect(process.env.CLIENT_URL || 'http://localhost:5173'));
app.use('/', require('./routes/redirect')); // /:code  and  /track/:id

// central error handler
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('DB connection error:', err.message));

# LinkTrack – MERN URL Shortener with Click Analytics

**Stack:** MongoDB, Express, React (Vite), Node.js, JWT auth.

## Features
- Register / login (JWT, bcrypt)
- Shorten any URL -> `http://localhost:5000/<code>`
- Every click is stored: visitor location (IP geolocation), time, referrer, time spent on the link page
- Dashboard with total clicks, total/avg time viewed, country breakdown, recent clicks table

## Run
Requires Node 18+ and MongoDB running locally (or an Atlas URI in `server/.env`).

    cd server && npm install && npm start
    cd client && npm install && npm run dev

Open http://localhost:5173

## Test location tracking locally
Localhost has no public IP, so fake one:

    curl -H "X-Forwarded-For: 8.8.8.8" http://localhost:5000/<code>

## API
| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register, /login | auth |
| POST | /api/links | create short link |
| GET | /api/links | list my links |
| GET | /api/links/:id/stats | stats + clicks |
| DELETE | /api/links/:id | delete |
| GET | /:code | record click + redirect |
| POST | /track/:id | beacon: time on page |

## Extra features (v2)
Overview dashboard, dark mode, custom short names, link expiry, on/off switch, QR codes, search/sort/filter,
redirect-delay slider, CSV export, device/browser/referrer breakdowns.
Run `npm install` again in both folders (a new package `qrcode` was added to the client).

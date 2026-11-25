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


## New in v3
- **Real IP address** for every click (reads Cloudflare / proxy headers). On localhost it uses your network's public IP, shown with a "local test" tag.
- **Country flag, city, region, ISP, coordinates and timezone** per visitor (ipwho.is, with the offline geoip-lite database as a fallback)
- **Brand logos** for device (Apple, Samsung, Xiaomi...), operating system and browser
- **Visitor map** (Leaflet) on the overview and on every link, with live updates
- **Click details window**: click any row to see everything about that visit
- Unique visitors, top cities, busiest hours, live activity feed, search/filter in the click table
- **Professional short links**: short readable codes (6 characters, no look-alike letters), a branded redirect page showing the destination, polished 404/expired pages, "link ready" card with copy / open / QR / share
- Rate-limited login, central error handler (a database error no longer crashes the server)

## Making links look professional
Set `BASE_URL` in `server/.env` to your own short domain, e.g. `BASE_URL=https://lnk.yourname.com`, and `CLIENT_URL` to your dashboard address.

Run `npm install` again in both `server` and `client` (new packages: express-rate-limit, express-async-errors, leaflet, flag-icons, react-icons).

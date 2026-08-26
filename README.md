# NYC Bus-Lane Corridors — before / after

It's Gabriel. I built this to answer one question with real data: **when a Manhattan street gets a bus-only lane, do the buses actually get faster — and do more people ride?** It's a CARTO + deck.gl map where you ride each route end-to-end and watch a "before-lane" point race an "after-lane" point.

Everything on the map streams live from CARTO — no mock data, no creds in this repo. Themed for the [Spatial Data Science Conference](https://spatial-data-science-conference.com/) (New York · Oct 20–21, 2026, New World Stages) — tap the CARTO marker on the map to visit.

## The 5 routes
Not just the busiest buses — the busiest that *genuinely run in a bus-only lane*. I overlapped each route's GTFS shape with the NYC DOT bus-lane network and kept only the ones with real coverage, then ranked by ridership (that's why M4/5th Ave and M86/86th St are out — barely any lane).

| # | Route | Riders/yr | In a lane | Speed after lane |
|---|---|--:|--:|--:|
| 1 | M15 · 1st/2nd Ave | 12.0M | 79% | +2% |
| 2 | M14 · 14th St Busway | 8.35M | 61% | **+27%** |
| 3 | M101 · Lex/3rd Ave | 5.99M | 55% | +4% |
| 4 | M23 · 23rd St | 3.23M | 68% | +19% |
| 5 | M96 · 96th St | 3.09M | 62% | −10% |

The M14 busway is the standout; M96 actually got slower. Real data, not a pitch.

## What you see
- **Map** (locked to each route's extent): the GTFS route line, the **bus-only lane** as a teal band only where it exists, and two moving points — grey **before** and amber **after** — each labeled. Charts are [Apache ECharts](https://echarts.apache.org).
- **Ride it** (▶): the two points run at the measured before/after speeds; the map follows both and a finish card + confetti show the time saved.
- **Card**: install year, before→after speed (monthly) and ridership, and the trip-time delta.

## Data (all in CARTO `carto_dw`)
- `nyc_bus_corridor_routes` — GTFS route shapes (MTA Manhattan feed)
- `nyc_bus_corridor_lanes` — DOT bus lanes matched to each route and dissolved to continuous lines
- `nyc_bus_corridor_monthly` — monthly weekday speed (MTA Bus Speeds)

Pulled at runtime via [`@carto/api-client`](https://github.com/CartoDB/carto-api-client) (`widgetSource.getTable`); the route↔lane spatial matching runs in CARTO SQL.

**Open-data sources:**
- [MTA Bus Speeds: Beginning 2015](https://data.ny.gov/Transportation/MTA-Bus-Speeds-Beginning-2015/6ksi-7cxr) — bus speed by route/month
- [MTA Bus Customer Journey-Focused Metrics: Beginning 2017](https://data.ny.gov/Transportation/MTA-Bus-Customer-Journey-Focused-Metrics-Beginning/kv7t-n8in) — ridership
- [MTA GTFS — bus feeds](https://www.mta.info/developers) (Manhattan bus `gtfs_m`) — route shapes
- [NYC DOT Bus Lanes – Local Streets](https://data.cityofnewyork.us/Transportation/Bus-Lanes-Local-Streets/ycrg-ses3) — bus-lane network

## Run locally
```bash
cp .env.example .env      # then fill in your CARTO values
npm install && npm run dev
```
Mint the token (read-only, referer-locked, scoped to the 3 tables):
```bash
carto credentials create token --connection carto_dw \
  --source <project.dataset.nyc_bus_corridor_routes> \
  --source <project.dataset.nyc_bus_corridor_lanes> \
  --source <project.dataset.nyc_bus_corridor_monthly> \
  --apis sql,maps --referers 'http://localhost:5173*'
```

## Deploy on Railway
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/nyc-bus-lane-corri-1)

`railway.json` is included (build `npm run build`, serve `npm run start`). Set these variables in the Railway service (nothing is committed):

| Variable | What it is | Example |
|---|---|---|
| `VITE_CARTO_API_BASE` | Your CARTO region API base | `https://gcp-us-east1.api.carto.com` |
| `VITE_CARTO_CONNECTION` | CARTO connection name | `carto_dw` |
| `VITE_CARTO_TOKEN` | CARTO **API Access Token** (public, read-only) | `eyJhbGciOi…` |
| `VITE_ROUTES_TABLE` | Route-shapes table (FQN) | `project.dataset.nyc_bus_corridor_routes` |
| `VITE_LANES_TABLE` | Bus-lane table (FQN) | `project.dataset.nyc_bus_corridor_lanes` |
| `VITE_MONTHLY_TABLE` | Monthly-speed table (FQN) | `project.dataset.nyc_bus_corridor_monthly` |

The token is a CARTO **API Access Token** — see the docs: **[API access tokens](https://docs.carto.com/carto-for-developers/key-concepts/authentication-methods/api-access-tokens)**. Create one scoped (read-only, `sql,maps`) to the three tables and **referer-locked to your deployed domain**, or the Maps API returns 403:

```bash
carto credentials create token --connection carto_dw \
  --source <project.dataset.nyc_bus_corridor_routes> \
  --source <project.dataset.nyc_bus_corridor_lanes> \
  --source <project.dataset.nyc_bus_corridor_monthly> \
  --apis sql,maps --referers 'https://<app>.up.railway.app*'
```

## Built with
- [CARTO](https://carto.com) — platform, [docs & API tokens](https://docs.carto.com), and the `carto` CLI ([carto-basics skill](https://github.com/CartoDB/carto-internal-skills))
- [CARTO Agent Skills](https://github.com/CartoDB/carto-internal-skills) — scaffolded with `carto-import-export-data` and `carto-develop-app`
- [deck.gl](https://deck.gl) · [MapLibre](https://maplibre.org) · [Apache ECharts](https://echarts.apache.org)

## Caveats
Speeds are mileage-weighted, weekday; 2020–21 excluded from before/after. Ridership dipped in COVID and is measured 2018→2024. Trip time = route length ÷ speed. Association, not a controlled experiment.

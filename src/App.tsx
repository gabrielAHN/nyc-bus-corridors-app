import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator, WebMercatorViewport } from '@deck.gl/core';
import { ScatterplotLayer, TextLayer, PathLayer, IconLayer } from '@deck.gl/layers';
import { CORRIDORS, pct } from './corridors';
import { fetchAllRoutePaths, fetchAllLanePaths, fetchAllMonthly, type MonthPt, type Path } from './cartodata';
import { Delta, Confetti } from './charts';
import { SpeedChart, RidershipChart } from './echarts';

const API = import.meta.env.VITE_CARTO_API_BASE as string;
const TOKEN = import.meta.env.VITE_CARTO_TOKEN as string;
const CONNECTION = import.meta.env.VITE_CARTO_CONNECTION as string;
const ROUTES = import.meta.env.VITE_ROUTES_TABLE as string;
const LANES = import.meta.env.VITE_LANES_TABLE as string;
const cfg = { accessToken: TOKEN, apiBaseUrl: API, connectionName: CONNECTION };
const TRIP_MS = 24000; // wall-clock for the full trip — mid-pace tracking

const kmBetween = (a: number[], b: number[]) => {
  const mx = Math.cos((40.78 * Math.PI) / 180) * 111.32, my = 111.32;
  return Math.hypot((b[0] - a[0]) * mx, (b[1] - a[1]) * my);
};
const BEFORE_COL: [number, number, number] = [70, 78, 90];   // slate grey = before-lane bus
const AFTER_COL: [number, number, number] = [245, 158, 11];  // amber = after-lane bus
// Spatial Data Science Conference — New York 2026
const SDSC_URL = 'https://spatial-data-science-conference.com/';
const SDSC_POS: [number, number] = [-73.9865, 40.7625]; // New World Stages, NYC
const SDSC_INFO = 'Spatial Data Science Conference · New York · Oct 20–21, 2026 · New World Stages';
const TIP_STYLE: Record<string, string> = {
  background: '#12161d', color: '#e9eef4', border: '1px solid rgba(45,225,194,0.55)',
  borderRadius: '10px', padding: '9px 12px', fontSize: '12px',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  boxShadow: '0 8px 24px rgba(0,0,0,0.55)', maxWidth: '240px', pointerEvents: 'none',
};
// CARTO marker icon — navy dot on a light circle
const CARTO_ICON = 'data:image/svg+xml;base64,' + btoa(
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
  '<circle cx="24" cy="24" r="22" fill="#e6e8ec" stroke="#ffffff" stroke-width="2"/>' +
  '<circle cx="24" cy="24" r="10" fill="#16294a"/></svg>');

export default function App() {
  // selected corridor is driven by the URL (#/m15, #/m14, …); defaults to #1
  const { code } = useParams();
  const navigate = useNavigate();
  const sel = CORRIDORS.find((c) => c.code.toLowerCase() === (code || '').toLowerCase())?.id ?? CORRIDORS[0].id;
  const setSel = (id: number) => navigate('/' + (CORRIDORS.find((c) => c.id === id)?.code.toLowerCase() ?? ''));
  useEffect(() => { if (!code) navigate('/' + CORRIDORS[0].code.toLowerCase(), { replace: true }); }, [code]);
  const [allPaths, setAllPaths] = useState<Record<number, Path>>({});
  const [allLanePaths, setAllLanePaths] = useState<Record<number, Path[]>>({});
  const [allMonthly, setAllMonthly] = useState<Record<number, MonthPt[]>>({});
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const elapsedRef = useRef(0);
  const confTimer = useRef<number | null>(null);
  const idx = CORRIDORS.findIndex((x) => x.id === sel);
  const c = CORRIDORS[idx];
  const [cr, cg, cb] = c.color;
  const chg = pct(c.speedBefore, c.speedAfter);
  const path = allPaths[sel] ?? [];
  const lanePaths = allLanePaths[sel] ?? [];
  const monthPts = allMonthly[sel] ?? [];
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  const [viewState, setViewState] = useState<any>({ longitude: c.center[0], latitude: c.center[1], zoom: c.zoom, pitch: 0, bearing: 0 });

  // preload ALL corridors' geometry once, so switching routes is instant (no per-switch fetch lag)
  useEffect(() => {
    fetchAllRoutePaths().then(setAllPaths).catch((e) => console.error('routes', e));
    fetchAllLanePaths().then(setAllLanePaths).catch((e) => console.error('lanes', e));
    fetchAllMonthly().then(setAllMonthly).catch((e) => console.error('monthly', e));
  }, []);

  // on route change: just reset the trip + fly to it (all data is already loaded)
  useEffect(() => {
    setElapsed(0); elapsedRef.current = 0; setPlaying(false); setFinished(false);
    setViewState((vs: any) => ({ ...vs, longitude: c.center[0], latitude: c.center[1], zoom: c.zoom,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.3 }), transitionDuration: 'auto' }));
  }, [sel]);

  // smooth rAF-driven trip
  useEffect(() => {
    if (!playing) return;
    let raf = 0, start = 0; const startE = elapsedRef.current;
    const step = (ts: number) => {
      if (!start) start = ts;
      const e = startE + ((ts - start) / TRIP_MS) * c.tripBefore;
      if (e >= c.tripBefore) {
        setElapsed(c.tripBefore); setPlaying(false); setFinished(true);
        setConfetti(true);
        if (confTimer.current) window.clearTimeout(confTimer.current);
        confTimer.current = window.setTimeout(() => setConfetti(false), 2600);
        return;
      }
      setElapsed(e); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, sel]);

  const cum = useMemo(() => { const out = [0]; for (let i = 1; i < path.length; i++) out.push(out[i - 1] + kmBetween(path[i - 1], path[i])); return out; }, [path]);
  const total = cum.length ? cum[cum.length - 1] : c.lengthKm;
  const posAt = (d0: number): [number, number] => {
    if (path.length < 2) return c.center;
    const d = Math.max(0, Math.min(total, d0));
    let lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, f = (d - cum[lo]) / seg;
    return [path[lo][0] + (path[hi][0] - path[lo][0]) * f, path[lo][1] + (path[hi][1] - path[lo][1]) * f];
  };
  // position along route, offset laterally so the two buses ride side-by-side (never overlap).
  // offset is a constant ~6 screen-px (zoom-aware) so they hug the line but stay separated at any zoom.
  const MXo = Math.cos((40.78 * Math.PI) / 180) * 111320, MYo = 111320;
  const mpp = (156543.03 * Math.cos((40.78 * Math.PI) / 180)) / Math.pow(2, viewState.zoom || c.zoom);
  const OFF_M = 6 * mpp;
  const offsetPos = (distKm: number, side: number): [number, number] => {
    const p = posAt(distKm);
    const ahead = Math.min(total, distKm + 0.03), behind = Math.max(0, distKm - 0.03);
    const q = ahead > distKm ? posAt(ahead) : p, r = posAt(behind);
    let tx = (q[0] - r[0]) * MXo, ty = (q[1] - r[1]) * MYo;
    const len = Math.hypot(tx, ty) || 1; tx /= len; ty /= len;
    const px = -ty * side * OFF_M, py = tx * side * OFF_M; // perpendicular offset (meters)
    return [p[0] + px / MXo, p[1] + py / MYo];
  };
  const kmPerMin = (mph: number) => (mph * 1.60934) / 60;
  const beforePos = offsetPos(kmPerMin(c.speedBefore) * elapsed, -1);
  const afterPos = offsetPos(kmPerMin(c.speedAfter) * elapsed, 1);

  // during play, center the view on the moving points (only zoom OUT from the route zoom — no jitter)
  useEffect(() => {
    if (!playing || path.length < 2) return;
    const midLon = (beforePos[0] + afterPos[0]) / 2, midLat = (beforePos[1] + afterPos[1]) / 2;
    const lons = [beforePos[0], afterPos[0]], lats = [beforePos[1], afterPos[1]]; const pad = 0.0009;
    const bounds: [[number, number], [number, number]] = [[Math.min(...lons) - pad, Math.min(...lats) - pad], [Math.max(...lons) + pad, Math.max(...lats) + pad]];
    let zoom = c.zoom;
    try {
      const vp = new WebMercatorViewport({ width: window.innerWidth, height: window.innerHeight });
      zoom = vp.fitBounds(bounds, { padding: 160 }).zoom;
    } catch { /* keep route zoom */ }
    setViewState((vs: any) => ({ ...vs, longitude: midLon, latitude: midLat, zoom: Math.max(c.zoom - 2.5, Math.min(c.zoom, zoom)), transitionDuration: 0 }));
  }, [elapsed, playing]);

  const laneCol: [number, number, number] = [13, 148, 136]; // consistent bus-lane teal across all routes
  const ctxPaths = useMemo(() => Object.entries(allPaths).filter(([id]) => +id !== sel).map(([, p]) => p), [allPaths, sel]);
  // bus-lane band grows with zoom so it reads as a wide lane when zoomed in
  const z = viewState.zoom || c.zoom;
  const laneW = Math.min(40, Math.max(9, 9 + (z - 11) * 4.5));

  const layers = [
    // faint context: the other routes
    new PathLayer<Path>({ id: 'routes-ctx', data: ctxPaths, getPath: (d) => d, getColor: [150, 158, 168, 80],
      getWidth: 1.5, widthUnits: 'pixels', widthMinPixels: 1, capRounded: true, jointRounded: true }),
    // bus lane = ONE bold teal band, ONLY where a bus-only lane exists, under the route (scales with zoom)
    new PathLayer<Path>({ id: 'fastlane', data: lanePaths, getPath: (d) => d, getColor: [laneCol[0], laneCol[1], laneCol[2], 255],
      getWidth: laneW, widthUnits: 'pixels', widthMinPixels: 10, capRounded: true, jointRounded: true,
      updateTriggers: { getPath: [sel], getWidth: [laneW] } }),
    // route ON TOP: corridor-colored line with a white casing so it stays distinct from the teal lane
    new PathLayer<Path>({ id: 'route-casing', data: path.length ? [path] : [], getPath: (d) => d, getColor: [255, 255, 255, 255],
      getWidth: 6.5, widthUnits: 'pixels', widthMinPixels: 4, capRounded: true, jointRounded: true, updateTriggers: { getPath: [sel] } }),
    new PathLayer<Path>({ id: 'route-sel', data: path.length ? [path] : [], getPath: (d) => d, getColor: [cr, cg, cb, 255],
      getWidth: 3, widthUnits: 'pixels', widthMinPixels: 2, capRounded: true, jointRounded: true, updateTriggers: { getPath: [sel], getColor: [sel] } }),
    // buses = moving points, each with an attached label
    new ScatterplotLayer({ id: 'buses', data: [
        { pos: beforePos, col: BEFORE_COL },
        { pos: afterPos, col: AFTER_COL }],
      getPosition: (d: any) => d.pos, getFillColor: (d: any) => d.col, getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2, stroked: true, radiusUnits: 'pixels', getRadius: 8,
      updateTriggers: { getPosition: [beforePos, afterPos] } }),
    new TextLayer({ id: 'bus-labels', data: [
        { pos: beforePos, t: 'before', col: BEFORE_COL, off: [0, -16] as [number, number] },
        { pos: afterPos, t: 'after', col: AFTER_COL, off: [0, 18] as [number, number] }],
      getPosition: (d: any) => d.pos, getText: (d: any) => d.t, getColor: (d: any) => d.col, getSize: 11,
      fontFamily: 'Inter, sans-serif', fontWeight: 700, getTextAnchor: 'middle', getPixelOffset: (d: any) => d.off,
      background: true, getBackgroundColor: [255, 255, 255, 235], backgroundPadding: [4, 2],
      updateTriggers: { getPosition: [beforePos, afterPos] } }),
    // SDSC venue star — click to open the conference site
    new IconLayer({ id: 'sdsc-star', data: [{ pos: SDSC_POS }],
      getIcon: () => ({ url: CARTO_ICON, width: 48, height: 48, anchorX: 24, anchorY: 24 }),
      getPosition: (d: any) => d.pos, getSize: 30, sizeUnits: 'pixels', pickable: true,
      onClick: () => { window.open(SDSC_URL, '_blank', 'noopener'); } }),
  ];

  const saved = c.savedMin;
  const play = () => { if (finished || elapsed >= c.tripBefore) { setElapsed(0); elapsedRef.current = 0; setFinished(false); } setPlaying((p) => !p); };
  const scrub = (v: number) => { setPlaying(false); setFinished(false); setElapsed(v); elapsedRef.current = v; };

  // lock panning/zoom to the selected route's extent
  const bounds = useMemo(() => {
    if (path.length < 2) return null;
    const lo = path.map((p) => p[0]), la = path.map((p) => p[1]);
    return { w: Math.min(...lo), e: Math.max(...lo), s: Math.min(...la), n: Math.max(...la) };
  }, [path]);
  const clampView = (vs: any) => {
    const zoom = Math.max(c.zoom - 1, Math.min(c.zoom + 3, vs.zoom));
    if (!bounds) return { ...vs, zoom, pitch: 0, bearing: 0 };
    const mx = 0.008, my = 0.006;
    return {
      ...vs, zoom, pitch: 0, bearing: 0,
      longitude: Math.max(bounds.w - mx, Math.min(bounds.e + mx, vs.longitude)),
      latitude: Math.max(bounds.s - my, Math.min(bounds.n + my, vs.latitude)),
    };
  };
  // close celebration: reset the trip to the start (confetti already fired on finish)
  const closeFinish = () => {
    setFinished(false); setPlaying(false); setElapsed(0); elapsedRef.current = 0;
  };

  return (
    <div className="app">
      <DeckGL viewState={viewState} onViewStateChange={(e: any) => setViewState(clampView(e.viewState))}
        controller={{ dragRotate: false, touchRotate: false }} layers={layers}
        getTooltip={(info: any) => {
          if (info?.layer?.id === 'sdsc-star') return {
            html: `<div class="tip"><div class="tip-h">Spatial Data Science Conference</div>`
              + `<div class="tip-r"><b>New York</b> · Oct 20–21, 2026</div>`
              + `<div class="tip-sub">New World Stages · a CARTO event</div>`
              + `<div class="tip-go">Click to visit ↗</div></div>`,
            className: 'sdsc-tip', style: TIP_STYLE };
          if (info?.object?.properties?.corridor) return { html: `<div class="tip"><b>${info.object.properties.corridor}</b></div>`, style: TIP_STYLE };
          return null;
        }}>
        <Map mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" />
      </DeckGL>

      {/* selector */}
      <div className="legend-panel">
        <div className="brand-title">NYC Bus-Lane Corridors</div>
        <div className="brand-sub">The 5 busiest Manhattan routes with a bus-only lane</div>
        {CORRIDORS.map((x, i) => (
          <button key={x.id} className={`leg-row ${x.id === sel ? 'active' : ''}`} onClick={() => setSel(x.id)} style={{ ['--c' as any]: `rgb(${x.color.join(',')})` }}>
            <span className="rank">#{i + 1}</span>
            <span className="dot" style={{ background: `rgb(${x.color.join(',')})` }} />
            <span className="leg-name">{x.name}<span className="leg-sub">{x.ridersM}M riders/yr</span></span>
          </button>
        ))}
      </div>

      {/* simple map legend */}
      <div className="map-legend">
        <div className="ml-row"><span className="ml-line" style={{ background: `rgb(${cr},${cg},${cb})` }} /> {c.code} route</div>
        <div className="ml-row"><span className="ml-band" style={{ background: `rgb(${laneCol[0]},${laneCol[1]},${laneCol[2]})` }} /> bus-only lane</div>
      </div>

      {/* concise analysis card */}
      <div className="analysis" style={{ ['--accent' as any]: `rgb(${cr},${cg},${cb})` }}>
        <div className="an-head">
          <span className="an-code">{c.code} · {c.street}</span>
          <span className="an-chip">#{idx + 1} busiest · lane {c.install}</span>
        </div>
        <div className="kpis">
          <Kpi label="Usage" value={`${c.ridersM}M`} sub="riders/yr" />
          <Kpi label="Speed" value={`${c.speedAfter}`} sub="mph" delta={chg} />
          <Kpi label="Trip" value={`${c.tripAfter}m`} sub={`${c.tripBefore}m before`} delta={pct(c.tripBefore, c.tripAfter)} invert />
        </div>
        <div className="spark-title">Speed by month · dashed = <b style={{ color: `rgb(${cr},${cg},${cb})` }}>lane</b></div>
        <SpeedChart data={monthPts} color={`rgb(${cr},${cg},${cb})`} install={c.install} />
        <div className="spark-title" style={{ marginTop: 12 }}>Ridership <Delta value={c.ridersChg} suffix="%" /> after lane</div>
        <RidershipChart before={c.riders[0]} after={c.riders[6]} color={`rgb(${cr},${cg},${cb})`} />
        <div className="card-links">
          <a href="https://github.com/gabrielAHN/nyc-bus-corridors-app" target="_blank" rel="noopener" title="GitHub repo">
            <svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>
            <span>GitHub</span>
          </a>
          <a href={SDSC_URL} target="_blank" rel="noopener" title="CARTO · Spatial Data Science Conference">
            <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2"/><circle cx="12" cy="12" r="3.6" fill="currentColor"/></svg>
            <span>CARTO</span>
          </a>
        </div>
      </div>

      {/* trip control */}
      <div className="timeline" style={{ ['--accent' as any]: `rgb(${cr},${cg},${cb})` }}>
        <button className="play" onClick={play}>{playing ? '❚❚' : (finished ? '↺' : '▶')}</button>
        <div className="tl-main">
          <div className="tl-head">
            <span>Ride the {c.code} — <b>before</b> vs <b>after</b> the bus lane</span>
            <span className="tl-clock">{elapsed.toFixed(0)} min</span>
          </div>
          <input type="range" min={0} max={c.tripBefore} step={0.1} value={elapsed} onChange={(e) => scrub(+e.target.value)} />
        </div>
        <div className={`saved ${saved >= 0 ? 'good' : 'bad'}`}>
          <span className="saved-val">{saved >= 0 ? '−' : '+'}{Math.abs(saved).toFixed(1)}m</span>
          <span className="saved-lab">{saved >= 0 ? 'faster' : 'slower'}</span>
        </div>
      </div>

      {/* finish celebration */}
      {finished && (
        <div className="finish" onClick={closeFinish}>
          <div className="finish-card" style={{ ['--accent' as any]: `rgb(${cr},${cg},${cb})` }} onClick={(e) => e.stopPropagation()}>
            <div className="finish-flag">🏁</div>
            <div className="finish-title">After-lane bus arrives {Math.abs(saved).toFixed(1)} min {saved >= 0 ? 'earlier' : 'later'}</div>
            <div className="finish-times">
              <span className="ft before">before {c.tripBefore}m</span>
              <span className="ft after">after {c.tripAfter}m</span>
            </div>
            <div className="finish-sub">{c.code} · {chg >= 0 ? '+' : ''}{chg.toFixed(1)}% bus speed after the lane</div>
            <button className="finish-close" onClick={closeFinish}>Close &amp; reset</button>
          </div>
        </div>
      )}

      {confetti && <Confetti colors={[`rgb(${cr},${cg},${cb})`, '#12a150', '#f5c518', '#36bffa', '#ff6b6b']} />}
    </div>
  );
}

function Kpi({ label, value, sub, delta, invert }: { label: string; value: string; sub: string; delta?: number; invert?: boolean }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-after">{value}</div>
      <div className="kpi-sub">{sub}</div>
      {delta != null && <Delta value={delta} suffix="%" invert={invert} small />}
    </div>
  );
}

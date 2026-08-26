import { useMemo } from 'react';

type Pt = { x: number; y: number };

export function Confetti({ colors }: { colors: string[] }) {
  const pieces = useMemo(
    () => Array.from({ length: 110 }, (_, i) => ({
      left: Math.random() * 100,
      bg: colors[i % colors.length],
      delay: Math.random() * 0.25,
      dur: 1.1 + Math.random() * 0.9,
      rot: Math.random() * 360,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
    })),
    []
  );
  return (
    <div className="confetti">
      {pieces.map((p, i) => (
        <span key={i} className="confetti-piece" style={{
          left: `${p.left}%`, background: p.bg, width: p.w, height: p.h,
          animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  );
}

export function Delta({ value, suffix, invert, small }: { value: number; suffix: string; invert?: boolean; small?: boolean }) {
  // invert=true means "down is good" (e.g. crashes)
  const good = invert ? value < 0 : value > 0;
  const sign = value > 0 ? '+' : '';
  return (
    <span className={`delta ${good ? 'up' : 'down'} ${small ? 'small' : ''}`}>
      {sign}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

export function LineChart({ points, color, marker, yLabel, cursor }: { points: Pt[]; color: string; marker: number | null; yLabel: string; cursor?: number }) {
  const W = 460, H = 150, pad = { l: 30, r: 12, t: 12, b: 20 };
  if (points.length === 0) return <div className="nodata">no data</div>;
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys) * 0.97, ymax = Math.max(...ys) * 1.03;
  const sx = (x: number) => pad.l + ((x - xmin) / (xmax - xmin || 1)) * (W - pad.l - pad.r);
  const sy = (y: number) => H - pad.b - ((y - ymin) / (ymax - ymin || 1)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const ticks = [ymin, (ymin + ymax) / 2, ymax];
  const yearTicks: number[] = [];
  for (let y = Math.ceil(xmin); y <= xmax; y++) if (y % 2 === 0) yearTicks.push(y);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart" preserveAspectRatio="xMidYMid meet">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} className="grid" />
          <text x={4} y={sy(t) + 3} className="axis">{t.toFixed(t < 20 ? 1 : 0)}</text>
        </g>
      ))}
      {yearTicks.map((y) => (
        <text key={y} x={sx(y)} y={H - 6} className="axis" textAnchor="middle">{`'${String(y).slice(2)}`}</text>
      ))}
      {marker != null && marker >= xmin && marker <= xmax && (
        <g>
          <rect x={sx(marker)} y={pad.t} width={W - pad.r - sx(marker)} height={H - pad.t - pad.b} className="after-shade" />
          <line x1={sx(marker)} x2={sx(marker)} y1={pad.t} y2={H - pad.b} className="marker" />
          <text x={sx(marker) + 4} y={pad.t + 10} className="marker-label">lane installed</text>
        </g>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {cursor != null && cursor >= xmin && cursor <= xmax && (
        <line x1={sx(cursor)} x2={sx(cursor)} y1={pad.t} y2={H - pad.b} className="cursor" />
      )}
    </svg>
  );
}

export function RidershipChange({ before, after, color }: { before: number; after: number; color: string }) {
  const max = Math.max(before, after) || 1;
  return (
    <div className="rchange">
      <div className="rc-item">
        <div className="rc-bar-wrap"><div className="rc-bar" style={{ height: `${(before / max) * 100}%`, background: '#c4ccd6' }} /></div>
        <div className="rc-val">{before.toFixed(1)}M</div><div className="rc-yr">2018</div>
      </div>
      <div className="rc-arrow">→</div>
      <div className="rc-item">
        <div className="rc-bar-wrap"><div className="rc-bar" style={{ height: `${(after / max) * 100}%`, background: color }} /></div>
        <div className="rc-val" style={{ color }}>{after.toFixed(1)}M</div><div className="rc-yr">2024</div>
      </div>
    </div>
  );
}

export function BeforeAfterBar({ before, after, note }: { before: number; after: number; note: string }) {
  const max = Math.max(before, after);
  const w = (v: number) => `${(v / max) * 100}%`;
  return (
    <div className="ba">
      <div className="ba-row">
        <span className="ba-label">before</span>
        <div className="ba-track"><div className="ba-fill before" style={{ width: w(before) }} /></div>
        <span className="ba-val">{Math.round(before)}</span>
      </div>
      <div className="ba-row">
        <span className="ba-label">after</span>
        <div className="ba-track"><div className="ba-fill after" style={{ width: w(after) }} /></div>
        <span className="ba-val">{Math.round(after)}</span>
      </div>
      <div className="ba-note">{note}</div>
    </div>
  );
}

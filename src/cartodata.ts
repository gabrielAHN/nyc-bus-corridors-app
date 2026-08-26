import { vectorTableSource } from '@carto/api-client';

const cfg = {
  accessToken: import.meta.env.VITE_CARTO_TOKEN as string,
  apiBaseUrl: import.meta.env.VITE_CARTO_API_BASE as string,
  connectionName: import.meta.env.VITE_CARTO_CONNECTION as string,
};
const ROUTES = import.meta.env.VITE_ROUTES_TABLE as string;
const LANES = import.meta.env.VITE_LANES_TABLE as string;
const MONTHLY = import.meta.env.VITE_MONTHLY_TABLE as string;

export type MonthPt = { month: string; speed: number };
export type Path = [number, number][];

// All route polylines from CARTO (`path` = JSON array of [lon,lat]).
export async function fetchAllRoutePaths(): Promise<Record<number, Path>> {
  const { widgetSource } = await vectorTableSource({ ...cfg, tableName: ROUTES, columns: ['corridor_id', 'path'] });
  const { rows } = await widgetSource.getTable({ columns: ['corridor_id', 'path'], limit: 20 });
  const out: Record<number, Path> = {};
  for (const r of rows as any[]) { try { out[+r.corridor_id] = JSON.parse(String(r.path)); } catch { /* skip */ } }
  return out;
}

// All bus-lane polylines from CARTO (`paths` = GeoJSON (Multi)LineString) — only the streets with a lane.
export async function fetchAllLanePaths(): Promise<Record<number, Path[]>> {
  const { widgetSource } = await vectorTableSource({ ...cfg, tableName: LANES, columns: ['corridor_id', 'paths'] });
  const { rows } = await widgetSource.getTable({ columns: ['corridor_id', 'paths'], limit: 20 });
  const out: Record<number, Path[]> = {};
  for (const r of rows as any[]) {
    try {
      const g = JSON.parse(String(r.paths));
      out[+r.corridor_id] = g.type === 'MultiLineString' ? g.coordinates : g.type === 'LineString' ? [g.coordinates] : [];
    } catch { out[+r.corridor_id] = []; }
  }
  return out;
}

// All monthly weekday speed series from CARTO, grouped by corridor.
export async function fetchAllMonthly(): Promise<Record<number, MonthPt[]>> {
  const { widgetSource } = await vectorTableSource({ ...cfg, tableName: MONTHLY, columns: ['corridor_id', 'month', 'avg_speed_mph'] });
  const { rows } = await widgetSource.getTable({ columns: ['corridor_id', 'month', 'avg_speed_mph'], limit: 1000 });
  const out: Record<number, MonthPt[]> = {};
  for (const r of rows as any[]) {
    if (r.avg_speed_mph == null) continue;
    (out[+r.corridor_id] ||= []).push({ month: String(r.month).slice(0, 7), speed: +r.avg_speed_mph });
  }
  for (const k of Object.keys(out)) out[+k].sort((a, b) => a.month.localeCompare(b.month));
  return out;
}

import { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';

function EChart({ option, height }: { option: any; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current, undefined, { renderer: 'svg' });
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); inst.current?.dispose(); inst.current = null; };
  }, []);
  useEffect(() => { inst.current?.setOption(option, true); }, [option]);
  return <div ref={ref} style={{ width: '100%', height }} />;
}

const AXIS = '#8b98a5';
const GRID = '#232c37';

export function SpeedChart({ data, color, install }: { data: { month: string; speed: number }[]; color: string; install: number }) {
  const option = useMemo(() => {
    const months = data.map((d) => d.month);
    const speeds = data.map((d) => d.speed);
    const installIdx = data.findIndex((d) => d.month >= `${install}-01`);
    return {
      grid: { left: 34, right: 10, top: 12, bottom: 22 },
      animationDuration: 400,
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v?.toFixed(2)} mph` },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false },
        axisLabel: { color: AXIS, fontSize: 9, interval: (i: number) => months[i]?.endsWith('-01') && +months[i].slice(0, 4) % 2 === 0,
          formatter: (v: string) => `'${v.slice(2, 4)}` },
      },
      yAxis: {
        type: 'value', scale: true, splitLine: { lineStyle: { color: GRID } },
        axisLabel: { color: AXIS, fontSize: 9 }, axisLine: { show: false }, axisTick: { show: false },
      },
      series: [{
        type: 'line', data: speeds, showSymbol: false, smooth: true,
        lineStyle: { color, width: 2 },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: echarts.color.modifyAlpha(color, 0.32) }, { offset: 1, color: echarts.color.modifyAlpha(color, 0.02) }]) },
        markLine: installIdx >= 0 ? {
          symbol: 'none', silent: true,
          lineStyle: { color: '#aeb8c4', type: 'dashed', width: 1.5 },
          label: { formatter: 'lane', color: '#e9eef4', fontSize: 9, position: 'insideStartTop' },
          data: [{ xAxis: installIdx }],
        } : undefined,
      }],
    };
  }, [data, color, install]);
  if (!data.length) return <div className="nodata">no data</div>;
  return <EChart option={option} height={140} />;
}

export function RidershipChart({ before, after, color }: { before: number; after: number; color: string }) {
  const option = useMemo(() => ({
    grid: { left: 30, right: 12, top: 16, bottom: 20 },
    animationDuration: 400,
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v?.toFixed(1)}M riders` },
    xAxis: { type: 'category', data: ['2018', '2024'], axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false }, axisLabel: { color: AXIS, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: GRID } }, axisLabel: { color: AXIS, fontSize: 9, formatter: '{value}M' }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', barWidth: '46%',
      data: [{ value: before, itemStyle: { color: '#c4ccd6' } }, { value: after, itemStyle: { color } }],
      label: { show: true, position: 'top', color: '#e9eef4', fontSize: 11, fontWeight: 700, formatter: (p: any) => `${p.value.toFixed(1)}M` },
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    }],
  }), [before, after, color]);
  return <EChart option={option} height={120} />;
}

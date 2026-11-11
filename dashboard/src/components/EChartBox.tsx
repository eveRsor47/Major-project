import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface EChartBoxProps {
  option: echarts.EChartsCoreOption;
  className?: string;
  height?: number | string;
}

export function EChartBox({ option, className = "", height = 340 }: EChartBoxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
    }
  }, [option]);

  return (
    <div
      ref={containerRef}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
      className={`w-full ${className}`}
    />
  );
}


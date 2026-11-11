import type { ThemeMode } from "../types";

export function getChartPalette(theme: ThemeMode) {
  if (theme === "light") {
    return {
      tooltipBg: "rgba(255, 255, 255, 0.97)",
      tooltipBorder: "rgba(2, 132, 199, 0.32)",
      tooltipText: "#0F172A",
      legendText: "#475569",
      legendInactive: "#CBD5E1",
      axisLine: "#CBD5E1",
      axisLabel: "#475569",
      axisLabelStrong: "#1E293B",
      axisTitle: "#64748B",
      splitLine: "rgba(15, 23, 42, 0.08)",
      trueLine: "#0F172A",
      solar: "#D97706",
      solarBar: "rgba(217, 119, 6, 0.55)",
      grid: "#0284C7",
      net: "#059669",
      netArea: "rgba(5, 150, 105, 0.10)",
      persistence: "#64748B",
      nightShade: "rgba(15, 23, 42, 0.07)",
      piBandFill: "rgba(2, 132, 199, 0.14)",
      shockBandFill: "rgba(217, 119, 6, 0.16)",
      shockLine: "#DC2626",
      shockLabel: "#B91C1C",
      cursorLine: "#D97706",
    };
  }

  return {
    tooltipBg: "rgba(8, 13, 25, 0.95)",
    tooltipBorder: "rgba(92, 184, 228, 0.35)",
    tooltipText: "#E2E8F0",
    legendText: "#94A3B8",
    legendInactive: "#475569",
    axisLine: "#334155",
    axisLabel: "#94A3B8",
    axisLabelStrong: "#CBD5E1",
    axisTitle: "#64748B",
    splitLine: "rgba(148, 163, 184, 0.08)",
    trueLine: "#EDF2F7",
    solar: "#E5A93C",
    solarBar: "rgba(229, 169, 60, 0.45)",
    grid: "#5CB8E4",
    net: "#34D399",
    netArea: "rgba(52, 211, 153, 0.07)",
    persistence: "#94A3B8",
    nightShade: "rgba(7, 8, 11, 0.55)",
    piBandFill: "rgba(92, 184, 228, 0.12)",
    shockBandFill: "rgba(229, 169, 60, 0.16)",
    shockLine: "#F46060",
    shockLabel: "#FCA5A5",
    cursorLine: "#E5A93C",
  };
}

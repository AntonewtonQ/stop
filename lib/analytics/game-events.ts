"use client";

import { track } from "@vercel/analytics";

type AnalyticsValue = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsValue>;

export function trackGameEvent(
  name: string,
  properties: AnalyticsProperties = {},
) {
  try {
    track(name, properties);
  } catch {
    // Analytics should never interrupt the game flow.
  }
}

export function getPerformanceNow() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function getDurationMs(startedAt: number) {
  return Math.max(0, Math.round(getPerformanceNow() - startedAt));
}

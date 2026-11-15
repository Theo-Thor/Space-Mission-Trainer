// REAL NASA DATA — generated from NASA JPL Horizons (https://ssd.jpl.nasa.gov/horizons/), fetched 2026-11-15.
// Observer: lunar surface at 89.5° S, 0° E (geodetic, body 301). Targets: Earth (399) and Sun (10).
// Apparent elevation above an ideal horizon, every 6 hours, 2048-11-01 00:00 to 2048-12-01 00:00 UT.
// "Ideal horizon" means the math horizon: real hills and crater rims can hide the Sun or Earth sooner.

export const SKY_SOURCE = "NASA JPL Horizons: Earth and Sun elevation seen from 89.5° S on the Moon, Nov 2048 (ideal horizon, no hills).";
export const SKY_START = Date.UTC(2048, 10, 1);
export const SKY_STEP_HOURS = 6;
/** Earth elevation above the horizon, degrees. */
export const EARTH_ELEV: number[] = [-6.2, -6.3, -6.38, -6.44, -6.48, -6.49, -6.48, -6.45, -6.4, -6.32, -6.22, -6.1, -5.95, -5.77, -5.57, -5.35, -5.1, -4.84, -4.54, -4.23, -3.9, -3.55, -3.18, -2.8, -2.41, -2.0, -1.58, -1.15, -0.72, -0.29, 0.15, 0.59, 1.03, 1.46, 1.88, 2.3, 2.71, 3.1, 3.49, 3.85, 4.21, 4.54, 4.86, 5.15, 5.43, 5.69, 5.92, 6.13, 6.32, 6.49, 6.63, 6.76, 6.85, 6.93, 6.98, 7.01, 7.01, 6.99, 6.96, 6.89, 6.81, 6.71, 6.59, 6.45, 6.29, 6.11, 5.91, 5.7, 5.47, 5.23, 4.98, 4.71, 4.42, 4.13, 3.83, 3.52, 3.2, 2.87, 2.53, 2.19, 1.85, 1.5, 1.15, 0.8, 0.44, 0.09, -0.26, -0.61, -0.96, -1.31, -1.65, -1.98, -2.31, -2.63, -2.95, -3.26, -3.55, -3.84, -4.12, -4.39, -4.64, -4.88, -5.11, -5.33, -5.53, -5.72, -5.89, -6.04, -6.17, -6.29, -6.39, -6.47, -6.54, -6.58, -6.6, -6.6, -6.58, -6.53, -6.46, -6.37, -6.26];
/** Sun elevation above the horizon, degrees. */
export const SUN_ELEV: number[] = [0.77, 0.75, 0.72, 0.69, 0.67, 0.64, 0.62, 0.6, 0.57, 0.55, 0.53, 0.52, 0.5, 0.48, 0.47, 0.45, 0.44, 0.43, 0.42, 0.41, 0.41, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.41, 0.42, 0.43, 0.43, 0.44, 0.46, 0.47, 0.48, 0.5, 0.51, 0.53, 0.55, 0.56, 0.58, 0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.88, 0.9, 0.91, 0.93, 0.95, 0.96, 0.97, 0.99, 1.0, 1.01, 1.02, 1.03, 1.04, 1.04, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.05, 1.04, 1.04, 1.03, 1.02, 1.01, 1.0, 0.98, 0.97, 0.95, 0.93, 0.92, 0.9, 0.88, 0.85, 0.83, 0.81, 0.78, 0.75, 0.73, 0.7, 0.67, 0.64, 0.61, 0.58, 0.55, 0.52, 0.49, 0.45, 0.42, 0.39, 0.36, 0.32, 0.29, 0.26, 0.22, 0.19, 0.16, 0.13, 0.1, 0.07, 0.04, 0.01, -0.02];

export interface SkyMoment { date: Date; earth: number; sun: number }

/** Interpolated sky at a day offset from 1 Nov 2048 (0 = 1 Nov 00:00 UT). */
export function skyAt(day: number): SkyMoment {
  const f = Math.max(0, Math.min(EARTH_ELEV.length - 1, (day * 24) / SKY_STEP_HOURS));
  const i = Math.floor(f);
  const j = Math.min(EARTH_ELEV.length - 1, i + 1);
  const k = f - i;
  return {
    date: new Date(SKY_START + day * 86400000),
    earth: EARTH_ELEV[i] + (EARTH_ELEV[j] - EARTH_ELEV[i]) * k,
    sun: SUN_ELEV[i] + (SUN_ELEV[j] - SUN_ELEV[i]) * k,
  };
}

/** Share of samples with Earth above the ideal horizon (0–1). */
export const EARTH_UP_SHARE = EARTH_ELEV.filter((e) => e > 0).length / EARTH_ELEV.length;
export const SUN_MAX = Math.max(...SUN_ELEV);

export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** One plain sentence about the real sky on a given day (NASA JPL Horizons data). */
export function skySentence(day: number): string {
  const sky = skyAt(day);
  const earth = sky.earth > 0
    ? `Earth is ${sky.earth.toFixed(1)}° above the horizon: we can call home.`
    : `Earth is ${Math.abs(sky.earth).toFixed(1)}° below the horizon: no direct call home.`;
  const sun = sky.sun > 0
    ? `The Sun is only ${sky.sun.toFixed(2)}° up.`
    : `The Sun has slipped below the horizon.`;
  return `${formatDay(sky.date)} · ${earth} ${sun}`;
}

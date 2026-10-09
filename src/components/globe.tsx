import { geoDistance, geoGraticule10, geoOrthographic, geoPath, type GeoPermissibleObjects } from 'd3-geo';
import { useMemo, type ReactNode } from 'react';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';

import { mintA, SC } from '@/theme/colors';

type LngLat = [number, number];

let landCache: GeoPermissibleObjects | null = null;
function land() {
  if (!landCache) {
    const topo = world as unknown as Topology<{ countries: GeometryCollection }>;
    landCache = feature(topo, topo.objects.countries) as GeoPermissibleObjects;
  }
  return landCache;
}

type GlobeProps = {
  /** Point the globe faces. */
  center: LngLat;
  size: number;
  scale?: number;
  /** Tilt the view down so the center sits slightly above middle. */
  tilt?: number;
  pins?: LngLat[];
  route?: [LngLat, LngLat];
  /** Extra SVG drawn in projected coordinates. */
  overlay?: (project: (c: LngLat) => [number, number]) => ReactNode;
  id?: string;
};

/** Orthographic globe rendered with d3-geo into react-native-svg paths. */
export function Globe({ center, size, scale, tilt = 0, pins = [], route, overlay, id = 'g' }: GlobeProps) {
  const { paths, project } = useMemo(() => {
    const proj = geoOrthographic()
      .rotate([-center[0], -center[1] + tilt])
      .scale(scale ?? size / 2 - 6)
      .translate([size / 2, size / 2])
      .clipAngle(90);
    const path = geoPath(proj);
    return {
      project: (c: LngLat) => (proj(c) ?? [-100, -100]) as [number, number],
      paths: {
        sphere: path({ type: 'Sphere' }) ?? '',
        graticule: path(geoGraticule10()) ?? '',
        land: path(land()) ?? '',
        route: route ? (path({ type: 'LineString', coordinates: route }) ?? '') : '',
      },
    };
  }, [center, size, scale, tilt, route]);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={`sphere-${id}`} cx="40%" cy="30%" r="70%">
          <Stop offset="0" stopColor="#22356A" />
          <Stop offset="1" stopColor="#0B1430" />
        </RadialGradient>
      </Defs>
      <Path d={paths.sphere} fill={`url(#sphere-${id})`} />
      <Path d={paths.graticule} fill="none" stroke="rgba(255,255,255,0.06)" />
      <Path d={paths.land} fill="#1F4A3C" stroke="#0B1430" strokeWidth={0.5} />
      {paths.route ? <Path d={paths.route} fill="none" stroke={SC.mint} strokeWidth={2.5} strokeLinecap="round" /> : null}
      {pins.map((c, i) => {
        const [x, y] = project(c);
        return (
          <G key={i}>
            <Circle cx={x} cy={y} r={22} fill={mintA(0.18)} />
            <Circle cx={x} cy={y} r={11} fill={mintA(0.35)} />
            <Circle cx={x} cy={y} r={5} fill="#fff" />
          </G>
        );
      })}
      {overlay?.(project)}
    </Svg>
  );
}

/** Initial great-circle bearing in degrees from `a` to `b`. */
export function bearing(a: LngLat, b: LngLat) {
  const r = Math.PI / 180;
  const φ1 = a[1] * r;
  const φ2 = b[1] * r;
  const Δ = (b[0] - a[0]) * r;
  const y = Math.sin(Δ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δ);
  return Math.round((Math.atan2(y, x) / r + 360) % 360);
}

export const distanceKm = (a: LngLat, b: LngLat) => Math.round(geoDistance(a, b) * 6371);

export function compassWord(deg: number) {
  const names = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  return names[Math.round(deg / 45) % 8];
}

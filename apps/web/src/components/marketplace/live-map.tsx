'use client';

/**
 * Live Leaflet map for the marketplace. Renders one custom marker per
 * property at its lat/lng (already resolved server-side: real geocode
 * → city centroid fallback). Click a marker → select it (sync with the
 * side list) + open a popup with a tiny preview that links to the full
 * detail page.
 *
 * Why Leaflet over Mapbox/Google: zero API key, OpenStreetMap tiles are
 * free for low-volume sites, and the bundle size is reasonable when
 * dynamic-imported. The map mounts client-side only — Leaflet's runtime
 * touches `window`, so we forward `ssr: false` from the parent.
 *
 * Custom marker: an HTML pill showing the price (or "נכס" if unknown),
 * styled exactly like the original fake map's pills so the visual
 * vocabulary doesn't shift.
 */

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  price: number | null;
  dealType: 'sale' | 'rent';
  title: string;
  subtitle: string;
  imageUrl?: string | null;
}

// Centre of Israel — used as the initial view when there are no points
// (e.g. while items are still loading).
const IL_CENTRE: [number, number] = [31.7683, 35.2137]; // Jerusalem-ish
const IL_DEFAULT_ZOOM = 8;
const DEFAULT_FIT_PADDING: [number, number] = [40, 40];

const TILE_LAYERS = {
  standard: {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  light: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  },
} as const;

type TileStyle = keyof typeof TILE_LAYERS;

function formatShort(price: number | null): string {
  if (!price) return 'נכס';
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(price >= 10_000_000 ? 0 : 1)}M`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}K`;
  return `${price}`;
}

function formatPriceFull(price: number | null, dealType: 'sale' | 'rent'): string {
  if (!price) return 'מחיר יעודכן';
  const f = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(price);
  return dealType === 'rent' ? `${f} / חודש` : f;
}

/**
 * Custom HTML divIcon. Leaflet's default icon needs a hosted image which
 * doesn't play nice with Next's static-export pipeline; divIcon avoids
 * that entirely. The marker is a brand-pill (white card) and becomes a
 * gradient-violet chip when selected.
 */
function buildPriceIcon(label: string, active: boolean, compact: boolean): L.DivIcon {
  const className = ['rai-marker', compact ? 'rai-marker-compact' : null, active ? 'rai-marker-active' : null]
    .filter(Boolean)
    .join(' ');
  return L.divIcon({
    html: `<div class="${className}">${label}</div>`,
    className: 'rai-marker-wrapper',
    iconSize: compact ? [50, 28] : [56, 32],
    iconAnchor: compact ? [25, 28] : [28, 32],
  });
}

function spreadOverlappingPoints(points: MapPoint[], precision: number, spreadRadius: number): MapPoint[] {
  const groups = new Map<string, MapPoint[]>();

  for (const point of points) {
    const key = `${point.lat.toFixed(precision)}:${point.lng.toFixed(precision)}`;
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }

  return points.map((point) => {
    const key = `${point.lat.toFixed(precision)}:${point.lng.toFixed(precision)}`;
    const group = groups.get(key);
    if (!group || group.length === 1) return point;

    const index = group.findIndex((candidate) => candidate.id === point.id);
    const radius = spreadRadius + Math.floor(index / 8) * (spreadRadius / 2);
    const angle = (Math.PI * 2 * index) / group.length;

    return {
      ...point,
      lat: point.lat + Math.cos(angle) * radius,
      lng: point.lng + Math.sin(angle) * radius,
    };
  });
}

/**
 * Refits the map view to enclose all current points whenever they
 * change. Runs as a child of MapContainer so it can use the useMap hook.
 */
function AutoFit({ points, padding, maxZoom }: { points: MapPoint[]; padding: [number, number]; maxZoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding, maxZoom });
  }, [points, map, padding, maxZoom]);
  return null;
}

/**
 * Pans the map smoothly to the selected point. Doesn't change zoom — the
 * AutoFit already handled the initial framing, and a sudden zoom-in is
 * disorienting when the user just clicked a row in the side list.
 */
function FlyToSelected({ point }: { point: MapPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.panTo([point.lat, point.lng], { animate: true, duration: 0.4 });
  }, [point, map]);
  return null;
}

export function LiveMap({
  points,
  selectedId,
  onSelect,
  collisionPrecision = 5,
  collisionSpread = 0.006,
  compactMarkers = false,
  fitMaxZoom = 14,
  fitPadding = DEFAULT_FIT_PADDING,
  minHeight = 420,
  scrollWheelZoom = true,
  tileStyle = 'standard',
  zoomControl = true,
}: {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  collisionPrecision?: number;
  collisionSpread?: number;
  compactMarkers?: boolean;
  fitMaxZoom?: number;
  fitPadding?: [number, number];
  minHeight?: number;
  scrollWheelZoom?: boolean;
  tileStyle?: TileStyle;
  zoomControl?: boolean;
}) {
  const validPoints = useMemo(
    () =>
      spreadOverlappingPoints(
        points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
        collisionPrecision,
        collisionSpread,
      ),
    [points, collisionPrecision, collisionSpread],
  );
  const selectedPoint = validPoints.find((p) => p.id === selectedId) ?? null;
  const tileLayer = TILE_LAYERS[tileStyle];
  // The markers should reflect "active" state so they restyle when the
  // user clicks a row in the side list. We rebuild icons inline per
  // render rather than memoize — there's at most ~30 points per page.

  // Inject CSS for our divIcon once (next/font + Leaflet load order
  // sometimes makes a global stylesheet skip; doing it here guarantees
  // the markers look right even on the first paint).
  const styleInjectedRef = useRef(false);
  useEffect(() => {
    if (styleInjectedRef.current) return;
    if (typeof document === 'undefined') return;
    const id = 'rai-marker-style';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .rai-marker-wrapper { background: transparent !important; border: 0 !important; }
      .rai-marker {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 48px; height: 30px; padding: 0 10px;
        background: #ffffff; color: #111827;
        font: 700 13px/1 'Heebo', system-ui, sans-serif;
        border-radius: 9999px;
        border: 1px solid rgba(0,0,0,0.08);
        box-shadow: 0 2px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06);
        white-space: nowrap;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease;
      }
      .rai-marker:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.18); }
      .rai-marker-compact {
        min-width: 44px;
        height: 28px;
        padding: 0 9px;
        font-size: 12px;
        box-shadow: 0 5px 14px rgba(15, 23, 42, 0.15), 0 1px 3px rgba(15, 23, 42, 0.10);
      }
      .rai-marker-active {
        background: linear-gradient(135deg, hsl(262 83% 58%), hsl(320 85% 65%));
        color: #ffffff;
        border-color: transparent;
        box-shadow: 0 0 0 1px hsl(262 83% 58% / 0.18), 0 8px 20px hsl(262 83% 58% / 0.30);
        transform: translateY(-1px);
      }
      .leaflet-popup-content-wrapper { border-radius: 12px; }
      .leaflet-popup-content { margin: 10px 12px; font-family: 'Heebo', system-ui, sans-serif; direction: rtl; }
      /* RTL fix for the close button — Leaflet positions it absolutely. */
      .leaflet-popup-close-button { right: auto !important; left: 4px !important; }
      .leaflet-hero-map .leaflet-control-attribution {
        font-size: 9px;
        opacity: .55;
      }
    `;
    document.head.appendChild(style);
    styleInjectedRef.current = true;
  }, []);

  if (validPoints.length === 0) {
    return (
      <div className="grid h-full place-items-center bg-muted/30 text-sm text-muted-foreground">
        אין נכסים להציג על המפה
      </div>
    );
  }

  return (
    <MapContainer
      center={IL_CENTRE}
      zoom={IL_DEFAULT_ZOOM}
      zoomControl={zoomControl}
      scrollWheelZoom={scrollWheelZoom}
      className={compactMarkers ? 'leaflet-hero-map h-full w-full' : 'h-full w-full'}
      style={{ minHeight, background: 'hsl(var(--muted))' }}
    >
      <TileLayer
        attribution={tileLayer.attribution}
        url={tileLayer.url}
        // Hebrew sub-tiles aren't part of the default OSM set; the standard
        // mapnik renderer ships English/transliterated city labels, which
        // is fine for our use (the property pills carry the price/area
        // info the user actually needs).
      />
      <AutoFit points={validPoints} padding={fitPadding} maxZoom={fitMaxZoom} />
      <FlyToSelected point={selectedPoint} />
      {validPoints.map((p) => {
        const active = p.id === selectedId;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={buildPriceIcon(formatShort(p.price), active, compactMarkers)}
            eventHandlers={{ click: () => onSelect(p.id) }}
          >
            <Popup>
              <div className="space-y-1.5">
                <p className="font-bold text-sm">{p.title}</p>
                <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                <p className="text-base font-bold" style={{ color: 'hsl(262 83% 58%)' }}>
                  {formatPriceFull(p.price, p.dealType)}
                </p>
                <Link
                  href={`/marketplace/${p.id}`}
                  className="inline-block text-xs font-semibold"
                  style={{ color: 'hsl(262 83% 58%)' }}
                >
                  כל הפרטים ←
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

import { useEffect, useRef } from 'react';
import maplibregl, { Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { OVERLAYS, WELLINGTON } from '@/lib/catalogue.generated';
import { AREAS_BY_ID } from '@/lib/areas';
import { TIERS } from '@/lib/tiers';
import type { Signal } from '@/lib/signals';

/**
 * CARTO raster basemap. Keyless, CORS-open, and permitted for this kind of use.
 *
 * Deliberately not tile.openstreetmap.org: their tile usage policy does not
 * allow an app to hit it directly and they will block you, which is not a thing
 * to discover during a four-minute demo. Deliberately not LINZ Basemaps either,
 * which needs an API key. `light_all` also reads better on a projector than
 * satellite imagery.
 */
const BASEMAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
};

interface Props {
  signals: Signal[];
  activeOverlays: string[];
  areaId: string;
  onSelect: (s: Signal) => void;
  showCommunity: boolean;
  simulated: boolean;
}

export function MapView({
  signals,
  activeOverlays,
  areaId,
  onSelect,
  showCommunity,
  simulated,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // ---- init ---------------------------------------------------------------
  useEffect(() => {
    if (!container.current || map.current) return;

    const area = AREAS_BY_ID[areaId] ?? AREAS_BY_ID['island-bay'];
    const m = new maplibregl.Map({
      container: container.current,
      style: BASEMAP_STYLE,
      center: area.centre,
      zoom: 13,
      maxBounds: [
        [WELLINGTON[0] - 0.25, WELLINGTON[1] - 0.25],
        [WELLINGTON[2] + 0.25, WELLINGTON[3] + 0.25],
      ],
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(
      new maplibregl.ScaleControl({ maxWidth: 90, unit: 'metric' }),
      'bottom-left',
    );

    m.on('load', () => {
      ready.current = true;

      // ---- hazard context overlays, straight from the generated registry ----
      // Every URL here was resolved from the WCC catalogue by wcc_gis. Nothing
      // in this file knows a service path.
      for (const o of OVERLAYS) {
        if (o.layer_kind === 'raster_overlay' && o.tile_url) {
          m.addSource(`src-${o.id}`, {
            type: 'raster',
            tiles: [o.tile_url],
            tileSize: 256,
            attribution: o.attribution,
          });
          m.addLayer({
            id: `ov-${o.id}`,
            type: 'raster',
            source: `src-${o.id}`,
            paint: { 'raster-opacity': 0.55 },
            layout: { visibility: 'none' },
          });
        } else if (o.endpoint) {
          const params = new URLSearchParams({
            where: '1=1',
            outFields: '*',
            outSR: '4326',
            f: 'geojson',
            resultRecordCount: '1000',
          });
          m.addSource(`src-${o.id}`, {
            type: 'geojson',
            data: `${o.endpoint}/query?${params}`,
            attribution: o.attribution,
          });
          // Hatched, low-saturation, no marker: a planning layer must never read
          // as something that is happening right now.
          m.addLayer({
            id: `ov-${o.id}`,
            type: 'fill',
            source: `src-${o.id}`,
            paint: {
              'fill-color': TIERS.context.hex,
              'fill-opacity': 0.18,
              'fill-outline-color': TIERS.context.hex,
            },
            layout: { visibility: 'none' },
          });
        }
      }

      // ---- signal layers, one per tier ----
      // Separate sources so community can never be clustered into, or drawn
      // above, an attributed source. Draw order below is bottom-to-top.
      for (const tier of ['community', 'measured', 'council', 'official'] as const) {
        m.addSource(`sig-${tier}`, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        if (tier === 'official') {
          // Warnings are areas, so show the area as well as a point.
          m.addLayer({
            id: `sig-${tier}-fill`,
            type: 'fill',
            source: `sig-${tier}`,
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: { 'fill-color': TIERS.official.hex, 'fill-opacity': 0.18 },
          });
          m.addLayer({
            id: `sig-${tier}-line`,
            type: 'line',
            source: `sig-${tier}`,
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: { 'line-color': TIERS.official.hex, 'line-width': 2 },
          });
        }

        m.addLayer({
          id: `sig-${tier}`,
          type: 'circle',
          source: `sig-${tier}`,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            // Community is hollow with a dashed-equivalent treatment: no fill
            // saturation, ring only. Solid fill is reserved for attributed
            // sources and that invariant is visible on the map.
            'circle-color':
              tier === 'community' ? 'rgba(255,255,255,0.85)' : TIERS[tier].hex,
            'circle-radius': tier === 'community' ? 7 : 8,
            'circle-stroke-width': tier === 'community' ? 2.5 : 2,
            'circle-stroke-color': TIERS[tier].hex,
            'circle-opacity': tier === 'community' ? 0.9 : 0.95,
          },
        });

        m.on('click', `sig-${tier}`, (e) => {
          const f = e.features?.[0];
          if (f?.properties?.__id) {
            onSelectRef.current(JSON.parse(f.properties.__payload as string));
          }
        });
        m.on('mouseenter', `sig-${tier}`, () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', `sig-${tier}`, () => {
          m.getCanvas().style.cursor = '';
        });
      }
    });

    // The sidebar and the flex layout settle after the map is constructed, so
    // MapLibre latches onto a stale container size and paints into a corner.
    // Observing the container is the only reliable fix; a one-off resize on
    // load races the layout.
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(container.current);

    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__map = m;

    map.current = m;
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      ready.current = false;
    };
    // Init once. Area changes are handled by the flyTo effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- signals -> sources -------------------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;

    for (const tier of ['community', 'measured', 'council', 'official'] as const) {
      const src = m.getSource(`sig-${tier}`) as maplibregl.GeoJSONSource | undefined;
      if (!src) continue;

      const features = signals
        .filter((s) => s.tier === tier)
        .filter((s) => (tier === 'community' ? showCommunity : true))
        .flatMap((s) => {
          const out: GeoJSON.Feature[] = [];
          const props = {
            __id: s.id,
            __payload: JSON.stringify(s),
            headline: s.headline,
          };
          if (s.geometry && s.geometry.type !== 'Point') {
            out.push({ type: 'Feature', geometry: s.geometry, properties: props });
          }
          if (s.lng != null && s.lat != null) {
            out.push({
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
              properties: props,
            });
          }
          return out;
        });

      src.setData({ type: 'FeatureCollection', features });
    }
  }, [signals, showCommunity]);

  // ---- overlay visibility -------------------------------------------------
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    for (const o of OVERLAYS) {
      if (!m.getLayer(`ov-${o.id}`)) continue;
      m.setLayoutProperty(
        `ov-${o.id}`,
        'visibility',
        activeOverlays.includes(o.id) ? 'visible' : 'none',
      );
    }
  }, [activeOverlays]);

  // ---- recentre when the chosen area changes ------------------------------
  useEffect(() => {
    const m = map.current;
    const area = AREAS_BY_ID[areaId];
    if (!m || !area) return;
    m.flyTo({ center: area.centre, zoom: area.id === 'wellington-other' ? 11.5 : 13.5 });
  }, [areaId]);

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      {simulated && (
        // Hatched frame around the canvas. One of five simultaneous cues that
        // what is on screen is not real.
        <div
          className="pointer-events-none absolute inset-0 border-[6px] border-sim"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(247,144,9,.18) 0 10px, transparent 10px 20px)',
            backgroundClip: 'border-box',
            borderImage:
              'repeating-linear-gradient(45deg,#f79009 0 10px,#b54708 10px 20px) 6',
          }}
        />
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap, LngLatBoundsLike } from 'maplibre-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Project, Annotation } from '../../types';

interface MapContainerProps {
  project: Project;
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  onShapeCreated: (geometry: GeoJSON.Geometry) => void;
  onAnnotationClick: (annotation: Annotation) => void;
}

export default function MapContainer({
  project,
  annotations,
  selectedAnnotation,
  onShapeCreated,
  onAnnotationClick,
}: MapContainerProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const annotationsRef = useRef<Annotation[]>([]);
  const onAnnotationClickRef = useRef<(annotation: Annotation) => void>(() => {});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseStyleUrl =
    import.meta.env.VITE_BASEMAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json';
  const tileMinZoom = Number(import.meta.env.VITE_TILE_MIN_ZOOM || 14);
  const tileMaxZoom = Number(import.meta.env.VITE_TILE_MAX_ZOOM || 22);
  const projectBounds = useMemo<[[number, number], [number, number]] | null>(() => {
    if (!project.bounds) return null;
    const coords = project.bounds.coordinates[0];
    const bounds = coords.reduce(
      (acc, [lng, lat]) => {
        acc[0] = Math.min(acc[0], lng);
        acc[1] = Math.min(acc[1], lat);
        acc[2] = Math.max(acc[2], lng);
        acc[3] = Math.max(acc[3], lat);
        return acc;
      },
      [Infinity, Infinity, -Infinity, -Infinity]
    );
    return [
      [bounds[0], bounds[1]],
      [bounds[2], bounds[3]],
    ];
  }, [project.bounds]);

  const DrawRectangleMode = {
    ...MapboxDraw.modes.draw_polygon,
    onSetup(this: any) {
      const polygon = this.newFeature({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[]],
        },
      });
      this.addFeature(polygon);
      this.clearSelectedFeatures();
      this.updateUIClasses({ mouse: 'add' });
      this.activateUIButton('draw_rectangle');
      this.setActionableState({ trash: true });
      return { polygon, startPoint: null as [number, number] | null };
    },
    onMouseDown(this: any, state: any, e: any) {
      state.startPoint = [e.lngLat.lng, e.lngLat.lat];
    },
    onMouseMove(this: any, state: any, e: any) {
      if (!state.startPoint) return;
      const start = state.startPoint;
      const end: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const coords: [number, number][] = [
        [start[0], start[1]],
        [end[0], start[1]],
        [end[0], end[1]],
        [start[0], end[1]],
        [start[0], start[1]],
      ];
      state.polygon.setCoordinates([coords]);
    },
    onMouseUp(this: any, state: any, e: any) {
      if (!state.startPoint) return;
      const start = state.startPoint;
      const end: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const coords: [number, number][] = [
        [start[0], start[1]],
        [end[0], start[1]],
        [end[0], end[1]],
        [start[0], end[1]],
        [start[0], start[1]],
      ];
      state.polygon.setCoordinates([coords]);
      this.changeMode('simple_select', { featureIds: [state.polygon.id] });
    },
    onStop(this: any, state: any) {
      this.updateUIClasses({ mouse: 'none' });
      this.activateUIButton();

      if (state.polygon.isValid()) {
        this.map.fire('draw.create', {
          features: [state.polygon.toGeoJSON()],
        });
      } else {
        this.deleteFeature([state.polygon.id], { silent: true });
      }
    },
  } as unknown as MapboxDraw.DrawCustomMode<any, any>;

  const drawStyles = [
    {
      id: 'gl-draw-polygon-fill',
      type: 'fill',
      filter: ['all', ['==', '$type', 'Polygon']],
      paint: {
        'fill-color': ['case', ['==', ['get', 'active'], 'true'], '#fbb03b', '#3bb2d0'],
        'fill-opacity': 0.1,
      },
    },
    {
      id: 'gl-draw-lines',
      type: 'line',
      filter: ['any', ['==', '$type', 'LineString'], ['==', '$type', 'Polygon']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': ['case', ['==', ['get', 'active'], 'true'], '#fbb03b', '#3bb2d0'],
        'line-width': 2,
      },
    },
    {
      id: 'gl-draw-point-outer',
      type: 'circle',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
      paint: {
        'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 7, 5],
        'circle-color': '#fff',
      },
    },
    {
      id: 'gl-draw-point-inner',
      type: 'circle',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
      paint: {
        'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 5, 3],
        'circle-color': ['case', ['==', ['get', 'active'], 'true'], '#fbb03b', '#3bb2d0'],
      },
    },
    {
      id: 'gl-draw-vertex-outer',
      type: 'circle',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'simple_select']],
      paint: {
        'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 7, 5],
        'circle-color': '#fff',
      },
    },
    {
      id: 'gl-draw-vertex-inner',
      type: 'circle',
      filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'simple_select']],
      paint: {
        'circle-radius': ['case', ['==', ['get', 'active'], 'true'], 5, 3],
        'circle-color': '#fbb03b',
      },
    },
    {
      id: 'gl-draw-midpoint',
      type: 'circle',
      filter: ['all', ['==', 'meta', 'midpoint']],
      paint: {
        'circle-radius': 3,
        'circle-color': '#fbb03b',
      },
    },
  ];

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: baseStyleUrl,
      center: [78.9629, 20.5937],
      zoom: 5,
      ...(projectBounds ? { bounds: projectBounds, fitBoundsOptions: { padding: 40, maxZoom: tileMaxZoom } } : {}),
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      modes: {
        ...MapboxDraw.modes,
        draw_rectangle: DrawRectangleMode,
      },
      controls: {
        polygon: true,
        point: true,
        trash: false,
      },
      ...(drawStyles.length > 0 ? { styles: drawStyles } : {}),
    });

    map.addControl(draw as unknown as maplibregl.IControl, 'top-right');
    drawRef.current = draw;

    // Add a custom rectangle control button
    class RectangleControl implements maplibregl.IControl {
      private container!: HTMLDivElement;

      onAdd(mapInstance: MapLibreMap) {
        void mapInstance;
        this.container = document.createElement('div');
        this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'maplibregl-ctrl-icon';
        button.title = 'Draw rectangle';
        button.innerHTML = '&#9633;';
        button.onclick = () => {
          draw.changeMode('draw_rectangle');
        };

        this.container.appendChild(button);
        return this.container;
      }

      onRemove() {
        this.container.remove();
      }
    }

    map.addControl(new RectangleControl(), 'top-right');

    map.on('draw.create', (e) => {
      const feature = e.features?.[0];
      if (feature?.geometry) {
        onShapeCreated(feature.geometry as GeoJSON.Geometry);
        if (feature.id) {
          draw.delete(feature.id);
        }
      }
    });

    map.on('load', () => setMapLoaded(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, [onShapeCreated]);

  // Load orthomosaic tiles
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Ensure style is fully loaded before adding sources/layers
    if (!map.isStyleLoaded()) {
      const onStyleLoad = () => {
        map.off('style.load', onStyleLoad);
        // Trigger re-run by forcing a state update
        setMapLoaded(false);
        setTimeout(() => setMapLoaded(true), 0);
      };
      map.on('style.load', onStyleLoad);
      return;
    }
    const sourceId = 'orthomosaic';
    const layerId = 'orthomosaic-layer';

    setError(null);
    setLoading(false);

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    if (!project.orthomosaic_path) return;

    const tileUrl = `/outputs/${project.id}/tiles/{z}/{x}/{y}.png`;
    const source: maplibregl.RasterSourceSpecification = {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      minzoom: tileMinZoom,
      maxzoom: tileMaxZoom,
    };

    if (projectBounds) {
      source.bounds = [projectBounds[0][0], projectBounds[0][1], projectBounds[1][0], projectBounds[1][1]];
    }

    map.addSource(sourceId, source);

    const beforeId = map.getLayer('annotations-fill') ? 'annotations-fill' : undefined;
    map.addLayer(
      {
        id: layerId,
        type: 'raster',
        source: sourceId,
        minzoom: tileMinZoom,
        maxzoom: tileMaxZoom,
      },
      beforeId
    );

    if (projectBounds) {
      map.fitBounds(projectBounds, { padding: 40, maxZoom: tileMaxZoom });
    }
  }, [mapLoaded, project.id, project.orthomosaic_path, projectBounds]);

  // Update annotations source/layers
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Ensure style is fully loaded before adding sources/layers
    if (!map.isStyleLoaded()) {
      return; // Will re-run when mapLoaded cycles
    }

    const sourceId = 'annotations';

    annotationsRef.current = annotations;
    onAnnotationClickRef.current = onAnnotationClick;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: annotations.map(annotation => ({
        type: 'Feature',
        properties: {
          id: annotation.id,
          label: annotation.label,
          category: annotation.category,
        },
        geometry: annotation.geometry,
      })),
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });

      map.addLayer({
        id: 'annotations-fill',
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': ['match', ['get', 'category'],
            'disease', '#ef4444',
            'irrigation', '#3b82f6',
            'pest', '#f59e0b',
            'other', '#6b7280',
            '#22c55e',
          ],
          'fill-opacity': 0.3,
        },
      });

      map.addLayer({
        id: 'annotations-outline',
        type: 'line',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': ['match', ['get', 'category'],
            'disease', '#ef4444',
            'irrigation', '#3b82f6',
            'pest', '#f59e0b',
            'other', '#6b7280',
            '#22c55e',
          ],
          'line-width': 2,
        },
      });

      map.addLayer({
        id: 'annotations-point',
        type: 'circle',
        source: sourceId,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 7,
          'circle-color': ['match', ['get', 'category'],
            'disease', '#ef4444',
            'irrigation', '#3b82f6',
            'pest', '#f59e0b',
            'other', '#6b7280',
            '#22c55e',
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
        },
      });

      map.on('click', 'annotations-fill', (e) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        const annotation = annotationsRef.current.find(a => a.id === id);
        if (annotation) onAnnotationClickRef.current(annotation);
      });

      map.on('click', 'annotations-point', (e) => {
        const feature = e.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        const annotation = annotationsRef.current.find(a => a.id === id);
        if (annotation) onAnnotationClickRef.current(annotation);
      });

      map.on('mouseenter', 'annotations-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'annotations-fill', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'annotations-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'annotations-point', () => {
        map.getCanvas().style.cursor = '';
      });
    } else {
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(geojson);
    }

    const selectedId = selectedAnnotation?.id || '';
    if (map.getLayer('annotations-outline')) {
      map.setPaintProperty('annotations-outline', 'line-width',
        ['case', ['==', ['get', 'id'], selectedId], 3, 2]
      );
      map.setPaintProperty('annotations-outline', 'line-color',
        ['case', ['==', ['get', 'id'], selectedId], '#000',
          ['match', ['get', 'category'],
            'disease', '#ef4444',
            'irrigation', '#3b82f6',
            'pest', '#f59e0b',
            'other', '#6b7280',
            '#22c55e',
          ],
        ]
      );
    }
    if (map.getLayer('annotations-point')) {
      map.setPaintProperty('annotations-point', 'circle-stroke-color',
        ['case', ['==', ['get', 'id'], selectedId], '#000', '#fff']
      );
    }
  }, [mapLoaded, annotations, selectedAnnotation, onAnnotationClick]);

  // Zoom to selected annotation
  useEffect(() => {
    if (!mapRef.current || !selectedAnnotation) return;

    const bounds = getGeometryBounds(selectedAnnotation.geometry);
    if (!bounds) return;
    mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 18 });
  }, [selectedAnnotation]);

  function getGeometryBounds(geometry: GeoJSON.Geometry): LngLatBoundsLike | null {
    const coords = extractCoords(geometry);
    if (coords.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    coords.forEach(([lng, lat]) => {
      minX = Math.min(minX, lng);
      minY = Math.min(minY, lat);
      maxX = Math.max(maxX, lng);
      maxY = Math.max(maxY, lat);
    });

    return [
      [minX, minY],
      [maxX, maxY],
    ];
  }

  function extractCoords(geometry: GeoJSON.Geometry): [number, number][] {
    switch (geometry.type) {
      case 'Point':
        return [geometry.coordinates as [number, number]];
      case 'MultiPoint':
      case 'LineString':
        return geometry.coordinates as [number, number][];
      case 'MultiLineString':
      case 'Polygon':
        return (geometry.coordinates as [number, number][][]).flat();
      case 'MultiPolygon':
        return (geometry.coordinates as [number, number][][][]).flat(2);
      default:
        return [];
    }
  }

  return (
    <div className="relative h-full">
      <div ref={mapContainerRef} className="h-full w-full" />

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading orthomosaic...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 right-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg shadow z-[1000]">
          {error}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-8 right-4 bg-white rounded-lg shadow p-3 z-[1000]">
        <div className="text-xs font-medium text-gray-700 mb-2">Categories</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            Disease
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            Irrigation
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
            Pest
          </div>
          <div className="flex items-center">
            <span className="w-3 h-3 rounded-full bg-gray-500 mr-2" />
            Other
          </div>
        </div>
      </div>
    </div>
  );
}

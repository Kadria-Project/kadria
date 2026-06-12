'use client';

import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

type ProspectProject = {
  id: string;
  clientFirstName?: string;
  clientName?: string;
  trade?: string;
  city?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type ProspectPoint = {
  project: ProspectProject;
  lat: number;
  lng: number;
  isFallback: boolean;
};

const FALLBACK_POINTS = [
  { lat: 48.8566, lng: 2.3522 },
  { lat: 45.764, lng: 4.8357 },
  { lat: 43.6047, lng: 1.4442 },
  { lat: 44.8378, lng: -0.5792 },
  { lat: 47.2184, lng: -1.5536 },
  { lat: 43.2965, lng: 5.3698 },
  { lat: 50.6292, lng: 3.0573 },
  { lat: 48.5734, lng: 7.7521 },
];

function hasCoordinates(project: ProspectProject) {
  const lat = Number(project.latitude);
  const lng = Number(project.longitude);

  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

function toPoint(project: ProspectProject, index: number): ProspectPoint {
  if (hasCoordinates(project)) {
    return {
      project,
      lat: Number(project.latitude),
      lng: Number(project.longitude),
      isFallback: false,
    };
  }

  const fallback = FALLBACK_POINTS[index % FALLBACK_POINTS.length];

  return {
    project,
    ...fallback,
    isFallback: true,
  };
}

function FitProjectBounds({ points }: { points: ProspectPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], points[0].isFallback ? 6 : 11);
      return;
    }

    map.fitBounds(points.map((point) => [point.lat, point.lng]), {
      padding: [36, 36],
      maxZoom: 12,
    });
  }, [map, points]);

  useEffect(() => {
    const container = map.getContainer();
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(container);
    map.invalidateSize();

    return () => resizeObserver.disconnect();
  }, [map]);

  return null;
}

export default function ProspectsLeafletMap({
  projects,
  onSelectProject,
}: {
  projects: ProspectProject[];
  onSelectProject: (projectId: string) => void;
}) {
  const points = useMemo(
    () => projects.map((project, index) => toPoint(project, index)),
    [projects],
  );

  return (
    <MapContainer
      center={[46.6034, 1.8883]}
      zoom={6}
      minZoom={5}
      scrollWheelZoom={false}
      className="h-full min-h-[420px] w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitProjectBounds points={points} />

      {points.map((point) => (
        <CircleMarker
          key={point.project.id}
          center={[point.lat, point.lng]}
          radius={point.isFallback ? 7 : 9}
          pathOptions={{
            color: point.isFallback ? '#94a3b8' : '#22c55e',
            fillColor: point.isFallback ? '#94a3b8' : '#22c55e',
            fillOpacity: 0.82,
            opacity: 1,
            weight: 2,
          }}
          eventHandlers={{
            click: () => onSelectProject(point.project.id),
          }}
        >
          <Popup>
            <div className="min-w-40 space-y-1">
              <p className="font-semibold text-slate-950">
                {point.project.clientFirstName} {point.project.clientName}
              </p>
              <p className="text-xs text-slate-600">
                {point.project.trade || 'Projet'} - {point.project.city || 'Ville inconnue'}
              </p>
              {point.isFallback && (
                <p className="text-[11px] text-slate-500">
                  Position estimee
                </p>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

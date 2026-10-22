import React, { useState, useEffect, useRef } from 'react';
import { shipmentApi, trackingApi } from '../api/client';
import { Shipment, GPSLocation } from '../types';
import {
  Navigation,
  Compass,
  Play,
  RotateCw,
  RefreshCw,
  AlertCircle,
  Clock,
  Radio,
  Zap
} from 'lucide-react';
import L from 'leaflet';

export const LiveTrackingPage: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('');
  const [latestLocation, setLatestLocation] = useState<GPSLocation | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [autoPoll, setAutoPoll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Load active shipments
  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await shipmentApi.list({ limit: 50 });
        setShipments(res.data || []);
        if (res.data && res.data.length > 0 && !selectedShipmentId) {
          setSelectedShipmentId(res.data[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchShipments();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center Seattle
    const map = L.map(mapContainerRef.current, {
      center: [47.6062, -122.3321],
      zoom: 7,
      zoomControl: true
    });

    // OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch telemetry & update map
  const fetchTelemetry = async (shipmentId: string) => {
    if (!shipmentId) return;
    try {
      const loc = await trackingApi.getLatest(shipmentId);
      setLatestLocation(loc);

      const routeRes = await trackingApi.getRoute(shipmentId);
      const coords = routeRes.geojson.geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
      setRouteCoords(coords);

      const map = mapInstanceRef.current;
      if (!map) return;

      // Update Polyline
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(coords);
      } else if (coords.length > 0) {
        polylineRef.current = L.polyline(coords, {
          color: '#06b6d4',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8'
        }).addTo(map);
      }

      // Update Vehicle Marker
      if (loc) {
        const truckIcon = L.divIcon({
          className: 'custom-vehicle-marker',
          html: `
            <div style="background-color: #06b6d4; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px #06b6d4; border: 2px solid white; transform: rotate(${loc.headingDeg || 0}deg);">
              <span style="color: white; font-size: 14px; font-weight: bold;">▲</span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        if (markerRef.current) {
          markerRef.current.setLatLng([loc.latitude, loc.longitude]);
          markerRef.current.setIcon(truckIcon);
        } else {
          markerRef.current = L.marker([loc.latitude, loc.longitude], { icon: truckIcon }).addTo(map);
        }

        markerRef.current.bindPopup(
          `<b>Speed:</b> ${loc.speedKmh} km/h<br/><b>Heading:</b> ${loc.headingDeg}°<br/><b>Updated:</b> ${new Date(loc.timestamp).toLocaleTimeString()}`
        );

        map.panTo([loc.latitude, loc.longitude]);
      }
    } catch (err: any) {
      console.warn('Telemetry poll note:', err.message);
    }
  };

  // Trigger poll on shipment change or interval
  useEffect(() => {
    if (!selectedShipmentId) return;
    fetchTelemetry(selectedShipmentId);

    if (!autoPoll) return;

    const interval = setInterval(() => {
      fetchTelemetry(selectedShipmentId);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedShipmentId, autoPoll]);

  // Simulator controls
  const handleStartSimulation = async () => {
    if (!selectedShipmentId) return;
    setIsSimulating(true);
    try {
      await trackingApi.startSimulation(selectedShipmentId, 14);
      await fetchTelemetry(selectedShipmentId);
    } catch (err: any) {
      alert(`Simulation init failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleStepSimulation = async () => {
    if (!selectedShipmentId) return;
    setIsSimulating(true);
    try {
      await trackingApi.stepSimulation(selectedShipmentId);
      await fetchTelemetry(selectedShipmentId);
    } catch (err: any) {
      alert(`Simulation step failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Live Fleet GPS Telemetry</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> LIVE STREAM
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Real-time geospatial position ingestion, breadcrumb routing, and heading telemetry (MS3 MongoDB).
          </p>
        </div>

        {/* Shipment Selector */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedShipmentId}
            onChange={(e) => setSelectedShipmentId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.trackingNumber} ({s.origin.city} → {s.destination.city})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchTelemetry(selectedShipmentId)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Poll Now"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Main Map View & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Leaflet Map (Left 3 cols) */}
        <div className="lg:col-span-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 p-4 shadow-2xl relative flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Interactive OpenStreetMap Route Map</span>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={autoPoll}
                  onChange={(e) => setAutoPoll(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                />
                <span>Auto-poll (4s)</span>
              </label>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono">
                SIMULATED DATA
              </span>
            </div>
          </div>

          {/* Map canvas */}
          <div ref={mapContainerRef} className="flex-1 rounded-xl overflow-hidden border border-slate-700" />
        </div>

        {/* Telemetry & Simulation Controls (Right 1 col) */}
        <div className="space-y-4">
          {/* Telemetry Card */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Telemetry State
              </span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>

            {latestLocation ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400">Current Coordinates</span>
                  <div className="font-mono text-base font-semibold text-white">
                    {latestLocation.latitude.toFixed(4)}° N, {Math.abs(latestLocation.longitude).toFixed(4)}° W
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400">Ground Speed</span>
                    <div className="text-lg font-bold text-cyan-400 font-mono">
                      {latestLocation.speedKmh} <span className="text-xs font-normal">km/h</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400">Bearing Heading</span>
                    <div className="text-lg font-bold text-white font-mono flex items-center">
                      <Compass className="w-4 h-4 mr-1 text-slate-400" />
                      {latestLocation.headingDeg}°
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400">Last Telemetry Ping</span>
                  <div className="text-xs text-slate-300 font-mono flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(latestLocation.timestamp).toLocaleTimeString()} UTC
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400">Total Route Waypoints</span>
                  <div className="text-xs text-slate-300 font-mono mt-0.5">
                    {routeCoords.length} breadcrumb point(s) recorded
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                No GPS coordinates received for this shipment yet.
              </div>
            )}
          </div>

          {/* Simulator Action Card */}
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900 rounded-2xl border border-cyan-800/40 p-5 shadow-xl space-y-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">GPS Route Simulator</h3>
            </div>
            <p className="text-xs text-slate-400">
              Drive simulated truck telemetry along the I-5 West Coast freight highway corridor.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleStartSimulation}
                disabled={isSimulating}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-cyan-600/20"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'Generating Route...' : 'Start / Reset Simulation'}</span>
              </button>

              <button
                onClick={handleStepSimulation}
                disabled={isSimulating}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Advance 1 GPS Waypoint</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Shipment, PredictionData } from '../types';
import { predictionApi, trackingApi } from '../api/client';
import {
  X,
  Truck,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
  ShieldAlert,
  Cpu
} from 'lucide-react';

interface ShipmentDetailsModalProps {
  shipment: Shipment | null;
  onClose: () => void;
}

export const ShipmentDetailsModal: React.FC<ShipmentDetailsModalProps> = ({ shipment, onClose }) => {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shipment) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const pred = await predictionApi.getForShipment(shipment.id);
        setPrediction(pred);

        const hist = await trackingApi.getHistory(shipment.id, 10);
        setHistory(hist || []);
      } catch (err: any) {
        console.warn('Error fetching shipment deep dive details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [shipment]);

  if (!shipment) return null;

  const timelineSteps = [
    { label: 'Order Confirmed', status: 'COMPLETED' },
    {
      label: 'Carrier Assigned',
      status: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)
        ? 'COMPLETED'
        : 'PENDING'
    },
    {
      label: 'Picked Up',
      status: ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)
        ? 'COMPLETED'
        : 'PENDING'
    },
    {
      label: 'In Transit',
      status: ['IN_TRANSIT', 'DELIVERED'].includes(shipment.status) ? 'COMPLETED' : 'PENDING'
    },
    {
      label: 'Delivered',
      status: shipment.status === 'DELIVERED' ? 'COMPLETED' : 'PENDING'
    }
  ];

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> CRITICAL DELAY RISK
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-950 text-orange-300 border border-orange-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-orange-400" /> HIGH DELAY RISK
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" /> MODERATE RISK
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ON-TIME (LOW RISK)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        {/* Top Header */}
        <div className="flex justify-between items-start border-b border-slate-700 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Shipment {shipment.trackingNumber}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-cyan-400 border border-slate-700 font-mono">
                {shipment.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Order UUID: <span className="font-mono text-slate-300">{shipment.orderId}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Progress Timeline */}
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-700/60">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">
            Shipment Lifecycle Stages
          </span>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 z-0" />
            {timelineSteps.map((step, idx) => {
              const isCompleted = step.status === 'COMPLETED';
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isCompleted ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* C++ MS4 Real-time Prediction Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-850 p-6 rounded-xl border border-cyan-700/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">MS4 Baseline ETA & Risk Engine</h3>
                <p className="text-[11px] text-slate-400">
                  C++17 deterministic Haversine distance & velocity delay algorithm
                </p>
              </div>
            </div>
            {prediction && getRiskBadge(prediction.riskLevel)}
          </div>

          {prediction ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Remaining Distance</span>
                  <div className="text-lg font-bold text-white font-mono">
                    {prediction.remainingDistanceKm} <span className="text-xs font-normal">km</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Effective Speed</span>
                  <div className="text-lg font-bold text-cyan-400 font-mono">
                    {prediction.effectiveSpeedKmh} <span className="text-xs font-normal">km/h</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Transit Duration</span>
                  <div className="text-lg font-bold text-white font-mono">
                    ~{prediction.estimatedTravelHours} <span className="text-xs font-normal">hrs</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Predicted ETA</span>
                  <div className="text-sm font-bold text-emerald-400 font-mono truncate">
                    {new Date(prediction.estimatedDelivery).toLocaleTimeString()} UTC
                  </div>
                </div>
              </div>

              {/* Explanatory Factors */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Model Explanatory Factors
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {prediction.explanatoryFactors.map((factor, fIdx) => (
                    <li key={fIdx} className="flex items-start space-x-2">
                      <span className="text-cyan-400">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">
              Querying C++ prediction service for route evaluation...
            </div>
          )}
        </div>

        {/* Carrier & Location Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {/* Origin & Destination */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Route Coordinates
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Origin: {shipment.origin.city}, {shipment.origin.countryCode}</span>
              </div>
              <p className="text-xs text-slate-400 pl-5">{shipment.origin.address}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Destination: {shipment.destination.city}, {shipment.destination.countryCode}</span>
              </div>
              <p className="text-xs text-slate-400 pl-5">{shipment.destination.address}</p>
            </div>
          </div>

          {/* Carrier Info */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/60 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Fleet Assignment
            </span>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Carrier:</span>
              <span className="font-medium text-white">{shipment.carrierName || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Truck / Vehicle:</span>
              <span className="font-mono text-cyan-400">{shipment.truckNumber || 'Pending'}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Driver:</span>
              <span className="text-white">{shipment.driverName || 'Pending'}</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-slate-400">Created:</span>
              <span className="text-slate-300">{new Date(shipment.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

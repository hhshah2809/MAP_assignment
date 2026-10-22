import React, { useState, useEffect } from 'react';
import { orderApi, shipmentApi } from '../api/client';
import { Order, Shipment } from '../types';
import { KPICards } from '../components/KPICards';
import {
  ArrowRight,
  Truck,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onSelectShipment: (shipment: Shipment) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onSelectShipment }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, shipRes] = await Promise.all([
        orderApi.list({ limit: 10 }),
        shipmentApi.list({ limit: 10 })
      ]);
      setOrders(orderRes.data || []);
      setShipments(shipRes.data || []);
    } catch (err: any) {
      console.warn('Dashboard data fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalOrders = orders.length;
  const activeShipments = shipments.filter((s) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(s.status)).length;
  const delayedShipments = shipments.filter((s) => s.status === 'FAILED').length;
  const deliveredShipments = shipments.filter((s) => s.status === 'DELIVERED').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Logistics Control Tower
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" /> OPERATIONAL
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-tier control tower integrating MS1 Orders, MS2 Shipments, MS3 GPS Tracking & MS4 C++ Predictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => onNavigate('tracking')}
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-cyan-600/20"
          >
            <span>Live GPS Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <KPICards
        totalOrders={totalOrders}
        activeShipments={activeShipments}
        delayedShipments={delayedShipments}
        deliveredShipments={deliveredShipments}
        onCardClick={onNavigate}
      />

      {/* 2-Column Overview (Active Shipments + Recent Orders) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Shipments Card */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div className="flex items-center space-x-2">
              <Truck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Active Shipments</h2>
            </div>
            <button
              onClick={() => onNavigate('shipments')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              View All ({shipments.length}) <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {shipments.slice(0, 5).map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectShipment(s)}
                className="cursor-pointer p-3 bg-slate-900/60 hover:bg-slate-750 border border-slate-800 rounded-xl transition flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-sm font-semibold text-white">{s.trackingNumber}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>{s.origin.city}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span>{s.destination.city}</span>
                    {s.carrierName && <span className="text-slate-500">• {s.carrierName}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                    {s.status}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            ))}

            {shipments.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No shipments active yet. Create and confirm an order to generate a shipment.
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders Card */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Recent Orders</h2>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              Manage Orders <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-mono text-sm font-semibold text-white">{o.orderNumber}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {o.origin.city} → {o.destination.city} • {o.currencyCode} {Number(o.totalAmount).toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      o.status === 'CONFIRMED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              </div>
            ))}

            {orders.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No orders loaded. Go to the Orders tab to create your first order.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

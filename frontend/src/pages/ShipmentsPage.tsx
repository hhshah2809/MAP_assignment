import React, { useState, useEffect } from 'react';
import { shipmentApi } from '../api/client';
import { Shipment, ShipmentStatus } from '../types';
import {
  Search,
  Truck,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  Eye,
  Plus
} from 'lucide-react';

interface ShipmentsPageProps {
  onSelectShipment: (shipment: Shipment) => void;
}

export const ShipmentsPage: React.FC<ShipmentsPageProps> = ({ onSelectShipment }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipmentForAssign, setSelectedShipmentForAssign] = useState<Shipment | null>(null);
  const [carrierForm, setCarrierForm] = useState({
    carrierName: 'Apex Freight Express',
    truckNumber: 'TRK-WA-884',
    driverName: 'Robert Vance'
  });
  const [actionLoading, setActionLoading] = useState(false);

  const loadShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await shipmentApi.list({
        status: statusFilter || undefined,
        limit: 50
      });
      setShipments(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shipments from MS2');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [statusFilter]);

  const handleAssignCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipmentForAssign) return;
    setActionLoading(true);
    try {
      await shipmentApi.assignCarrier(
        selectedShipmentForAssign.id,
        carrierForm.carrierName,
        carrierForm.truckNumber,
        carrierForm.driverName
      );
      setSelectedShipmentForAssign(null);
      loadShipments();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (shipmentId: string, nextStatus: ShipmentStatus) => {
    try {
      await shipmentApi.updateStatus(shipmentId, nextStatus);
      loadShipments();
    } catch (err: any) {
      alert(`Status transition failed: ${err.message}`);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.trackingNumber.toLowerCase().includes(q) ||
      (s.carrierName && s.carrierName.toLowerCase().includes(q)) ||
      (s.truckNumber && s.truckNumber.toLowerCase().includes(q)) ||
      s.origin.city.toLowerCase().includes(q) ||
      s.destination.city.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle className="w-3 h-3 mr-1" /> Delivered
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse">
            <Truck className="w-3 h-3 mr-1" /> In Transit
          </span>
        );
      case 'PICKED_UP':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950 text-indigo-400 border border-indigo-800">
            <Clock className="w-3 h-3 mr-1" /> Picked Up
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950 text-blue-400 border border-blue-800">
            <UserCheck className="w-3 h-3 mr-1" /> Assigned
          </span>
        );
      case 'CANCELLED':
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950 text-rose-400 border border-rose-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950 text-amber-400 border border-amber-800">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Shipments & Fleet Management</h1>
          <p className="text-sm text-slate-400">
            Carrier assignments, route waypoints, and transit progression (MS2 PostgreSQL).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadShipments}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh Shipments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking #, carrier, truck..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="PICKED_UP">PICKED_UP</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl flex items-center justify-between">
          <span className="text-sm">{error}</span>
          <button
            onClick={loadShipments}
            className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white text-xs rounded transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Shipments Table */}
      {loading && shipments.length === 0 ? (
        <div className="p-12 text-center bg-slate-800/40 rounded-xl border border-slate-700/40">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading shipments from PostgreSQL...</p>
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="p-12 text-center bg-slate-800/40 rounded-xl border border-slate-700/40">
          <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No shipments staged yet</h3>
          <p className="text-sm text-slate-400">
            Confirm an order on the Orders page to automatically stage a shipment via RabbitMQ event!
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3.5">Tracking Number</th>
                  <th className="px-6 py-3.5">Route</th>
                  <th className="px-6 py-3.5">Carrier / Driver</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-200">
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-medium text-cyan-400">{shipment.trackingNumber}</div>
                      <div className="text-xs text-slate-400">Order: {shipment.orderId.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-slate-300">
                        <span>{shipment.origin.city}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span>{shipment.destination.city}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {shipment.origin.latitude.toFixed(2)}, {shipment.origin.longitude.toFixed(2)} →{' '}
                        {shipment.destination.latitude.toFixed(2)}, {shipment.destination.longitude.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {shipment.carrierName ? (
                        <div>
                          <div className="font-medium text-white">{shipment.carrierName}</div>
                          <div className="text-xs text-slate-400">
                            {shipment.truckNumber || 'No Truck'} • {shipment.driverName || 'No Driver'}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedShipmentForAssign(shipment)}
                          className="px-2.5 py-1 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-300 border border-cyan-700/50 rounded text-xs transition"
                        >
                          + Assign Carrier
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(shipment.status)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => onSelectShipment(shipment)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded transition"
                        title="View Shipment Details & ETA"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* State Transitions */}
                      {shipment.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleStatusChange(shipment.id, 'PICKED_UP')}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition"
                        >
                          Pickup
                        </button>
                      )}
                      {shipment.status === 'PICKED_UP' && (
                        <button
                          onClick={() => handleStatusChange(shipment.id, 'IN_TRANSIT')}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs transition"
                        >
                          Depart (In Transit)
                        </button>
                      )}
                      {shipment.status === 'IN_TRANSIT' && (
                        <button
                          onClick={() => handleStatusChange(shipment.id, 'DELIVERED')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs transition"
                        >
                          Deliver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Carrier Modal */}
      {selectedShipmentForAssign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h2 className="text-lg font-bold text-white">Assign Carrier & Truck</h2>
              <button
                onClick={() => setSelectedShipmentForAssign(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignCarrier} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-400">Carrier Company</label>
                <input
                  type="text"
                  value={carrierForm.carrierName}
                  onChange={(e) => setCarrierForm({ ...carrierForm, carrierName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Truck / Vehicle Plate</label>
                <input
                  type="text"
                  value={carrierForm.truckNumber}
                  onChange={(e) => setCarrierForm({ ...carrierForm, truckNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Driver Name</label>
                <input
                  type="text"
                  value={carrierForm.driverName}
                  onChange={(e) => setCarrierForm({ ...carrierForm, driverName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedShipmentForAssign(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition"
                >
                  {actionLoading ? 'Assigning...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

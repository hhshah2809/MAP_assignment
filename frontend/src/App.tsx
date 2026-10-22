import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { LiveTrackingPage } from './pages/LiveTrackingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ShipmentDetailsModal } from './pages/ShipmentDetailsModal';
import { Shipment } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [systemStatus, setSystemStatus] = useState({
    ms1: false,
    ms2: false,
    ms3: false,
    ms4: false
  });

  // Health check polling for all 4 microservices
  useEffect(() => {
    const checkClusterHealth = async () => {
      try {
        const [h1, h2, h3, h4] = await Promise.allSettled([
          fetch('/api/v1/orders/health').then((r) => r.ok),
          fetch('/api/v1/shipments/health').then((r) => r.ok),
          fetch('/api/v1/tracking/health').then((r) => r.ok),
          fetch('/api/v1/predictions/health').then((r) => r.ok)
        ]);

        setSystemStatus({
          ms1: h1.status === 'fulfilled' && h1.value,
          ms2: h2.status === 'fulfilled' && h2.value,
          ms3: h3.status === 'fulfilled' && h3.value,
          ms4: h4.status === 'fulfilled' && h4.value
        });
      } catch (_) {
        // ignore
      }
    };

    checkClusterHealth();
    const interval = setInterval(checkClusterHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectShipment={(shipment) => setSelectedShipment(shipment)}
          />
        )}
        {activeTab === 'orders' && <OrdersPage />}
        {activeTab === 'shipments' && (
          <ShipmentsPage onSelectShipment={(shipment) => setSelectedShipment(shipment)} />
        )}
        {activeTab === 'tracking' && <LiveTrackingPage />}
        {activeTab === 'analytics' && <AnalyticsPage />}
      </main>

      {/* Shipment Deep-Dive Modal */}
      <ShipmentDetailsModal
        shipment={selectedShipment}
        onClose={() => setSelectedShipment(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Logistics Control Tower Monorepo • MS1 (MySQL) • MS2 (PostgreSQL) • MS3 (MongoDB) • MS4 (C++17) • RabbitMQ
      </footer>
    </div>
  );
};

export default App;

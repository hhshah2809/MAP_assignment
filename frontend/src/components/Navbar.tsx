import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  MapPin,
  BarChart3,
  Radio,
  Server
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus: {
    ms1: boolean;
    ms2: boolean;
    ms3: boolean;
    ms4: boolean;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, systemStatus }) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders (MS1)', icon: ShoppingCart },
    { id: 'shipments', label: 'Shipments (MS2)', icon: Truck },
    { id: 'tracking', label: 'Live Tracking (MS3)', icon: MapPin },
    { id: 'analytics', label: 'Analytics & Risk (MS4)', icon: BarChart3 }
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-lg shadow-lg shadow-cyan-500/20">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                CONTROL TOWER
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  v1.0
                </span>
              </span>
              <p className="text-xs text-slate-400">Autonomous Logistics Mesh</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 shadow-inner'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Service Health Pills */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <Server className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <span className="text-slate-400 font-mono text-[11px] mr-1">CLUSTER:</span>
            <span title="MS1 Order Service" className={`inline-block w-2 h-2 rounded-full ${systemStatus.ms1 ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-mono">MS1</span>
            <span title="MS2 Shipment Service" className={`inline-block w-2 h-2 rounded-full ${systemStatus.ms2 ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-mono">MS2</span>
            <span title="MS3 Tracking Service" className={`inline-block w-2 h-2 rounded-full ${systemStatus.ms3 ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-mono">MS3</span>
            <span title="MS4 Prediction Service" className={`inline-block w-2 h-2 rounded-full ${systemStatus.ms4 ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-mono">MS4</span>
          </div>
        </div>
      </div>
    </header>
  );
};

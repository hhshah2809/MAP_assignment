import React from 'react';
import { ShoppingCart, Truck, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

interface KPICardsProps {
  totalOrders: number;
  activeShipments: number;
  delayedShipments: number;
  deliveredShipments: number;
  onCardClick?: (tab: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  totalOrders,
  activeShipments,
  delayedShipments,
  deliveredShipments,
  onCardClick
}) => {
  const cards = [
    {
      id: 'orders',
      title: 'Total Orders',
      value: totalOrders,
      change: '+12% vs last week',
      icon: ShoppingCart,
      color: 'from-blue-500 to-indigo-600',
      badge: 'MS1 MySQL'
    },
    {
      id: 'shipments',
      title: 'Active Shipments',
      value: activeShipments,
      change: 'In transit / Assigned',
      icon: Truck,
      color: 'from-cyan-500 to-blue-600',
      badge: 'MS2 Postgres'
    },
    {
      id: 'analytics',
      title: 'Delayed / High Risk',
      value: delayedShipments,
      change: delayedShipments > 0 ? 'Requires attention' : 'Optimal ETA flow',
      icon: AlertTriangle,
      color: delayedShipments > 0 ? 'from-amber-500 to-rose-600' : 'from-slate-700 to-slate-800',
      badge: 'MS4 C++ Engine'
    },
    {
      id: 'shipments',
      title: 'Delivered Shipments',
      value: deliveredShipments,
      change: 'Completed SLA orders',
      icon: CheckCircle2,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Fulfilled'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={() => onCardClick && onCardClick(card.id)}
            className="cursor-pointer bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-600 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-lg bg-gradient-to-tr ${card.color} text-white shadow-md`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {card.value}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                {card.badge}
              </span>
            </div>
            <div className="mt-2 flex items-center text-xs text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              <span>{card.change}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

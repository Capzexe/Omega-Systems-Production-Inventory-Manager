
import React from 'react';
import { InventoryItem } from '../types';
import { Box, LogOut, AlertCircle, CheckCircle } from 'lucide-react';

interface StatsOverviewProps {
    items: InventoryItem[];
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ items }) => {
    const stats = [
        { 
            label: 'Total Assets', 
            value: items.length, 
            icon: <Box size={24} className="text-indigo-400" />,
            bgColor: 'bg-indigo-500/10'
        },
        { 
            label: 'Available', 
            value: items.filter(i => i.status === 'available').length, 
            icon: <CheckCircle size={24} className="text-green-400" />,
            bgColor: 'bg-green-500/10'
        },
        { 
            label: 'On Set', 
            value: items.filter(i => i.status === 'checked_out').length, 
            icon: <LogOut size={24} className="text-blue-400" />,
            bgColor: 'bg-blue-500/10'
        },
        { 
            label: 'Maintenance', 
            value: items.filter(i => i.status === 'maintenance').length, 
            icon: <AlertCircle size={24} className="text-amber-400" />,
            bgColor: 'bg-amber-500/10'
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:translate-y-[-4px] transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                            <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StatsOverview;

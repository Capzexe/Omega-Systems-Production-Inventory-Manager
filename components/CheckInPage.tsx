
import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Search, RotateCcw, Check, Loader2, Info, User, ClipboardList } from 'lucide-react';
import { mockSupabase } from '../services/mockSupabase';

interface CheckInPageProps {
    items: InventoryItem[];
    onAction: () => void;
}

const CheckInPage: React.FC<CheckInPageProps> = ({ items, onAction }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.production?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleReturn = async (itemId: string) => {
        setIsProcessing(itemId);
        await mockSupabase.items.return(itemId);
        setIsProcessing(null);
        onAction();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold mb-2">Check In Station</h1>
                <p className="text-slate-400">Scan or select equipment to return it to central storage.</p>
            </div>

            <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                <input 
                    type="text" 
                    placeholder="Scan serial or search checked out items..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-medium shadow-2xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                    <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Loans</span>
                        <span className="text-xs text-slate-500">{items.length} items currently out</span>
                    </div>
                    
                    <div className="divide-y divide-slate-800/50">
                        {filteredItems.length === 0 ? (
                            <div className="p-20 text-center text-slate-600">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                    <Check size={32} />
                                </div>
                                <p className="text-lg font-medium">No items found matching your search.</p>
                                <p className="text-sm">Everything might already be safely stored in the warehouse.</p>
                            </div>
                        ) : (
                            filteredItems.map(item => (
                                <div 
                                    key={item.id} 
                                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-800/20 transition-colors"
                                >
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-500 font-bold text-xl flex-shrink-0 border border-indigo-500/20">
                                            {item.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold truncate">{item.name}</h3>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-xs font-mono text-slate-500 uppercase tracking-tighter">S/N: {item.serial_number}</span>
                                                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                                    <ClipboardList size={12} />
                                                    {item.production?.name}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="hidden md:flex flex-col items-end">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Assigned to</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{item.assigned_to?.full_name}</span>
                                                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                                    {item.assigned_to?.avatar_url ? (
                                                        <img src={item.assigned_to.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={12} className="text-slate-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleReturn(item.id)}
                                            disabled={isProcessing === item.id}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
                                        >
                                            {isProcessing === item.id ? (
                                                <Loader2 className="animate-spin" size={20} />
                                            ) : (
                                                <>
                                                    <RotateCcw size={20} />
                                                    Process Return
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-start gap-4">
                <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-500">
                    <Info size={24} />
                </div>
                <div>
                    <h4 className="font-bold mb-1">Auto-Logging Enabled</h4>
                    <p className="text-sm text-slate-500 max-w-2xl">
                        Returning items will automatically mark them as 'Available' in the global inventory and log the return event with a timestamp for accountability.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheckInPage;

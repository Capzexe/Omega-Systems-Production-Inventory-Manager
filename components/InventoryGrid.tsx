
import React, { useState } from 'react';
import { InventoryItem, Production, Profile } from '../types';
import { Camera, Disc, Sun, Mic, Battery, MoreVertical, LogOut, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { mockSupabase } from '../services/mockSupabase';

interface InventoryGridProps {
    items: InventoryItem[];
    productions: Production[];
    crew: Profile[];
    onAction: () => void;
}

const InventoryGrid: React.FC<InventoryGridProps> = ({ items, productions, crew, onAction }) => {
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [targetProdId, setTargetProdId] = useState('');

    const getIcon = (catName?: string) => {
        switch (catName) {
            case 'Cameras': return <Camera size={18} />;
            case 'Lenses': return <Disc size={18} />;
            case 'Lighting': return <Sun size={18} />;
            case 'Audio': return <Mic size={18} />;
            case 'Power': return <Battery size={18} />;
            default: return <Camera size={18} />;
        }
    };

    const handleCheckout = async (itemId: string) => {
        if (!targetProdId) return;
        // Mock user id
        await mockSupabase.items.checkout(itemId, 'u2', targetProdId);
        setShowCheckoutModal(false);
        setSelectedItem(null);
        onAction();
    };

    const handleReturn = async (itemId: string) => {
        if (confirm('Are you sure you want to return this item to inventory?')) {
            await mockSupabase.items.return(itemId);
            onAction();
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {items.map(item => (
                    <div key={item.id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 rounded-lg flex items-center gap-2 text-sm font-medium ${
                                item.category?.name === 'Cameras' ? 'bg-red-500/10 text-red-400' :
                                item.category?.name === 'Lenses' ? 'bg-blue-500/10 text-blue-400' :
                                item.category?.name === 'Lighting' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-indigo-500/10 text-indigo-400'
                            }`}>
                                {getIcon(item.category?.name)}
                                {item.category?.name}
                            </div>
                            <div className="relative group">
                                <button className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                                    <MoreVertical size={18} />
                                </button>
                                {/* Simple dropdown would go here */}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">{item.name}</h3>
                            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">S/N: {item.serial_number}</p>
                        </div>

                        <div className="flex items-center justify-between mb-4 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                    item.status === 'available' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                    item.status === 'checked_out' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' :
                                    'bg-amber-500'
                                }`} />
                                <span className="text-xs font-semibold capitalize">{item.status.replace('_', ' ')}</span>
                            </div>
                            {item.status === 'checked_out' && item.production && (
                                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700 max-w-[120px] truncate">
                                    {item.production.name}
                                </span>
                            )}
                        </div>

                        {item.status === 'available' ? (
                            <button 
                                onClick={() => {
                                    setSelectedItem(item);
                                    setShowCheckoutModal(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/10"
                            >
                                <LogOut size={16} />
                                Check Out
                            </button>
                        ) : item.status === 'checked_out' ? (
                            <button 
                                onClick={() => handleReturn(item.id)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition-all border border-slate-700"
                            >
                                <CheckCircle size={16} />
                                Return to Inventory
                            </button>
                        ) : (
                            <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-slate-600 text-sm font-bold transition-all border border-slate-800 cursor-not-allowed">
                                <AlertCircle size={16} />
                                Under Maintenance
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Checkout Modal */}
            {showCheckoutModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl scale-in-center">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-indigo-600/10 rounded-2xl">
                                <LogOut className="text-indigo-500" size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Checkout Gear</h2>
                                <p className="text-slate-400 text-sm">Assigning equipment to a project.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Equipment</p>
                                <p className="text-lg font-semibold">{selectedItem.name}</p>
                                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedItem.serial_number}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300">Assign to Production</label>
                                <select 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={targetProdId}
                                    onChange={(e) => setTargetProdId(e.target.value)}
                                >
                                    <option value="">Select a production...</option>
                                    {productions.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => {
                                        setShowCheckoutModal(false);
                                        setSelectedItem(null);
                                    }}
                                    className="flex-1 py-3 px-6 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-bold transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleCheckout(selectedItem.id)}
                                    disabled={!targetProdId}
                                    className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InventoryGrid;

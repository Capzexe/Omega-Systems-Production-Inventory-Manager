
import React, { useState } from 'react';
import { InventoryItem, Production } from '../types';
import { Search, Package, ArrowRight, X, Check, Loader2, Info } from 'lucide-react';
import { mockSupabase } from '../services/mockSupabase';

interface CheckOutPageProps {
    items: InventoryItem[];
    productions: Production[];
    onAction: () => void;
}

const CheckOutPage: React.FC<CheckOutPageProps> = ({ items, productions, onAction }) => {
    const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetProdId, setTargetProdId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleItemSelection = (item: InventoryItem) => {
        if (selectedItems.find(i => i.id === item.id)) {
            setSelectedItems(selectedItems.filter(i => i.id !== item.id));
        } else {
            setSelectedItems([...selectedItems, item]);
        }
    };

    const handleBulkCheckout = async () => {
        if (!targetProdId || selectedItems.length === 0) return;
        setIsProcessing(true);
        
        // Execute checkouts in sequence (mock)
        for (const item of selectedItems) {
            await mockSupabase.items.checkout(item.id, 'u2', targetProdId);
        }
        
        setIsProcessing(false);
        setSuccessMessage(`Successfully checked out ${selectedItems.length} items.`);
        setSelectedItems([]);
        setTargetProdId('');
        onAction();

        setTimeout(() => setSuccessMessage(null), 5000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Check Out Station</h1>
                    <p className="text-slate-400">Select available equipment to assign to an active production.</p>
                </div>
                {successMessage && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                        <Check size={18} />
                        <span className="text-sm font-semibold">{successMessage}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Selection Panel */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input 
                            type="text" 
                            placeholder="Scan serial or search equipment name..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
                        <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Available Assets</span>
                            <span className="text-xs text-slate-500">{filteredItems.length} items found</span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/50">
                            {filteredItems.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No available equipment matches your search.</p>
                                </div>
                            ) : (
                                filteredItems.map(item => {
                                    const isSelected = selectedItems.find(i => i.id === item.id);
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => toggleItemSelection(item)}
                                            className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-indigo-600/10' : 'hover:bg-slate-800/30'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{item.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.serial_number}</p>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-700'}`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Checkout Summary Panel */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-500">
                                <Package size={24} />
                            </div>
                            <h2 className="text-xl font-bold">Checkout Manifest</h2>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign to Production</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                    value={targetProdId}
                                    onChange={(e) => setTargetProdId(e.target.value)}
                                >
                                    <option value="">Select Target...</option>
                                    {productions.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                                <span>Selected Items</span>
                                <span>{selectedItems.length}</span>
                            </p>
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                                {selectedItems.length === 0 ? (
                                    <p className="text-sm text-slate-600 italic py-4">No items selected yet.</p>
                                ) : (
                                    selectedItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between group">
                                            <span className="text-sm truncate pr-4">{item.name}</span>
                                            <button 
                                                onClick={() => toggleItemSelection(item)}
                                                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <button 
                            disabled={!targetProdId || selectedItems.length === 0 || isProcessing}
                            onClick={handleBulkCheckout}
                            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Confirm Checkout
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                        
                        {!targetProdId && selectedItems.length > 0 && (
                            <p className="mt-4 text-[10px] text-amber-500 flex items-center gap-1">
                                <Info size={12} />
                                Please select a production to proceed.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckOutPage;

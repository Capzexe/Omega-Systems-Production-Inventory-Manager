
import React, { useState } from 'react';
import { InventoryItem, Production } from '../types';
import { 
    Search, 
    Package, 
    ArrowRight, 
    X, 
    Check, 
    Loader2, 
    Info, 
    ArrowUpRight, 
    ArrowDownLeft, 
    RotateCcw,
    User,
    ClipboardList
} from 'lucide-react';
import { mockSupabase } from '../services/mockSupabase';
import { getSessionUser } from '../services/api';

interface WorkflowStationProps {
    items: InventoryItem[];
    productions: Production[];
    onAction: () => void;
}

const WorkflowStation: React.FC<WorkflowStationProps> = ({ items, productions, onAction }) => {
    const [mode, setMode] = useState<'checkout' | 'checkin'>('checkout');
    const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetProdId, setTargetProdId] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [error, setError] = useState('');
    const actor = getSessionUser();

    // Items available for the current mode
    const modeItems = mode === 'checkout' 
        ? items.filter(i => i.status === 'available')
        : items.filter(i => i.status === 'checked_out' && (!actor || actor.role === 'admin' || i.assigned_to_id === actor.id));

    const filteredItems = modeItems.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (i.serial_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mode === 'checkin' && i.production?.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const toggleItemSelection = (item: InventoryItem) => {
        if (selectedItems.find(i => i.id === item.id)) {
            setSelectedItems(selectedItems.filter(i => i.id !== item.id));
        } else {
            setSelectedItems([...selectedItems, item]);
        }
    };

    const handleCheckoutAction = async () => {
        if (!targetProdId || selectedItems.length === 0) return;
        setIsProcessing(true);
        setError('');
        let completed = 0;
        try {
            for (const item of selectedItems) { await mockSupabase.items.checkout(item.id, actor?.id || 'u2', targetProdId); completed++; }
            finishAction(`Successfully checked out ${completed} items.`);
        } catch (err) {
            setError(`${completed} completed. ${err instanceof Error ? err.message : 'Checkout failed.'} Refresh before retrying.`);
            onAction();
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCheckinAction = async (itemId?: string) => {
        // Handle individual or bulk check-in
        const itemsToReturn = itemId ? [items.find(i => i.id === itemId)!] : selectedItems;
        if (itemsToReturn.length === 0) return;

        setIsProcessing(itemId || true);
        setError('');
        let completed = 0;
        try {
            for (const item of itemsToReturn) { await mockSupabase.items.return(item.id); completed++; }
            finishAction(`Successfully returned ${completed} items.`);
        } catch (err) {
            setError(`${completed} completed. ${err instanceof Error ? err.message : 'Return failed.'} Refresh before retrying.`);
            onAction();
        } finally {
            setIsProcessing(false);
        }
    };

    const finishAction = (msg: string) => {
        setSuccessMessage(msg);
        setSelectedItems([]);
        setTargetProdId('');
        onAction();
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            {/* Mode Selector Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-800 p-1.5 rounded-3xl w-fit">
                <button 
                    onClick={() => { setMode('checkout'); setSelectedItems([]); }}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all ${mode === 'checkout' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <ArrowUpRight size={20} />
                    Check Out
                </button>
                <button 
                    onClick={() => { setMode('checkin'); setSelectedItems([]); }}
                    className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all ${mode === 'checkin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <ArrowDownLeft size={20} />
                    Check In
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">
                        {mode === 'checkout' ? 'Equipment Deployment' : 'Warehouse Return'}
                    </h1>
                    <p className="text-slate-400">
                        {mode === 'checkout' 
                            ? 'Assign gear to an active production manifest.' 
                            : 'Scan equipment to return them to central storage.'}
                    </p>
                </div>
                {successMessage && ( mode === 'checkout' ? (
                    <div className="bg-indigo-500/10 border border-indigo-500/50 text-indigo-400 px-4 py-2 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                        <Check size={18} />
                        <span className="text-sm font-semibold">{successMessage}</span>
                    </div>
                ) : (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2 animate-in slide-in-from-top-2">
                        <Check size={18} />
                        <span className="text-sm font-semibold">{successMessage}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Selection Area */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input 
                            type="text" 
                            placeholder={mode === 'checkout' ? "Search available gear..." : "Search items out on set..."}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-lg font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                {mode === 'checkout' ? 'Stock Room' : 'Active Manifest'}
                            </span>
                            <span className="text-xs text-slate-500">{filteredItems.length} items found</span>
                        </div>
                        
                        <div className="max-h-[50vh] md:max-h-[600px] overflow-y-auto custom-scrollbar divide-y divide-slate-800/50">
                            {filteredItems.length === 0 ? (
                                <div className="p-20 text-center text-slate-600">
                                    <Package size={48} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-lg font-medium">No results found.</p>
                                    <p className="text-sm">{mode === 'checkout' ? 'Maybe everything is already on set?' : 'Everything might be safely stored.'}</p>
                                </div>
                            ) : (
                                filteredItems.map(item => {
                                    const isSelected = selectedItems.find(i => i.id === item.id);
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => toggleItemSelection(item)}
                                            className={`p-6 flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-indigo-600/10' : 'hover:bg-slate-800/30'}`}
                                        >
                                            <div className="flex items-center gap-5 min-w-0">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${
                                                    isSelected ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'
                                                }`}>
                                                    {item.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold truncate">{item.name}</p>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-[10px] text-slate-500 font-mono uppercase">S/N: {item.serial_number}</span>
                                                        {mode === 'checkin' && item.production && (
                                                            <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                                                                <ClipboardList size={10} />
                                                                {item.production.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                {mode === 'checkin' && !isSelected && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleCheckinAction(item.id); }}
                                                        className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-indigo-600/20 text-xs font-bold transition-all border border-slate-700"
                                                    >
                                                        Quick Return
                                                    </button>
                                                )}
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-700'}`}>
                                                    {isSelected && <Check size={14} className="text-white" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Processing Panel */}
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sticky top-24 shadow-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === 'checkout' ? 'bg-indigo-600/20 text-indigo-500' : 'bg-green-600/20 text-green-500'}`}>
                                {mode === 'checkout' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                            </div>
                            <h2 className="text-xl font-bold">Action Manifest</h2>
                        </div>

                        {mode === 'checkout' && (
                            <div className="space-y-4 mb-8 animate-in slide-in-from-top-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block px-1">Assign to Production</label>
                                <select 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium transition-all"
                                    value={targetProdId}
                                    onChange={(e) => setTargetProdId(e.target.value)}
                                >
                                    <option value="">Select Target...</option>
                                    {productions.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Selected Assets</span>
                                <span className={`text-xs font-bold ${selectedItems.length > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>{selectedItems.length} items</span>
                            </div>
                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-2">
                                {selectedItems.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                                        <p className="text-xs text-slate-600 italic">Select items from the list to begin the workflow.</p>
                                    </div>
                                ) : (
                                    selectedItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between group bg-slate-800/30 p-3 rounded-xl border border-slate-800/50">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-xs font-bold truncate pr-4">{item.name}</span>
                                            </div>
                                            <button 
                                                onClick={() => toggleItemSelection(item)}
                                                className="text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {mode === 'checkout' ? (
                            <button 
                                disabled={!targetProdId || selectedItems.length === 0 || !!isProcessing}
                                onClick={handleCheckoutAction}
                                className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 disabled:opacity-20 disabled:cursor-not-allowed text-lg"
                            >
                                {isProcessing === true ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        Process Checkout
                                        <ArrowRight size={24} />
                                    </>
                                )}
                            </button>
                        ) : (
                            <button 
                                disabled={selectedItems.length === 0 || !!isProcessing}
                                onClick={() => handleCheckinAction()}
                                className="w-full py-5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-3 disabled:opacity-20 disabled:cursor-not-allowed text-lg"
                            >
                                {isProcessing === true ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        Process Bulk Return
                                        <RotateCcw size={24} />
                                    </>
                                )}
                            </button>
                        )}
                        
                        {mode === 'checkout' && !targetProdId && selectedItems.length > 0 && (
                            <p className="mt-4 text-[10px] text-amber-500 flex items-center gap-1.5 justify-center bg-amber-500/5 py-2 rounded-lg border border-amber-500/20">
                                <Info size={12} />
                                A target production is required to deploy gear.
                            </p>
                        )}
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                            <Info size={16} className="text-indigo-500" />
                            Terminal Notes
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            {mode === 'checkout' 
                                ? 'Deploying gear will automatically notify the production coordinator and update the insurance manifest for the active project.'
                                : 'Returning gear to inventory requires a basic visual inspection. Any damage should be reported via the maintenance module.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowStation;

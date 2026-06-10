
import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, 
    Box, 
    ClipboardList, 
    Settings, 
    Bell, 
    Search,
    Plus,
    Filter,
    LogOut,
    ChevronRight,
    Loader2,
    Repeat,
    Sparkles,
    X,
    Check
} from 'lucide-react';
import { mockSupabase } from './services/mockSupabase';
import { InventoryItem, Profile, Production, ActivityLog, Category, ItemStatus } from './types';
import InventoryGrid from './components/InventoryGrid';
import ActivityFeed from './components/ActivityFeed';
import StatsOverview from './components/StatsOverview';
import WorkflowStation from './components/WorkflowStation';
import AISidebar from './components/AISidebar';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'productions' | 'logs' | 'workflow'>('dashboard');
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [user, setUser] = useState<Profile | null>(null);
    const [productions, setProductions] = useState<Production[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter states
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedStatusId, setSelectedStatusId] = useState<ItemStatus | null>(null);
    const [showStatusFilters, setShowStatusFilters] = useState(false);

    // Modal/Toggle states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAISidebar, setShowAISidebar] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Form states for new equipment
    const [newEquipName, setNewEquipName] = useState('');
    const [newEquipModel, setNewEquipModel] = useState('');
    const [newEquipSerial, setNewEquipSerial] = useState('');
    const [newEquipCategoryId, setNewEquipCategoryId] = useState('');
    const [newEquipStatus, setNewEquipStatus] = useState<ItemStatus>('available');

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const [fetchedItems, fetchedUser, fetchedProds, fetchedLogs, fetchedCats] = await Promise.all([
                mockSupabase.items.getAll(),
                mockSupabase.profiles.getMe(),
                mockSupabase.productions.getAll(),
                mockSupabase.logs.getAll(),
                mockSupabase.categories.getAll(),
            ]);
            setItems(fetchedItems);
            setUser(fetchedUser);
            setProductions(fetchedProds);
            setLogs(fetchedLogs);
            setCategories(fetchedCats);
            if (fetchedCats.length > 0) {
                setNewEquipCategoryId(fetchedCats[0].id);
            }
            setLoading(false);
        };
        init();
    }, []);

    const refreshData = async () => {
        const fetchedItems = await mockSupabase.items.getAll();
        const fetchedLogs = await mockSupabase.logs.getAll();
        setItems(fetchedItems);
        setLogs(fetchedLogs);
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleCreateEquipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEquipName || !newEquipModel || !newEquipSerial || !newEquipCategoryId) {
            showToast('Please fill out all fields.');
            return;
        }

        try {
            await mockSupabase.items.create({
                name: newEquipName,
                model: newEquipModel,
                serial_number: newEquipSerial,
                category_id: newEquipCategoryId,
                status: newEquipStatus,
            });

            // Reset form
            setNewEquipName('');
            setNewEquipModel('');
            setNewEquipSerial('');
            if (categories.length > 0) {
                setNewEquipCategoryId(categories[0].id);
            }
            setNewEquipStatus('available');
            setShowAddModal(false);

            await refreshData();
            showToast(`Asset "${newEquipName}" successfully added.`);
        } catch (err) {
            console.error(err);
            showToast('Failed to add equipment.');
        }
    };

    const handleUserSwitch = async () => {
        const allProfiles = await mockSupabase.profiles.getAll();
        const nextUser = allProfiles.find(p => p.id !== user?.id);
        if (nextUser) {
            setUser(nextUser);
            showToast(`Profile Switched: Now active as ${nextUser.full_name} (${nextUser.role.toUpperCase()})`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-xl shrink-0">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/30">C</div>
                    <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">CineFlow</span>
                </div>

                <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-850 text-slate-400'}`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Dashboard</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-850 text-slate-400'}`}
                    >
                        <Box size={20} />
                        <span className="font-medium">Inventory</span>
                    </button>

                    <div className="pt-4 pb-2 px-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operations</p>
                    </div>

                    <button 
                        onClick={() => setActiveTab('workflow')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'workflow' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-850 text-slate-400'}`}
                    >
                        <Repeat size={20} />
                        <span className="font-medium">Workflow Terminal</span>
                    </button>

                    <div className="pt-4 pb-2 px-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Management</p>
                    </div>

                    <button 
                        onClick={() => setActiveTab('productions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'productions' ? 'bg-indigo-600 text-white margin-shadow' : 'hover:bg-slate-850 text-slate-400'}`}
                    >
                        <ClipboardList size={20} />
                        <span className="font-medium">Productions</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-850 text-slate-400'}`}
                    >
                        <Settings size={20} />
                        <span className="font-medium">Activity Logs</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div 
                        onClick={handleUserSwitch}
                        title="Click to Switch active user role (Admin / Crew)"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/60 cursor-pointer border border-transparent hover:border-slate-800 transition-all group"
                    >
                        <img src={user?.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-indigo-500/30 group-hover:border-indigo-500/60 transition-colors" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-slate-200 group-hover:text-white transition-colors">{user?.full_name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{user?.role} switcher ⇄</p>
                        </div>
                        <LogOut size={16} className="text-slate-500 hover:text-red-400 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Top Header */}
                <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search inventory, serials, or crew..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all text-slate-100 placeholder:text-slate-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        {/* CineBot Launcher */}
                        <button 
                            onClick={() => setShowAISidebar(!showAISidebar)}
                            className={`p-2 rounded-full transition-all relative border ${
                                showAISidebar 
                                    ? 'text-indigo-400 bg-indigo-900/20 border-indigo-500/55 shadow-lg shadow-indigo-500/10' 
                                    : 'text-slate-400 hover:text-white hover:bg-slate-850 border-slate-800'
                            }`}
                            title="Open CineBot AI Specs Assistant"
                        >
                            <Sparkles size={20} />
                        </button>
                        
                        {/* Notification Panel */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className={`p-2 rounded-full transition-all border ${showNotifications ? 'bg-slate-850 border-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-850 border-slate-800'}`}
                                title="Incident Alerts & System logs"
                            >
                                <Bell size={20} />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-950"></span>
                            </button>
                            
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl py-3 shadow-2xl z-30 animate-in fade-in duration-200">
                                    <div className="px-4 pb-2 border-b border-slate-800 flex justify-between items-center">
                                        <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Activity Bulletins</p>
                                        <button 
                                            onClick={() => setShowNotifications(false)} 
                                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                                        >
                                            Dismiss
                                        </button>
                                    </div>
                                    <div className="divide-y divide-slate-850 max-h-[260px] overflow-y-auto custom-scrollbar">
                                        {logs.slice(0, 5).map(log => (
                                            <div key={log.id} className="p-3.5 hover:bg-slate-800/30 transition-colors">
                                                <p className="text-xs text-slate-300">
                                                    <span className="font-semibold text-white">{log.user?.full_name}</span> performs <span className="text-indigo-400 font-bold uppercase text-[9px] bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20">{log.action}</span>
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1 font-mono">{log.item ? log.item.name : 'System modification'}</p>
                                                <p className="text-[9px] text-slate-600 mt-1 font-mono">{new Date(log.created_at).toLocaleTimeString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <Plus size={18} />
                            Add Equipment
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h1 className="text-3xl font-bold mb-2 tracking-tight">Operations Dashboard</h1>
                                <p className="text-slate-400">Real-time overview of crew assignments and equipment flow.</p>
                            </div>
                            
                            <StatsOverview items={items} />

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            <Box size={20} className="text-indigo-500" />
                                            Active Deployments
                                        </h2>
                                        <button onClick={() => setActiveTab('inventory')} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
                                    </div>
                                    <InventoryGrid items={items.filter(i => i.status === 'checked_out').slice(0, 4)} onAction={refreshData} productions={productions} crew={[user!]} />
                                </div>
                                <div className="space-y-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <ChevronRight size={20} className="text-indigo-500" />
                                        Recent Activity
                                    </h2>
                                    <ActivityFeed logs={logs.slice(0, 10)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2 tracking-tight">Equipment Inventory</h1>
                                    <p className="text-slate-400">Total {items.length} items cataloged across {categories.length} categories.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setShowStatusFilters(!showStatusFilters)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                                            showStatusFilters || selectedStatusId
                                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' 
                                                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-705'
                                        }`}
                                    >
                                        <Filter size={18} />
                                        Filters {selectedStatusId ? `(${selectedStatusId.replace('_', ' ')})` : ''}
                                    </button>
                                </div>
                            </div>

                            {showStatusFilters && (
                                <div className="flex flex-wrap gap-2 bg-slate-900/40 p-4 rounded-3xl border border-slate-800 animate-in slide-in-from-top-2 duration-200">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center pr-3 border-r border-slate-800 mr-2">
                                        Status Filters
                                    </div>
                                    <button 
                                        onClick={() => setSelectedStatusId(null)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                                            !selectedStatusId 
                                                ? 'bg-indigo-600/35 border-indigo-500/60 text-white' 
                                                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-250'
                                        }`}
                                    >
                                        Show All
                                    </button>
                                    {(['available', 'checked_out', 'maintenance', 'lost'] as const).map(stat => (
                                        <button 
                                            key={stat}
                                            onClick={() => setSelectedStatusId(stat)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                                                selectedStatusId === stat 
                                                    ? 'bg-indigo-600/35 border-indigo-500/60 text-white' 
                                                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-250'
                                            }`}
                                        >
                                            {stat.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
                                <button 
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                                        selectedCategoryId === null 
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                            : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                                    }`}
                                >
                                    All Gear
                                </button>
                                {categories.map(cat => (
                                    <button 
                                        key={cat.id} 
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                                            selectedCategoryId === cat.id 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <InventoryGrid 
                                items={items.filter(i => {
                                    const matchesCategory = !selectedCategoryId || i.category_id === selectedCategoryId;
                                    const matchesStatus = !selectedStatusId || i.status === selectedStatusId;
                                    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                          i.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                          i.model.toLowerCase().includes(searchTerm.toLowerCase());
                                    return matchesCategory && matchesStatus && matchesSearch;
                                })} 
                                onAction={refreshData}
                                productions={productions}
                                crew={[user!]} 
                            />
                        </div>
                    )}

                    {activeTab === 'workflow' && (
                        <div className="animate-in fade-in duration-300">
                            <WorkflowStation 
                                items={items} 
                                productions={productions} 
                                onAction={refreshData} 
                            />
                        </div>
                    )}

                    {activeTab === 'productions' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h1 className="text-3xl font-bold mb-2 tracking-tight">Active Films & Shows</h1>
                                <p className="text-slate-400">Select any project card below to view detailed gear manifolds.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {productions.map(prod => {
                                    const deployedCount = items.filter(i => i.current_production_id === prod.id).length;
                                    return (
                                        <div 
                                            key={prod.id} 
                                            onClick={() => setSelectedProduction(prod)}
                                            className="bg-slate-900 border border-slate-805 p-6 rounded-3xl hover:border-indigo-500/50 transition-all cursor-pointer group active:scale-[0.99]"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-indigo-600/10 rounded-xl group-hover:bg-indigo-600/20 transition-all">
                                                    <ClipboardList className="text-indigo-500" size={24} />
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                                    prod.status === 'production' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                                    prod.status === 'pre-production' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-slate-800 text-slate-400'
                                                }`}>
                                                    {prod.status}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold mb-1 group-hover:text-indigo-400 transition-colors">{prod.name}</h3>
                                            <p className="text-slate-400 text-sm mb-4">{prod.location}</p>
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                                <span className="text-xs text-slate-500">{prod.start_date} – {prod.end_date}</span>
                                                <span className="text-xs font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                                                    {deployedCount} assets deployed
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="bg-slate-900 border border-slate-804 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-300">
                            <div className="p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold">System Accountability Log</h2>
                                <p className="text-sm text-slate-500">Chronological history of all inventory movements and status changes.</p>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {logs.map(log => (
                                    <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${log.action === 'Checkout' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : log.action === 'Return' ? 'bg-green-500' : 'bg-slate-400'}`} />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    <span className="text-white">{log.user?.full_name}</span>
                                                    <span className="text-slate-500 mx-2">performed</span>
                                                    <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[11px] uppercase mr-2">{log.action}</span>
                                                    <span className="text-slate-500 mx-2">on</span>
                                                    <span className="text-slate-100 underline decoration-slate-700 font-semibold">{log.item?.name || 'Asset system'}</span>
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">
                                                    ID: {log.id} • {new Date(log.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        {log.details?.production && (
                                            <div className="text-right">
                                                <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-700/50">
                                                    {log.details.production}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* CineBot Side panel */}
            {showAISidebar && <AISidebar />}

            {/* Toast system alerts */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300 border border-indigo-400">
                    <Sparkles size={16} />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Create Asset Popover Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl scale-in-center">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Plus className="text-indigo-500" />
                                Add Equipment
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateEquipment} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Equipment Name</label>
                                <input 
                                    required
                                    type="text"
                                    placeholder="e.g. Red Komodo 6K"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white placeholder:text-slate-600"
                                    value={newEquipName}
                                    onChange={(e) => setNewEquipName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Model</label>
                                <input 
                                    required
                                    type="text"
                                    placeholder="e.g. Komodo-X"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white placeholder:text-slate-600"
                                    value={newEquipModel}
                                    onChange={(e) => setNewEquipModel(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Serial Number</label>
                                <input 
                                    required
                                    type="text"
                                    placeholder="e.g. RK-9040"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white placeholder:text-slate-600"
                                    value={newEquipSerial}
                                    onChange={(e) => setNewEquipSerial(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</label>
                                <select
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white"
                                    value={newEquipCategoryId}
                                    onChange={(e) => setNewEquipCategoryId(e.target.value)}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-slate-950">{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Initial Status</label>
                                <select
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white"
                                    value={newEquipStatus}
                                    onChange={(e) => setNewEquipStatus(e.target.value as any)}
                                >
                                    <option value="available" className="bg-slate-950">Available</option>
                                    <option value="maintenance" className="bg-slate-950">Under Maintenance</option>
                                    <option value="lost" className="bg-slate-950">Lost</option>
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3 px-6 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-850 font-bold transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-sm shadow-lg shadow-indigo-600/20"
                                >
                                    Save Asset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Production Asset Manifest Details Modal */}
            {selectedProduction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-8 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold uppercase tracking-widest">{selectedProduction.status}</span>
                                <h2 className="text-2xl font-bold mt-1">{selectedProduction.name}</h2>
                                <p className="text-slate-400 text-sm">{selectedProduction.location} • {selectedProduction.start_date} to {selectedProduction.end_date}</p>
                            </div>
                            <button onClick={() => setSelectedProduction(null)} className="text-slate-500 hover:text-white transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Deployed Equipment Manifest</h3>
                                {items.filter(i => i.current_production_id === selectedProduction.id).length === 0 ? (
                                    <div className="p-8 text-center bg-slate-950/30 border border-slate-800 rounded-2xl">
                                        <p className="text-sm text-slate-500 italic">No equipment currently checked out to this production.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {items.filter(i => i.current_production_id === selectedProduction.id).map(item => (
                                            <div key={item.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                                                        {item.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{item.name}</p>
                                                        <p className="text-xs text-slate-500 font-mono">S/N: {item.serial_number} • {item.model}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={async () => {
                                                        if (confirm(`Recall ${item.name} and return to central storage?`)) {
                                                            await mockSupabase.items.return(item.id);
                                                            await refreshData();
                                                            showToast(`Recalled and returned "${item.name}" to inventory.`);
                                                        }
                                                    }}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-600/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 hover:bg-indigo-600/20 transition-all"
                                                >
                                                    Recall Asset
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Allocated Logistics Crew</h3>
                                <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
                                    <img src="https://picsum.photos/seed/jordan/100/100" className="w-10 h-10 rounded-full border border-indigo-500/30" alt="Crew" />
                                    <div>
                                        <p className="text-sm font-semibold">Jordan Smith</p>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Logistics Coordinator</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800 flex justify-end">
                            <button 
                                onClick={() => setSelectedProduction(null)}
                                className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all text-sm"
                            >
                                Close Manifest
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

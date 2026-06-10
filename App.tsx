
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
    Repeat
} from 'lucide-react';
import { mockSupabase } from './services/mockSupabase';
import { InventoryItem, Profile, Production, ActivityLog, Category } from './types';
import InventoryGrid from './components/InventoryGrid';
import ActivityFeed from './components/ActivityFeed';
import StatsOverview from './components/StatsOverview';
import WorkflowStation from './components/WorkflowStation';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'productions' | 'logs' | 'workflow'>('dashboard');
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [user, setUser] = useState<Profile | null>(null);
    const [productions, setProductions] = useState<Production[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            <aside className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-xl">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl">C</div>
                    <span className="text-xl font-bold tracking-tight">CineFlow</span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    <button 
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Dashboard</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Box size={20} />
                        <span className="font-medium">Inventory</span>
                    </button>

                    <div className="pt-4 pb-2 px-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operations</p>
                    </div>

                    <button 
                        onClick={() => setActiveTab('workflow')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'workflow' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Repeat size={20} />
                        <span className="font-medium">Workflow Terminal</span>
                    </button>

                    <div className="pt-4 pb-2 px-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Management</p>
                    </div>

                    <button 
                        onClick={() => setActiveTab('productions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'productions' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <ClipboardList size={20} />
                        <span className="font-medium">Productions</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                    >
                        <Settings size={20} />
                        <span className="font-medium">Activity Logs</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 cursor-pointer">
                        <img src={user?.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-indigo-500/30" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{user?.full_name}</p>
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{user?.role}</p>
                        </div>
                        <LogOut size={16} className="text-slate-500 hover:text-red-400" />
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
                            className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-950"></span>
                        </button>
                        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20">
                            <Plus size={18} />
                            Add Equipment
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8">
                            <div>
                                <h1 className="text-3xl font-bold mb-2">Operations Dashboard</h1>
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
                                    <InventoryGrid items={items.filter(i => i.status === 'checked_out').slice(0, 4)} onAction={refreshData} productions={productions} crew={[]} />
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
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold mb-2">Equipment Inventory</h1>
                                    <p className="text-slate-400">Total {items.length} items cataloged across {categories.length} categories.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700">
                                        <Filter size={18} />
                                        Filters
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                                <button className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium whitespace-nowrap">All Gear</button>
                                {categories.map(cat => (
                                    <button key={cat.id} className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 text-sm font-medium transition-all whitespace-nowrap">
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <InventoryGrid 
                                items={items.filter(i => 
                                    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    i.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    i.model.toLowerCase().includes(searchTerm.toLowerCase())
                                )} 
                                onAction={refreshData}
                                productions={productions}
                                crew={[user!]} 
                            />
                        </div>
                    )}

                    {activeTab === 'workflow' && (
                        <WorkflowStation 
                            items={items} 
                            productions={productions} 
                            onAction={refreshData} 
                        />
                    )}

                    {activeTab === 'productions' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {productions.map(prod => (
                                <div key={prod.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/50 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-600/10 rounded-xl group-hover:bg-indigo-600/20 transition-colors">
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
                                    <h3 className="text-xl font-bold mb-1">{prod.name}</h3>
                                    <p className="text-slate-400 text-sm mb-4">{prod.location}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                        <span className="text-xs text-slate-500">{prod.start_date} – {prod.end_date}</span>
                                        <div className="flex -space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900"></div>
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">+3</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-slate-800">
                                <h2 className="text-xl font-bold">System Accountability Log</h2>
                                <p className="text-sm text-slate-500">Chronological history of all inventory movements and status changes.</p>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {logs.map(log => (
                                    <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${log.action === 'Checkout' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-green-500'}`} />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    <span className="text-white">{log.user?.full_name}</span>
                                                    <span className="text-slate-500 mx-2">performed</span>
                                                    <span className="text-indigo-400 font-bold">{log.action}</span>
                                                    <span className="text-slate-500 mx-2">on</span>
                                                    <span className="text-white underline decoration-slate-700">{log.item?.name}</span>
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">
                                                    ID: {log.id} • {new Date(log.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        {log.details?.production && (
                                            <div className="text-right">
                                                <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-1 rounded-md border border-indigo-700/50">
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
        </div>
    );
};

export default App;

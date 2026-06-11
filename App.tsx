import React, { useState, useEffect } from "react";
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
  Check,
  Database,
  Globe,
  RefreshCw,
} from "lucide-react";
import {
  mockSupabase,
  getDbMode,
  setDbMode,
  getBackendUrl,
  setBackendUrl,
} from "./services/mockSupabase";
import {
  InventoryItem,
  Profile,
  Production,
  ActivityLog,
  Category,
  ItemStatus,
} from "./types";
import InventoryGrid from "./components/InventoryGrid";
import ActivityFeed from "./components/ActivityFeed";
import StatsOverview from "./components/StatsOverview";
import WorkflowStation from "./components/WorkflowStation";
import AISidebar from "./components/AISidebar";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "inventory" | "productions" | "logs" | "workflow"
  >("dashboard");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [user, setUser] = useState<Profile | null>(null);
  const [productions, setProductions] = useState<Production[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Database connection states
  const [dbMode, setDbModeState] = useState<"mock" | "mysql">("mock");
  const [dbUrl, setDbUrlState] = useState("/api.php");
  const [showDbModal, setShowDbModal] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [dbUrlInput, setDbUrlInput] = useState("");

  // Filter states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedStatusId, setSelectedStatusId] = useState<ItemStatus | null>(
    null,
  );
  const [showStatusFilters, setShowStatusFilters] = useState(false);

  // Modal/Toggle states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedProduction, setSelectedProduction] =
    useState<Production | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for new equipment
  const [newEquipName, setNewEquipName] = useState("");
  const [newEquipModel, setNewEquipModel] = useState("");
  const [newEquipSerial, setNewEquipSerial] = useState("");
  const [newEquipCategoryId, setNewEquipCategoryId] = useState("");
  const [newEquipStatus, setNewEquipStatus] = useState<ItemStatus>("available");

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      // Hydrate DB states
      const savedMode = getDbMode();
      setDbModeState(savedMode);
      const savedUrl = getBackendUrl();
      setDbUrlState(savedUrl);
      setDbUrlInput(savedUrl);

      try {
        const [
          fetchedItems,
          fetchedUser,
          fetchedProds,
          fetchedLogs,
          fetchedCats,
        ] = await Promise.all([
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
      } catch (err) {
        console.error(
          "Critical hydration error during database startup: ",
          err,
        );
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const handleDbError = (e: Event) => {
      const customErr = e as CustomEvent;
      const detailMsg =
        customErr.detail ||
        "Connection refused or database credentials invalid.";
      showToast(
        `⚠️ Live DB Notice: ${detailMsg.includes("credentials") || detailMsg.includes("connection") ? "Using Local Sandbox. Check credentials / setup in Settings menu!" : detailMsg}`,
      );
    };
    window.addEventListener("database-connection-failed", handleDbError);
    return () => {
      window.removeEventListener("database-connection-failed", handleDbError);
    };
  }, []);

  const handleTestConnection = async (targetUrl: string) => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const trimmedUrl = targetUrl.trim();
      if (!trimmedUrl) {
        throw new Error("API base URL is empty.");
      }
      const delimiter = trimmedUrl.includes("?") ? "&" : "?";

      // Try fetching items to verify structure
      const res = await fetch(`${trimmedUrl}${delimiter}action=items`).catch(
        (e) => {
          throw new Error(
            "Unable to contact PHP endpoint. Double check the address, verify that api.php exists on Hostinger, and check CORS permissions.",
          );
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConnectionResult({
            success: true,
            message: `Success! Successfully fetched ${data.length} equipment assets from your live Hostinger MySQL tables.`,
          });
        } else {
          setConnectionResult({
            success: true,
            message:
              "Success! Connection succeeded, but the database returned a non-array response.",
          });
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error ||
            `HTTP error returned from server (Status ${res.status}). Verify table structures exist in MySQL.`,
        );
      }
    } catch (e: any) {
      setConnectionResult({
        success: false,
        message: e.message || "Connection failed.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

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
    if (!newEquipName || !newEquipCategoryId) {
      showToast("Please fill out the Name and Category.");
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
      setNewEquipName("");
      setNewEquipModel("");
      setNewEquipSerial("");
      if (categories.length > 0) {
        setNewEquipCategoryId(categories[0].id);
      }
      setNewEquipStatus("available");
      setShowAddModal(false);

      await refreshData();
      showToast(`Asset "${newEquipName}" successfully added.`);
    } catch (err) {
      console.error(err);
      showToast("Failed to add equipment.");
    }
  };

  const handleUserSwitch = async () => {
    const allProfiles = await mockSupabase.profiles.getAll();
    const nextUser = allProfiles.find((p) => p.id !== user?.id);
    if (nextUser) {
      setUser(nextUser);
      showToast(
        `Profile Switched: Now active as ${nextUser.full_name} (${nextUser.role.toUpperCase()})`,
      );
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
      {/* Sidebar – hidden on mobile, visible md+ */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0">
        <div className="p-6 pb-4 flex items-center justify-start">
          <svg
            viewBox="0 0 170 45"
            className="w-full h-auto max-w-[200px] select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="omegaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#12b3ff" />
                <stop offset="100%" stopColor="#5bf7ff" />
              </linearGradient>
            </defs>
            <text
              x="5"
              y="34"
              fontFamily="'Inter', system-ui, -apple-system, sans-serif"
              fontSize="38"
              fontWeight="905"
              fontStyle="italic"
              letterSpacing="-1.7px"
            >
              <tspan fill="#0a4cb2">om</tspan>
              <tspan fill="#0082df">eg</tspan>
              <tspan fill="url(#omegaGrad)">a</tspan>
              <tspan fill="#5bf7ff">.</tspan>
            </text>
          </svg>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "dashboard" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "hover:bg-slate-850 text-slate-400"}`}
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "inventory" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "hover:bg-slate-850 text-slate-400"}`}
          >
            <Box size={20} />
            <span className="font-medium">Inventory</span>
          </button>

          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Operations
            </p>
          </div>

          <button
            onClick={() => setActiveTab("workflow")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "workflow" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "hover:bg-slate-850 text-slate-400"}`}
          >
            <Repeat size={20} />
            <span className="font-medium">Workflow Terminal</span>
          </button>

          <div className="pt-4 pb-2 px-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Management
            </p>
          </div>

          <button
            onClick={() => setActiveTab("productions")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "productions" ? "bg-indigo-600 text-white margin-shadow" : "hover:bg-slate-850 text-slate-400"}`}
          >
            <ClipboardList size={20} />
            <span className="font-medium">Productions</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "logs" ? "bg-indigo-600 text-white" : "hover:bg-slate-850 text-slate-400"}`}
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
            <img
              src={user?.avatar_url}
              alt="Avatar"
              className="w-10 h-10 rounded-full border-2 border-indigo-500/30 group-hover:border-indigo-500/60 transition-colors"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200 group-hover:text-white transition-colors">
                {user?.full_name}
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                {user?.role} switcher ⇄
              </p>
            </div>
            <LogOut
              size={16}
              className="text-slate-500 hover:text-red-400 transition-colors"
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center">
            <svg viewBox="0 0 170 45" className="h-8 w-auto select-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="omegaGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#12b3ff" />
                  <stop offset="100%" stopColor="#5bf7ff" />
                </linearGradient>
              </defs>
              <text x="5" y="34" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontSize="38" fontWeight="905" fontStyle="italic" letterSpacing="-1.7px">
                <tspan fill="#0a4cb2">om</tspan>
                <tspan fill="#0082df">eg</tspan>
                <tspan fill="url(#omegaGrad2)">a</tspan>
                <tspan fill="#5bf7ff">.</tspan>
              </text>
            </svg>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* Notification Panel */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full transition-all border ${showNotifications ? "bg-slate-850 border-slate-700 text-white" : "text-slate-400 hover:text-white hover:bg-slate-850 border-slate-800"}`}
                title="Incident Alerts & System logs"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-slate-950"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-1rem))] bg-slate-900 border border-slate-800 rounded-2xl py-3 shadow-2xl z-30 animate-in fade-in duration-200">
                  <div className="px-4 pb-2 border-b border-slate-800 flex justify-between items-center">
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-400">
                      Activity Bulletins
                    </p>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="divide-y divide-slate-850 max-h-[260px] overflow-y-auto custom-scrollbar">
                    {logs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 hover:bg-slate-800/30 transition-colors"
                      >
                        <p className="text-xs text-slate-300">
                          <span className="font-semibold text-white">
                            {log.user?.full_name}
                          </span>{" "}
                          performs{" "}
                          <span className="text-indigo-400 font-bold uppercase text-[9px] bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20">
                            {log.action}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          {log.item ? log.item.name : "System modification"}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-1 font-mono">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Equipment</span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 pb-24 md:pb-8">
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight">
                  Operations Dashboard
                </h1>
                <p className="text-slate-400">
                  Real-time overview of crew assignments and equipment flow.
                </p>
              </div>

              <StatsOverview items={items} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Box size={20} className="text-indigo-500" />
                      Active Deployments
                    </h2>
                    <button
                      onClick={() => setActiveTab("inventory")}
                      className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      View All
                    </button>
                  </div>
                  <InventoryGrid
                    items={items
                      .filter((i) => i.status === "checked_out")
                      .slice(0, 4)}
                    onAction={refreshData}
                    productions={productions}
                    crew={[user!]}
                  />
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
          )}{" "}
          {activeTab === "inventory" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2 tracking-tight">
                    Equipment Inventory
                  </h1>
                  <p className="text-slate-400">
                    Total {items.length} items cataloged across{" "}
                    {categories.length} categories.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search gear..."
                      className="bg-slate-900 border border-slate-700/60 rounded-full py-1.5 pl-9 pr-4 text-xs focus:ring-1 focus:ring-indigo-500/60 outline-none transition-all text-slate-100 placeholder:text-slate-500 w-full sm:w-44 sm:focus:w-60"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setShowStatusFilters(!showStatusFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      showStatusFilters || selectedStatusId
                        ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400 font-bold"
                        : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 font-medium"
                    }`}
                  >
                    <Filter size={18} />
                    Filters{" "}
                    {selectedStatusId
                      ? `(${selectedStatusId.replace("_", " ")})`
                      : ""}
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
                        ? "bg-indigo-600/35 border-indigo-500/60 text-white"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Show All ({items.length})
                  </button>
                  {(
                    ["available", "checked_out", "maintenance", "lost"] as const
                  ).map((stat) => {
                    const count = items.filter((i) => i.status === stat).length;
                    return (
                      <button
                        key={stat}
                        onClick={() =>
                          setSelectedStatusId(
                            selectedStatusId === stat ? null : stat,
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                          selectedStatusId === stat
                            ? "bg-indigo-600/45 border-indigo-500/80 text-white shadow-sm"
                            : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {stat.replace("_", " ")} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 animate-in fade-in duration-200">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                    selectedCategoryId === null
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
                  }`}
                >
                  All Gear ({items.length})
                </button>
                {categories.map((cat) => {
                  const catCount = items.filter(
                    (i) => i.category_id === cat.id,
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategoryId(
                          selectedCategoryId === cat.id ? null : cat.id,
                        )
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                        selectedCategoryId === cat.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
                      }`}
                    >
                      {cat.name} ({catCount})
                    </button>
                  );
                })}
              </div>

              <InventoryGrid
                items={items.filter((i) => {
                  const matchesCategory =
                    !selectedCategoryId || i.category_id === selectedCategoryId;
                  const matchesStatus =
                    !selectedStatusId || i.status === selectedStatusId;
                  const matchesSearch = !searchTerm
                    ? true
                    : (i.name || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      (i.serial_number || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      (i.model || "")
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase());
                  return matchesCategory && matchesStatus && matchesSearch;
                })}
                onAction={refreshData}
                productions={productions}
                crew={[user!]}
              />
            </div>
          )}
          {activeTab === "workflow" && (
            <div className="animate-in fade-in duration-300">
              <WorkflowStation
                items={items}
                productions={productions}
                onAction={refreshData}
              />
            </div>
          )}
          {activeTab === "productions" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight">
                  Active Films & Shows
                </h1>
                <p className="text-slate-400">
                  Select any project card below to view detailed gear manifolds.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {productions.map((prod) => {
                  const deployedCount = items.filter(
                    (i) => i.current_production_id === prod.id,
                  ).length;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProduction(prod)}
                      className="bg-slate-900 border border-slate-805 p-6 rounded-3xl hover:border-indigo-500/50 transition-all cursor-pointer group active:scale-[0.99]"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-600/10 rounded-xl group-hover:bg-indigo-600/20 transition-all">
                          <ClipboardList
                            className="text-indigo-500"
                            size={24}
                          />
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            prod.status === "production"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : prod.status === "pre-production"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {prod.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-1 group-hover:text-indigo-400 transition-colors">
                        {prod.name}
                      </h3>
                      <p className="text-slate-400 text-sm mb-4">
                        {prod.location}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                        <span className="text-xs text-slate-500">
                          {prod.start_date} – {prod.end_date}
                        </span>
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
          {activeTab === "logs" && (
            <div className="bg-slate-900 border border-slate-804 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-300">
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold">System Accountability Log</h2>
                <p className="text-sm text-slate-500">
                  Chronological history of all inventory movements and status
                  changes.
                </p>
              </div>
              <div className="divide-y divide-slate-800">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${log.action === "Checkout" ? "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" : log.action === "Return" ? "bg-green-500" : "bg-slate-400"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="text-sm font-semibold text-white">
                            {log.user?.full_name}
                          </span>
                          <span className="text-slate-500 text-sm">·</span>
                          <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[11px] uppercase">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 mt-0.5 truncate">
                          {log.item?.name || "Asset system"}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <p className="text-[10px] text-slate-500 font-mono uppercase">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                          {log.details?.production && (
                            <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/50">
                              {log.details.production}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800">
        <div className="flex items-center justify-around px-1 py-1">
          {([
            { tab: 'dashboard' as const, icon: <LayoutDashboard size={20} />, label: 'Home' },
            { tab: 'inventory' as const, icon: <Box size={20} />, label: 'Inventory' },
            { tab: 'workflow' as const, icon: <Repeat size={20} />, label: 'Workflow' },
            { tab: 'productions' as const, icon: <ClipboardList size={20} />, label: 'Projects' },
            { tab: 'logs' as const, icon: <Settings size={20} />, label: 'Logs' },
          ]).map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1 ${
                activeTab === tab ? 'text-indigo-400' : 'text-slate-500 active:text-slate-300'
              }`}
            >
              {icon}
              <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* CineBot Side panel */}
      {showAISidebar && <AISidebar />}

      {/* Toast system alerts */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 bg-indigo-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300 border border-indigo-400">
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
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Equipment Name
                </label>
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
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Model{" "}
                  <span className="text-slate-500 lowercase font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Komodo-X"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white placeholder:text-slate-600"
                  value={newEquipModel}
                  onChange={(e) => setNewEquipModel(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Serial Number{" "}
                  <span className="text-slate-500 lowercase font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. RK-9040"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white placeholder:text-slate-600"
                  value={newEquipSerial}
                  onChange={(e) => setNewEquipSerial(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Category
                </label>
                <select
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white"
                  value={newEquipCategoryId}
                  onChange={(e) => setNewEquipCategoryId(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option
                      key={cat.id}
                      value={cat.id}
                      className="bg-slate-950"
                    >
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Initial Status
                </label>
                <select
                  required
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none text-sm font-medium transition-all text-white"
                  value={newEquipStatus}
                  onChange={(e) => setNewEquipStatus(e.target.value as any)}
                >
                  <option value="available" className="bg-slate-950">
                    Available
                  </option>
                  <option value="maintenance" className="bg-slate-950">
                    Under Maintenance
                  </option>
                  <option value="lost" className="bg-slate-950">
                    Lost
                  </option>
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
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold uppercase tracking-widest">
                  {selectedProduction.status}
                </span>
                <h2 className="text-2xl font-bold mt-1">
                  {selectedProduction.name}
                </h2>
                <p className="text-slate-400 text-sm">
                  {selectedProduction.location} •{" "}
                  {selectedProduction.start_date} to{" "}
                  {selectedProduction.end_date}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduction(null)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Deployed Equipment Manifest
                </h3>
                {items.filter(
                  (i) => i.current_production_id === selectedProduction.id,
                ).length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/30 border border-slate-800 rounded-2xl">
                    <p className="text-sm text-slate-500 italic">
                      No equipment currently checked out to this production.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items
                      .filter(
                        (i) =>
                          i.current_production_id === selectedProduction.id,
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-slate-950/40 border border-slate-800 p-4 rounded-xl"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold">
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{item.name}</p>
                              <p className="text-xs text-slate-500 font-mono">
                                S/N: {item.serial_number} • {item.model}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  `Recall ${item.name} and return to central storage?`,
                                )
                              ) {
                                await mockSupabase.items.return(item.id);
                                await refreshData();
                                showToast(
                                  `Recalled and returned "${item.name}" to inventory.`,
                                );
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
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Allocated Logistics Crew
                </h3>
                <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
                  <img
                    src="https://picsum.photos/seed/jordan/100/100"
                    className="w-10 h-10 rounded-full border border-indigo-500/30"
                    alt="Crew"
                  />
                  <div>
                    <p className="text-sm font-semibold">Jordan Smith</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                      Logistics Coordinator
                    </p>
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

      {/* Hostinger Database Setup Hub Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl scale-in-center max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Database className="text-emerald-400" />
                Hostinger MySQL Setup Hub
              </h2>
              <button
                onClick={() => setShowDbModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Brief Status Header */}
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    Active Connection Mode
                  </p>
                  <p
                    className={`text-sm font-bold ${dbMode === "mysql" ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    {dbMode === "mysql"
                      ? "Live Hostinger MySQL (Active)"
                      : "Offline Local Sandbox (Demo)"}
                  </p>
                </div>
                <span
                  className={`w-3 h-3 rounded-full ${dbMode === "mysql" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
                />
              </div>

              {/* Setup Instructions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Database Instructions & Setup
                </h3>
                <div className="space-y-2 text-xs text-slate-400 leading-relaxed bg-slate-950/30 p-4 border border-slate-800/50 rounded-2xl">
                  <p>
                    <strong className="text-slate-200">
                      1. phpMyAdmin Table Setup:
                    </strong>
                    <br />
                    In Hostinger Panel, go to your Database page. Click{" "}
                    <strong className="text-slate-350 font-normal">
                      Enter phpMyAdmin
                    </strong>{" "}
                    for{" "}
                    <code className="text-indigo-400">
                      u522832521_OmegaSystem
                    </code>
                    . Go to the SQL tab, copy everything inside the file{" "}
                    <code className="text-emerald-400">db_setup.sql</code> in
                    this project, paste it in, and click Go/Run.
                  </p>
                  <p className="mt-2.5">
                    <strong className="text-slate-200">
                      2. Upload Bridge Script:
                    </strong>
                    <br />
                    Upload <code className="text-emerald-400">
                      api.php
                    </code>{" "}
                    into your Hostinger host manager folder (usually{" "}
                    <code className="text-slate-300">public_html</code>).
                    Double-click to edit and replace the password on Line 12
                    with your real MySQL password.
                  </p>
                </div>
              </div>

              {/* Mode selection Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Select Operational Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDbModeState("mock");
                    }}
                    className={`p-3.5 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                      dbMode === "mock"
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-400 font-bold"
                        : "bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-300 hover:border-slate-800"
                    }`}
                  >
                    <span>Sandbox Mode</span>
                    <span className="text-[9px] font-normal text-slate-500 capitalize">
                      Uses local mock records
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDbModeState("mysql");
                    }}
                    className={`p-3.5 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${
                      dbMode === "mysql"
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold"
                        : "bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-300 hover:border-slate-800"
                    }`}
                  >
                    <span>MySQL Direct API</span>
                    <span className="text-[9px] font-normal text-slate-500 capitalize">
                      Queries live Hostinger db
                    </span>
                  </button>
                </div>
              </div>

              {/* Endpoint input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-sans">
                    MySQL API endpoint URL
                  </label>
                  <span className="text-[9px] text-slate-500">
                    (Supports remote CORS fetching!)
                  </span>
                </div>
                <input
                  type="text"
                  value={dbUrlInput}
                  onChange={(e) => setDbUrlInput(e.target.value)}
                  placeholder="https://ghostwhite-sardine-651089.hostingersite.com/api.php"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                  Leave as{" "}
                  <code className="text-indigo-400 font-mono">/api.php</code> if
                  you plan to upload the static built pages in the same folder.
                  To connect your live Hostinger DB directly right now in this
                  preview console, enter{" "}
                  <code className="text-emerald-400 font-mono">
                    https://ghostwhite-sardine-651089.hostingersite.com/api.php
                  </code>{" "}
                  (must have CORS enabled)!
                </p>
              </div>

              {/* Testing area */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={() => handleTestConnection(dbUrlInput)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950 text-xs text-slate-300 font-bold rounded-xl transition-all flex items-center gap-2 justify-center w-full disabled:opacity-40"
                >
                  {testingConnection ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Globe size={12} />
                  )}
                  Test MySQL API Access & Queries
                </button>

                {connectionResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs leading-relaxed animate-in slide-in-from-top-1 ${
                      connectionResult.success
                        ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/5 border-red-500/20 text-red-400"
                    }`}
                  >
                    <p className="font-semibold">
                      {connectionResult.success
                        ? "✓ Connection Succesful"
                        : "✕ Connection Error"}
                    </p>
                    <p className="mt-1 text-slate-300">
                      {connectionResult.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Save actions */}
              <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDbModal(false)}
                  className="py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setBackendUrl(dbUrlInput);
                    setDbUrlState(dbUrlInput);
                    setDbMode(dbMode); // Save to local storage
                    setDbModeState(dbMode);
                    setShowDbModal(false);
                    showToast(
                      `Operational mode changed: Connected to ${dbMode === "mysql" ? "Hostinger MySQL Database API." : "Offline Client Simulator."}`,
                    );
                    await refreshData();
                  }}
                  className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
                >
                  Save Operational Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

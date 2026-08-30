"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CarFront,
  Search,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  Users,
  Hash,
  Palette,
  Activity,
  RefreshCw,
  Check,
  Plus,
  Wrench,
  Droplets,
  CircleDot,
  Calendar,
  Gauge,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  ClipboardCheck,
  FileText,
  ArrowRight,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import ServiceRecordModal from "./ServiceRecordModal";
import { getServiceTypeLabel } from "../../lib/serviceTypes";
import type { ServiceRecordType, ServiceRecordMeta } from "../../lib/serviceTypes";
type ServiceRecord = ServiceRecordMeta & { _id?: unknown };

type VehicleStatus = "parked" | "on_route";
type VehicleCondition = "working" | "debrecen_only" | "not_working";

interface Vehicle {
  _id: string;
  name: string;
  type: string;
  plates?: string;
  seats?: number;
  color?: string;
  status: VehicleStatus;
  condition: VehicleCondition;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

interface UserSession {
  name: string;
  email: string;
  role: string;
  company?: string;
}

type Tab = "vehicles" | "service" | "oil" | "tires";

const CONDITION_META: Record<
  VehicleCondition,
  { label: string; icon: any; textColor: string; backgroundColor: string; borderColor: string; dot: string }
> = {
  working: {
    label: "Működik",
    icon: ShieldCheck,
    textColor: "#10b981",
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "rgba(16,185,129,0.25)",
    dot: "#10b981",
  },
  debrecen_only: {
    label: "Csak Debrecen",
    icon: MapPin,
    textColor: "#f59e0b",
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.25)",
    dot: "#f59e0b",
  },
  not_working: {
    label: "Nem működik",
    icon: AlertTriangle,
    textColor: "#f43f5e",
    backgroundColor: "rgba(244,63,94,0.12)",
    borderColor: "rgba(244,63,94,0.25)",
    dot: "#f43f5e",
  },
};

const statusMeta: Record<VehicleStatus, { label: string; dot: string; textColor: string }> = {
  parked: { label: "Parkolt", dot: "#94a3b8", textColor: "#cbd5e1" },
  on_route: { label: "Úton", dot: "#3b82f6", textColor: "#93c5fd" },
};

const typeIconMap: Record<ServiceRecordType, any> = {
  olajcsere: Droplets,
  gumicsere: CircleDot,
  muszaki_vizsga: ClipboardCheck,
  szerviz_altalanos: Wrench,
  fekbetisztitas: ShieldCheck,
  futomu_frissites: Sparkles,
  tomegkozlekedesi_engedely: FileText,
  egyeb: FileText,
};

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-");
    if (!y || !m || !day) return d;
    return `${y}. ${Number(m)}. ${Number(day)}.`;
  } catch {
    return d;
  }
}

function daysUntil(date?: string): number | null {
  if (!date) return null;
  const target = new Date(date + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function kmNumber(v?: number): string {
  if (v == null || isNaN(v)) return "—";
  try {
    return new Intl.NumberFormat("hu-HU").format(v) + " km";
  } catch {
    return String(v) + " km";
  }
}

const huf = (v?: number) => {
  if (v == null || isNaN(v)) return null;
  try {
    return new Intl.NumberFormat("hu-HU").format(v) + " Ft";
  } catch {
    return String(v) + " Ft";
  }
};

export default function GroupLeaderDashboardClient() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VehicleStatus>("all");
  const [conditionFilter, setConditionFilter] = useState<"all" | VehicleCondition>("all");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [tab, setTab] = useState<Tab>("vehicles");
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVehicleId, setModalVehicleId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"main" | "oil" | "tire">("main");
  const [modalEditing, setModalEditing] = useState<ServiceRecord | null>(null);

  // Record deletion confirm
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    window.setTimeout(() => setToast(null), 2800);
  };

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data?.authenticated && data?.user) {
        setUser(data.user);
      }
    } catch {}
  };

  const fetchAll = async (showToastSuccess = false) => {
    setLoading(true);
    try {
      const [vRes, rRes] = await Promise.all([
        fetch("/api/vehicles", { cache: "no-store" }),
        fetch("/api/service-records", { cache: "no-store" }),
      ]);
      const vData = await vRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      if (Array.isArray(vData?.vehicles)) setVehicles(vData.vehicles);
      if (Array.isArray(rData?.records)) setRecords(rData.records);
      if (showToastSuccess) showToast(true, "Frissítve");
    } catch {
      showToast(false, "Hiba a betöltésnél");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchAll(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  };

  useEffect(() => {
    fetchSession();
    fetchAll();
  }, []);

  const patchVehicle = async (id: string, patch: Partial<Vehicle>) => {
    try {
      const res = await fetch("/api/vehicles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (res.ok) {
        setVehicles((prev) => prev.map((v) => (v._id === id ? { ...v, ...patch, updatedAt: Date.now() } : v)));
        showToast(true, patch.status === "on_route" ? "Úton jelölve" : "Parkolásba rakva");
        return true;
      }
      showToast(false, "Hiba a mentés közben");
      return false;
    } catch {
      showToast(false, "Hálózati hiba");
      return false;
    }
  };

  // === SERVICE RECORDS ===
  const openCreate = (vehicleId: string, mode: "main" | "oil" | "tire" = "main") => {
    setModalEditing(null);
    setModalVehicleId(vehicleId);
    setModalMode(mode);
    setModalOpen(true);
  };

  const openEdit = (record: ServiceRecord) => {
    setModalEditing(record);
    setModalVehicleId(String(record.vehicleId));
    setModalMode("main");
    setModalOpen(true);
  };

  const saveRecord = async (payload: any): Promise<boolean> => {
    try {
      const editingId = payload.id;
      delete payload.id;
      let res;
      if (editingId) {
        const url = new URL("/api/service-records", window.location.origin);
        url.searchParams.set("id", editingId);
        res = await fetch(url.toString(), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/service-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        showToast(true, editingId ? "Módosítva" : "Rögzítve");
        await fetchAll();
        return true;
      }
      const j = await res.json().catch(() => ({}));
      showToast(false, j?.error ?? "Hiba a mentésnél");
      return false;
    } catch (e: any) {
      showToast(false, e?.message ?? "Hálózati hiba");
      return false;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const url = new URL("/api/service-records", window.location.origin);
      url.searchParams.set("id", id);
      const res = await fetch(url.toString(), { method: "DELETE" });
      if (res.ok) {
        showToast(true, "Törölve");
        setRecords((prev) => prev.filter((r) => String(r._id) !== id));
        return true;
      }
      showToast(false, "Nem sikerült törölni");
      return false;
    } catch {
      showToast(false, "Hálózati hiba");
      return false;
    } finally {
      setDeletingRecordId(null);
    }
  };

  // === DERIVED DATA ===
  const stats = useMemo(() => {
    const total = vehicles.length;
    const onRoute = vehicles.filter((v) => v.status === "on_route").length;
    const working = vehicles.filter((v) => v.condition === "working").length;
    const broken = vehicles.filter((v) => v.condition === "not_working").length;
    return { total, onRoute, working, broken };
  }, [vehicles]);

  const serviceStats = useMemo(() => {
    const today = new Date();
    const future = (d?: string) => {
      if (!d) return false;
      const t = new Date(d + "T00:00:00");
      const diff = Math.round((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 30;
    };
    const totalRecords = records.length;
    const oilCount = records.filter((r) => r.type === "olajcsere").length;
    const tireCount = records.filter((r) => r.type === "gumicsere").length;
    const upcoming = records.filter(
      (r) => future(r.nextCheckDate)
    ).length;
    return { totalRecords, oilCount, tireCount, upcoming };
  }, [records]);

  const recordsByVehicle = useMemo(() => {
    const map = new Map<string, ServiceRecord[]>();
    for (const r of records) {
      const key = String(r.vehicleId);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      map.set(k, list);
    }
    return map;
  }, [records]);

  const upcomingByVehicle = useMemo(() => {
    const map = new Map<string, { record: ServiceRecord; days: number | null }>();
    for (const r of records) {
      const d = daysUntil(r.nextCheckDate);
      if (d == null) continue;
      if (d > 60) continue;
      const key = String(r.vehicleId);
      const cur = map.get(key);
      if (!cur || (cur.days ?? 99999) > d) map.set(key, { record: r, days: d });
    }
    return map;
  }, [records]);

  const lastServiceByVehicle = useMemo(() => {
    const map = new Map<string, ServiceRecord>();
    for (const r of records) {
      const key = String(r.vehicleId);
      const cur = map.get(key);
      if (!cur || (cur.date ?? "") < (r.date ?? "")) map.set(key, r);
    }
    return map;
  }, [records]);

  // Tab specific data
  const filteredVehicles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (conditionFilter !== "all" && v.condition !== conditionFilter) return false;
      if (!q) return true;
      return [v.name, v.type, v.plates, v.color, v.note].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [vehicles, search, statusFilter, conditionFilter]);

  const serviceFilteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...records];
    if (tab === "oil") list = list.filter((r) => r.type === "olajcsere");
    if (tab === "tires") list = list.filter((r) => r.type === "gumicsere");
    if (q) {
      list = list.filter((r) => {
        const haystack = [
          r.title,
          r.type,
          r.notes,
          r.vehicleName,
          r.vehiclePlateNumber,
          r.servicePartner,
          r.date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    return list;
  }, [records, search, tab]);

  // ====== RENDER ======
  return (
    <div
      className="min-h-screen min-h-[100dvh] text-[#F7F5F1] pb-8 relative overflow-x-hidden"
    >
      {/* Premium Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-5%] right-[-10%] w-[380px] h-[380px] bg-[#C9A962]/[0.06] blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-15%] w-[400px] h-[400px] bg-[#1e3a8a]/[0.3] blur-[130px] rounded-full" />
      </div>

      {/* Sticky Header */}
      <header
        className="sticky top-0 z-40 border-b border-[#C9A962]/10"
        style={{
          backgroundColor: "rgba(11,26,42,0.82)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
        }}
      >
        <div className="w-full mx-auto px-4 h-[60px] flex items-center justify-between" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-[0_4px_16px_rgba(201,169,98,0.2)]">
              <div className="absolute inset-0 gold-gradient" />
              <CarFront className="relative z-10 w-5 h-5 text-[#0B1A2A]" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[9px] font-black tracking-[0.22em] text-[#C9A962] uppercase flex items-center gap-1">
                Flotta
              </div>
              <h1 className="text-[17px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] tracking-tight leading-tight">
                {tab === "vehicles"
                  ? "Járműlista"
                  : tab === "service"
                  ? "Szerviz napló"
                  : tab === "oil"
                  ? "Olajcserék"
                  : "Gumicserék"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 rounded-xl border border-[#C9A962]/15 flex items-center justify-center text-[#C9A962] hover:bg-[#C9A962]/10 transition-all active:scale-[0.95] disabled:opacity-50"
              style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
              title="Frissítés"
            >
              <RefreshCw className={`w-[18px] h-[18px] ${refreshing ? "animate-spin" : ""}`} strokeWidth={2} />
            </button>

            {/* Plus for service tabs */}
            {(tab === "service" || tab === "oil" || tab === "tires") && (
              <button
                onClick={() =>
                  openCreate(
                    vehicles[0]?._id ?? "",
                    tab === "oil" ? "oil" : tab === "tires" ? "tire" : "main"
                  )
                }
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#0B1A2A] transition-all active:scale-[0.95] shadow-[0_6px_18px_-6px_rgba(201,169,98,0.5)]"
                style={{ background: "linear-gradient(135deg, #C9A962 0%, #d4bb7a 100%)" }}
                title="Új rekord"
              >
                <Plus className="w-[19px] h-[19px]" strokeWidth={2.5} />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="w-10 h-10 rounded-xl border border-[#C9A962]/15 flex items-center justify-center transition-all active:scale-[0.95] overflow-hidden"
                style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
              >
                <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
                  <span className="text-[12px] font-black text-[#0B1A2A]">
                    {user?.name?.charAt(0)?.toUpperCase() || "C"}
                  </span>
                </div>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl card-glass shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden animate-slide-up">
                    <div className="px-4 py-3.5 border-b border-[#C9A962]/10">
                      <div className="text-[13px] font-bold text-[#F7F5F1] truncate">{user?.name || "Csoportvezető"}</div>
                      <div className="text-[11px] text-[#F7F5F1]/50 font-medium truncate mt-0.5">{user?.email}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-[#C9A962]/5 transition-colors"
                    >
                      <LogOut className="w-[18px] h-[18px] text-[#f43f5e]" strokeWidth={2} />
                      <span className="text-[13px] font-semibold text-[#f43f5e]">Kijelentkezés</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-[#C9A962]/50" strokeWidth={2} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === "vehicles"
                  ? "Keresés név, típus, rendszám..."
                  : "Keresés rekord, típus, jármű, partner..."
              }
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-[14px] text-[#F7F5F1] placeholder:text-[#F7F5F1]/35 font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/25"
              style={{
                backgroundColor: "rgba(26,45,68,0.5)",
                borderColor: search ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#F7F5F1]/40 hover:text-[#F7F5F1]/80"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab Nav - horizontal scroll mobile */}
        <div className="w-full mx-auto px-4 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
            <TabButton active={tab === "vehicles"} onClick={() => setTab("vehicles")} icon={CarFront}>
              Járművek
            </TabButton>
            <TabButton active={tab === "service"} onClick={() => setTab("service")} icon={Wrench}>
              Szervíz
            </TabButton>
            <TabButton active={tab === "oil"} onClick={() => setTab("oil")} icon={Droplets}>
              Olajcsere
            </TabButton>
            <TabButton active={tab === "tires"} onClick={() => setTab("tires")} icon={CircleDot}>
              Gumicsere
            </TabButton>
          </div>
        </div>
      </header>

      <main className="relative z-10 w-full mx-auto px-4 mt-5">
        {/* === VEHICLES TAB === */}
        {tab === "vehicles" && (
          <section className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <MiniStat title="Összes jármű" value={stats.total} icon={CarFront} tone="gold" />
              <MiniStat title="Úton van" value={stats.onRoute} icon={Activity} tone="blue" />
              <MiniStat title="Működik" value={stats.working} icon={ShieldCheck} tone="green" />
              <MiniStat title="Hibás" value={stats.broken} icon={AlertTriangle} tone="red" />
            </div>

            {/* Filter chips */}
            <div className="flex flex-col gap-3 p-2.5 rounded-2xl card-glass-light">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1">
                <FilterTab active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
                  Összes
                </FilterTab>
                <FilterTab active={statusFilter === "parked"} onClick={() => setStatusFilter("parked")} dot="#94a3b8">
                  Szabad
                </FilterTab>
                <FilterTab active={statusFilter === "on_route"} onClick={() => setStatusFilter("on_route")} dot="#3b82f6">
                  Úton
                </FilterTab>
                <div className="w-px h-5 bg-[#C9A962]/15 mx-1 shrink-0" />
                <FilterTab active={conditionFilter === "all"} onClick={() => setConditionFilter("all")}>
                  Minden állapot
                </FilterTab>
                <FilterTab active={conditionFilter === "working"} onClick={() => setConditionFilter("working")}>
                  Működik
                </FilterTab>
                <FilterTab active={conditionFilter === "not_working"} onClick={() => setConditionFilter("not_working")}>
                  Hibás
                </FilterTab>
              </div>
              <div className="flex items-center justify-between px-1.5">
                <div className="text-[10.5px] font-bold text-[#F7F5F1]/40 uppercase tracking-[0.2em]">
                  <span className="text-[#C9A962] font-black">{filteredVehicles.length}</span> találat
                </div>
              </div>
            </div>

            {/* Vehicle List (NO CARD GRID, elegant list mobile style) */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[110px] rounded-2xl card-glass animate-pulse" />
                ))}
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="py-16 text-center card-glass rounded-3xl border-dashed">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-[#C9A962]/50 mb-5 border border-[#C9A962]/10" style={{ backgroundColor: "rgba(26,45,68,0.5)" }}>
                  <Search className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] mb-2">
                  Nincs találat
                </h3>
                <p className="text-[13px] font-medium text-[#F7F5F1]/50 px-8">
                  Próbáld módosítani a szűrőket vagy a keresést.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVehicles.map((v, idx) => {
                  const expanded = expandedVehicleId === v._id;
                  const vRecs = recordsByVehicle.get(v._id) ?? [];
                  const upcoming = upcomingByVehicle.get(v._id);
                  const lastRec = lastServiceByVehicle.get(v._id);
                  return (
                    <VehicleRow
                      key={v._id}
                      index={idx}
                      vehicle={v}
                      expanded={expanded}
                      records={vRecs}
                      upcoming={upcoming}
                      lastRecord={lastRec}
                      onToggle={() => setExpandedVehicleId(expanded ? null : v._id)}
                      onPatch={(patch: any) => patchVehicle(v._id, patch)}
                      onAddOil={() => openCreate(v._id, "oil")}
                      onAddTire={() => openCreate(v._id, "tire")}
                      onAddService={() => openCreate(v._id, "main")}
                      onEditRecord={openEdit}
                      onDeleteRecord={(rid: any) => setDeletingRecordId(rid)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* === SERVICE / OIL / TIRES TABS === */}
        {(tab === "service" || tab === "oil" || tab === "tires") && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat title="Összes rekord" value={serviceStats.totalRecords} icon={FileText} tone="gold" />
              <MiniStat title="Hamarosan due" value={serviceStats.upcoming} icon={Clock} tone="blue" />
              <MiniStat title="Olajcserék" value={serviceStats.oilCount} icon={Droplets} tone="green" />
              <MiniStat title="Gumicserék" value={serviceStats.tireCount} icon={CircleDot} tone="red" />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[108px] rounded-2xl card-glass animate-pulse" />
                ))}
              </div>
            ) : serviceFilteredRecords.length === 0 ? (
              <EmptyStateService onAdd={() =>
                openCreate(
                  vehicles[0]?._id ?? "",
                  tab === "oil" ? "oil" : tab === "tires" ? "tire" : "main"
                )
              }
              tab={tab}
              />
            ) : (
              <div className="space-y-3">
                {serviceFilteredRecords.map((r, idx) => (
                  <ServiceRow
                    key={String(r._id)}
                    index={idx}
                    record={r}
                    onEdit={() => openEdit(r)}
                    onDelete={() => setDeletingRecordId(String(r._id))}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
          <div className={`px-4 py-3 rounded-2xl shadow-[0_16px_44px_rgba(0,0,0,0.5)] border flex items-center gap-2.5 ${
            toast.ok
              ? "bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.3)]"
              : "bg-[rgba(244,63,94,0.15)] border-[rgba(244,63,94,0.3)]"
          }`}>
            {toast.ok ? <Check className="w-[18px] h-[18px] text-[#10b981]" strokeWidth={2.5} /> : <AlertTriangle className="w-[18px] h-[18px] text-[#f43f5e]" strokeWidth={2.5} />}
            <span className={`text-[13px] font-bold ${toast.ok ? "text-[#10b981]" : "text-[#f43f5e]"}`}>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Record Delete Confirm */}
      {deletingRecordId && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" onClick={() => setDeletingRecordId(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[4px]" />
          <div
            className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[#C9A962]/10 shadow-[0_26px_80px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up-bottom"
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: "#0F2338", paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="px-5 pt-5 pb-4 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f43f5e]">
                  Törlés
                </div>
                <h3 className="text-[17px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] mt-1">
                  Biztosan törlöd ezt a rekordot?
                </h3>
                <p className="text-[12.5px] text-[#F7F5F1]/55 mt-1 font-medium">
                  A művelet nem visszavonható.
                </p>
              </div>
              <button
                onClick={() => setDeletingRecordId(null)}
                className="w-9 h-9 shrink-0 rounded-xl border border-[#C9A962]/10 flex items-center justify-center text-[#F7F5F1]/60 hover:text-[#F7F5F1] hover:bg-[#C9A962]/5 transition-all"
                style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
              >
                <X className="w-[17px] h-[17px]" strokeWidth={2.2} />
              </button>
            </div>
            <div
              className="px-5 pb-5 pt-2 border-t border-[#C9A962]/10 flex gap-3"
              style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
            >
              <button
                onClick={() => setDeletingRecordId(null)}
                className="flex-1 px-4 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.16em] border border-[#C9A962]/10 text-[#F7F5F1]/70 hover:text-[#F7F5F1] hover:bg-[#C9A962]/5 transition-all active:scale-[0.97]"
                style={{ backgroundColor: "rgba(26,45,68,0.4)" }}
              >
                Mégse
              </button>
              <button
                onClick={() => deleteRecord(deletingRecordId)}
                className="flex-1 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
                  color: "#ffffff",
                  boxShadow: "0 10px 26px -8px rgba(244,63,94,0.55)",
                }}
              >
                <Trash2 className="w-[16px] h-[16px]" strokeWidth={2.2} />
                Törlés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      <ServiceRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={saveRecord}
        vehicles={vehicles}
        preselectedVehicleId={modalVehicleId}
        mode={modalMode}
        editing={modalEditing}
      />
    </div>
  );
}

/* =========== Subcomponents =========== */

function TabButton({ active, onClick, icon: Icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3.5 py-2.5 rounded-xl text-[11.5px] font-black uppercase tracking-[0.14em] transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
        active
          ? "shadow-[0_6px_18px_-6px_rgba(201,169,98,0.4)]"
          : "bg-transparent text-[#F7F5F1]/55 hover:bg-[#C9A962]/5 hover:text-[#F7F5F1]/90"
      }`}
      style={
        active
          ? {
              background: "linear-gradient(135deg, #C9A962 0%, #d4bb7a 100%)",
              color: "#0B1A2A",
            }
          : {}
      }
    >
      <Icon className="w-[15px] h-[15px]" strokeWidth={2.2} />
      {children}
    </button>
  );
}

function MiniStat({ title, value, icon: Icon, tone }: any) {
  const palettes = {
    gold: {
      valueColor: "#F7F5F1",
      iconBg: "rgba(201,169,98,0.15)",
      iconBorder: "rgba(201,169,98,0.25)",
      iconColor: "#C9A962",
      accent: "#C9A962",
    },
    blue: {
      valueColor: "#93c5fd",
      iconBg: "rgba(59,130,246,0.15)",
      iconBorder: "rgba(59,130,246,0.25)",
      iconColor: "#60a5fa",
      accent: "#60a5fa",
    },
    green: {
      valueColor: "#34d399",
      iconBg: "rgba(16,185,129,0.15)",
      iconBorder: "rgba(16,185,129,0.25)",
      iconColor: "#10b981",
      accent: "#10b981",
    },
    red: {
      valueColor: "#fb7185",
      iconBg: "rgba(244,63,94,0.15)",
      iconBorder: "rgba(244,63,94,0.25)",
      iconColor: "#f43f5e",
      accent: "#f43f5e",
    },
  };
  const t = (palettes as any)[tone] ?? palettes.gold;
  return (
    <div
      className="p-3.5 rounded-2xl flex items-center gap-3 transition-all active:scale-[0.99]"
      style={{
        backgroundColor: "rgba(26,45,68,0.5)",
        border: `1px solid ${t.iconBorder}`,
        boxShadow: "0 8px 24px -16px rgba(0,0,0,0.45)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
        style={{ backgroundColor: t.iconBg, borderColor: t.iconBorder, color: t.iconColor }}
      >
        <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: `${t.accent}99` }}>
          {title}
        </div>
        <div className="text-[22px] font-black leading-none mt-1 tracking-tight" style={{ color: t.valueColor }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function FilterTab({ active, onClick, children, dot }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-[11.5px] font-bold uppercase tracking-[0.12em] transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
        active
          ? "text-[#0B1A2A] shadow-[0_4px_16px_rgba(201,169,98,0.3)]"
          : "bg-transparent text-[#F7F5F1]/55 hover:bg-[#C9A962]/5 hover:text-[#F7F5F1]/85"
      }`}
      style={active ? { background: "linear-gradient(135deg, #C9A962 0%, #d4bb7a 100%)" } : {}}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
      {children}
    </button>
  );
}

/* === VEHICLE LIST ITEM - mobile optimized elegant LIST, NOT CARDS === */
function VehicleRow({
  vehicle,
  expanded,
  records,
  upcoming,
  lastRecord,
  index,
  onToggle,
  onPatch,
  onAddOil,
  onAddTire,
  onAddService,
  onEditRecord,
  onDeleteRecord,
}: any) {
  const v = vehicle as Vehicle;
  const isParked = v.status === "parked";
  const cond = CONDITION_META[v.condition];
  const CondIcon = cond.icon;
  const st = statusMeta[v.status];
  const upcomingDays = upcoming?.days;
  const upcomingBadge = upcoming?.record;
  const nextCheckTone =
    upcomingDays == null
      ? null
      : upcomingDays <= 7
      ? "critical"
      : upcomingDays <= 30
      ? "warn"
      : "ok";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl transition-all duration-300 animate-slide-up card-glass active:scale-[0.995]"
      style={{
        animationDelay: `${Math.min(index * 45, 280)}ms`,
      }}
    >
      {/* Left side accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-10"
        style={{
          background: expanded
            ? "linear-gradient(180deg, #C9A962, #d4bb7a)"
            : v.condition === "working"
            ? "linear-gradient(180deg, #10b981 0%, #059669 100%)"
            : v.condition === "debrecen_only"
            ? "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)"
            : "linear-gradient(180deg, #f43f5e 0%, #be123c 100%)",
          borderRadius: "2px 0 0 2px",
        }}
      />

      {/* Row - NOT a button to avoid nested <button> hydration error with ActionPatchButton */}
      {/* EXPLICIT pr-5 (20px) jobb padding + pl-[1.15rem] to avoid any overflow of right actions */}
      <div className="flex items-stretch w-full pl-[1.15rem] pr-5 py-3.5 gap-3">
        {/* Clickable left + center area - toggles expand */}
        <div
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
          className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer outline-none"
        >
          {/* Icon */}
          <div
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{
              backgroundColor: "rgba(201,169,98,0.1)",
              borderColor: "rgba(201,169,98,0.2)",
            }}
          >
            <CarFront className="w-[20px] h-[20px] text-[#C9A962]" strokeWidth={2} />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0F2338]"
              style={{ backgroundColor: st.dot }}
              title={st.label}
            />
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1 flex flex-col justify-center overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[8.5px] font-black uppercase tracking-[0.16em] shrink-0"
                style={{ color: st.textColor }}
              >
                {st.label}
              </span>
              {upcomingBadge && nextCheckTone && (
                <span
                  className="px-1.5 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-[0.08em] shrink-0"
                  style={
                    nextCheckTone === "critical"
                      ? { backgroundColor: "rgba(244,63,94,0.18)", color: "#fb7185" }
                      : nextCheckTone === "warn"
                      ? { backgroundColor: "rgba(245,158,11,0.18)", color: "#fbbf24" }
                      : { backgroundColor: "rgba(16,185,129,0.16)", color: "#34d399" }
                  }
                >
                  {upcomingDays! < 0 ? `Lejárt ${-upcomingDays!} napja` : `${upcomingDays!} nap múlva`}
                </span>
              )}
            </div>

            <h2 className="mt-0.5 text-[15px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] truncate leading-tight tracking-tight">
              {v.name}
            </h2>

            <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold tracking-wide text-[#C9A962]/90">
                <Hash className="w-[10px] h-[10px]" strokeWidth={2.5} />
                {v.plates || "—"}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-[#F7F5F1]/50 uppercase tracking-wide">
                <Users className="w-[10px] h-[10px]" strokeWidth={2.2} />
                {v.seats ? `${v.seats} fő` : "—"}
              </span>
              {v.color && (
                <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-[#F7F5F1]/50 uppercase tracking-wide">
                  <Palette className="w-[10px] h-[10px]" strokeWidth={2.2} />
                  {v.color}
                </span>
              )}
            </div>

            {lastRecord && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#F7F5F1]/45 font-medium truncate">
                <Clock className="w-[10px] h-[10px] shrink-0" strokeWidth={2} />
                <span className="truncate">
                  Utolsó: <span className="font-semibold text-[#F7F5F1]/65 truncate">{formatDate(lastRecord.date)}</span>
                  {" "}· {getServiceTypeLabel(lastRecord.type)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right actions: CTA + expand - SHRINK-0 so buttons never get cut off, keep width stable */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <ActionPatchButton parked={isParked} onClick={(e) => { onPatch({ status: isParked ? "on_route" : "parked" }); }} />
          <button
            onClick={onToggle}
            aria-label={expanded ? "Összecsukás" : "Kibontás"}
            className="w-9 h-9 rounded-xl border border-[#C9A962]/10 flex items-center justify-center text-[#C9A962]/80 hover:bg-[#C9A962]/5 transition-all active:scale-[0.95] shrink-0"
            style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
          >
            <ChevronDown className={`w-[17px] h-[17px] transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Expanded section - service sublist */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#C9A962]/10 pt-4 space-y-3" style={{ paddingLeft: "1.15rem", paddingRight: "1rem" }}>
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <QuickAction onClick={onAddOil} icon={Droplets} tone="blue">
              Olajcsere
            </QuickAction>
            <QuickAction onClick={onAddTire} icon={CircleDot} tone="amber">
              Gumicsere
            </QuickAction>
            <QuickAction onClick={onAddService} icon={Wrench} tone="gold">
              Szerviz
            </QuickAction>
          </div>

          {/* Info badges row */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="p-3 rounded-2xl border flex items-center gap-2.5"
              style={{ backgroundColor: "rgba(26,45,68,0.4)", borderColor: cond.borderColor }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ backgroundColor: cond.backgroundColor, borderColor: cond.borderColor, color: cond.textColor }}
              >
                <CondIcon className="w-[16px] h-[16px]" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-black uppercase tracking-[0.18em] text-[#F7F5F1]/45">
                  Állapot
                </div>
                <div className="text-[12.5px] font-black truncate" style={{ color: cond.textColor }}>
                  {cond.label}
                </div>
              </div>
            </div>
            <div
              className="p-3 rounded-2xl border flex items-center gap-2.5"
              style={{ backgroundColor: "rgba(26,45,68,0.4)", borderColor: "rgba(201,169,98,0.12)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                style={{ backgroundColor: "rgba(201,169,98,0.1)", borderColor: "rgba(201,169,98,0.2)", color: "#C9A962" }}
              >
                <FileText className="w-[16px] h-[16px]" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] font-black uppercase tracking-[0.18em] text-[#F7F5F1]/45">
                  Rekordok
                </div>
                <div className="text-[12.5px] font-black truncate text-[#C9A962]">
                  {records.length} db
                </div>
              </div>
            </div>
          </div>

          {/* Note */}
          {v.note && (
            <div className="p-3 rounded-2xl border flex items-start gap-2.5" style={{ backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.22)" }}>
              <AlertTriangle className="w-[15px] h-[15px] text-[#f59e0b] shrink-0 mt-0.5" strokeWidth={2.1} />
              <div className="text-[11.5px] font-semibold text-[#fbbf24] leading-relaxed">{v.note}</div>
            </div>
          )}

          {/* Records per vehicle */}
          {records.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-[#C9A962]/15 flex flex-col items-center text-center" style={{ backgroundColor: "rgba(26,45,68,0.35)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border border-[#C9A962]/10" style={{ backgroundColor: "rgba(201,169,98,0.08)", color: "#C9A962" }}>
                <Wrench className="w-[18px] h-[18px]" strokeWidth={1.7} />
              </div>
              <div className="text-[12.5px] font-bold text-[#F7F5F1]/80">Még nincs szerviz rekord</div>
              <div className="text-[11px] text-[#F7F5F1]/50 mt-0.5 font-medium">
                Használd a gombokat fent rögzítéshez
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="text-[10.5px] font-black uppercase tracking-[0.2em] text-[#F7F5F1]/40">
                  Szerviz előzmények
                </div>
              </div>
              {records.slice(0, 8).map((r: ServiceRecord) => (
                <InlineRecord
                  key={String(r._id)}
                  record={r}
                  onEdit={() => onEditRecord(r)}
                  onDelete={() => onDeleteRecord(String(r._id))}
                />
              ))}
              {records.length > 8 && (
                <div className="text-center pt-1">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#F7F5F1]/40">
                    {records.length - 8} további rekord · lásd a Szervíz fül alatt
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionPatchButton({ parked, onClick }: { parked: boolean; onClick: (e: any) => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.12em] transition-all active:scale-[0.97] whitespace-nowrap shrink-0"
      style={
        parked
          ? {
              background: "linear-gradient(135deg, #C9A962 0%, #d4bb7a 100%)",
              color: "#0B1A2A",
              boxShadow: "0 6px 16px -8px rgba(201,169,98,0.65)",
            }
          : {
              backgroundColor: "rgba(37,65,97,0.55)",
              border: "1px solid rgba(59,130,246,0.32)",
              color: "#93c5fd",
            }
      }
    >
      {parked ? (
        <span className="flex items-center gap-1">
          Úton <ArrowRight className="w-[11px] h-[11px]" strokeWidth={3} />
        </span>
      ) : (
        <span className="flex items-center gap-1">
          Park <Check className="w-[11px] h-[11px]" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function QuickAction({ icon: Icon, onClick, children, tone }: any) {
  const tones: Record<string, any> = {
    blue: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.22)", color: "#60a5fa" },
    amber: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.22)", color: "#fbbf24" },
    gold: { bg: "rgba(201,169,98,0.12)", border: "rgba(201,169,98,0.22)", color: "#C9A962" },
  };
  const t = tones[tone] ?? tones.gold;
  return (
    <button
      onClick={onClick}
      className="px-2 py-2.5 rounded-2xl border text-[10.5px] font-black uppercase tracking-[0.14em] flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]"
      style={{ backgroundColor: t.bg, borderColor: t.border, color: t.color }}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ borderColor: t.border, backgroundColor: "rgba(11,26,42,0.25)" }}>
        <Icon className="w-[17px] h-[17px]" strokeWidth={2.1} />
      </div>
      {children}
    </button>
  );
}

function InlineRecord({ record, onEdit, onDelete }: any) {
  const r = record as ServiceRecord;
  const TIcon = typeIconMap[r.type] ?? FileText;
  const days = r.nextCheckDate ? daysUntil(r.nextCheckDate) : null;
  const tone =
    days == null
      ? null
      : days <= 7
      ? "critical"
      : days <= 30
      ? "warn"
      : "ok";

  return (
    <div
      className="p-3 rounded-2xl border flex items-center gap-3 transition-all active:scale-[0.99]"
      style={{ backgroundColor: "rgba(15,35,56,0.55)", borderColor: "rgba(201,169,98,0.1)" }}
    >
      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border" style={{ backgroundColor: "rgba(201,169,98,0.1)", borderColor: "rgba(201,169,98,0.2)", color: "#C9A962" }}>
        <TIcon className="w-[17px] h-[17px]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C9A962]">
            {getServiceTypeLabel(r.type)}
          </span>
          {tone && (
            <span
              className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.1em]"
              style={
                tone === "critical"
                  ? { backgroundColor: "rgba(244,63,94,0.18)", color: "#fb7185" }
                  : tone === "warn"
                  ? { backgroundColor: "rgba(245,158,11,0.18)", color: "#fbbf24" }
                  : { backgroundColor: "rgba(16,185,129,0.16)", color: "#34d399" }
              }
            >
              {days! < 0 ? `le ${-days!} nap` : `k${days!} nap`}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[12.5px] font-bold text-[#F7F5F1] truncate leading-tight">
          {r.title}
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap text-[10.5px] text-[#F7F5F1]/55 font-semibold">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-[11px] h-[11px]" strokeWidth={2.3} />
            {formatDate(r.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="w-[11px] h-[11px]" strokeWidth={2.3} />
            {kmNumber(r.mileageKm)}
          </span>
          {r.costHUF != null && <span>{huf(r.costHUF)}</span>}
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#C9A962]/85 hover:text-[#C9A962] hover:bg-[#C9A962]/10 border border-[#C9A962]/10 transition-all active:scale-[0.95]"
          style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
        >
          <Pencil className="w-[13px] h-[13px]" strokeWidth={2.2} />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#fb7185]/90 hover:text-[#f43f5e] hover:bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.18)] transition-all active:scale-[0.95]"
          style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
        >
          <Trash2 className="w-[13px] h-[13px]" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}

function ServiceRow({ record, index, onEdit, onDelete }: any) {
  const r = record as ServiceRecord;
  const TIcon = typeIconMap[r.type] ?? FileText;
  const days = r.nextCheckDate ? daysUntil(r.nextCheckDate) : null;
  const tone =
    days == null
      ? null
      : days <= 7
      ? "critical"
      : days <= 30
      ? "warn"
      : "ok";

  return (
    <div
      className="relative overflow-hidden rounded-2xl transition-all duration-300 animate-slide-up card-glass active:scale-[0.995]"
      style={{ animationDelay: `${Math.min(index * 45, 280)}ms` }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          background:
            r.type === "olajcsere"
              ? "linear-gradient(180deg, #3b82f6, #1d4ed8)"
              : r.type === "gumicsere"
              ? "linear-gradient(180deg, #f59e0b, #d97706)"
              : r.type === "muszaki_vizsga"
              ? "linear-gradient(180deg, #10b981, #059669)"
              : "linear-gradient(180deg, #C9A962, #b8973f)",
          borderRadius: "2px 0 0 2px",
        }}
      />

      <div className="px-4 py-3.5 flex items-start gap-3.5" style={{ paddingLeft: "1.15rem" }}>
        <div
          className="relative w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center border"
          style={{
            backgroundColor:
              r.type === "olajcsere"
                ? "rgba(59,130,246,0.12)"
                : r.type === "gumicsere"
                ? "rgba(245,158,11,0.12)"
                : r.type === "muszaki_vizsga"
                ? "rgba(16,185,129,0.12)"
                : "rgba(201,169,98,0.1)",
            borderColor:
              r.type === "olajcsere"
                ? "rgba(59,130,246,0.25)"
                : r.type === "gumicsere"
                ? "rgba(245,158,11,0.25)"
                : r.type === "muszaki_vizsga"
                ? "rgba(16,185,129,0.25)"
                : "rgba(201,169,98,0.2)",
            color:
              r.type === "olajcsere"
                ? "#60a5fa"
                : r.type === "gumicsere"
                ? "#fbbf24"
                : r.type === "muszaki_vizsga"
                ? "#10b981"
                : "#C9A962",
          }}
        >
          <TIcon className="w-[20px] h-[20px]" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C9A962]">
              {getServiceTypeLabel(r.type)}
            </span>
            {tone && (
              <span
                className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.1em]"
                style={
                  tone === "critical"
                    ? { backgroundColor: "rgba(244,63,94,0.18)", color: "#fb7185" }
                    : tone === "warn"
                    ? { backgroundColor: "rgba(245,158,11,0.18)", color: "#fbbf24" }
                    : { backgroundColor: "rgba(16,185,129,0.16)", color: "#34d399" }
                }
              >
                {days! < 0 ? `Lejárt ${-days!} napja` : `${days!} nap múlva`}
              </span>
            )}
            {r.vehiclePlateNumber && (
              <span className="text-[10px] font-bold tracking-wide text-[#F7F5F1]/50 inline-flex items-center gap-1">
                <Hash className="w-[11px] h-[11px]" strokeWidth={2.5} />
                {r.vehiclePlateNumber}
              </span>
            )}
          </div>

          <h3 className="mt-1 text-[14.5px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] leading-tight tracking-tight truncate">
            {r.title}
          </h3>
          {r.vehicleName && (
            <div className="text-[11.5px] text-[#F7F5F1]/55 font-semibold truncate mt-0.5">
              {r.vehicleName}
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F7F5F1]/60">
              <Calendar className="w-[12px] h-[12px]" strokeWidth={2.2} />
              {formatDate(r.date)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F7F5F1]/60">
              <Gauge className="w-[12px] h-[12px]" strokeWidth={2.2} />
              {kmNumber(r.mileageKm)}
            </div>
            {r.costHUF != null && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#C9A962]/90">
                {huf(r.costHUF)}
              </div>
            )}
            {r.nextCheckDate && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F7F5F1]/60">
                <Clock className="w-[12px] h-[12px]" strokeWidth={2.2} />
                Következő: {formatDate(r.nextCheckDate)}
              </div>
            )}
          </div>

          {r.servicePartner && (
            <div className="mt-1.5 text-[10.5px] text-[#F7F5F1]/45 font-medium truncate">
              Partner: <span className="font-semibold text-[#F7F5F1]/65">{r.servicePartner}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#C9A962]/85 hover:text-[#C9A962] hover:bg-[#C9A962]/10 border border-[#C9A962]/10 transition-all active:scale-[0.95]"
            style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
          >
            <Pencil className="w-[15px] h-[15px]" strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#fb7185]/90 hover:text-[#f43f5e] hover:bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.18)] transition-all active:scale-[0.95]"
            style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
          >
            <Trash2 className="w-[15px] h-[15px]" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyStateService({ onAdd, tab }: { onAdd: () => void; tab: Tab }) {
  const text =
    tab === "oil"
      ? { title: "Még nincs olajcsere rekord", sub: "Kezdd az első rögzítéssel az alábbi gombbal", cta: "Olajcsere rögzítése", icon: Droplets }
      : tab === "tires"
      ? { title: "Még nincs gumicsere rekord", sub: "Kezdd az első rögzítéssel az alábbi gombbal", cta: "Gumicsere rögzítése", icon: CircleDot }
      : { title: "Még nincs szerviz rekord", sub: "Kezdd az első rögzítéssel az alábbi gombbal", cta: "Szerviz rögzítése", icon: Wrench };
  const Icon = text.icon;
  return (
    <div className="py-16 px-5 text-center card-glass rounded-3xl border-dashed">
      <div
        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 border"
        style={{
          backgroundColor: "rgba(201,169,98,0.1)",
          borderColor: "rgba(201,169,98,0.2)",
          color: "#C9A962",
        }}
      >
        <Icon className="w-7 h-7" strokeWidth={1.7} />
      </div>
      <h3 className="text-[17px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] mb-2">
        {text.title}
      </h3>
      <p className="text-[13px] font-medium text-[#F7F5F1]/50 mb-6">{text.sub}</p>
      <button
        onClick={onAdd}
        className="px-5 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.18em] flex items-center gap-2 mx-auto transition-all active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #C9A962 0%, #d4bb7a 100%)",
          color: "#0B1A2A",
          boxShadow: "0 10px 26px -8px rgba(201,169,98,0.55)",
        }}
      >
        <Plus className="w-[16px] h-[16px]" strokeWidth={2.4} />
        {text.cta}
      </button>
    </div>
  );
}

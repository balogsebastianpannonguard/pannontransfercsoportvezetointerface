"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, AlertTriangle, Bell, Calendar, Car, CarFront, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleDot, ClipboardCheck,
  Clock, Droplets, FileText, Gauge, Hash, Home, LogOut, Menu,
  Palette, Pencil, Plus, RefreshCw, Search, ShieldCheck, Sparkles,
  Trash2, TrendingUp, Truck, Users, Wrench, X, XCircle, MapPin,
  ArrowRight, BarChart3, Zap, Star, Coffee, Navigation, Route,
  CalendarCheck, CalendarX, Fuel, Timer, ChevronUp, Filter,
  Download, ThumbsUp, ThumbsDown, Eye,
} from "lucide-react";
import ServiceRecordModal from "./ServiceRecordModal";
import { getServiceTypeLabel } from "../../lib/serviceTypes";
import type { ServiceRecordType, ServiceRecordMeta } from "../../lib/serviceTypes";

type ServiceRecord = ServiceRecordMeta & { _id?: unknown };
type VehicleStatus = "parked" | "on_route";
type VehicleCondition = "working" | "debrecen_only" | "not_working";
type LeaveStatus = "pending" | "approved" | "rejected";
type LeaveType = "fizetett" | "betegseg" | "rendkivuli" | "egyeb";
type NavSection = "overview" | "vehicles" | "service" | "oil" | "tires" | "leaves" | "stats" | "alerts";
type DateFilter = "all" | "thisMonth" | "thisYear";

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

interface LeaveRequest {
  _id: string;
  driverName: string;
  driverEmail?: string;
  driverPhone?: string;
  vehicleName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
  createdAt: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  fizetett: "Fizetett szabadság",
  betegseg: "Betegszabadság",
  rendkivuli: "Rendkívüli szabadság",
  egyeb: "Egyéb",
};

const LEAVE_TYPE_COLORS: Record<LeaveType, { bg: string; text: string; border: string }> = {
  fizetett: { bg: "rgba(59,130,246,0.15)", text: "#93c5fd", border: "rgba(59,130,246,0.3)" },
  betegseg: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  rendkivuli: { bg: "rgba(244,63,94,0.15)", text: "#fb7185", border: "rgba(244,63,94,0.3)" },
  egyeb: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" },
};

const LEAVE_STATUS_META: Record<LeaveStatus, { label: string; bg: string; text: string; border: string; icon: any }> = {
  pending: { label: "Függőben", bg: "rgba(245,158,11,0.15)", text: "#fbbf24", border: "rgba(245,158,11,0.3)", icon: Clock },
  approved: { label: "Jóváhagyva", bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.3)", icon: CheckCircle2 },
  rejected: { label: "Elutasítva", bg: "rgba(244,63,94,0.15)", text: "#fb7185", border: "rgba(244,63,94,0.3)", icon: XCircle },
};

const CONDITION_META: Record<VehicleCondition, { label: string; textColor: string; bg: string; border: string; dot: string }> = {
  working: { label: "Működik", textColor: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", dot: "#10b981" },
  debrecen_only: { label: "Csak Debrecen", textColor: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", dot: "#f59e0b" },
  not_working: { label: "Nem működik", textColor: "#f43f5e", bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.25)", dot: "#f43f5e" },
};

const SERVICE_TYPE_ICONS: Record<ServiceRecordType, any> = {
  olajcsere: Droplets,
  gumicsere: CircleDot,
  muszaki_vizsga: ClipboardCheck,
  szerviz_altalanos: Wrench,
  fekbetisztitas: ShieldCheck,
  futomu_frissites: Sparkles,
  tomegkozlekedesi_engedely: FileText,
  egyeb: FileText,
};

const SERVICE_TYPE_COLORS: Record<ServiceRecordType, string> = {
  olajcsere: "#f59e0b",
  gumicsere: "#3b82f6",
  muszaki_vizsga: "#10b981",
  szerviz_altalanos: "#8b5cf6",
  fekbetisztitas: "#06b6d4",
  futomu_frissites: "#f97316",
  tomegkozlekedesi_engedely: "#ec4899",
  egyeb: "#94a3b8",
};

const NAV_ITEMS: { id: NavSection; label: string; icon: any; badge?: string }[] = [
  { id: "overview", label: "Áttekintés", icon: Home },
  { id: "vehicles", label: "Járműpark", icon: Truck },
  { id: "service", label: "Szerviznapló", icon: Wrench },
  { id: "oil", label: "Olajcserék", icon: Droplets },
  { id: "tires", label: "Gumikezelés", icon: CircleDot },
  { id: "leaves", label: "Szabadságok", icon: Calendar },
  { id: "stats", label: "Statisztikák", icon: BarChart3 },
  { id: "alerts", label: "Figyelmeztetések", icon: Bell },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("-");
    return `${y}. ${Number(m)}. ${Number(day)}.`;
  } catch { return d; }
}

function daysUntil(date?: string): number | null {
  if (!date) return null;
  const target = new Date(date + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function kmFmt(v?: number) {
  if (v == null || isNaN(v)) return "—";
  return new Intl.NumberFormat("hu-HU").format(v) + " km";
}

function hufFmt(v?: number) {
  if (v == null || isNaN(v)) return null;
  return new Intl.NumberFormat("hu-HU").format(v) + " Ft";
}

function getGreeting(name: string) {
  const h = new Date().getHours();
  const firstName = name.split(" ")[0];
  if (h < 11) return `Jó reggelt, ${firstName}!`;
  if (h < 18) return `Szép napot, ${firstName}!`;
  return `Jó estét, ${firstName}!`;
}

function getMotivation() {
  const msgs = [
    "Ma is minden rendben fog menni. 💪",
    "A flotta kezekben van! 🚗",
    "Hatékony napot! ⚡",
    "Minden szerviznapló naprakész? 📋",
    "Biztonságos utakat kíván a Pannon Transfer! 🛡️",
  ];
  return msgs[new Date().getDate() % msgs.length];
}

function urgencyBadge(days: number | null) {
  if (days == null) return null;
  if (days < 0) return { label: `${-days} napja lejárt`, color: "#fb7185", bg: "rgba(244,63,94,0.18)" };
  if (days === 0) return { label: "MA esedékes!", color: "#fb7185", bg: "rgba(244,63,94,0.18)" };
  if (days <= 7) return { label: `${days} nap múlva`, color: "#fbbf24", bg: "rgba(245,158,11,0.18)" };
  if (days <= 30) return { label: `${days} nap múlva`, color: "#34d399", bg: "rgba(16,185,129,0.12)" };
  return null;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GroupLeaderDashboardClient() {
  const router = useRouter();

  // Core state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Navigation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<NavSection>("overview");

  // Welcome Story
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomePhase, setWelcomePhase] = useState<"in" | "show" | "out">("in");

  // Search & filters
  const [search, setSearch] = useState("");
  const [vehicleCondFilter, setVehicleCondFilter] = useState<"all" | VehicleCondition>("all");
  const [leaveFilter, setLeaveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [serviceVehicleFilter, setServiceVehicleFilter] = useState<string>("all");
  const [serviceDateFilter, setServiceDateFilter] = useState<DateFilter>("all");

  // Vehicle expansion
  const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalVehicleId, setModalVehicleId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"main" | "oil" | "tire">("main");
  const [modalEditing, setModalEditing] = useState<ServiceRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Leave review modal
  const [reviewLeave, setReviewLeave] = useState<LeaveRequest | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  // Quick leave decision (inline, no modal)
  const [quickDecideId, setQuickDecideId] = useState<string | null>(null);
  const [quickNote, setQuickNote] = useState("");

  // Toast
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = useCallback((ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Welcome Story ──────────────────────────────────────────────────────────

  useEffect(() => {
    const key = "pannon_welcome_shown_" + new Date().toDateString();
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setShowWelcome(true);
      setWelcomePhase("in");
      setTimeout(() => setWelcomePhase("show"), 100);
      setTimeout(() => setWelcomePhase("out"), 2200);
      setTimeout(() => setShowWelcome(false), 2700);
    }
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [vRes, rRes, lRes, sRes] = await Promise.all([
        fetch("/api/vehicles", { cache: "no-store" }),
        fetch("/api/service-records", { cache: "no-store" }),
        fetch("/api/leave-requests", { cache: "no-store" }),
        fetch("/api/auth/session", { cache: "no-store" }),
      ]);
      const vData = await vRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      const lData = await lRes.json().catch(() => ({}));
      const sData = await sRes.json().catch(() => ({}));

      if (Array.isArray(vData?.vehicles)) setVehicles(vData.vehicles);
      if (Array.isArray(rData?.records)) setRecords(rData.records);
      if (Array.isArray(lData?.requests)) setLeaves(lData.requests);
      if (sData?.authenticated && sData?.user) setUser(sData.user);
    } catch {
      if (!silent) showToast(false, "Hiba a betöltésnél");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const t = setInterval(() => { void fetchAll(true); }, 60000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchAll(true);
    setRefreshing(false);
    showToast(true, "Adatok frissítve");
  };

  const handleLogout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    router.push("/login");
  };

  // ── Vehicle actions ────────────────────────────────────────────────────────

  const patchVehicle = async (id: string, patch: Partial<Vehicle>) => {
    const res = await fetch("/api/vehicles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) {
      setVehicles((prev) => prev.map((v) => (v._id === id ? { ...v, ...patch, updatedAt: Date.now() } : v)));
      showToast(true, patch.status === "on_route" ? "Útra küldve" : "Parkoltba helyezve");
      return true;
    }
    showToast(false, "Mentési hiba");
    return false;
  };

  // ── Service record actions ─────────────────────────────────────────────────

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
    const editingId = payload.id;
    delete payload.id;
    let res;
    if (editingId) {
      const url = new URL("/api/service-records", window.location.origin);
      url.searchParams.set("id", editingId);
      res = await fetch(url.toString(), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      res = await fetch("/api/service-records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    if (res.ok) {
      showToast(true, editingId ? "Módosítva" : "Rögzítve");
      await fetchAll(true);
      return true;
    }
    const j = await res.json().catch(() => ({}));
    showToast(false, j?.error ?? "Mentési hiba");
    return false;
  };

  const deleteRecord = async (id: string) => {
    const url = new URL("/api/service-records", window.location.origin);
    url.searchParams.set("id", id);
    const res = await fetch(url.toString(), { method: "DELETE" });
    if (res.ok) {
      showToast(true, "Törölve");
      setRecords((prev) => prev.filter((r) => String(r._id) !== id));
      setDeletingRecordId(null);
      return true;
    }
    showToast(false, "Törlési hiba");
    setDeletingRecordId(null);
    return false;
  };

  // ── Leave actions ──────────────────────────────────────────────────────────

  const handleLeaveReview = async (leaveId: string, status: "approved" | "rejected") => {
    setReviewSubmitting(true);
    const url = new URL("/api/leave-requests", window.location.origin);
    url.searchParams.set("id", leaveId);
    const res = await fetch(url.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    if (res.ok) {
      showToast(true, status === "approved" ? "Szabadság jóváhagyva ✓" : "Szabadság elutasítva");
      setLeaves((prev) => prev.map((l) => l._id === leaveId ? { ...l, status, reviewNote } : l));
      setReviewLeave(null);
      setReviewNote("");
    } else {
      showToast(false, "Hiba a feldolgozás során");
    }
    setReviewSubmitting(false);
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const recordsByVehicle = useMemo(() => {
    const map = new Map<string, ServiceRecord[]>();
    for (const r of records) {
      const key = String(r.vehicleId);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return map;
  }, [records]);

  const vehicleCards = useMemo(() => {
    return vehicles.map((vehicle) => {
      const vRecords = recordsByVehicle.get(vehicle._id) ?? [];
      const sorted = [...vRecords].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      const upcoming = sorted.reduce<{ record: ServiceRecord; days: number } | null>((best, r) => {
        const d = daysUntil(r.nextCheckDate);
        if (d == null || d > 60) return best;
        if (!best || d < best.days) return { record: r, days: d };
        return best;
      }, null);
      const lastRecord = sorted[0] ?? null;
      return { vehicle, records: vRecords, upcoming, lastRecord };
    });
  }, [vehicles, recordsByVehicle]);

  const stats = useMemo(() => ({
    total: vehicles.length,
    onRoute: vehicles.filter((v) => v.status === "on_route").length,
    working: vehicles.filter((v) => v.condition === "working").length,
    broken: vehicles.filter((v) => v.condition === "not_working").length,
    parked: vehicles.filter((v) => v.status === "parked").length,
  }), [vehicles]);

  const serviceStats = useMemo(() => {
    const overdue = records.filter((r) => { const d = daysUntil(r.nextCheckDate); return d != null && d < 0; }).length;
    const dueSoon = records.filter((r) => { const d = daysUntil(r.nextCheckDate); return d != null && d >= 0 && d <= 14; }).length;
    const oilCount = records.filter((r) => r.type === "olajcsere").length;
    const tireCount = records.filter((r) => r.type === "gumicsere").length;
    const totalCost = records.reduce((s, r) => s + (typeof r.costHUF === "number" ? r.costHUF : 0), 0);
    return { total: records.length, overdue, dueSoon, oilCount, tireCount, totalCost };
  }, [records]);

  const pendingLeaves = useMemo(() => leaves.filter((l) => l.status === "pending").length, [leaves]);

  const filteredLeaves = useMemo(() => {
    let list = [...leaves];
    if (leaveFilter !== "all") list = list.filter((l) => l.status === leaveFilter);
    if (search) list = list.filter((l) => [l.driverName, l.reason, LEAVE_TYPE_LABELS[l.type]].join(" ").toLowerCase().includes(search.toLowerCase()));
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [leaves, leaveFilter, search]);

  const filteredVehicleCards = useMemo(() => {
    const q = search.toLowerCase();
    return vehicleCards.filter(({ vehicle }) => {
      if (vehicleCondFilter !== "all" && vehicle.condition !== vehicleCondFilter) return false;
      if (!q) return true;
      return [vehicle.name, vehicle.type, vehicle.plates, vehicle.color, vehicle.note].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [vehicleCards, vehicleCondFilter, search]);

  const filteredServiceRecords = useMemo(() => {
    const q = search.toLowerCase();
    let list = [...records];
    if (activeSection === "oil") list = list.filter((r) => r.type === "olajcsere");
    if (activeSection === "tires") list = list.filter((r) => r.type === "gumicsere");
    if (q) list = list.filter((r) => [r.title, r.vehicleName, r.vehiclePlateNumber, r.notes, r.servicePartner].filter(Boolean).join(" ").toLowerCase().includes(q));
    return list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [records, activeSection, search]);

  // ── New derived data ──────────────────────────────────────────────────────

  // Today's service records (nextCheckDate == today)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysServices = useMemo(() =>
    records.filter((r) => r.nextCheckDate === todayStr),
  [records, todayStr]);

  // This week's approved/pending leaves
  const thisWeekLeaves = useMemo(() => {
    const mon = new Date();
    mon.setHours(0,0,0,0);
    mon.setDate(mon.getDate() - mon.getDay() + 1);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return leaves.filter((l) => {
      if (l.status === 'rejected') return false;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      return start <= sun && end >= mon;
    });
  }, [leaves]);

  // Monthly service trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: { label: string; count: number; cost: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('hu-HU', { month: 'short' });
      const monthRecs = records.filter((r) => (r.date ?? '').startsWith(ym));
      months.push({ label, count: monthRecs.length, cost: monthRecs.reduce((s, r) => s + (typeof r.costHUF === 'number' ? r.costHUF : 0), 0) });
    }
    return months;
  }, [records]);

  // Per-vehicle service count for stats
  const perVehicleStats = useMemo(() => {
    return vehicles.map((v) => ({
      name: v.name,
      plates: v.plates,
      count: records.filter((r) => String(r.vehicleId) === v._id).length,
      cost: records.filter((r) => String(r.vehicleId) === v._id).reduce((s, r) => s + (typeof r.costHUF === 'number' ? r.costHUF : 0), 0),
    })).sort((a, b) => b.count - a.count);
  }, [vehicles, records]);

  // Filtered service records with vehicle + date filter
  const filteredServiceRecordsEnhanced = useMemo(() => {
    const q = search.toLowerCase();
    let list = [...records];
    if (activeSection === 'oil') list = list.filter((r) => r.type === 'olajcsere');
    if (activeSection === 'tires') list = list.filter((r) => r.type === 'gumicsere');
    if (serviceVehicleFilter !== 'all') list = list.filter((r) => String(r.vehicleId) === serviceVehicleFilter);
    if (serviceDateFilter === 'thisMonth') {
      const ym = new Date().toISOString().slice(0, 7);
      list = list.filter((r) => (r.date ?? '').startsWith(ym));
    } else if (serviceDateFilter === 'thisYear') {
      const y = new Date().toISOString().slice(0, 4);
      list = list.filter((r) => (r.date ?? '').startsWith(y));
    }
    if (q) list = list.filter((r) => [r.title, r.vehicleName, r.vehiclePlateNumber, r.notes, r.servicePartner].filter(Boolean).join(' ').toLowerCase().includes(q));
    return list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [records, activeSection, serviceVehicleFilter, serviceDateFilter, search]);

  const alertItems = useMemo(() => {
    const items: { label: string; detail: string; tone: "critical" | "warn" | "info"; vehicleName?: string; days?: number }[] = [];
    for (const { vehicle, upcoming, records: vRecs } of vehicleCards) {
      if (vehicle.condition === "not_working") {
        items.push({ label: vehicle.name, detail: "Jármű nem működik — azonnali figyelem szükséges!", tone: "critical", vehicleName: vehicle.name });
      }
      if (upcoming) {
        const d = upcoming.days;
        if (d < 0) items.push({ label: vehicle.name, detail: `${getServiceTypeLabel(upcoming.record.type as ServiceRecordType)}: ${-d} napja lejárt`, tone: "critical", vehicleName: vehicle.name, days: d });
        else if (d <= 7) items.push({ label: vehicle.name, detail: `${getServiceTypeLabel(upcoming.record.type as ServiceRecordType)}: ${d} nap múlva esedékes`, tone: "warn", vehicleName: vehicle.name, days: d });
        else if (d <= 30) items.push({ label: vehicle.name, detail: `${getServiceTypeLabel(upcoming.record.type as ServiceRecordType)}: ${d} nap múlva esedékes`, tone: "info", vehicleName: vehicle.name, days: d });
      }
      if (vRecs.length === 0) {
        items.push({ label: vehicle.name, detail: "Nincs szerviznapló rögzítve ehhez a járműhöz", tone: "info", vehicleName: vehicle.name });
      }
    }
    if (pendingLeaves > 0) {
      items.push({ label: `${pendingLeaves} szabadságkérelem`, detail: "Döntésre vár — tekintsd meg a Szabadságok szekciót", tone: "warn" });
    }
    return items.sort((a, b) => (a.tone === "critical" ? -1 : b.tone === "critical" ? 1 : a.tone === "warn" ? -1 : 1));
  }, [vehicleCards, pendingLeaves]);

  // ── Navigate helper ────────────────────────────────────────────────────────
  const navigate = (section: NavSection) => {
    setActiveSection(section);
    setSidebarOpen(false);
    setSearch("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const displayName = user?.name || "Gábor";

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1A2A" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-[#C9A962]/30 border-t-[#C9A962] rounded-full animate-spin" />
          <p className="text-[#C9A962]/70 text-sm tracking-widest uppercase">Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] text-[#F7F5F1] relative overflow-x-hidden">
      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 ambient-grid opacity-40" />
        <div className="absolute inset-0 ambient-scan opacity-20" />
        <div className="absolute top-[-5%] right-[-10%] w-[380px] h-[380px] bg-[#C9A962]/[0.06] blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-15%] w-[400px] h-[400px] bg-[#1e3a8a]/[0.25] blur-[130px] rounded-full" />
        <div className="absolute top-[45%] right-[5%] w-[200px] h-[200px] bg-[#C9A962]/[0.04] blur-[80px] rounded-full animate-pulse-glow" />
      </div>

      {/* ── Welcome Story ── */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{
            background: "rgba(11,26,42,0.97)",
            backdropFilter: "blur(20px)",
            opacity: welcomePhase === "in" ? 0 : welcomePhase === "show" ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        >
          <div className="flex flex-col items-center gap-6 text-center px-8" style={{ animation: welcomePhase === "show" ? "slide-up 0.6s cubic-bezier(0.16,1,0.3,1) both" : undefined }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #C9A962, #d4bb7a)" }}>
              <span className="text-3xl font-bold text-[#0B1A2A]">P</span>
            </div>
            <div>
              <p className="text-[#C9A962]/70 text-xs tracking-[4px] uppercase mb-2">Pannon Transfer · Csoportvezető</p>
              <h1 className="text-3xl font-bold text-[#F7F5F1] mb-1">{getGreeting(displayName)}</h1>
              <p className="text-[#C9A962]/80 text-base mt-2">{getMotivation()}</p>
            </div>
            <div className="flex gap-6 mt-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#C9A962]">{stats.total}</p>
                <p className="text-xs text-[#F7F5F1]/50 mt-0.5">Jármű</p>
              </div>
              <div className="w-px bg-[#C9A962]/20" />
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: pendingLeaves > 0 ? "#fbbf24" : "#34d399" }}>{pendingLeaves}</p>
                <p className="text-xs text-[#F7F5F1]/50 mt-0.5">Kérelem</p>
              </div>
              <div className="w-px bg-[#C9A962]/20" />
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: serviceStats.overdue > 0 ? "#fb7185" : "#34d399" }}>{serviceStats.overdue}</p>
                <p className="text-xs text-[#F7F5F1]/50 mt-0.5">Lejárt</p>
              </div>
            </div>
            <div className="flex gap-1 mt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1 rounded-full" style={{ width: i === 0 ? 24 : 8, background: i === 0 ? "#C9A962" : "rgba(201,169,98,0.3)", transition: "all 0.3s" }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col"
        style={{
          width: 280,
          background: "linear-gradient(180deg, #0d1f32 0%, #0B1A2A 100%)",
          borderRight: "1px solid rgba(201,169,98,0.15)",
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: sidebarOpen ? "4px 0 40px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(201,169,98,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#C9A962,#b8973f)" }}>
              <span className="text-base font-bold text-[#0B1A2A]">P</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#C9A962] tracking-widest uppercase">Pannon Transfer</p>
              <p className="text-[10px] text-[#F7F5F1]/40 mt-0.5">Csoportvezető</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,169,98,0.08)" }}>
            <X size={16} className="text-[#C9A962]" />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(201,169,98,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "rgba(201,169,98,0.15)", color: "#C9A962" }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F7F5F1]">{displayName}</p>
              <p className="text-xs text-[#F7F5F1]/40">{user?.email || "csoportvezető"}</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const badge = item.id === "leaves" && pendingLeaves > 0 ? pendingLeaves :
                         item.id === "alerts" && alertItems.filter(a => a.tone === "critical").length > 0 ? alertItems.filter(a => a.tone === "critical").length : null;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-left transition-all duration-150"
                style={{
                  background: isActive ? "rgba(201,169,98,0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(201,169,98,0.25)" : "1px solid transparent",
                }}
              >
                <item.icon size={18} style={{ color: isActive ? "#C9A962" : "rgba(247,245,241,0.45)" }} />
                <span className="text-sm flex-1" style={{ color: isActive ? "#C9A962" : "rgba(247,245,241,0.7)", fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </span>
                {badge && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(244,63,94,0.2)", color: "#fb7185" }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t" style={{ borderColor: "rgba(201,169,98,0.12)" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: "rgba(244,63,94,0.08)", color: "#fb7185", border: "1px solid rgba(244,63,94,0.15)" }}
          >
            <LogOut size={16} />
            <span>Kijelentkezés</span>
          </button>
        </div>
      </aside>

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30" style={{ background: "rgba(11,26,42,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(201,169,98,0.12)" }}>
        <div className="flex items-center gap-3 px-4 py-3 max-w-7xl mx-auto">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(201,169,98,0.1)", border: "1px solid rgba(201,169,98,0.2)" }}
          >
            <Menu size={18} className="text-[#C9A962]" />
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div>
              <p className="text-xs text-[#C9A962]/60 tracking-widest uppercase hidden sm:block">Pannon Transfer</p>
              <h1 className="text-sm font-semibold text-[#F7F5F1] truncate">
                {NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? "Csoportvezető"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingLeaves > 0 && (
              <button onClick={() => navigate("leaves")} className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <Bell size={16} className="text-[#fbbf24]" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: "#f59e0b", color: "#0B1A2A" }}>{pendingLeaves}</span>
              </button>
            )}
            <button onClick={handleRefresh} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,169,98,0.08)", border: "1px solid rgba(201,169,98,0.15)" }}>
              <RefreshCw size={16} className={`text-[#C9A962]/70 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search bar (contextual) */}
        {["vehicles", "service", "oil", "tires", "leaves"].includes(activeSection) && (
          <div className="px-4 pb-3 max-w-7xl mx-auto">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9A962]/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés..."
                className="w-full bg-transparent pl-9 pr-4 py-2 text-sm text-[#F7F5F1] placeholder-[#F7F5F1]/30 rounded-xl outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,98,0.12)" }}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-[#F7F5F1]/30" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-16">

        {/* ════ OVERVIEW ════ */}
        {activeSection === "overview" && (
          <div className="animate-slide-up space-y-5">

            {/* ── CRITICAL BANNER ── */}
            {(serviceStats.overdue > 0 || stats.broken > 0) && (
              <div
                className="urgent-pulse rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(244,63,94,0.13)', border: '1.5px solid rgba(244,63,94,0.35)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(244,63,94,0.2)' }}>
                  <AlertTriangle size={18} style={{ color: '#fb7185' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#fb7185]">Azonnali figyelmet igényel!</p>
                  <p className="text-xs text-[#F7F5F1]/60 mt-0.5">
                    {serviceStats.overdue > 0 && `${serviceStats.overdue} lejárt szerviz`}
                    {serviceStats.overdue > 0 && stats.broken > 0 && ' · '}
                    {stats.broken > 0 && `${stats.broken} hibás jármű`}
                  </p>
                </div>
                <button onClick={() => navigate('alerts')} className="text-xs px-3 py-1.5 rounded-lg font-bold" style={{ background: 'rgba(244,63,94,0.2)', color: '#fb7185' }}>
                  Részletek →
                </button>
              </div>
            )}

            {/* ── LIVE CLOCK + GREETING ── */}
            <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(201,169,98,0.12) 0%, rgba(11,26,42,0.8) 100%)", border: "1px solid rgba(201,169,98,0.2)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-[#C9A962]/60 tracking-widest uppercase mb-1">
                    {now.toLocaleDateString("hu-HU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <h2 className="text-xl font-bold text-[#F7F5F1]">{getGreeting(displayName)}</h2>
                  <p className="text-sm text-[#F7F5F1]/50 mt-1">{getMotivation()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <span className="live-dot" />
                    <span className="text-[10px] text-[#10b981] font-bold tracking-widest uppercase">Élő</span>
                  </div>
                  <p className="text-3xl font-black text-[#C9A962] tabular-nums" style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                    {now.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            {/* ── QUICK STATS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Összes jármű", value: stats.total, icon: Truck, color: "#C9A962", sub: `${stats.onRoute} úton · ${stats.parked} parkol`, onClick: () => navigate('vehicles') },
                { label: "Működőképes", value: stats.working, icon: ShieldCheck, color: "#10b981", sub: `${stats.broken} meghibásodott`, onClick: () => navigate('vehicles') },
                { label: "Lejárt szerviz", value: serviceStats.overdue, icon: AlertTriangle, color: serviceStats.overdue > 0 ? "#fb7185" : "#34d399", sub: `${serviceStats.dueSoon} hamarosan`, onClick: () => navigate('alerts') },
                { label: "Kérelem", value: pendingLeaves, icon: Calendar, color: pendingLeaves > 0 ? "#fbbf24" : "#34d399", sub: "Döntésre vár", onClick: () => navigate('leaves') },
              ].map((s) => (
                <button key={s.label} onClick={s.onClick} className="rounded-xl p-4 card-glass qa-card text-left">
                  <div className="flex items-center justify-between mb-3">
                    <s.icon size={18} style={{ color: s.color }} />
                    <span className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                  <p className="text-xs font-semibold text-[#F7F5F1]/80">{s.label}</p>
                  <p className="text-xs text-[#F7F5F1]/35 mt-0.5">{s.sub}</p>
                </button>
              ))}
            </div>

            {/* ── FLEET LIVE STATUS ── */}
            <div className="rounded-2xl card-glass overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(201,169,98,0.1)' }}>
                <div className="flex items-center gap-2">
                  <Route size={15} className="text-[#C9A962]" />
                  <h3 className="text-sm font-bold text-[#F7F5F1]">Flotta – Élő állapot</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="live-dot" />
                  <span className="text-[10px] text-[#10b981] font-bold tracking-widest uppercase">Live</span>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'rgba(201,169,98,0.1)' }}>
                {/* On route */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation size={13} style={{ color: '#93c5fd' }} />
                    <p className="text-xs font-bold text-[#93c5fd] tracking-widest uppercase">Úton ({stats.onRoute})</p>
                  </div>
                  <div className="space-y-2">
                    {vehicles.filter((v) => v.status === 'on_route').length === 0 && (
                      <p className="text-xs text-[#F7F5F1]/30">Nincs úton lévő jármű</p>
                    )}
                    {vehicles.filter((v) => v.status === 'on_route').map((v) => (
                      <div key={v._id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#F7F5F1] truncate">{v.name}</p>
                          {v.plates && <p className="text-[10px] text-[#F7F5F1]/35">{v.plates}</p>}
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: CONDITION_META[v.condition].bg, color: CONDITION_META[v.condition].textColor }}>
                          {CONDITION_META[v.condition].label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Parked */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CarFront size={13} style={{ color: '#94a3b8' }} />
                    <p className="text-xs font-bold text-[#94a3b8] tracking-widest uppercase">Parkol ({stats.parked})</p>
                  </div>
                  <div className="space-y-2">
                    {vehicles.filter((v) => v.status === 'parked').length === 0 && (
                      <p className="text-xs text-[#F7F5F1]/30">Nincs parkolt jármű</p>
                    )}
                    {vehicles.filter((v) => v.status === 'parked').slice(0, 5).map((v) => (
                      <div key={v._id} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#F7F5F1]/70 truncate">{v.name}</p>
                          {v.plates && <p className="text-[10px] text-[#F7F5F1]/30">{v.plates}</p>}
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: CONDITION_META[v.condition].bg, color: CONDITION_META[v.condition].textColor }}>
                          {CONDITION_META[v.condition].label}
                        </span>
                      </div>
                    ))}
                    {vehicles.filter((v) => v.status === 'parked').length > 5 && (
                      <p className="text-[10px] text-[#F7F5F1]/30">+{vehicles.filter((v) => v.status === 'parked').length - 5} további</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── TODAY'S SERVICES + WEEKLY LEAVES ROW ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Today's services */}
              <div className="rounded-2xl card-glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Timer size={14} className="text-[#C9A962]" />
                  <h3 className="text-xs font-bold text-[#F7F5F1]/80 uppercase tracking-widest">Ma esedékes</h3>
                  {todaysServices.length > 0 && (
                    <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                      {todaysServices.length}
                    </span>
                  )}
                </div>
                {todaysServices.length === 0 ? (
                  <div className="flex items-center gap-2 py-2">
                    <CheckCircle2 size={14} className="text-[#10b981]" />
                    <p className="text-xs text-[#F7F5F1]/40">Ma nincs esedékes szerviz</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todaysServices.slice(0, 3).map((r, i) => {
                      const Icon = SERVICE_TYPE_ICONS[r.type as ServiceRecordType] ?? FileText;
                      const color = SERVICE_TYPE_COLORS[r.type as ServiceRecordType] ?? '#94a3b8';
                      return (
                        <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                          <Icon size={13} style={{ color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#F7F5F1] truncate">{r.vehicleName ?? '—'}</p>
                            <p className="text-[10px] text-[#F7F5F1]/40 truncate">{getServiceTypeLabel(r.type as ServiceRecordType)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* This week's leaves */}
              <div className="rounded-2xl card-glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarCheck size={14} className="text-[#8b5cf6]" />
                  <h3 className="text-xs font-bold text-[#F7F5F1]/80 uppercase tracking-widest">Ezen a héten szabi</h3>
                  {thisWeekLeaves.length > 0 && (
                    <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
                      {thisWeekLeaves.length}
                    </span>
                  )}
                </div>
                {thisWeekLeaves.length === 0 ? (
                  <div className="flex items-center gap-2 py-2">
                    <CheckCircle2 size={14} className="text-[#10b981]" />
                    <p className="text-xs text-[#F7F5F1]/40">Ezen a héten mindenki dolgozik</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {thisWeekLeaves.slice(0, 3).map((l, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg p-2" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa' }}>
                          {l.driverName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#F7F5F1] truncate">{l.driverName}</p>
                          <p className="text-[10px] text-[#F7F5F1]/40">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: LEAVE_STATUS_META[l.status].bg, color: LEAVE_STATUS_META[l.status].text }}>
                          {l.days}n
                        </span>
                      </div>
                    ))}
                    {thisWeekLeaves.length > 3 && (
                      <button onClick={() => navigate('leaves')} className="text-[10px] text-[#a78bfa]/70 pt-1">+{thisWeekLeaves.length - 3} további →</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── QUICK ACTIONS ── */}
            <div>
              <h3 className="text-xs font-bold text-[#F7F5F1]/50 uppercase tracking-widest mb-3">Gyors műveletek</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Járműpark", icon: Truck, section: "vehicles" as NavSection, color: "#C9A962" },
                  { label: "Olajcsere", icon: Droplets, section: "oil" as NavSection, color: "#f59e0b" },
                  { label: "Gumikezelés", icon: CircleDot, section: "tires" as NavSection, color: "#3b82f6" },
                  { label: "Szabadságok", icon: Calendar, section: "leaves" as NavSection, color: pendingLeaves > 0 ? "#fbbf24" : "#8b5cf6" },
                ].map((qa) => (
                  <button
                    key={qa.section}
                    onClick={() => navigate(qa.section)}
                    className="rounded-xl p-4 flex flex-col items-center gap-2 text-center card-glass qa-card"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${qa.color}18` }}>
                      <qa.icon size={20} style={{ color: qa.color }} />
                    </div>
                    <span className="text-xs font-semibold text-[#F7F5F1]/70">{qa.label}</span>
                    {qa.section === "leaves" && pendingLeaves > 0 && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}>{pendingLeaves} db</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── RECENT SERVICES ── */}
            {records.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[#F7F5F1]/50 uppercase tracking-widest">Legutóbbi szervizek</h3>
                  <button onClick={() => navigate("service")} className="text-xs text-[#C9A962]/70 flex items-center gap-1">Összes <ChevronRight size={12} /></button>
                </div>
                <div className="space-y-2">
                  {[...records].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 4).map((r, i) => {
                    const Icon = SERVICE_TYPE_ICONS[r.type as ServiceRecordType] ?? FileText;
                    const color = SERVICE_TYPE_COLORS[r.type as ServiceRecordType] ?? "#94a3b8";
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl p-3 card-glass">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                          <Icon size={15} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#F7F5F1] truncate">{r.title}</p>
                          <p className="text-xs text-[#F7F5F1]/40 truncate">{r.vehicleName ?? "—"} · {fmtDate(r.date)}</p>
                        </div>
                        {r.costHUF ? <p className="text-xs text-[#C9A962] flex-shrink-0">{hufFmt(r.costHUF)}</p> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ VEHICLES ════ */}
        {activeSection === "vehicles" && (
          <div className="animate-slide-up space-y-4">
            {/* Filter row */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "working", "debrecen_only", "not_working"] as const).map((f) => (
                <button key={f} onClick={() => setVehicleCondFilter(f)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: vehicleCondFilter === f ? "rgba(201,169,98,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${vehicleCondFilter === f ? "rgba(201,169,98,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: vehicleCondFilter === f ? "#C9A962" : "rgba(247,245,241,0.5)",
                  }}>
                  {f === "all" ? "Mind" : CONDITION_META[f as VehicleCondition].label}
                </button>
              ))}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Összes", value: stats.total, color: "#C9A962" },
                { label: "Úton", value: stats.onRoute, color: "#3b82f6" },
                { label: "Hibás", value: stats.broken, color: stats.broken > 0 ? "#fb7185" : "#34d399" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 card-glass text-center">
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-[#F7F5F1]/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Vehicle list */}
            <div className="space-y-3">
              {filteredVehicleCards.length === 0 && (
                <div className="text-center py-12 text-[#F7F5F1]/30">
                  <Truck size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nem található jármű</p>
                </div>
              )}
              {filteredVehicleCards.map(({ vehicle, records: vRecs, upcoming, lastRecord }) => {
                const cond = CONDITION_META[vehicle.condition];
                const expanded = expandedVehicleId === vehicle._id;
                const ub = urgencyBadge(upcoming?.days ?? null);

                return (
                  <div key={vehicle._id} className="rounded-2xl overflow-hidden card-glass" style={{ border: vehicle.condition === "not_working" ? "1.5px solid rgba(244,63,94,0.4)" : vehicle.condition === "debrecen_only" ? "1.5px solid rgba(245,158,11,0.3)" : undefined }}>
                    {/* Card header */}
                    <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setExpandedVehicleId(expanded ? null : vehicle._id)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${cond.textColor}15` }}>
                        <CarFront size={20} style={{ color: cond.textColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-[#F7F5F1]">{vehicle.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: cond.bg, color: cond.textColor, border: `1px solid ${cond.border}` }}>{cond.label}</span>
                          {vehicle.status === "on_route" && <span className="text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1" style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}><span className="live-dot" style={{ width: 5, height: 5 }} />Úton</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {vehicle.plates && <span className="text-xs text-[#F7F5F1]/40 font-mono">{vehicle.plates}</span>}
                          {vehicle.type && <span className="text-xs text-[#F7F5F1]/30">{vehicle.type}</span>}
                          {vehicle.seats && <span className="text-xs text-[#F7F5F1]/25">{vehicle.seats} fő</span>}
                          {ub && <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${ub.color === '#fb7185' ? 'urgent-pulse' : ''}`} style={{ background: ub.bg, color: ub.color }}>{ub.label}</span>}
                        </div>
                      </div>
                      <ChevronDown size={16} className="text-[#F7F5F1]/30 flex-shrink-0 mt-1 transition-transform duration-200" style={{ transform: expanded ? "rotate(180deg)" : undefined }} />
                    </button>

                    {/* Expanded content */}
                    {expanded && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: "rgba(201,169,98,0.1)" }}>

                        {/* ── CONDITION TOGGLE (big visual buttons) ── */}
                        <div>
                          <p className="text-[10px] text-[#F7F5F1]/40 uppercase tracking-widest mb-2">Jármű állapota</p>
                          <div className="grid grid-cols-3 gap-2">
                            {(['working', 'debrecen_only', 'not_working'] as VehicleCondition[]).map((cnd) => {
                              const meta = CONDITION_META[cnd];
                              const isActive = vehicle.condition === cnd;
                              return (
                                <button
                                  key={cnd}
                                  onClick={() => !isActive && patchVehicle(vehicle._id, { condition: cnd })}
                                  className="rounded-xl p-2.5 text-center transition-all duration-200"
                                  style={{
                                    background: isActive ? meta.bg : 'rgba(255,255,255,0.03)',
                                    border: `1.5px solid ${isActive ? meta.border : 'rgba(255,255,255,0.06)'}`,
                                    transform: isActive ? 'scale(1)' : 'scale(0.96)',
                                    opacity: isActive ? 1 : 0.55,
                                  }}
                                >
                                  <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: meta.dot }} />
                                  <p className="text-[10px] font-bold leading-tight" style={{ color: isActive ? meta.textColor : 'rgba(247,245,241,0.5)' }}>{meta.label}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── ROUTE STATUS TOGGLE ── */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => patchVehicle(vehicle._id, { status: vehicle.status === 'on_route' ? 'parked' : 'on_route' })}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                            style={{
                              background: vehicle.status === 'on_route' ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                              border: vehicle.status === 'on_route' ? '1.5px solid rgba(59,130,246,0.35)' : '1px solid rgba(255,255,255,0.08)',
                              color: vehicle.status === 'on_route' ? '#93c5fd' : 'rgba(247,245,241,0.5)',
                            }}
                          >
                            <Navigation size={13} />
                            {vehicle.status === 'on_route' ? '🔵 Jelenleg úton' : 'Útra küld'}
                          </button>
                          <button onClick={() => openCreate(vehicle._id)}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: "rgba(201,169,98,0.12)", color: "#C9A962", border: "1px solid rgba(201,169,98,0.2)" }}>
                            <Plus size={12} /> Szerviz
                          </button>
                          <button onClick={() => openCreate(vehicle._id, "oil")}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.2)" }}>
                            <Fuel size={12} /> Olaj
                          </button>
                          <button onClick={() => openCreate(vehicle._id, "tire")}
                            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}>
                            <CircleDot size={12} /> Gumi
                          </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-xs text-[#F7F5F1]/40">Szervizek</p>
                            <p className="text-base font-bold text-[#C9A962] mt-0.5">{vRecs.length}</p>
                          </div>
                          <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-xs text-[#F7F5F1]/40">Utolsó szerviz</p>
                            <p className="text-xs font-medium text-[#F7F5F1]/70 mt-0.5">{lastRecord ? fmtDate(lastRecord.date) : "—"}</p>
                          </div>
                          <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-xs text-[#F7F5F1]/40">Következő</p>
                            <p className="text-xs font-medium mt-0.5" style={{ color: upcoming ? (upcoming.days < 0 ? "#fb7185" : upcoming.days <= 7 ? "#fbbf24" : "#34d399") : "#F7F5F1/70" }}>
                              {upcoming ? fmtDate(upcoming.record.nextCheckDate) : "—"}
                            </p>
                          </div>
                        </div>

                        {/* Last 3 records */}
                        {vRecs.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-[#F7F5F1]/40 uppercase tracking-wider">Előzmények</p>
                            {[...vRecs].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 3).map((r, i) => {
                              const Icon = SERVICE_TYPE_ICONS[r.type as ServiceRecordType] ?? FileText;
                              const color = SERVICE_TYPE_COLORS[r.type as ServiceRecordType] ?? "#94a3b8";
                              return (
                                <div key={i} className="flex items-center gap-2 rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)" }}>
                                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                                    <Icon size={12} style={{ color }} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-[#F7F5F1] truncate">{r.title}</p>
                                    <p className="text-xs text-[#F7F5F1]/35">{fmtDate(r.date)} · {kmFmt(r.mileageKm)}</p>
                                  </div>
                                  {r.costHUF ? <span className="text-xs text-[#C9A962]">{hufFmt(r.costHUF)}</span> : null}
                                  <div className="flex gap-1">
                                    <button onClick={() => openEdit(r)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(201,169,98,0.1)" }}>
                                      <Pencil size={10} className="text-[#C9A962]" />
                                    </button>
                                    <button onClick={() => setDeletingRecordId(String(r._id))} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "rgba(244,63,94,0.1)" }}>
                                      <Trash2 size={10} className="text-[#fb7185]" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {vehicle.note && (
                          <div className="rounded-lg p-3 text-xs text-[#F7F5F1]/50" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            📝 {vehicle.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ SERVICE / OIL / TIRES ════ */}
        {(activeSection === "service" || activeSection === "oil" || activeSection === "tires") && (
          <div className="animate-slide-up space-y-4">
            {/* Header row: Tabs & Add button */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2">
                {[
                  { id: "service" as NavSection, label: "Összes szerviz", icon: Wrench },
                  { id: "oil" as NavSection, label: "Olajcserék", icon: Droplets },
                  { id: "tires" as NavSection, label: "Gumikezelés", icon: CircleDot },
                ].map((t) => (
                  <button key={t.id} onClick={() => navigate(t.id)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{
                      background: activeSection === t.id ? "rgba(201,169,98,0.2)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${activeSection === t.id ? "rgba(201,169,98,0.35)" : "rgba(255,255,255,0.08)"}`,
                      color: activeSection === t.id ? "#C9A962" : "rgba(247,245,241,0.5)",
                    }}>
                    <t.icon size={12} />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setModalEditing(null);
                  setModalVehicleId(null);
                  setModalMode(activeSection === "oil" ? "oil" : activeSection === "tires" ? "tire" : "main");
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
                style={{ background: "rgba(201,169,98,0.15)", color: "#C9A962", border: "1px solid rgba(201,169,98,0.25)" }}
              >
                <Plus size={16} /> Új rögzítése
              </button>
            </div>

            {/* ── EXTRA FILTERS: vehicle + date ── */}
            <div className="flex gap-2 flex-wrap">
              <select
                value={serviceVehicleFilter}
                onChange={(e) => setServiceVehicleFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-full outline-none cursor-pointer"
                style={{ background: serviceVehicleFilter !== 'all' ? 'rgba(201,169,98,0.18)' : 'rgba(255,255,255,0.05)', border: `1px solid ${serviceVehicleFilter !== 'all' ? 'rgba(201,169,98,0.35)' : 'rgba(255,255,255,0.08)'}`, color: serviceVehicleFilter !== 'all' ? '#C9A962' : 'rgba(247,245,241,0.5)' }}
              >
                <option value="all">Összes jármű</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>{v.name}{v.plates ? ` (${v.plates})` : ''}</option>
                ))}
              </select>
              {(['all', 'thisMonth', 'thisYear'] as DateFilter[]).map((f) => (
                <button key={f} onClick={() => setServiceDateFilter(f)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={{
                    background: serviceDateFilter === f ? 'rgba(201,169,98,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${serviceDateFilter === f ? 'rgba(201,169,98,0.35)' : 'rgba(255,255,255,0.08)'}`,
                    color: serviceDateFilter === f ? '#C9A962' : 'rgba(247,245,241,0.5)',
                  }}
                >
                  {f === 'all' ? 'Összes' : f === 'thisMonth' ? 'Ez a hónap' : 'Ez az év'}
                </button>
              ))}
              {(serviceVehicleFilter !== 'all' || serviceDateFilter !== 'all') && (
                <button onClick={() => { setServiceVehicleFilter('all'); setServiceDateFilter('all'); }}
                  className="text-xs px-2 py-1.5 rounded-full flex items-center gap-1"
                  style={{ background: 'rgba(244,63,94,0.1)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.2)' }}
                >
                  <X size={10} /> Töröl
                </button>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Összes rekord", value: activeSection === "oil" ? serviceStats.oilCount : activeSection === "tires" ? serviceStats.tireCount : serviceStats.total, color: "#C9A962" },
                { label: "Lejárt", value: serviceStats.overdue, color: serviceStats.overdue > 0 ? "#fb7185" : "#34d399" },
                { label: "14 napon belül", value: serviceStats.dueSoon, color: serviceStats.dueSoon > 0 ? "#fbbf24" : "#34d399" },
                { label: "Összköltség", value: hufFmt(serviceStats.totalCost) ?? "0 Ft", color: "#C9A962" },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 card-glass">
                  <p className="text-xs text-[#F7F5F1]/40 mb-1">{s.label}</p>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Records list */}
            <div className="space-y-2">
              {filteredServiceRecordsEnhanced.length === 0 && (
                <div className="text-center py-12 text-[#F7F5F1]/30">
                  <Wrench size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nincs rögzített szervizrekord</p>
                </div>
              )}
              {filteredServiceRecordsEnhanced.map((r, i) => {
                const Icon = SERVICE_TYPE_ICONS[r.type as ServiceRecordType] ?? FileText;
                const color = SERVICE_TYPE_COLORS[r.type as ServiceRecordType] ?? "#94a3b8";
                const days = daysUntil(r.nextCheckDate);
                const ub = urgencyBadge(days);
                return (
                  <div key={i} className="rounded-2xl card-glass overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                        <Icon size={17} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>{getServiceTypeLabel(r.type as ServiceRecordType)}</span>
                          {ub && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: ub.bg, color: ub.color }}>{ub.label}</span>}
                        </div>
                        <h4 className="text-sm font-medium text-[#F7F5F1]">{r.title}</h4>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {r.vehicleName && <span className="text-xs text-[#F7F5F1]/50">{r.vehicleName}</span>}
                          <span className="text-xs text-[#F7F5F1]/35">{fmtDate(r.date)}</span>
                          {r.mileageKm && <span className="text-xs text-[#F7F5F1]/35">{kmFmt(r.mileageKm)}</span>}
                          {r.costHUF && <span className="text-xs text-[#C9A962]">{hufFmt(r.costHUF)}</span>}
                          {r.servicePartner && <span className="text-xs text-[#F7F5F1]/35">📍 {r.servicePartner}</span>}
                        </div>
                        {r.nextCheckDate && (
                          <p className="text-xs mt-1" style={{ color: ub?.color ?? "#F7F5F1/30" }}>
                            Következő: {fmtDate(r.nextCheckDate)}
                            {r.nextCheckMileageKm ? ` · ${kmFmt(r.nextCheckMileageKm)}` : ""}
                          </p>
                        )}
                        {r.notes && <p className="text-xs text-[#F7F5F1]/40 mt-1 line-clamp-2">{r.notes}</p>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => openEdit(r)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,169,98,0.1)", border: "1px solid rgba(201,169,98,0.15)" }}>
                          <Pencil size={12} className="text-[#C9A962]" />
                        </button>
                        <button onClick={() => setDeletingRecordId(String(r._id))} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)" }}>
                          <Trash2 size={12} className="text-[#fb7185]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ LEAVES ════ */}
        {activeSection === "leaves" && (
          <div className="animate-slide-up space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Függőben", value: leaves.filter((l) => l.status === "pending").length, color: "#fbbf24", filter: "pending" as const },
                { label: "Jóváhagyva", value: leaves.filter((l) => l.status === "approved").length, color: "#34d399", filter: "approved" as const },
                { label: "Elutasítva", value: leaves.filter((l) => l.status === "rejected").length, color: "#fb7185", filter: "rejected" as const },
              ].map((s) => (
                <button key={s.filter} onClick={() => setLeaveFilter(leaveFilter === s.filter ? "all" : s.filter)}
                  className="rounded-xl p-3 card-glass text-center transition-all qa-card"
                  style={{ border: leaveFilter === s.filter ? `1.5px solid ${s.color}50` : undefined }}>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-[#F7F5F1]/50 mt-0.5 font-semibold">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                <button key={f} onClick={() => setLeaveFilter(f)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all font-semibold"
                  style={{
                    background: leaveFilter === f ? "rgba(201,169,98,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${leaveFilter === f ? "rgba(201,169,98,0.35)" : "rgba(255,255,255,0.08)"}`,
                    color: leaveFilter === f ? "#C9A962" : "rgba(247,245,241,0.5)",
                  }}>
                  {f === "all" ? "Összes" : LEAVE_STATUS_META[f].label}
                </button>
              ))}
            </div>

            {/* Leave list */}
            <div className="space-y-3">
              {filteredLeaves.length === 0 && (
                <div className="text-center py-12 text-[#F7F5F1]/30">
                  <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nincs szabadságkérelem</p>
                </div>
              )}
              {filteredLeaves.map((l) => {
                const typeStyle = LEAVE_TYPE_COLORS[l.type];
                const statusMeta = LEAVE_STATUS_META[l.status];
                const StatusIcon = statusMeta.icon;
                const isQuickOpen = quickDecideId === l._id;
                const isUrgent = l.status === 'pending' && (() => { const d = new Date(l.startDate); const t = new Date(); t.setHours(0,0,0,0); return (d.getTime() - t.getTime()) / 86400000 <= 3; })();
                return (
                  <div key={l._id} className="rounded-2xl card-glass overflow-hidden" style={{ border: isUrgent ? '1.5px solid rgba(244,63,94,0.35)' : undefined }}>
                    {isUrgent && (
                      <div className="px-4 py-1.5 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5" style={{ background: 'rgba(244,63,94,0.12)', color: '#fb7185' }}>
                        <AlertTriangle size={10} /> Sürgős – holnaputántól kezdődik!
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}>
                              {LEAVE_TYPE_LABELS[l.type]}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-bold" style={{ background: statusMeta.bg, color: statusMeta.text, border: `1px solid ${statusMeta.border}` }}>
                              <StatusIcon size={10} /> {statusMeta.label}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-[#F7F5F1]">{l.driverName}</h4>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-[#F7F5F1]/50">{fmtDate(l.startDate)} – {fmtDate(l.endDate)}</span>
                            <span className="text-xs font-bold" style={{ color: "#C9A962" }}>{l.days} nap</span>
                            {l.driverEmail && <span className="text-xs text-[#F7F5F1]/35">{l.driverEmail}</span>}
                          </div>
                          {l.reason && <p className="text-xs text-[#F7F5F1]/50 mt-1.5 italic">„{l.reason}"</p>}
                          {l.reviewedBy && (
                            <p className="text-xs text-[#F7F5F1]/30 mt-1">
                              {statusMeta.label} · {l.reviewedBy} {l.reviewNote ? `· „${l.reviewNote}"` : ""}
                            </p>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          {l.status === "pending" && (
                            <div className="flex flex-col gap-1.5">
                              {/* Quick inline approve/reject */}
                              <button
                                onClick={() => handleLeaveReview(l._id, 'approved')}
                                disabled={reviewSubmitting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                              >
                                <ThumbsUp size={11} /> Jóváhagy
                              </button>
                              <button
                                onClick={() => handleLeaveReview(l._id, 'rejected')}
                                disabled={reviewSubmitting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: 'rgba(244,63,94,0.12)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.25)' }}
                              >
                                <ThumbsDown size={11} /> Elutasít
                              </button>
                              <button
                                onClick={() => { setReviewLeave(l); setReviewNote(""); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                                style={{ background: 'rgba(201,169,98,0.1)', color: '#C9A962', border: '1px solid rgba(201,169,98,0.2)' }}
                              >
                                <FileText size={11} /> + Megjegyzés
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ STATS ════ */}
        {activeSection === "stats" && (
          <div className="animate-slide-up space-y-5">
            <h2 className="text-lg font-bold text-[#F7F5F1]">Statisztikák</h2>

            {/* Fleet health */}
            <div className="rounded-2xl p-5 card-glass">
              <h3 className="text-sm font-bold text-[#F7F5F1]/80 mb-4 flex items-center gap-2"><Activity size={15} className="text-[#C9A962]" /> Flotta egészség</h3>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="2.5"
                      strokeDasharray={`${stats.total ? (stats.working / stats.total * 100) : 0} 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-black text-[#10b981]">{stats.total ? Math.round(stats.working / stats.total * 100) : 0}%</span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {[
                    { label: "Működőképes", value: stats.working, total: stats.total, color: "#10b981" },
                    { label: "Korlátozott", value: vehicles.filter(v => v.condition === "debrecen_only").length, total: stats.total, color: "#f59e0b" },
                    { label: "Meghibásodott", value: stats.broken, total: stats.total, color: "#fb7185" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#F7F5F1]/60 font-medium">{item.label}</span>
                        <span className="font-bold" style={{ color: item.color }}>{item.value} / {item.total}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${item.total ? (item.value / item.total * 100) : 0}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── MONTHLY TREND ── */}
            <div className="rounded-2xl p-5 card-glass">
              <h3 className="text-sm font-bold text-[#F7F5F1]/80 mb-5 flex items-center gap-2">
                <TrendingUp size={15} className="text-[#C9A962]" /> Havi szerviz trend (6 hónap)
              </h3>
              <div className="flex items-end gap-2 h-24">
                {monthlyTrend.map((m, i) => {
                  const maxCount = Math.max(...monthlyTrend.map((x) => x.count), 1);
                  const pct = (m.count / maxCount) * 100;
                  const isCurrentMonth = i === monthlyTrend.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <p className="text-[9px] font-bold" style={{ color: isCurrentMonth ? '#C9A962' : 'rgba(247,245,241,0.4)' }}>{m.count}</p>
                      <div
                        className="w-full rounded-t-lg trend-bar"
                        style={{
                          height: `${Math.max(pct, m.count === 0 ? 0 : 8)}%`,
                          background: isCurrentMonth
                            ? 'linear-gradient(180deg, #C9A962, #b8973f)'
                            : 'rgba(201,169,98,0.3)',
                          minHeight: m.count > 0 ? 4 : 0,
                        }}
                      />
                      <p className="text-[9px] text-[#F7F5F1]/35 font-semibold">{m.label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 flex justify-between text-xs" style={{ borderTop: '1px solid rgba(201,169,98,0.1)' }}>
                <span className="text-[#F7F5F1]/40">Összköltség (6 hónap)</span>
                <span className="font-bold text-[#C9A962]">{hufFmt(monthlyTrend.reduce((s, m) => s + m.cost, 0)) ?? '0 Ft'}</span>
              </div>
            </div>

            {/* Service type breakdown */}
            <div className="rounded-2xl p-5 card-glass">
              <h3 className="text-sm font-bold text-[#F7F5F1]/80 mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-[#C9A962]" /> Szerviz típusok</h3>
              <div className="space-y-3">
                {(["olajcsere", "gumicsere", "muszaki_vizsga", "szerviz_altalanos", "fekbetisztitas", "futomu_frissites", "tomegkozlekedesi_engedely", "egyeb"] as ServiceRecordType[]).map((type) => {
                  const count = records.filter((r) => r.type === type).length;
                  const pct = records.length ? Math.round(count / records.length * 100) : 0;
                  const color = SERVICE_TYPE_COLORS[type];
                  if (count === 0) return null;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#F7F5F1]/70 font-medium">{getServiceTypeLabel(type)}</span>
                        <span className="font-bold" style={{ color }}>{count} db ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-vehicle breakdown */}
            {perVehicleStats.filter((v) => v.count > 0).length > 0 && (
              <div className="rounded-2xl p-5 card-glass">
                <h3 className="text-sm font-bold text-[#F7F5F1]/80 mb-4 flex items-center gap-2">
                  <Truck size={15} className="text-[#C9A962]" /> Szervizek járművenként
                </h3>
                <div className="space-y-3">
                  {perVehicleStats.filter((v) => v.count > 0).map((v, i) => {
                    const maxCount = Math.max(...perVehicleStats.map((x) => x.count), 1);
                    const pct = (v.count / maxCount) * 100;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-[#F7F5F1]/70 font-medium truncate max-w-[60%]">{v.name}{v.plates ? ` · ${v.plates}` : ''}</span>
                          <span className="font-bold text-[#C9A962]">{v.count} szerviz · {hufFmt(v.cost) ?? '0 Ft'}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #C9A962, #b8973f)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cost summary */}
            <div className="rounded-2xl p-5 card-glass">
              <h3 className="text-sm font-bold text-[#F7F5F1]/80 mb-4 flex items-center gap-2"><Zap size={15} className="text-[#C9A962]" /> Összesítő</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Összes szerviz', value: serviceStats.total, color: '#C9A962' },
                  { label: 'Összes költség', value: hufFmt(serviceStats.totalCost) ?? '0 Ft', color: '#C9A962' },
                  { label: 'Átlag/szerviz', value: serviceStats.total ? hufFmt(Math.round(serviceStats.totalCost / serviceStats.total)) ?? '—' : '—', color: '#C9A962' },
                  { label: 'Szabadságkérelmek', value: `${leaves.length} db`, color: '#fbbf24' },
                  { label: 'Lejárt szerviz', value: `${serviceStats.overdue} db`, color: serviceStats.overdue > 0 ? '#fb7185' : '#34d399' },
                  { label: 'Hamarosan esedékes', value: `${serviceStats.dueSoon} db`, color: serviceStats.dueSoon > 0 ? '#fbbf24' : '#34d399' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-[10px] text-[#F7F5F1]/40 uppercase tracking-wider">{s.label}</p>
                    <p className="text-base font-black mt-1" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════ ALERTS ════ */}
        {activeSection === "alerts" && (
          <div className="animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#F7F5F1]">Figyelmeztetések</h2>
              <span className="text-sm text-[#F7F5F1]/40">{alertItems.length} tétel</span>
            </div>

            {alertItems.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <ShieldCheck size={28} className="text-[#10b981]" />
                </div>
                <h3 className="text-[#F7F5F1]/70 font-medium">Minden rendben!</h3>
                <p className="text-sm text-[#F7F5F1]/35 mt-1">Nincs aktív figyelmeztetés</p>
              </div>
            )}

            <div className="space-y-2">
              {alertItems.map((a, i) => {
                const toneColors = {
                  critical: { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.25)", color: "#fb7185" },
                  warn: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", color: "#fbbf24" },
                  info: { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)", color: "#93c5fd" },
                }[a.tone];
                return (
                  <div key={i} className="rounded-2xl p-4 flex items-start gap-3" style={{ background: toneColors.bg, border: `1px solid ${toneColors.border}` }}>
                    <AlertTriangle size={16} style={{ color: toneColors.color, flexShrink: 0, marginTop: 1 }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#F7F5F1]">{a.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: toneColors.color }}>{a.detail}</p>
                    </div>
                    {a.vehicleName && (
                      <button onClick={() => { navigate("vehicles"); }} className="text-xs px-2 py-1 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "#F7F5F1/50" }}>
                        Jármű →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAVIGATION BAR (mobile-first) ── */}
      <nav className="bottom-nav lg:hidden">
        {([
          { id: 'overview' as NavSection, label: 'Áttekintés', icon: Home },
          { id: 'vehicles' as NavSection, label: 'Járművek', icon: Truck, badge: stats.broken > 0 ? stats.broken : undefined },
          { id: 'service' as NavSection, label: 'Szerviz', icon: Wrench, badge: serviceStats.overdue > 0 ? serviceStats.overdue : undefined },
          { id: 'leaves' as NavSection, label: 'Szabadság', icon: Calendar, badge: pendingLeaves > 0 ? pendingLeaves : undefined },
          { id: 'alerts' as NavSection, label: 'Riasztás', icon: Bell, badge: alertItems.filter(a => a.tone === 'critical').length > 0 ? alertItems.filter(a => a.tone === 'critical').length : undefined },
        ]).map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`bottom-nav-item ${activeSection === item.id ? 'active' : ''}`}
          >
            <div className="relative">
              <item.icon size={activeSection === item.id ? 20 : 18} />
              {item.badge != null && (
                <span
                  className="absolute -top-1.5 -right-2.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: '#f43f5e', color: 'white' }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up-bottom">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium shadow-xl" style={{
            background: toast.ok ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)",
            border: `1px solid ${toast.ok ? "rgba(16,185,129,0.35)" : "rgba(244,63,94,0.35)"}`,
            color: toast.ok ? "#34d399" : "#fb7185",
            backdropFilter: "blur(16px)",
          }}>
            {toast.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {toast.msg}
          </div>
        </div>
      )}

      {/* ── Leave Review Modal ── */}
      {reviewLeave && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-5 animate-slide-up-bottom" style={{ background: "#0d1f32", border: "1px solid rgba(201,169,98,0.2)" }}>
            <h3 className="text-base font-bold text-[#F7F5F1] mb-1">Szabadságkérelem döntés</h3>
            <p className="text-sm text-[#F7F5F1]/50 mb-4">{reviewLeave.driverName} · {LEAVE_TYPE_LABELS[reviewLeave.type]} · {reviewLeave.days} nap</p>
            <div className="rounded-xl p-3 mb-4 text-sm" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs text-[#F7F5F1]/40 mb-0.5">Időszak</p>
              <p className="text-[#F7F5F1]">{fmtDate(reviewLeave.startDate)} – {fmtDate(reviewLeave.endDate)}</p>
              {reviewLeave.reason && <p className="text-xs text-[#F7F5F1]/50 mt-2 italic">„{reviewLeave.reason}"</p>}
            </div>
            <div className="mb-4">
              <label className="text-xs text-[#F7F5F1]/50 mb-1.5 block">Megjegyzés (opcionális)</label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Pl.: jóváhagyom, helyettesítésről gondoskodj..."
                rows={2}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,169,98,0.15)", color: "#F7F5F1" }}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewLeave(null)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "#F7F5F1/50" }}>
                Mégsem
              </button>
              <button
                onClick={() => handleLeaveReview(reviewLeave._id, "rejected")}
                disabled={reviewSubmitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: "rgba(244,63,94,0.15)", color: "#fb7185", border: "1px solid rgba(244,63,94,0.25)" }}
              >
                <XCircle size={14} /> Elutasít
              </button>
              <button
                onClick={() => handleLeaveReview(reviewLeave._id, "approved")}
                disabled={reviewSubmitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}
              >
                <CheckCircle2 size={14} /> Jóváhagy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deletingRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5 animate-slide-up" style={{ background: "#0d1f32", border: "1px solid rgba(244,63,94,0.2)" }}>
            <h3 className="text-base font-bold text-[#F7F5F1] mb-2">Rekord törlése</h3>
            <p className="text-sm text-[#F7F5F1]/50 mb-5">Ez a művelet nem visszavonható. Biztosan törlöd?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingRecordId(null)} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)" }}>Mégsem</button>
              <button onClick={() => deleteRecord(deletingRecordId)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "rgba(244,63,94,0.15)", color: "#fb7185", border: "1px solid rgba(244,63,94,0.25)" }}>Törlés</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Record Modal ── */}
      {modalOpen && (
        <ServiceRecordModal
          open={modalOpen}
          vehicles={vehicles.map((v) => ({ _id: v._id, name: v.name, plates: v.plates }))}
          preselectedVehicleId={modalVehicleId ?? undefined}
          mode={modalMode}
          editing={modalEditing as any}
          onClose={() => setModalOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  );
}

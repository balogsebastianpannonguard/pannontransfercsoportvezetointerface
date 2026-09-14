"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X, Save, Droplets, CircleDot, ClipboardCheck, Wrench,
  Disc3, Snowflake, Bus, FileText, Calendar, Gauge, DollarSign,
  Building, MessageSquare, CheckCircle2, Clock, ArrowRight,
  MapPin, Zap,
} from "lucide-react";
import { getServiceTypeLabel, SERVICE_TYPE_OPTIONS } from "../../lib/serviceTypes";
import type { ServiceRecordType, ServiceRecordMeta } from "../../lib/serviceTypes";

type ServiceRecord = ServiceRecordMeta & { _id?: unknown };

interface Vehicle {
  _id: string;
  name: string;
  plates?: string;
}

type TabMode = "main" | "oil" | "tire";
type EntryMode = "done" | "upcoming";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<boolean>;
  vehicles: Vehicle[];
  preselectedVehicleId?: string | null;
  mode?: TabMode;
  editing?: ServiceRecord | null;
}

const typeToIcon: Record<ServiceRecordType, any> = {
  olajcsere: Droplets,
  gumicsere: CircleDot,
  muszaki_vizsga: ClipboardCheck,
  szerviz_altalanos: Wrench,
  fekbetisztitas: Disc3,
  futomu_frissites: Snowflake,
  tomegkozlekedesi_engedely: Bus,
  egyeb: FileText,
};

const TYPE_SUGGESTIONS: Partial<Record<ServiceRecordType, {
  titleDone: string; titleUpcoming: string;
  notesDone: string; notesUpcoming: string;
  partnerExample: string;
}>> = {
  olajcsere: {
    titleDone: "Olajcsere + szűrők",
    titleUpcoming: "Soron következő olajcsere",
    notesDone: "Motorolaj: 5W-30 szintetikus, 5L\nOlajszűrő csere: igen\nLevegőszűrő: igen/nem\nPollen szűrő: igen/nem",
    notesUpcoming: "Előző olajcsere óta eltelt km alapján esedékes\nMotorolaj típus: ...\nSzűrők cseréje is szükséges",
    partnerExample: "AutoMester Kft., Mercedes-Benz Debrecen...",
  },
  gumicsere: {
    titleDone: "Gumicsere (nyár/tél)",
    titleUpcoming: "Gumiváltás ütemezve",
    notesDone: "Nyári/téli gumik mérete: ...\nGumik állapota: ...\nNyomás beállítva: igen\nHomlokzati mélység: ...",
    notesUpcoming: "Időszak: őszi/tavaszi váltás\nGumik tárolási helye: ...",
    partnerExample: "GumiCentrum, TotalTyre...",
  },
  muszaki_vizsga: {
    titleDone: "Műszaki vizsga – átment",
    titleUpcoming: "Műszaki vizsga időpontja",
    notesDone: "Eredmény: megfelelt / nem felelt meg\nKövetkezőig érvényes: ...\nHiányosságok / javítandók: ...",
    notesUpcoming: "Előre foglalt időpont\nFelkészítendő: fények, fék, gumiállapot...",
    partnerExample: "Vizsgaállomás Debrecen, NTA...",
  },
  szerviz_altalanos: {
    titleDone: "Általános szerviz",
    titleUpcoming: "Általános szerviz – tervezett",
    notesDone: "Elvégzett munkák:\n- Fékbetétek ellenőrzése\n- Felfüggesztés\n- Folyadékszintek\n- Egyéb:",
    notesUpcoming: "Tervezett munkák:\n- ...",
    partnerExample: "Szerviz partner neve...",
  },
  fekbetisztitas: {
    titleDone: "Fékbetét csere / tisztítás",
    titleUpcoming: "Fékbetét csere ütemezve",
    notesDone: "Helyszín: mellső/hátsó\nBetét típus: ...\nFékfolyadék szint: ok\nFéktárcsa állapot: ...",
    notesUpcoming: "Várható munka: ...",
    partnerExample: "Fékes szakszerviz...",
  },
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonths(months: number) {
  const d = new Date();
  d.setDate(d.getDate() + Math.round(months * 30.5));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const INPUT_STYLE = {
  backgroundColor: "rgba(26,45,68,0.5)",
};
const INPUT_CLASS =
  "w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30 placeholder:text-[#F7F5F1]/30";

export default function ServiceRecordModal({
  open,
  onClose,
  onSave,
  vehicles,
  preselectedVehicleId,
  mode = "main",
  editing,
}: Props) {
  const [entryMode, setEntryMode] = useState<EntryMode>("done");
  const [vehicleId, setVehicleId] = useState<string>(preselectedVehicleId ?? "");
  const [type, setType] = useState<ServiceRecordType>(
    mode === "oil" ? "olajcsere" : mode === "tire" ? "gumicsere" : "szerviz_altalanos"
  );
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [mileageKm, setMileageKm] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [nextCheckDate, setNextCheckDate] = useState("");
  const [nextCheckMileageKm, setNextCheckMileageKm] = useState<string>("");
  const [costHUF, setCostHUF] = useState<string>("");
  const [servicePartner, setServicePartner] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setVehicleId(String(editing.vehicleId));
      setType(editing.type);
      setTitle(editing.title);
      setDate(editing.date);
      setMileageKm(String(editing.mileageKm || ""));
      setNotes(editing.notes ?? "");
      setNextCheckDate(editing.nextCheckDate ?? "");
      setNextCheckMileageKm(String(editing.nextCheckMileageKm ?? ""));
      setCostHUF(String(editing.costHUF ?? ""));
      setServicePartner(editing.servicePartner ?? "");
      setEntryMode(editing.date > today() ? "upcoming" : "done");
    } else {
      setVehicleId(preselectedVehicleId ?? "");
      setType(mode === "oil" ? "olajcsere" : mode === "tire" ? "gumicsere" : "szerviz_altalanos");
      setTitle("");
      setDate(today());
      setMileageKm("");
      setNotes("");
      setNextCheckDate("");
      setNextCheckMileageKm("");
      setCostHUF("");
      setServicePartner("");
      setEntryMode("done");
    }
    setError(null);
  }, [open, preselectedVehicleId, mode, editing]);

  // Auto-title when type changes
  useEffect(() => {
    if (!open || title) return;
    const sug = TYPE_SUGGESTIONS[type];
    if (sug) setTitle(entryMode === "done" ? sug.titleDone : sug.titleUpcoming);
    else {
      const defaults: Record<ServiceRecordType, string> = {
        olajcsere: "Olajcsere", gumicsere: "Gumicsere",
        muszaki_vizsga: "Műszaki vizsga", szerviz_altalanos: "Általános szerviz",
        fekbetisztitas: "Fékbetét csere", futomu_frissites: "Futóműjavítás",
        tomegkozlekedesi_engedely: "Tömegközlekedési engedély", egyeb: "Egyéb szerviz",
      };
      setTitle(defaults[type] ?? "");
    }
  }, [type, open]);

  // Mode switch adjustments
  useEffect(() => {
    if (!open) return;
    const sug = TYPE_SUGGESTIONS[type];
    if (sug) {
      if (entryMode === "done" && title === sug.titleUpcoming) setTitle(sug.titleDone);
      if (entryMode === "upcoming" && title === sug.titleDone) setTitle(sug.titleUpcoming);
    }
    if (entryMode === "upcoming" && date <= today()) setDate(addMonths(1));
    if (entryMode === "done" && date > today()) setDate(today());
  }, [entryMode]);

  const vehicle = useMemo(() => vehicles.find((v) => v._id === vehicleId), [vehicles, vehicleId]);
  const sug = TYPE_SUGGESTIONS[type];

  if (!open) return null;

  const canSave = vehicleId && title && date && (entryMode === "upcoming" || mileageKm !== "");

  const handleSave = async () => {
    if (!canSave) {
      setError(entryMode === "done"
        ? "Kötelező: jármű, cím, dátum, km-állás."
        : "Kötelező: jármű, cím és tervezett dátum.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        vehicleId, type, title, date,
        vehiclePlateNumber: vehicle?.plates,
        vehicleName: vehicle?.name,
        entryMode,
      };
      if (entryMode === "done") {
        payload.mileageKm = Number(mileageKm);
        if (nextCheckDate) payload.nextCheckDate = nextCheckDate;
        if (nextCheckMileageKm) payload.nextCheckMileageKm = Number(nextCheckMileageKm);
      } else {
        if (mileageKm) payload.mileageKm = Number(mileageKm);
        payload.nextCheckDate = date;
      }
      if (notes.trim()) payload.notes = notes.trim();
      if (costHUF) payload.costHUF = Number(costHUF);
      if (servicePartner.trim()) payload.servicePartner = servicePartner.trim();
      if (editing?._id) payload.id = String(editing._id);

      const ok = await onSave(payload);
      if (ok) { setSaving(false); onClose(); }
      else { setError("Hiba a mentés közben. Kérlek próbáld újra."); setSaving(false); }
    } catch (e: any) {
      setError(e?.message ?? "Hiba a mentés közben.");
      setSaving(false);
    }
  };

  const TypeIcon = typeToIcon[type] ?? FileText;
  const isDone = entryMode === "done";
  const accentColor = isDone ? "#10b981" : "#3b82f6";
  const accentBg = isDone ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)";
  const accentBorder = isDone ? "rgba(16,185,129,0.3)" : "rgba(59,130,246,0.3)";
  const fieldBorder = (val: string) => val
    ? (isDone ? "rgba(201,169,98,0.4)" : "rgba(59,130,246,0.5)")
    : (isDone ? "rgba(201,169,98,0.12)" : "rgba(59,130,246,0.18)");

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[8px]" />
      <div
        className="relative z-10 w-full sm:max-w-xl bg-[#0F2338] rounded-t-3xl sm:rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] border border-[#C9A962]/12 overflow-hidden animate-slide-up-bottom"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "94dvh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-[#C9A962]/10 flex items-start justify-between"
          style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
        >
          <div className="flex items-start gap-3 pr-2 flex-1 min-w-0">
            <div
              className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center border shadow-[0_6px_20px_rgba(201,169,98,0.2)]"
              style={{ backgroundColor: "rgba(201,169,98,0.12)", borderColor: "rgba(201,169,98,0.22)" }}
            >
              <TypeIcon className="w-[20px] h-[20px] text-[#C9A962]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black tracking-[0.22em] text-[#C9A962] uppercase">
                {editing ? "Szerkesztés" : "Új rekord"}
              </div>
              <h2 className="text-[17px] font-bold text-[#F7F5F1] mt-0.5 leading-tight truncate">
                {getServiceTypeLabel(type)}
              </h2>
              {vehicle && (
                <div className="text-[11px] text-[#F7F5F1]/50 font-semibold mt-0.5 truncate">
                  {vehicle.name}{vehicle.plates ? ` · ${vehicle.plates}` : ""}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-xl border border-[#C9A962]/10 flex items-center justify-center text-[#F7F5F1]/60 hover:text-[#F7F5F1] transition-all"
            style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        {/* Entry Mode Toggle */}
        {!editing && (
          <div className="px-5 pt-4">
            <div
              className="flex rounded-2xl p-1 gap-1"
              style={{ background: "rgba(11,26,42,0.8)", border: "1px solid rgba(201,169,98,0.12)" }}
            >
              <button
                type="button"
                onClick={() => setEntryMode("done")}
                className="flex-1 flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl transition-all duration-200"
                style={{
                  background: isDone ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
                  color: isDone ? "white" : "rgba(247,245,241,0.4)",
                  boxShadow: isDone ? "0 4px 16px -4px rgba(16,185,129,0.5)" : "none",
                }}
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-[12px] font-black">✅ El vittem</div>
                  <div className="text-[9px] font-semibold opacity-80">megtörtént szerviz</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode("upcoming")}
                className="flex-1 flex items-center justify-center gap-2.5 py-3 px-3 rounded-xl transition-all duration-200"
                style={{
                  background: !isDone ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "transparent",
                  color: !isDone ? "white" : "rgba(247,245,241,0.4)",
                  boxShadow: !isDone ? "0 4px 16px -4px rgba(59,130,246,0.5)" : "none",
                }}
              >
                <Clock className="w-5 h-5 shrink-0" />
                <div className="text-left">
                  <div className="text-[12px] font-black">📅 Következik</div>
                  <div className="text-[9px] font-semibold opacity-80">előre rögzítés</div>
                </div>
              </button>
            </div>
            <div
              className="mt-2 px-3 py-2 rounded-xl text-[11px] font-semibold leading-relaxed"
              style={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}
            >
              {isDone
                ? "📋 Töltsd ki: mikor, hol, hány km-nél és mennyiért volt a szerviz"
                : "🗓️ Előre rögzítsd a tervezett időpontot – emlékeztetőként jelenik meg a dashboardon"}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Service type chips */}
          <div>
            <Label icon={FileText}>Szerviz típusa</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SERVICE_TYPE_OPTIONS.map((opt) => {
                const active = opt.value === type;
                const TIcon = typeToIcon[opt.value] ?? FileText;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setType(opt.value); setTitle(""); }}
                    className="px-3 py-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-[0.97]"
                    style={
                      active
                        ? { background: "linear-gradient(135deg, #C9A962, #d4bb7a)", borderColor: "transparent", color: "#0B1A2A" }
                        : { backgroundColor: "rgba(26,45,68,0.4)", borderColor: "rgba(201,169,98,0.12)", color: "rgba(247,245,241,0.65)" }
                    }
                  >
                    <TIcon className="w-[16px] h-[16px] shrink-0" strokeWidth={2} />
                    <span className="text-[11.5px] font-black tracking-wide truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <Label icon={FileText}>Jármű *</Label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className={`mt-2 ${INPUT_CLASS}`}
              style={{ ...INPUT_STYLE, borderColor: fieldBorder(vehicleId), appearance: "none" }}
            >
              <option value="">Válassz járművet...</option>
              {vehicles.map((v) => (
                <option key={v._id} value={v._id}>{v.name}{v.plates ? ` (${v.plates})` : ""}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <Label icon={FileText}>Rövid cím *</Label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={sug ? (isDone ? sug.titleDone : sug.titleUpcoming) : "Cím..."}
              className={`mt-2 ${INPUT_CLASS}`}
              style={{ ...INPUT_STYLE, borderColor: fieldBorder(title) }}
            />
          </div>

          {/* ─── DONE MODE ─── */}
          {isDone && (
            <>
              {/* Date + Km at service */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label icon={Calendar}>Szerviz dátuma *</Label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    max={today()}
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(date), colorScheme: "dark" }}
                  />
                </div>
                <div>
                  <Label icon={Gauge}>Km-állás szervizkor *</Label>
                  <input
                    type="number"
                    min={0}
                    value={mileageKm}
                    onChange={(e) => setMileageKm(e.target.value)}
                    placeholder="pl. 142 500"
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(mileageKm) }}
                  />
                </div>
              </div>

              {/* Cost + Partner */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label icon={DollarSign}>Tényleges költség (Ft)</Label>
                  <input
                    type="number"
                    min={0}
                    value={costHUF}
                    onChange={(e) => setCostHUF(e.target.value)}
                    placeholder="pl. 38 900"
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(costHUF) }}
                  />
                </div>
                <div>
                  <Label icon={MapPin}>Hol volt?</Label>
                  <input
                    value={servicePartner}
                    onChange={(e) => setServicePartner(e.target.value)}
                    placeholder={sug?.partnerExample ?? "Szerviz neve, város..."}
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(servicePartner) }}
                  />
                </div>
              </div>

              {/* What was done */}
              <div>
                <Label icon={MessageSquare}>Mit csináltak pontosan?</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={sug?.notesDone ?? "Elvégzett munkák, alkatrészek, megjegyzések..."}
                  className={`mt-2 ${INPUT_CLASS} resize-none`}
                  style={{ ...INPUT_STYLE, borderColor: fieldBorder(notes) }}
                />
                {sug?.notesDone && !notes && (
                  <button
                    type="button"
                    onClick={() => setNotes(sug.notesDone)}
                    className="mt-1.5 text-[10px] font-bold text-[#C9A962]/70 hover:text-[#C9A962] flex items-center gap-1 transition-colors"
                  >
                    <Zap className="w-3 h-3" /> Sablon betöltése
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1" style={{ borderTop: "1px solid rgba(201,169,98,0.1)" }}>
                <ArrowRight className="w-4 h-4 text-[#C9A962]/40 shrink-0" />
                <span className="text-[10px] font-black tracking-[0.2em] text-[#C9A962]/50 uppercase">
                  Következő szerviz előírása (opcionális)
                </span>
              </div>

              {/* Next check */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label icon={Calendar}>Következő dátum</Label>
                  <input
                    type="date"
                    value={nextCheckDate}
                    onChange={(e) => setNextCheckDate(e.target.value)}
                    min={today()}
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(nextCheckDate), colorScheme: "dark" }}
                  />
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {[{ label: "+3 hó", m: 3 }, { label: "+6 hó", m: 6 }, { label: "+1 év", m: 12 }, { label: "+2 év", m: 24 }].map((p) => (
                      <button key={p.label} type="button" onClick={() => setNextCheckDate(addMonths(p.m))}
                        className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(201,169,98,0.12)", color: "#C9A962", border: "1px solid rgba(201,169,98,0.2)" }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label icon={Gauge}>Következő km-nél</Label>
                  <input
                    type="number"
                    min={0}
                    value={nextCheckMileageKm}
                    onChange={(e) => setNextCheckMileageKm(e.target.value)}
                    placeholder="pl. 155 000"
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(nextCheckMileageKm) }}
                  />
                  {mileageKm && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {[{ label: "+10 000", add: 10000 }, { label: "+15 000", add: 15000 }, { label: "+20 000", add: 20000 }].map((p) => (
                        <button key={p.label} type="button" onClick={() => setNextCheckMileageKm(String(Number(mileageKm) + p.add))}
                          className="text-[9px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(201,169,98,0.12)", color: "#C9A962", border: "1px solid rgba(201,169,98,0.2)" }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ─── UPCOMING MODE ─── */}
          {!isDone && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label icon={Calendar}>Tervezett időpont *</Label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={today()}
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(date), colorScheme: "dark" }}
                  />
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {[{ label: "+2 hét", m: 0.5 }, { label: "+1 hó", m: 1 }, { label: "+3 hó", m: 3 }, { label: "+6 hó", m: 6 }].map((p) => (
                      <button key={p.label} type="button" onClick={() => setDate(addMonths(p.m))}
                        className="text-[9px] font-black px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(59,130,246,0.12)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.2)" }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label icon={Gauge}>Jelenlegi km-állás</Label>
                  <input
                    type="number"
                    min={0}
                    value={mileageKm}
                    onChange={(e) => setMileageKm(e.target.value)}
                    placeholder="Mostani km (opcionális)"
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(mileageKm) }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label icon={DollarSign}>Várható költség (Ft)</Label>
                  <input
                    type="number"
                    min={0}
                    value={costHUF}
                    onChange={(e) => setCostHUF(e.target.value)}
                    placeholder="Becsült összeg..."
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(costHUF) }}
                  />
                </div>
                <div>
                  <Label icon={Building}>Tervezett szerviz</Label>
                  <input
                    value={servicePartner}
                    onChange={(e) => setServicePartner(e.target.value)}
                    placeholder={sug?.partnerExample ?? "Szerviz neve..."}
                    className={`mt-2 ${INPUT_CLASS}`}
                    style={{ ...INPUT_STYLE, borderColor: fieldBorder(servicePartner) }}
                  />
                </div>
              </div>

              <div>
                <Label icon={MessageSquare}>Mit kell elvégeztetni?</Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder={sug?.notesUpcoming ?? "Tervezett munkák, felkészítés, megjegyzések..."}
                  className={`mt-2 ${INPUT_CLASS} resize-none`}
                  style={{ ...INPUT_STYLE, borderColor: fieldBorder(notes) }}
                />
                {sug?.notesUpcoming && !notes && (
                  <button
                    type="button"
                    onClick={() => setNotes(sug.notesUpcoming)}
                    className="mt-1.5 text-[10px] font-bold text-[#93c5fd]/70 hover:text-[#93c5fd] flex items-center gap-1 transition-colors"
                  >
                    <Zap className="w-3 h-3" /> Sablon betöltése
                  </button>
                )}
              </div>

              <div
                className="flex items-start gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)" }}
              >
                <Clock className="w-4 h-4 text-[#93c5fd] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-[#93c5fd]">Tervezett bejegyzés</p>
                  <p className="text-[10px] text-[#F7F5F1]/45 mt-0.5 leading-relaxed">
                    Megjelenik a figyelmeztetőkben és a dashboardon. Ha megtörtént, szerkesztéssel frissítsd.
                  </p>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="px-4 py-3 rounded-2xl text-[12.5px] font-bold text-[#fb7185] bg-[rgba(244,63,94,0.12)] border border-[rgba(244,63,94,0.25)]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t border-[#C9A962]/10 flex gap-3"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.16em] border border-[#C9A962]/10 text-[#F7F5F1]/70 hover:text-[#F7F5F1] transition-all shrink-0"
            style={{ backgroundColor: "rgba(26,45,68,0.4)" }}
          >
            Mégse
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isDone
                ? "linear-gradient(135deg, #10b981, #059669)"
                : "linear-gradient(135deg, #3b82f6, #2563eb)",
              color: "white",
              boxShadow: isDone
                ? "0 10px 26px -8px rgba(16,185,129,0.55)"
                : "0 10px 26px -8px rgba(59,130,246,0.55)",
            }}
          >
            {saving ? (
              <Save className="w-[16px] h-[16px] animate-spin" strokeWidth={2.4} />
            ) : isDone ? (
              <CheckCircle2 className="w-[16px] h-[16px]" strokeWidth={2.4} />
            ) : (
              <Clock className="w-[16px] h-[16px]" strokeWidth={2.4} />
            )}
            {saving ? "Mentés..." : editing ? "Módosítás mentése" : isDone ? "Szerviz rögzítése" : "Időpont rögzítése"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <label className="flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-[0.2em] text-[#C9A962]/80">
      {Icon && <Icon className="w-[13px] h-[13px]" strokeWidth={2.2} />}
      {children}
    </label>
  );
}

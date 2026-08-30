"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Save,
  Droplets,
  CircleDot,
  ClipboardCheck,
  Wrench,
  Disc3,
  Snowflake,
  Bus,
  FileText,
  Calendar,
  Gauge,
  DollarSign,
  Building,
  MessageSquare,
} from "lucide-react";
import {
  getServiceTypeLabel,
  SERVICE_TYPE_OPTIONS,
} from "../../lib/serviceTypes";
import type { ServiceRecordType, ServiceRecordMeta } from "../../lib/serviceTypes";

type ServiceRecord = ServiceRecordMeta & { _id?: unknown };

interface Vehicle {
  _id: string;
  name: string;
  plates?: string;
}

type TabMode = "main" | "oil" | "tire";

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

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ServiceRecordModal({
  open,
  onClose,
  onSave,
  vehicles,
  preselectedVehicleId,
  mode = "main",
  editing,
}: Props) {
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
    }
    setError(null);
  }, [open, preselectedVehicleId, mode, editing]);

  useEffect(() => {
    if (!open) return;
    if (type === "olajcsere" && !title) setTitle("Olajcsere");
    if (type === "gumicsere" && !title) setTitle("Gumicsere (nyár/téli)");
    if (type === "muszaki_vizsga" && !title) setTitle("Műszaki vizsga");
  }, [type, title, open]);

  const vehicle = useMemo(
    () => vehicles.find((v) => v._id === vehicleId),
    [vehicles, vehicleId]
  );

  if (!open) return null;

  const canSave = vehicleId && title && date && mileageKm !== "";

  const handleSave = async () => {
    if (!canSave) {
      setError("Kérjük töltsd ki a kötelező mezőket: jármű, cím, dátum, futás km.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        vehicleId,
        type,
        title,
        date,
        mileageKm: Number(mileageKm),
        vehiclePlateNumber: vehicle?.plates,
        vehicleName: vehicle?.name,
      };
      if (notes.trim()) payload.notes = notes.trim();
      if (nextCheckDate) payload.nextCheckDate = nextCheckDate;
      if (nextCheckMileageKm && String(nextCheckMileageKm).trim()) {
        payload.nextCheckMileageKm = Number(nextCheckMileageKm);
      }
      if (costHUF && String(costHUF).trim()) payload.costHUF = Number(costHUF);
      if (servicePartner.trim()) payload.servicePartner = servicePartner.trim();
      if (editing?._id) payload.id = String(editing._id);

      const ok = await onSave(payload);
      if (ok) {
        setSaving(false);
        onClose();
      } else {
        setError("Hiba a mentés közben. Kérlek próbáld újra.");
        setSaving(false);
      }
    } catch (e: any) {
      setError(e?.message ?? "Hiba a mentés közben.");
      setSaving(false);
    }
  };

  const headerTitle = editing
    ? `${getServiceTypeLabel(type)} szerkesztése`
    : mode === "oil"
    ? "Új olajcsere rekord"
    : mode === "tire"
    ? "Új gumicsere rekord"
    : "Új szerviz rekord";

  const TypeIcon = typeToIcon[type] ?? FileText;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" />
      <div
        className="relative z-10 w-full sm:max-w-lg bg-[#0F2338] rounded-t-3xl sm:rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.65)] border border-[#C9A962]/10 overflow-hidden animate-slide-up-bottom"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#C9A962]/10 flex items-start justify-between" style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}>
          <div className="flex items-start gap-3 pr-2">
            <div className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center border border-[#C9A962]/20 shadow-[0_6px_20px_rgba(201,169,98,0.15)]" style={{ backgroundColor: "rgba(201,169,98,0.12)" }}>
              <TypeIcon className="w-[20px] h-[20px] text-[#C9A962]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black tracking-[0.22em] text-[#C9A962] uppercase">
                {editing ? "Szerkesztés" : "Új rekord"}
              </div>
              <h2 className="text-[18px] font-[family-name:var(--font-serif)] font-bold text-[#F7F5F1] mt-0.5 leading-tight">
                {headerTitle}
              </h2>
              {vehicle && (
                <div className="text-[11.5px] text-[#F7F5F1]/55 font-semibold mt-1 truncate">
                  {vehicle.name} {vehicle.plates ? `· ${vehicle.plates}` : ""}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 shrink-0 rounded-xl border border-[#C9A962]/10 flex items-center justify-center text-[#F7F5F1]/60 hover:text-[#F7F5F1] hover:bg-[#C9A962]/5 transition-all active:scale-[0.96]"
            style={{ backgroundColor: "rgba(26,45,68,0.5)" }}
          >
            <X className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Type selection chips */}
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
                    onClick={() => setType(opt.value)}
                    className={`relative px-3 py-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-[0.98] ${
                      active
                        ? "text-[#0B1A2A] shadow-[0_6px_18px_rgba(201,169,98,0.25)]"
                        : "text-[#F7F5F1]/70 hover:text-[#F7F5F1]/95"
                    }`}
                    style={
                      active
                        ? {
                            background: "linear-gradient(135deg, #C9A962 0%, #d4bb7a 100%)",
                            borderColor: "transparent",
                          }
                        : {
                            backgroundColor: "rgba(26,45,68,0.4)",
                            borderColor: "rgba(201,169,98,0.12)",
                          }
                    }
                  >
                    <TIcon
                      className="w-[16px] h-[16px] shrink-0"
                      strokeWidth={2}
                    />
                    <span className="text-[11.5px] font-black tracking-wide truncate">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <Label icon={FileText}>Jármű *</Label>
            <div className="mt-2">
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30"
                style={{
                  backgroundColor: "rgba(26,45,68,0.5)",
                  borderColor: vehicleId ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
                  appearance: "none",
                }}
              >
                <option value="">Válassz járművet...</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} {v.plates ? `(${v.plates})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title + Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label icon={FileText}>Rövid cím *</Label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="pl. Teljes olajcsere szűrőkkel"
                className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30 placeholder:text-[#F7F5F1]/35"
                style={{
                  backgroundColor: "rgba(26,45,68,0.5)",
                  borderColor: title ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
                }}
              />
            </div>
            <div>
              <Label icon={Calendar}>Dátum *</Label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30"
                style={{
                  backgroundColor: "rgba(26,45,68,0.5)",
                  borderColor: date ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* Mileage + Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label icon={Gauge}>Futás km *</Label>
              <input
                type="number"
                min={0}
                value={mileageKm}
                onChange={(e) => setMileageKm(e.target.value)}
                placeholder="pl. 142500"
                className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30 placeholder:text-[#F7F5F1]/35"
                style={{
                  backgroundColor: "rgba(26,45,68,0.5)",
                  borderColor: mileageKm ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
                }}
              />
            </div>
            <div>
              <Label icon={DollarSign}>Költség (Ft)</Label>
              <input
                type="number"
                min={0}
                value={costHUF}
                onChange={(e) => setCostHUF(e.target.value)}
                placeholder="pl. 38900"
                className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30 placeholder:text-[#F7F5F1]/35"
                style={{
                  backgroundColor: "rgba(26,45,68,0.5)",
                  borderColor: costHUF ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
                }}
              />
            </div>
          </div>

          {/* Next check date + mileage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label icon={Calendar}>Következő ellenőrzés</Label>
              <input
                type="date"
                value={nextCheckDate}
                onChange={(e) => setNextCheckDate(e.target.value)}
                className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30"
                style={{
                  backgroundColor: "rgba(26,45,68,0.5)",
                  borderColor: nextCheckDate ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
                  colorScheme: "dark",
                }}
              />
            </div>
            <div>
              <Label icon={Gauge}>Következő km-hanál</Label>
              <input
                type="number"
                min={0}
                value={nextCheckMileageKm}
                onChange={(e) => setNextCheckMileageKm(e.target.value)}
                placeholder="pl. 155000"
                className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30 placeholder:text-[#F7F5F1]/35"
                style={{
                  backgroundColor: "rgba(26,45,68,0.5)",
                  borderColor: nextCheckMileageKm ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
                }}
              />
            </div>
          </div>

          {/* Service partner */}
          <div>
            <Label icon={Building}>Szerviz partner</Label>
            <input
              value={servicePartner}
              onChange={(e) => setServicePartner(e.target.value)}
              placeholder="pl. Mercedes-Benz Debrecen, Autósmester XYZ..."
              className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30 placeholder:text-[#F7F5F1]/35"
              style={{
                backgroundColor: "rgba(26,45,68,0.5)",
                borderColor: servicePartner ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
              }}
            />
          </div>

          {/* Notes */}
          <div>
            <Label icon={MessageSquare}>Megjegyzés</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Mit csináltáltak pontosan, műalkatrész, szűrő típusa..."
              className="mt-2 w-full px-4 py-3.5 rounded-2xl text-[14px] font-semibold text-[#F7F5F1] border transition-all focus:outline-none focus:ring-2 focus:ring-[#C9A962]/30 placeholder:text-[#F7F5F1]/35 resize-none"
              style={{
                backgroundColor: "rgba(26,45,68,0.5)",
                borderColor: notes ? "rgba(201,169,98,0.4)" : "rgba(201,169,98,0.12)",
              }}
            />
          </div>

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
            className="px-4 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.16em] border border-[#C9A962]/10 text-[#F7F5F1]/70 hover:text-[#F7F5F1] hover:bg-[#C9A962]/5 transition-all active:scale-[0.97] shrink-0"
            style={{ backgroundColor: "rgba(26,45,68,0.4)" }}
          >
            Mégse
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_10px_26px_-8px_rgba(201,169,98,0.5)]"
            style={{
              background: "linear-gradient(135deg, #C9A962 0%, #d4bb7a 100%)",
              color: "#0B1A2A",
            }}
          >
            {saving ? (
              <Save className="w-[16px] h-[16px] animate-spin" strokeWidth={2.4} />
            ) : (
              <Save className="w-[16px] h-[16px]" strokeWidth={2.4} />
            )}
            {editing ? "Mentés" : "Rögzítés"}
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

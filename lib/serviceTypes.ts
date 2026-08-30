export type ServiceRecordType =
  | "olajcsere"
  | "gumicsere"
  | "muszaki_vizsga"
  | "szerviz_altalanos"
  | "fekbetisztitas"
  | "futomu_frissites"
  | "tomegkozlekedesi_engedely"
  | "egyeb";

export interface ServiceRecordMeta {
  vehicleId: string | unknown;
  vehiclePlateNumber?: string;
  vehicleName?: string;
  type: ServiceRecordType;
  title: string;
  date: string;
  mileageKm: number;
  notes?: string;
  nextCheckDate?: string;
  nextCheckMileageKm?: number;
  costHUF?: number;
  servicePartner?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const SERVICE_TYPE_LABELS: Record<ServiceRecordType, string> = {
  olajcsere: "Olajcsere",
  gumicsere: "Gumicsere",
  muszaki_vizsga: "Műszaki vizsga",
  szerviz_altalanos: "Általános szerviz",
  fekbetisztitas: "Fékbetisztítás",
  futomu_frissites: "Fűtőmű szerviz",
  tomegkozlekedesi_engedely: "Tömegk. engedély",
  egyeb: "Egyéb",
};

export const getServiceTypeLabel = (t: ServiceRecordType): string =>
  SERVICE_TYPE_LABELS[t] ?? "Egyéb";

export const SERVICE_TYPE_OPTIONS: { value: ServiceRecordType; label: string }[] = (
  Object.keys(SERVICE_TYPE_LABELS) as ServiceRecordType[]
).map((k) => ({
  value: k,
  label: SERVICE_TYPE_LABELS[k],
}));

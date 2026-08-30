import { ObjectId } from "mongodb";
import { getMongoDb } from "./mongodb";
import { ServiceRecordType, getServiceTypeLabel, SERVICE_TYPE_OPTIONS, ServiceRecordMeta } from "./serviceTypes";

export type { ServiceRecordType };
export { getServiceTypeLabel, SERVICE_TYPE_OPTIONS };

export interface ServiceRecord extends Omit<ServiceRecordMeta, "vehicleId" | "createdAt" | "updatedAt"> {
  _id?: ObjectId;
  vehicleId: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTION = "service_records";

async function getCollection() {
  const db = await getMongoDb();
  return db.collection<ServiceRecord>(COLLECTION);
}

export async function getAllServiceRecords(): Promise<ServiceRecord[]> {
  const col = await getCollection();
  return col.find({}).sort({ date: -1 }).toArray();
}

export async function getServiceRecordsByVehicle(
  vehicleId: string | ObjectId
): Promise<ServiceRecord[]> {
  const vId = typeof vehicleId === "string" ? new ObjectId(vehicleId) : vehicleId;
  const col = await getCollection();
  return col.find({ vehicleId: vId }).sort({ date: -1 }).toArray();
}

export async function getServiceRecordsByType(type: ServiceRecordType): Promise<ServiceRecord[]> {
  const col = await getCollection();
  return col.find({ type }).sort({ date: -1 }).toArray();
}

export async function createServiceRecord(input: {
  vehicleId: string;
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
}): Promise<ServiceRecord> {
  const col = await getCollection();
  const record: ServiceRecord = {
    ...input,
    vehicleId: new ObjectId(input.vehicleId),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const res = await col.insertOne(record);
  return { ...record, _id: res.insertedId };
}

export async function updateServiceRecord(
  id: string,
  patch: Partial<ServiceRecord>
): Promise<boolean> {
  const col = await getCollection();
  const res = await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } }
  );
  return res.modifiedCount > 0;
}

export async function deleteServiceRecord(id: string): Promise<boolean> {
  const col = await getCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

export interface ServiceSummary {
  vehicleId: string;
  plateNumber?: string;
  vehicleName?: string;
  lastOilChange?: ServiceRecord;
  lastTireChange?: ServiceRecord;
  lastTechnical?: ServiceRecord;
  upcomingCount: number;
}

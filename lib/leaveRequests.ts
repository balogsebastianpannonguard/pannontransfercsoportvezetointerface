import { ObjectId } from "mongodb";
import { getMongoDb } from "./mongodb";

export type LeaveRequestStatus = "pending" | "approved" | "rejected";
export type LeaveRequestType = "fizetett" | "betegseg" | "rendkivuli" | "egyeb";

export interface LeaveRequest {
  _id?: ObjectId | string;
  driverName: string;
  driverEmail?: string;
  driverPhone?: string;
  vehicleName?: string;
  type: LeaveRequestType;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: LeaveRequestStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNote?: string;
  createdAt: number;
  updatedAt: number;
}

const COLLECTION = "leave_requests";

export const LEAVE_TYPE_LABELS: Record<LeaveRequestType, string> = {
  fizetett: "Fizetett szabadság",
  betegseg: "Betegszabadság",
  rendkivuli: "Rendkívüli szabadság",
  egyeb: "Egyéb",
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pending: "Függőben",
  approved: "Jóváhagyva",
  rejected: "Elutasítva",
};

async function getCollection() {
  const db = await getMongoDb();
  return db.collection<LeaveRequest>(COLLECTION);
}

export async function listLeaveRequests(filter?: {
  status?: LeaveRequestStatus;
  driverEmail?: string;
}): Promise<LeaveRequest[]> {
  const col = await getCollection();
  const query: Record<string, any> = {};
  if (filter?.status) query.status = filter.status;
  if (filter?.driverEmail) query.driverEmail = filter.driverEmail;
  const docs = await col.find(query).sort({ createdAt: -1 }).toArray();
  return docs.map((d) => ({ ...d, _id: d._id?.toString() })) as LeaveRequest[];
}

export async function createLeaveRequest(
  data: Omit<LeaveRequest, "_id" | "createdAt" | "updatedAt" | "status">
): Promise<LeaveRequest> {
  const col = await getCollection();
  const now = Date.now();
  const record: LeaveRequest = {
    ...data,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(record as any);
  return { ...record, _id: res.insertedId.toString() };
}

export async function updateLeaveRequestStatus(
  id: string,
  status: LeaveRequestStatus,
  reviewedBy: string,
  reviewNote?: string
): Promise<boolean> {
  const col = await getCollection();
  const res = await col.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        reviewedBy,
        reviewNote: reviewNote ?? "",
        reviewedAt: Date.now(),
        updatedAt: Date.now(),
      },
    }
  );
  return res.modifiedCount > 0;
}

export async function deleteLeaveRequest(id: string): Promise<boolean> {
  const col = await getCollection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

export async function getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) return null;
  return { ...doc, _id: doc._id.toString() } as LeaveRequest;
}

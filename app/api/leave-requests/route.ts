import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../lib/auth";
import {
  listLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
  deleteLeaveRequest,
  type LeaveRequestStatus,
  type LeaveRequestType,
} from "../../../lib/leaveRequests";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await verifyToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as LeaveRequestStatus | null;
  const driverEmail = url.searchParams.get("driverEmail") || undefined;

  try {
    const requests = await listLeaveRequests({ status: status ?? undefined, driverEmail });
    const pending = requests.filter((r) => r.status === "pending").length;
    return NextResponse.json({ ok: true, requests, pending });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Szerver hiba" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // POST is allowed without auth for drivers to submit requests
  try {
    const body = await request.json();
    if (!body.driverName || !body.startDate || !body.endDate || !body.type) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó kötelező mezők: driverName, startDate, endDate, type" },
        { status: 400 }
      );
    }
    const startMs = new Date(body.startDate).getTime();
    const endMs = new Date(body.endDate).getTime();
    const days = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);

    const record = await createLeaveRequest({
      driverName: body.driverName,
      driverEmail: body.driverEmail,
      driverPhone: body.driverPhone,
      vehicleName: body.vehicleName,
      type: body.type as LeaveRequestType,
      startDate: body.startDate,
      endDate: body.endDate,
      days,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, record }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Szerver hiba" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let user: any;
  try {
    user = await verifyToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Hiányzó id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const status = body.status as LeaveRequestStatus;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Érvénytelen státusz" }, { status: 400 });
    }
    const ok = await updateLeaveRequestStatus(id, status, user.name || user.email, body.reviewNote);
    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Szerver hiba" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await verifyToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "Hiányzó id" }, { status: 400 });
  }

  try {
    const ok = await deleteLeaveRequest(id);
    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Szerver hiba" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { verifyToken } from "../../../lib/auth";
import {
  createServiceRecord,
  deleteServiceRecord,
  getAllServiceRecords,
  getServiceRecordsByType,
  getServiceRecordsByVehicle,
  ServiceRecordType,
  updateServiceRecord,
} from "../../../lib/serviceRecords";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const type = url.searchParams.get("type");

  try {
    let records;
    if (vehicleId) {
      records = await getServiceRecordsByVehicle(vehicleId);
    } else if (type) {
      records = await getServiceRecordsByType(type as ServiceRecordType);
    } else {
      records = await getAllServiceRecords();
    }
    return NextResponse.json({ ok: true, records });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Nem sikerült betölteni a szerviz rekordokat." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await verifyToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.vehicleId || !body.type || !body.title || !body.date) {
      return NextResponse.json(
        { ok: false, error: "Hiányzó kötelező mezők: jármű, típus, cím, dátum." },
        { status: 400 }
      );
    }
    const record = await createServiceRecord(body);
    return NextResponse.json({ ok: true, record });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Nem sikerült létrehozni a rekordot." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await verifyToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Hiányzó id" }, { status: 400 });
    }
    const body = await request.json();
    const ok = await updateServiceRecord(id, body);
    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Nem sikerült frissíteni." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyToken();
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Hiányzó id" }, { status: 400 });
    }
    const ok = await deleteServiceRecord(id);
    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Nem sikerült törölni." },
      { status: 500 }
    );
  }
}

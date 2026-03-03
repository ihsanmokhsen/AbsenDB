import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AttendanceStatus } from "@/lib/types";

const STATUS_VALUES: AttendanceStatus[] = [
  "hadir",
  "sakit",
  "izin",
  "cuti",
  "terlambat",
  "tugas",
  "tubel",
];

function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !isValidDate(date)) {
    return NextResponse.json({ message: "Tanggal tidak valid." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("attendance_records")
      .select("employee_id, status")
      .eq("attendance_date", date);

    if (error) {
      return NextResponse.json(
        { message: "Gagal mengambil data absensi." },
        { status: 500 }
      );
    }

    const records: Record<string, AttendanceStatus> = {};
    for (const row of data ?? []) {
      if (STATUS_VALUES.includes(row.status as AttendanceStatus)) {
        records[row.employee_id] = row.status as AttendanceStatus;
      }
    }

    return NextResponse.json({ date, records }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Konfigurasi Supabase belum lengkap." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: {
    date?: string;
    records?: Record<string, AttendanceStatus>;
  } | null = null;

  try {
    body = (await request.json()) as {
      date?: string;
      records?: Record<string, AttendanceStatus>;
    };
  } catch {
    return NextResponse.json(
      { message: "Format payload tidak valid." },
      { status: 400 }
    );
  }

  try {
    const date = body?.date;
    const records = body?.records;

    if (!date || !isValidDate(date) || !records) {
      return NextResponse.json({ message: "Payload tidak valid." }, { status: 400 });
    }

    const rows = Object.entries(records)
      .filter(([, status]) => STATUS_VALUES.includes(status))
      .map(([employee_id, status]) => ({
        attendance_date: date,
        employee_id,
        status,
        updated_by: session.name,
      }));

    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("attendance_records")
      .upsert(rows, { onConflict: "attendance_date,employee_id" });

    if (error) {
      return NextResponse.json(
        { message: "Gagal menyimpan absensi." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (
      message.includes("SUPABASE_URL") ||
      message.includes("SUPABASE_SERVICE_ROLE_KEY")
    ) {
      return NextResponse.json(
        { message: "Konfigurasi Supabase belum lengkap." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan absensi." },
      { status: 500 }
    );
  }
}

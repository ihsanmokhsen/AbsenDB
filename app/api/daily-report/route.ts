import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { employees, departments } from "@/data/employees";
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

function buildDefaultRecords() {
  const records: Record<string, AttendanceStatus> = {};
  for (const employee of employees) {
    records[employee.id] = "hadir";
  }
  return records;
}

function buildSummary(records: Record<string, AttendanceStatus>) {
  const values = Object.values(records);
  const hadir = values.filter((s) => s === "hadir").length;
  const sakit = values.filter((s) => s === "sakit").length;
  const izin = values.filter((s) => s === "izin").length;
  const cuti = values.filter((s) => s === "cuti").length;
  const terlambat = values.filter((s) => s === "terlambat").length;
  const tugas = values.filter((s) => s === "tugas").length;
  const tubel = values.filter((s) => s === "tubel").length;

  return {
    total: employees.length,
    hadir,
    kurang: Math.max(employees.length - hadir, 0),
    sakit,
    izin,
    cuti,
    terlambat,
    tugas,
    tubel,
  };
}

function buildAbsentByDepartment(records: Record<string, AttendanceStatus>) {
  const statusLabels: Record<AttendanceStatus, string> = {
    hadir: "Hadir",
    sakit: "Sakit",
    izin: "Izin",
    cuti: "Cuti",
    terlambat: "Terlambat",
    tugas: "Tugas",
    tubel: "Tubel",
  };

  return departments
    .map((department) => {
      const employeeRows = employees
        .filter((emp) => emp.department === department)
        .filter((emp) => (records[emp.id] || "hadir") !== "hadir")
        .map((emp) => {
          const status = records[emp.id] || "hadir";
          return {
            name: emp.name,
            status: statusLabels[status],
          };
        });

      return {
        department,
        employees: employeeRows,
      };
    })
    .filter((item) => item.employees.length > 0);
}

function buildReportText(
  date: string,
  generatedBy: string,
  summary: ReturnType<typeof buildSummary>
) {
  const [year, month, day] = date.split("-").map(Number);
  const formattedDate = new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `Hari/Tanggal : ${formattedDate}
Petugas : ${generatedBy}
Jumlah : ${summary.total}
Kurang : ${summary.kurang}
Hadir : ${summary.hadir}
Keterangan :
- Sakit : ${summary.sakit}
- Izin : ${summary.izin}
- Cuti : ${summary.cuti}
- Terlambat : ${summary.terlambat}
- Tugas : ${summary.tugas}
- Tubel : ${summary.tubel}`;
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
      .from("daily_reports")
      .select("report_date, generated_by, generated_at")
      .eq("report_date", date)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { message: "Gagal mengambil status rekap harian." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        exists: !!data,
        report: data || null,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: "Konfigurasi Supabase belum lengkap." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { date?: string } | null = null;

  try {
    body = (await request.json()) as { date?: string };
  } catch {
    return NextResponse.json({ message: "Format payload tidak valid." }, { status: 400 });
  }

  const date = body?.date;
  if (!date || !isValidDate(date)) {
    return NextResponse.json({ message: "Tanggal tidak valid." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    const { data: attendanceRows, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("employee_id, status")
      .eq("attendance_date", date);

    if (attendanceError) {
      return NextResponse.json(
        { message: "Gagal mengambil data absensi harian." },
        { status: 500 }
      );
    }

    const records = buildDefaultRecords();
    for (const row of attendanceRows ?? []) {
      const status = row.status as AttendanceStatus;
      if (records[row.employee_id] && STATUS_VALUES.includes(status)) {
        records[row.employee_id] = status;
      }
    }

    const summary = buildSummary(records);
    const absentByDepartment = buildAbsentByDepartment(records);
    const reportText = buildReportText(date, session.name, summary);

    const { error } = await supabase.from("daily_reports").insert({
      report_date: date,
      generated_by: session.name,
      summary_json: summary,
      records_json: records,
      report_text: reportText,
      absent_by_department: absentByDepartment,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { message: "Rekapan hari ini sudah disimpan." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { message: "Gagal menyimpan rekap harian." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, summary }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Konfigurasi Supabase belum lengkap." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    const { data: existing, error: readError } = await supabase
      .from("daily_reports")
      .select("generated_by")
      .eq("report_date", date)
      .maybeSingle();

    if (readError) {
      return NextResponse.json(
        { message: "Gagal memeriksa hak hapus rekap." },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ message: "Rekap tidak ditemukan." }, { status: 404 });
    }

    const additionalAllowed = (process.env.REPORT_DELETE_ADMIN_NAMES || "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    const canDelete =
      existing.generated_by === session.name || additionalAllowed.includes(session.name);

    if (!canDelete) {
      return NextResponse.json(
        { message: "Anda tidak berhak menghapus rekap ini." },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("daily_reports")
      .delete()
      .eq("report_date", date);

    if (error) {
      return NextResponse.json(
        { message: "Gagal menghapus rekap harian." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Konfigurasi Supabase belum lengkap." },
      { status: 500 }
    );
  }
}

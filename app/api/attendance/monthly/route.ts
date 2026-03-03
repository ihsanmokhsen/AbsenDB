import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { AttendanceStatus } from "@/lib/types";
import { employees } from "@/data/employees";

const STATUS_VALUES: AttendanceStatus[] = [
  "hadir",
  "sakit",
  "izin",
  "cuti",
  "terlambat",
  "tugas",
  "tubel",
];

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

function getMonthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);

  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

type DailyReportRow = {
  report_date: string;
  records_json: Record<string, AttendanceStatus> | null;
};

export async function GET(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month || !isValidMonth(month)) {
    return NextResponse.json({ message: "Format bulan tidak valid." }, { status: 400 });
  }

  const { start, end } = getMonthRange(month);

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("daily_reports")
      .select("report_date, records_json")
      .gte("report_date", start)
      .lt("report_date", end)
      .order("report_date", { ascending: true });

    if (error) {
      return NextResponse.json(
        { message: "Gagal mengambil data rekap bulanan." },
        { status: 500 }
      );
    }

    const recapMap: Record<
      string,
      {
        employeeId: string;
        hadir: number;
        sakit: number;
        izin: number;
        cuti: number;
        terlambat: number;
        tugas: number;
        tubel: number;
        totalTidakHadir: number;
        tanggalTidakHadir: string[];
      }
    > = {};

    for (const employee of employees) {
      recapMap[employee.id] = {
        employeeId: employee.id,
        hadir: 0,
        sakit: 0,
        izin: 0,
        cuti: 0,
        terlambat: 0,
        tugas: 0,
        tubel: 0,
        totalTidakHadir: 0,
        tanggalTidakHadir: [],
      };
    }

    const rows = (data ?? []) as DailyReportRow[];
    const recordedDates = new Set<string>();

    for (const row of rows) {
      recordedDates.add(row.report_date);
      const records = row.records_json || {};
      if (Object.keys(records).length === 0) {
        continue;
      }

      for (const employee of employees) {
        const status = records[employee.id] || "terlambat";
        if (!STATUS_VALUES.includes(status)) continue;

        const target = recapMap[employee.id];
        target[status] += 1;

        if (status !== "hadir") {
          target.totalTidakHadir += 1;
          target.tanggalTidakHadir.push(row.report_date);
        }
      }
    }

    const rankings = Object.values(recapMap).sort((a, b) => {
      if (b.totalTidakHadir !== a.totalTidakHadir) {
        return b.totalTidakHadir - a.totalTidakHadir;
      }
      return a.employeeId.localeCompare(b.employeeId);
    });

    return NextResponse.json(
      {
        month,
        totalHariTercatat: recordedDates.size,
        rankings,
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

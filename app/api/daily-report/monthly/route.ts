import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
      .select("report_date, generated_by, generated_at, summary_json")
      .gte("report_date", start)
      .lt("report_date", end)
      .order("report_date", { ascending: true });

    if (error) {
      return NextResponse.json(
        { message: "Gagal mengambil daftar rekap harian." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        month,
        reports: data ?? [],
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

import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  let body: { name?: string; password?: string } | null = null;
  try {
    body = (await request.json()) as {
      name?: string;
      password?: string;
    };
  } catch {
    return NextResponse.json(
      { message: "Format request tidak valid." },
      { status: 400 }
    );
  }

  try {
    const name = body?.name?.trim();
    const password = body?.password;

    if (!name || !password) {
      return NextResponse.json(
        { message: "Nama petugas dan password wajib diisi." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc("verify_admin_login", {
      p_name: name,
      p_password: password,
    });

    if (error) {
      return NextResponse.json(
        { message: "Gagal memvalidasi login." },
        { status: 500 }
      );
    }

    const matchedName =
      Array.isArray(data) && data.length > 0
        ? (data[0] as { name?: string }).name
        : undefined;

    if (!matchedName) {
      return NextResponse.json({ message: "Password salah." }, { status: 401 });
    }

    const token = createSessionToken(matchedName);
    const response = NextResponse.json({ name: matchedName }, { status: 200 });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (
      message.includes("SUPABASE_URL") ||
      message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
      message.includes("APP_SESSION_SECRET")
    ) {
      return NextResponse.json(
        { message: "Konfigurasi server belum lengkap. Cek environment variables." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat proses login." },
      { status: 500 }
    );
  }
}

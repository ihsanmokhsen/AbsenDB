"use client";

import { useState, useEffect, useCallback } from "react";
import { employees, departments } from "@/data/employees";
import { AttendanceStatus } from "@/lib/types";
import { SummaryCards } from "@/components/summary-cards";
import { FieldAccordion } from "@/components/field-accordion";
import { ReportBox } from "@/components/report-box";
import { ReportDetailView } from "@/components/report-detail-view";
import { MonthlyRecapView } from "@/components/monthly-recap-view";
import { Button } from "@/components/ui/button";
import { Monitor, HelpCircle } from "lucide-react";
import Image from "next/image";
import { jsPDF } from "jspdf";

const ADMIN_NAMES = [
  "Aprianus Aryantho Rondak, S.STP",
  "Kristoforus R. Hayong, S.Kom., MM",
  "Marselinus Tahu Tetik",
  "Joachim A. K. Ulin, SM",
  "Sandy A. J. L. Pranadjaya, SH",
  "Melkisedek Koa, A.Md",
];

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDateKey = (dateKey: string) =>
  parseDateKey(dateKey).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function Home() {
  const [attendanceData, setAttendanceData] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [showDetailReport, setShowDetailReport] = useState(false);
  const [showMonthlyRecap, setShowMonthlyRecap] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDisplayMode, setIsDisplayMode] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [selectedAdminName, setSelectedAdminName] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [loggedAdminName, setLoggedAdminName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isDailyReportSaved, setIsDailyReportSaved] = useState(false);
  const [dailyReportInfo, setDailyReportInfo] = useState<{
    generated_by?: string;
    generated_at?: string;
  } | null>(null);
  const [dailyReportActionError, setDailyReportActionError] = useState("");
  const [dailyReportActionLoading, setDailyReportActionLoading] = useState(false);

  const getInitialAttendance = useCallback(() => {
    const initial: Record<string, AttendanceStatus> = {};
    employees.forEach((emp) => {
      initial[emp.id] = "terlambat";
    });
    return initial;
  }, []);

  const initializeAttendance = useCallback(() => {
    setAttendanceData(getInitialAttendance());
  }, [getInitialAttendance]);

  const loadAttendanceByDate = useCallback(
    async (dateKey: string) => {
      setCurrentDate(dateKey);
      setIsLoadingAttendance(true);
      setSaveStatus("idle");

      try {
        const response = await fetch(`/api/attendance?date=${dateKey}`, {
          cache: "no-store",
        });

        if (response.status === 401) {
          setLoggedAdminName("");
          initializeAttendance();
          return;
        }

        if (!response.ok) {
          initializeAttendance();
          return;
        }

        const data = (await response.json()) as {
          records?: Record<string, AttendanceStatus>;
        };

        const initial = getInitialAttendance();
        setAttendanceData({
          ...initial,
          ...(data.records || {}),
        });
      } catch {
        initializeAttendance();
      } finally {
        setIsLoadingAttendance(false);
      }
    },
    [getInitialAttendance, initializeAttendance]
  );

  useEffect(() => {
    const initializeSession = async () => {
      const today = getLocalDateKey();
      setCurrentDate(today);

      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await response.json()) as {
          authenticated?: boolean;
          name?: string;
        };

        if (response.ok && data.authenticated && data.name) {
          setLoggedAdminName(data.name);
          setSelectedAdminName(data.name);
          await loadAttendanceByDate(today);
        }
      } catch {
        // no-op
      } finally {
        setAuthReady(true);
      }
    };

    initializeSession();
  }, [loadAttendanceByDate]);

  useEffect(() => {
    if (!loggedAdminName) return;

    const timer = window.setInterval(() => {
      const today = getLocalDateKey();
      if (currentDate && currentDate !== today) {
        loadAttendanceByDate(today);
      }
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [currentDate, loggedAdminName, loadAttendanceByDate]);

  const loadDailyReportStatus = useCallback(
    async (dateKey: string) => {
      if (!loggedAdminName || !dateKey) return;

      try {
        const response = await fetch(`/api/daily-report?date=${dateKey}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          setIsDailyReportSaved(false);
          setDailyReportInfo(null);
          return;
        }

        const data = (await response.json()) as {
          exists?: boolean;
          report?: { generated_by?: string; generated_at?: string } | null;
        };

        setIsDailyReportSaved(Boolean(data.exists));
        setDailyReportInfo(data.report || null);
      } catch {
        setIsDailyReportSaved(false);
        setDailyReportInfo(null);
      }
    },
    [loggedAdminName]
  );

  useEffect(() => {
    if (!loggedAdminName || !currentDate) return;
    loadDailyReportStatus(currentDate);
  }, [loggedAdminName, currentDate, loadDailyReportStatus]);

  useEffect(() => {
    if (!loggedAdminName || !currentDate || isLoadingAttendance) return;
    if (Object.keys(attendanceData).length === 0) return;

    setSaveStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/attendance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: currentDate, records: attendanceData }),
        });

        if (!response.ok) {
          throw new Error("save failed");
        }

        setSaveStatus("saved");
        window.setTimeout(() => {
          setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
        }, 1200);
      } catch {
        setSaveStatus("error");
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [attendanceData, currentDate, loggedAdminName, isLoadingAttendance]);

  const handleStatusChange = (employeeId: string, status: AttendanceStatus) => {
    setAttendanceData((prev) => ({
      ...prev,
      [employeeId]: status,
    }));
  };

  const handleSetAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    employees.forEach((emp) => {
      updated[emp.id] = "hadir";
    });
    setAttendanceData(updated);
  };

  const handleReset = () => {
    initializeAttendance();
  };

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedAdminName) {
      setLoginError("Pilih nama petugas terlebih dahulu.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedAdminName,
          password: adminPasswordInput,
        }),
      });

      const data = (await response.json()) as { message?: string; name?: string };

      if (!response.ok) {
        setLoginError(data.message || "Login gagal.");
        return;
      }

      setLoggedAdminName(data.name || selectedAdminName);
      setLoginError("");
      await loadAttendanceByDate(getLocalDateKey());
    } catch {
      setLoginError("Gagal terhubung ke server.");
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // no-op
    }

    setLoggedAdminName("");
    setAdminPasswordInput("");
    setLoginError("");
    setSaveStatus("idle");
    setIsDailyReportSaved(false);
    setDailyReportInfo(null);
    setDailyReportActionError("");
    initializeAttendance();
  };

  const handleSaveDailyReport = async () => {
    if (!currentDate) return;
    setDailyReportActionLoading(true);
    setDailyReportActionError("");

    try {
      const syncResponse = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: currentDate, records: attendanceData }),
      });
      if (!syncResponse.ok) {
        const syncData = (await syncResponse.json()) as { message?: string };
        setDailyReportActionError(syncData.message || "Gagal sinkronisasi absensi terbaru.");
        return;
      }

      const response = await fetch("/api/daily-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: currentDate }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        if (response.status === 409) {
          window.alert(
            "Rekapan hari ini sudah tersimpan. Hapus dulu jika ingin generate ulang."
          );
          return;
        }
        setDailyReportActionError(data.message || "Gagal menyimpan rekap harian.");
        return;
      }

      setIsDailyReportSaved(true);
      await loadDailyReportStatus(currentDate);
      setShowReportModal(false);
    } catch {
      setDailyReportActionError("Gagal terhubung ke server.");
    } finally {
      setDailyReportActionLoading(false);
    }
  };

  const handleDeleteDailyReport = async () => {
    if (!currentDate) return;
    const confirmed = window.confirm(
      "Hapus rekap harian tanggal ini? Setelah dihapus, Anda bisa generate ulang."
    );
    if (!confirmed) return;

    setDailyReportActionLoading(true);
    setDailyReportActionError("");
    try {
      const response = await fetch(`/api/daily-report?date=${currentDate}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setDailyReportActionError(data.message || "Gagal menghapus rekap harian.");
        return;
      }

      setIsDailyReportSaved(false);
      setDailyReportInfo(null);
    } catch {
      setDailyReportActionError("Gagal terhubung ke server.");
    } finally {
      setDailyReportActionLoading(false);
    }
  };

  const handleExportDailyPDF = () => {
    if (!currentDate) return;

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("BPAD PROVINSI NTT", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text("LAPORAN ABSENSI APEL PAGI", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 8;

      const dateStr = formatDateKey(currentDate);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Hari/Tanggal: ${dateStr}`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      const splitText = pdf.splitTextToSize(reportText, pageWidth - 20);
      pdf.setFontSize(11);
      pdf.text(splitText, 10, yPosition);
      yPosition += splitText.length * 5 + 10;

      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 15;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("RINCIAN PER BIDANG", 10, yPosition);
      yPosition += 10;

      for (const dept of departments) {
        const deptEmployees = employees
          .filter((e) => e.department === dept)
          .filter((emp) => (attendanceData[emp.id] || "terlambat") !== "hadir");

        if (deptEmployees.length === 0) continue;

        if (yPosition > pageHeight - 50) {
          pdf.addPage();
          yPosition = 15;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${dept} (${deptEmployees.length} orang)`, 10, yPosition);
        yPosition += 6;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);

        deptEmployees.forEach((emp) => {
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = 15;
          }

          const status = attendanceData[emp.id] || "terlambat";
          const statusText = status.charAt(0).toUpperCase() + status.slice(1);
          pdf.text(`• ${emp.name} - ${statusText}`, 15, yPosition);
          yPosition += 4;
        });

        yPosition += 3;
      }

      pdf.save(`Laporan_Absensi_${currentDate}.pdf`);
    } catch {
      window.alert("Gagal membuat PDF. Silakan coba lagi.");
    }
  };

  const stats = {
    total: employees.length,
    hadir: Object.values(attendanceData).filter((s) => s === "hadir").length || 0,
    sakit: Object.values(attendanceData).filter((s) => s === "sakit").length || 0,
    izin: Object.values(attendanceData).filter((s) => s === "izin").length || 0,
    cuti: Object.values(attendanceData).filter((s) => s === "cuti").length || 0,
    terlambat: Object.values(attendanceData).filter((s) => s === "terlambat").length || 0,
    tugas: Object.values(attendanceData).filter((s) => s === "tugas").length || 0,
    tubel: Object.values(attendanceData).filter((s) => s === "tubel").length || 0,
  };

  const totalKurang = stats.total - stats.hadir >= 0 ? stats.total - stats.hadir : 0;

  const reportDate = currentDate ? formatDateKey(currentDate) : "-";

  const summaryStats = {
    total: stats.total,
    hadir: stats.hadir,
    kurang: totalKurang,
    sakit: stats.sakit,
    izin: stats.izin,
    cuti: stats.cuti,
    terlambat: stats.terlambat,
    tugas: stats.tugas,
    tubel: stats.tubel,
  };

  const absentStatusLabels: Record<AttendanceStatus, string> = {
    hadir: "Hadir",
    sakit: "Sakit",
    izin: "Izin",
    cuti: "Cuti",
    terlambat: "Terlambat",
    tugas: "Tugas",
    tubel: "Tubel",
  };

  const absentByDepartment = departments
    .map((department) => {
      const employeesInDepartment = employees
        .filter((emp) => emp.department === department)
        .filter((emp) => (attendanceData[emp.id] || "terlambat") !== "hadir")
        .map((emp) => {
          const status = attendanceData[emp.id] || "terlambat";
          return {
            name: emp.name,
            status: absentStatusLabels[status],
          };
        });

      return {
        department,
        employees: employeesInDepartment,
      };
    })
    .filter((item) => item.employees.length > 0);

  const reportText = `Hari/Tanggal : ${reportDate}
Petugas : ${loggedAdminName || "-"}
Jumlah : ${stats.total}
Kurang : ${totalKurang}
Hadir : ${stats.hadir}
Keterangan :
- Sakit : ${stats.sakit}
- Izin : ${stats.izin}
- Cuti : ${stats.cuti}
- Terlambat : ${stats.terlambat}
- Tugas : ${stats.tugas}
- Tubel : ${stats.tubel}`;

  if (!authReady) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
        <div className="max-w-md mx-auto mt-10 text-center text-slate-600">Memuat sesi...</div>
      </main>
    );
  }

  if (showDetailReport) {
    return (
      <ReportDetailView
        reportText={reportText}
        attendanceData={attendanceData}
        currentDate={currentDate}
        onClose={() => setShowDetailReport(false)}
      />
    );
  }

  if (showMonthlyRecap) {
    return <MonthlyRecapView onClose={() => setShowMonthlyRecap(false)} />;
  }

  if (!loggedAdminName) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-sm">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Image
                  src="/logo-bpad.png"
                  alt="Logo Absensi Apel Pagi BPAD Provinsi NTT (Plus Rekapan)"
                  width={64}
                  height={68}
                  className="h-16 w-16 object-contain"
                  priority
                />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Login Admin</h1>
              <p className="text-sm text-slate-600">
                Pilih nama petugas lalu masukkan password.
              </p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nama Petugas</label>
                <select
                  value={selectedAdminName}
                  onChange={(e) => setSelectedAdminName(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                >
                  <option value="">Pilih petugas</option>
                  {ADMIN_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                  placeholder="Masukkan password"
                />
              </div>

              {loginError && <p className="text-sm text-red-600">{loginError}</p>}

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Login
              </Button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (isDisplayMode) {
    return (
      <div className="w-full h-screen bg-white flex flex-col items-center justify-center p-3 md:p-8 overflow-hidden">
        <button
          onClick={() => setIsDisplayMode(false)}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
        >
          ✕
        </button>
        <ReportBox
          summary={summaryStats}
          reportDateText={reportDate}
          officerName={loggedAdminName}
          isDisplayMode={true}
          absentByDepartment={absentByDepartment}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-bpad.png"
              alt="Logo Absensi Apel Pagi BPAD Provinsi NTT (Plus Rekapan)"
              width={72}
              height={76}
              className="h-16 w-16 md:h-[72px] md:w-[72px] object-contain"
              priority
            />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">
                Absensi Apel Pagi BPAD Provinsi NTT (Plus Rekapan)
              </h1>
              <p className="text-slate-600">{currentDate ? formatDateKey(currentDate) : "-"}</p>
              <p className="text-sm text-slate-600">
                Petugas: <span className="font-semibold">{loggedAdminName}</span>
              </p>
              <p className="text-xs text-slate-500">
                {isLoadingAttendance
                  ? "Memuat data absensi..."
                  : saveStatus === "saving"
                  ? "Menyimpan perubahan..."
                  : saveStatus === "saved"
                  ? "Perubahan tersimpan"
                  : saveStatus === "error"
                  ? "Gagal menyimpan. Coba lagi."
                  : ""}
              </p>
              {isDailyReportSaved && (
                <p className="text-xs text-orange-700">
                  Rekap harian sudah disimpan
                  {dailyReportInfo?.generated_by
                    ? ` oleh ${dailyReportInfo.generated_by}`
                    : ""}.
                </p>
              )}
              {dailyReportActionError && (
                <p className="text-xs text-red-600">{dailyReportActionError}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={() => setShowMonthlyRecap(true)}
              className="bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300"
            >
              Rekapan Bulan
            </Button>
            {isDailyReportSaved && (
              <Button
                onClick={handleDeleteDailyReport}
                disabled={dailyReportActionLoading}
                variant="outline"
                className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
              >
                Hapus Rekapan
              </Button>
            )}
            <Button onClick={() => setShowGuide(true)} variant="outline" className="bg-transparent">
              <HelpCircle className="w-5 h-5 mr-2" />
              Panduan
            </Button>
            <Button onClick={handleAdminLogout} variant="outline" className="bg-transparent">
              Logout
            </Button>
          </div>
        </div>

        <SummaryCards
          total={stats.total}
          hadir={stats.hadir}
          sakit={stats.sakit}
          izin={stats.izin}
          cuti={stats.cuti}
          terlambat={stats.terlambat}
          tugas={stats.tugas}
          tubel={stats.tubel}
        />

        <div className="sticky top-0 z-40 bg-gradient-to-b from-slate-50 to-white pb-4 mb-4 flex flex-wrap gap-3 pt-4 border-b border-slate-200">
          <Button onClick={handleSetAllPresent} className="bg-green-600 hover:bg-green-700 text-white">
            Set Semua Hadir
          </Button>
          <Button onClick={handleReset} variant="outline" className="bg-transparent">
            Reset
          </Button>
          <Button
            onClick={() => {
              if (isDailyReportSaved) {
                window.alert(
                  "Rekapan hari ini sudah tersimpan. Hapus dulu jika ingin generate ulang."
                );
                return;
              }
              setDailyReportActionError("");
              setShowReportModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Generate Laporan
          </Button>
          <Button
            onClick={handleExportDailyPDF}
            variant="outline"
            className="bg-transparent"
          >
            PDF Hari Ini
          </Button>
          <Button onClick={() => setIsDisplayMode(true)} variant="outline" className="ml-auto bg-transparent">
            <Monitor className="w-4 h-4 mr-2" />
            Layar Apel
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Daftar Pegawai</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">ASN</h3>
              {departments.map((dept) => (
                <FieldAccordion
                  key={`asn-${dept}`}
                  department={dept}
                  employees={employees}
                  attendanceData={attendanceData}
                  onStatusChange={handleStatusChange}
                  employmentType="ASN"
                />
              ))}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">PPPK</h3>
              {departments.map((dept) => (
                <FieldAccordion
                  key={`pppk-${dept}`}
                  department={dept}
                  employees={employees}
                  attendanceData={attendanceData}
                  onStatusChange={handleStatusChange}
                  employmentType="PPPK"
                />
              ))}
            </div>
          </div>
        </div>

        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col min-h-0">
              <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Laporan Apel Pagi</h2>
                  <p className="text-slate-600">{currentDate ? formatDateKey(currentDate) : "-"}</p>
                </div>

                <ReportBox
                  summary={summaryStats}
                  reportDateText={reportDate}
                  officerName={loggedAdminName}
                  absentByDepartment={absentByDepartment}
                />
              </div>
              <div className="flex gap-3 p-6 pt-0 border-t border-slate-200 shrink-0">
                <Button
                  onClick={handleSaveDailyReport}
                  disabled={dailyReportActionLoading || isDailyReportSaved}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-300"
                >
                  {isDailyReportSaved
                    ? "Rekap Sudah Tersimpan"
                    : dailyReportActionLoading
                    ? "Menyimpan..."
                    : "Simpan Data di Rekapan Harian"}
                </Button>
                <Button
                  onClick={() => {
                    setShowReportModal(false);
                    setShowDetailReport(true);
                  }}
                  variant="outline"
                  className="flex-1 bg-transparent"
                >
                  Lihat Detail & Export
                </Button>
                <Button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}

        {showGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">Cara Menggunakan Aplikasi</h2>
                <button onClick={() => setShowGuide(false)} className="text-slate-500 hover:text-slate-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-lg min-w-[32px]">1.</span>
                    <p className="text-slate-700 pt-1">
                      <span className="font-semibold">Buka aplikasi, klik Reset.</span>
                      <br />
                      Pastikan semua pegawai dalam status default (Terlambat) sebelum memulai absensi.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-lg min-w-[32px]">2.</span>
                    <p className="text-slate-700 pt-1">
                      <span className="font-semibold">Panggil pegawai mulai dari Sekretariat sampai Aset 2.</span>
                      <br />
                      Centang pegawai yang hadir, atau pilih status lain (Sakit, Izin, Terlambat, Tugas, Tubel)
                      sesuai kebutuhan.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-lg min-w-[32px]">3.</span>
                    <p className="text-slate-700 pt-1">
                      <span className="font-semibold">Klik Generate Laporan untuk preview laporan hari ini.</span>
                      <br />
                      Di dalam modal, Anda bisa lihat ringkasan status dan lanjut ke detail.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-lg min-w-[32px]">4.</span>
                    <p className="text-slate-700 pt-1">
                      <span className="font-semibold">Klik Simpan Data di Rekapan Harian untuk mengunci laporan hari ini.</span>
                      <br />
                      Setelah tersimpan, tanggal yang sama tidak bisa generate ulang kecuali rekap dihapus.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-lg min-w-[32px]">5.</span>
                    <p className="text-slate-700 pt-1">
                      <span className="font-semibold">Gunakan tombol PDF Hari Ini untuk export laporan harian ke PDF.</span>
                      <br />
                      Gunakan tombol Layar Apel untuk tampilan presentasi saat apel.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-blue-600 font-bold text-lg min-w-[32px]">6.</span>
                    <p className="text-slate-700 pt-1">
                      <span className="font-semibold">Buka Rekapan Bulan untuk monitoring per pegawai dan per hari.</span>
                      <br />
                      Dari halaman ini Anda bisa export PDF dan Excel bulanan (termasuk rekap per bidang).
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Tip:</span> Data absensi auto-save ke database Supabase.
                    Rekapan harian adalah snapshot resmi untuk laporan bulanan.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-end">
                <Button onClick={() => setShowGuide(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Mengerti
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

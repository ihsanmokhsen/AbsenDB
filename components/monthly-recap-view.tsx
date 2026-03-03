"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { employees, departments } from "@/data/employees";
import { jsPDF } from "jspdf";

interface MonthlyRecapItem {
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

interface MonthlyRecapResponse {
  month: string;
  totalHariTercatat: number;
  rankings: MonthlyRecapItem[];
}

interface DailyReportItem {
  report_date: string;
  generated_by: string;
  generated_at: string;
  summary_json?: {
    total?: number;
    hadir?: number;
    kurang?: number;
    sakit?: number;
    izin?: number;
    cuti?: number;
    terlambat?: number;
    tugas?: number;
    tubel?: number;
  };
}

interface MonthlyRecapViewProps {
  onClose: () => void;
}

const getMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const formatMonthTitle = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

const formatDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export function MonthlyRecapView({ onClose }: MonthlyRecapViewProps) {
  const [month, setMonth] = useState(getMonthKey());
  const [data, setData] = useState<MonthlyRecapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dailyReports, setDailyReports] = useState<DailyReportItem[]>([]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, { name: string; department: string }>();
    for (const employee of employees) {
      map.set(employee.id, {
        name: employee.name,
        department: employee.department,
      });
    }
    return map;
  }, []);

  useEffect(() => {
    const loadRecap = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/attendance/monthly?month=${month}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as
          | MonthlyRecapResponse
          | { message?: string };

        if (!response.ok) {
          const message =
            typeof body === "object" && body && "message" in body
              ? String(body.message || "")
              : "";
          setError(message || "Gagal memuat rekap bulanan.");
          setData(null);
          return;
        }

        setData(body as MonthlyRecapResponse);
      } catch {
        setError("Gagal terhubung ke server.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadRecap();
  }, [month]);

  useEffect(() => {
    const loadDailyReports = async () => {
      try {
        const response = await fetch(`/api/daily-report/monthly?month=${month}`, {
          cache: "no-store",
        });
        const body = (await response.json()) as
          | { reports?: DailyReportItem[]; message?: string }
          | { message?: string };

        if (!response.ok) {
          setDailyReports([]);
          return;
        }

        const reports =
          typeof body === "object" && body && "reports" in body
            ? (body.reports as DailyReportItem[] | undefined)
            : undefined;
        setDailyReports(reports || []);
      } catch {
        setDailyReports([]);
      }
    };

    loadDailyReports();
  }, [month]);

  const filteredRankings = useMemo(() => {
    if (!data) return [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) return data.rankings;

    return data.rankings.filter((item) => {
      const employee = employeeMap.get(item.employeeId);
      const name = employee?.name?.toLowerCase() || "";
      const dept = employee?.department?.toLowerCase() || "";
      return name.includes(keyword) || dept.includes(keyword);
    });
  }, [data, employeeMap, search]);

  const handleExportMonthlyPdf = () => {
    if (!data) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 10;
    let y = 12;

    const ensureSpace = (needed = 6) => {
      if (y + needed > pageHeight - 10) {
        doc.addPage();
        y = 12;
      }
    };

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REKAP BULANAN ABSENSI APEL PAGI", pageWidth / 2, y, { align: "center" });
    y += 7;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Bulan: ${formatMonthTitle(data.month)}`, marginX, y);
    y += 5;
    doc.text(`Hari apel tercatat: ${data.totalHariTercatat}`, marginX, y);
    y += 7;

    doc.setFont("helvetica", "bold");
    doc.text("Ranking Tidak Hadir (Top 30)", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    const topRankings = data.rankings.slice(0, 30);
    for (let i = 0; i < topRankings.length; i += 1) {
      const item = topRankings[i];
      const employee = employeeMap.get(item.employeeId);
      const line = `${i + 1}. ${employee?.name || item.employeeId} | ${
        employee?.department || "-"
      } | Tidak hadir: ${item.totalTidakHadir} | Hadir: ${item.hadir}`;

      const wrapped = doc.splitTextToSize(line, pageWidth - marginX * 2);
      ensureSpace(wrapped.length * 4 + 1);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 4 + 1;
    }

    y += 2;
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.text("Rekapan Harian Tersimpan", marginX, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    if (dailyReports.length === 0) {
      ensureSpace(6);
      doc.text("Belum ada rekap harian tersimpan pada bulan ini.", marginX, y);
      y += 5;
    } else {
      for (const report of dailyReports) {
        const summary = report.summary_json || {};
        const dayLine = `${formatDateKey(report.report_date)} | Petugas: ${
          report.generated_by
        } | H:${summary.hadir ?? "-"} K:${summary.kurang ?? "-"} S:${
          summary.sakit ?? "-"
        } I:${summary.izin ?? "-"} C:${summary.cuti ?? "-"} T:${
          summary.terlambat ?? "-"
        } Tg:${summary.tugas ?? "-"} Tb:${summary.tubel ?? "-"}`;

        const wrapped = doc.splitTextToSize(dayLine, pageWidth - marginX * 2);
        ensureSpace(wrapped.length * 4 + 1);
        doc.text(wrapped, marginX, y);
        y += wrapped.length * 4 + 1;
      }
    }

    const fileName = `Rekap_Bulanan_Absensi_${data.month}.pdf`;
    doc.save(fileName);
  };

  const handleExportMonthlyExcel = () => {
    if (!data) return;

    const rankingRows = data.rankings
      .map((item, idx) => {
        const employee = employeeMap.get(item.employeeId);
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${escapeHtml(employee?.name || item.employeeId)}</td>
            <td>${escapeHtml(employee?.department || "-")}</td>
            <td>${item.totalTidakHadir}</td>
            <td>${item.hadir}</td>
            <td>${item.sakit}</td>
            <td>${item.izin}</td>
            <td>${item.cuti}</td>
            <td>${item.terlambat}</td>
            <td>${item.tugas}</td>
            <td>${item.tubel}</td>
            <td>${escapeHtml(
              item.tanggalTidakHadir.length > 0
                ? item.tanggalTidakHadir.map(formatDateKey).join(", ")
                : "-"
            )}</td>
          </tr>
        `;
      })
      .join("");

    const perDepartmentSections = departments
      .map((department) => {
        const rows = data.rankings
          .filter((item) => employeeMap.get(item.employeeId)?.department === department)
          .map((item, idx) => {
            const employee = employeeMap.get(item.employeeId);
            return `
              <tr>
                <td>${idx + 1}</td>
                <td>${escapeHtml(employee?.name || item.employeeId)}</td>
                <td>${item.totalTidakHadir}</td>
                <td>${item.hadir}</td>
                <td>${item.sakit}</td>
                <td>${item.izin}</td>
                <td>${item.cuti}</td>
                <td>${item.terlambat}</td>
                <td>${item.tugas}</td>
                <td>${item.tubel}</td>
              </tr>
            `;
          })
          .join("");

        return `
          <h3>Rekap Per Bidang - ${escapeHtml(department)}</h3>
          <table border="1">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Tidak Hadir</th>
                <th>Hadir</th>
                <th>Sakit</th>
                <th>Izin</th>
                <th>Cuti</th>
                <th>Terlambat</th>
                <th>Tugas</th>
                <th>Tubel</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <br />
        `;
      })
      .join("");

    const dailyRows =
      dailyReports.length > 0
        ? dailyReports
            .map((item) => {
              const summary = item.summary_json || {};
              return `
                <tr>
                  <td>${escapeHtml(formatDateKey(item.report_date))}</td>
                  <td>${escapeHtml(item.generated_by || "-")}</td>
                  <td>${summary.total ?? "-"}</td>
                  <td>${summary.hadir ?? "-"}</td>
                  <td>${summary.kurang ?? "-"}</td>
                  <td>${summary.sakit ?? "-"}</td>
                  <td>${summary.izin ?? "-"}</td>
                  <td>${summary.cuti ?? "-"}</td>
                  <td>${summary.terlambat ?? "-"}</td>
                  <td>${summary.tugas ?? "-"}</td>
                  <td>${summary.tubel ?? "-"}</td>
                </tr>
              `;
            })
            .join("")
        : `<tr><td colspan="11">Belum ada rekap harian tersimpan di bulan ini.</td></tr>`;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <h2>Rekap Bulanan Absensi Apel Pagi</h2>
          <p>Bulan: ${escapeHtml(formatMonthTitle(data.month))}</p>
          <p>Hari apel tercatat: ${data.totalHariTercatat}</p>

          <h3>Ranking Pegawai Paling Banyak Tidak Hadir Apel</h3>
          <table border="1">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Bidang</th>
                <th>Tidak Hadir</th>
                <th>Hadir</th>
                <th>Sakit</th>
                <th>Izin</th>
                <th>Cuti</th>
                <th>Terlambat</th>
                <th>Tugas</th>
                <th>Tubel</th>
                <th>Tanggal Tidak Hadir</th>
              </tr>
            </thead>
            <tbody>${rankingRows}</tbody>
          </table>

          <h3>Cek Rekapan per Hari (Tersimpan)</h3>
          <table border="1">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Petugas</th>
                <th>Total</th>
                <th>Hadir</th>
                <th>Kurang</th>
                <th>Sakit</th>
                <th>Izin</th>
                <th>Cuti</th>
                <th>Terlambat</th>
                <th>Tugas</th>
                <th>Tubel</th>
              </tr>
            </thead>
            <tbody>${dailyRows}</tbody>
          </table>

          ${perDepartmentSections}
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Rekap_Bulanan_Absensi_${data.month}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={onClose} variant="outline" className="bg-transparent">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Rekapan Harian Pegawai per Bulan
          </h1>
          <div className="w-[120px]" />
        </div>

        <Card className="p-4 md:p-6 bg-white border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Bulan</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              />
            </div>

            <div className="md:ml-auto w-full md:w-80">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cari Pegawai/Bidang
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="contoh: sekretariat"
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
              />
            </div>
            <div className="md:w-auto">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Export
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportMonthlyPdf}
                  disabled={!data || loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Export PDF Bulanan
                </Button>
                <Button
                  onClick={handleExportMonthlyExcel}
                  disabled={!data || loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Export Excel Bulanan
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            Bulan aktif: <span className="font-semibold text-slate-800">{formatMonthTitle(month)}</span>
            {data && (
              <span className="ml-3">
                Hari apel tercatat: <span className="font-semibold text-slate-800">{data.totalHariTercatat}</span>
              </span>
            )}
          </div>
        </Card>

        {loading && <div className="text-slate-600">Memuat rekap bulanan...</div>}

        {error && (
          <Card className="p-4 bg-red-50 border-red-200 text-red-700">
            {error}
          </Card>
        )}

        {!loading && !error && data && (
          <>
            <Card className="p-4 md:p-6 bg-white border-slate-200 overflow-x-auto">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Ranking Pegawai Paling Banyak Tidak Hadir Apel
              </h2>
              <table className="w-full text-sm min-w-[1200px]">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-2 pr-3">No</th>
                    <th className="py-2 pr-3">Nama</th>
                    <th className="py-2 pr-3">Bidang</th>
                    <th className="py-2 pr-3">Tidak Hadir</th>
                    <th className="py-2 pr-3">Hadir</th>
                    <th className="py-2 pr-3">Sakit</th>
                    <th className="py-2 pr-3">Izin</th>
                    <th className="py-2 pr-3">Cuti</th>
                    <th className="py-2 pr-3">Terlambat</th>
                    <th className="py-2 pr-3">Tugas</th>
                    <th className="py-2 pr-3">Tubel</th>
                    <th className="py-2 pr-3">Tanggal Tidak Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRankings.map((item, idx) => {
                    const employee = employeeMap.get(item.employeeId);
                    return (
                      <tr key={item.employeeId} className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-3 font-medium text-slate-700">{idx + 1}</td>
                        <td className="py-2 pr-3 font-medium text-slate-900">
                          {employee?.name || item.employeeId}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">{employee?.department || "-"}</td>
                        <td className="py-2 pr-3 font-bold text-red-600">{item.totalTidakHadir}</td>
                        <td className="py-2 pr-3">{item.hadir}</td>
                        <td className="py-2 pr-3">{item.sakit}</td>
                        <td className="py-2 pr-3">{item.izin}</td>
                        <td className="py-2 pr-3">{item.cuti}</td>
                        <td className="py-2 pr-3">{item.terlambat}</td>
                        <td className="py-2 pr-3">{item.tugas}</td>
                        <td className="py-2 pr-3">{item.tubel}</td>
                        <td className="py-2 pr-3 text-slate-700">
                          {item.tanggalTidakHadir.length > 0
                            ? item.tanggalTidakHadir.map(formatDateKey).join(", ")
                            : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            <Card className="p-4 md:p-6 bg-white border-slate-200 overflow-x-auto">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Cek Rekapan per Hari (Tersimpan)
              </h2>
              <table className="w-full text-sm min-w-[950px]">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-2 pr-3">Tanggal</th>
                    <th className="py-2 pr-3">Petugas</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Hadir</th>
                    <th className="py-2 pr-3">Kurang</th>
                    <th className="py-2 pr-3">Sakit</th>
                    <th className="py-2 pr-3">Izin</th>
                    <th className="py-2 pr-3">Cuti</th>
                    <th className="py-2 pr-3">Terlambat</th>
                    <th className="py-2 pr-3">Tugas</th>
                    <th className="py-2 pr-3">Tubel</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyReports.length > 0 ? (
                    dailyReports.map((item) => (
                      <tr key={item.report_date} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium text-slate-900">
                          {formatDateKey(item.report_date)}
                        </td>
                        <td className="py-2 pr-3 text-slate-700">{item.generated_by}</td>
                        <td className="py-2 pr-3">{item.summary_json?.total ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.hadir ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.kurang ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.sakit ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.izin ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.cuti ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.terlambat ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.tugas ?? "-"}</td>
                        <td className="py-2 pr-3">{item.summary_json?.tubel ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 text-slate-600" colSpan={11}>
                        Belum ada rekap harian tersimpan di bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

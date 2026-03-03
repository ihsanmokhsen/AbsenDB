"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, FileDown, Printer, ChevronLeft } from "lucide-react";
import { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import { employees, departments } from "@/data/employees";
import { AttendanceStatus } from "@/lib/types";
import Image from "next/image";

interface ReportDetailViewProps {
  reportText: string;
  attendanceData: Record<string, AttendanceStatus>;
  currentDate: string;
  onClose: () => void;
}

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export function ReportDetailView({
  reportText,
  attendanceData,
  currentDate,
  onClose,
}: ReportDetailViewProps) {
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const getSickEmployees = () =>
    employees
      .filter((emp) => attendanceData[emp.id] === "sakit")
      .map((emp) => emp.name);

  const getLeaveEmployees = () =>
    employees
      .filter((emp) => attendanceData[emp.id] === "izin")
      .map((emp) => emp.name);

  const getCutiEmployees = () =>
    employees
      .filter((emp) => attendanceData[emp.id] === "cuti")
      .map((emp) => emp.name);

  const getLateEmployees = () =>
    employees
      .filter((emp) => attendanceData[emp.id] === "terlambat")
      .map((emp) => emp.name);

  const getTaskEmployees = () =>
    employees
      .filter((emp) => attendanceData[emp.id] === "tugas")
      .map((emp) => emp.name);

  const getTubelEmployees = () =>
    employees
      .filter((emp) => attendanceData[emp.id] === "tubel")
      .map((emp) => emp.name);

  const getEmployeesByDepartment = (dept: string, status: AttendanceStatus) =>
    employees
      .filter((emp) => emp.department === dept && attendanceData[emp.id] === status)
      .map((emp) => emp.name);

  const handleCopy = () => {
    let fullText = `BPAD PROVINSI NTT\n\n${reportText}\n\nSAKIT:\n${
      getSickEmployees().join("\n") || "-"
    }\n\nIZIN:\n${getLeaveEmployees().join("\n") || "-"}`;

    if (getCutiEmployees().length > 0) {
      fullText += `\n\nCUTI:\n${getCutiEmployees().join("\n")}`;
    }

    fullText += `\n\nTERLAMBAT:\n${
      getLateEmployees().join("\n") || "-"
    }\n\nTUGAS:\n${getTaskEmployees().join("\n") || "-"}\n\nTUBEL:\n${
      getTubelEmployees().join("\n") || "-"
    }`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      // Header
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

      const dateStr = parseDateKey(currentDate).toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      pdf.setFontSize(10);
      pdf.text(`Hari/Tanggal: ${dateStr}`, pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 10;

      // Report summary
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const splitText = pdf.splitTextToSize(reportText, pageWidth - 20);
      pdf.text(splitText, 10, yPosition);
      yPosition += splitText.length * 5 + 10;

      // Department breakdown (single source of detail to avoid duplication)
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 15;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("RINCIAN PER DEPARTEMEN", 10, yPosition);
      yPosition += 10;

      for (const dept of departments) {
        const deptEmployees = employees
          .filter((e) => e.department === dept)
          .filter((emp) => (attendanceData[emp.id] || "terlambat") !== "hadir");

        if (deptEmployees.length === 0) {
          continue;
        }

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
          const statusText =
            status.charAt(0).toUpperCase() + status.slice(1);

          pdf.text(`• ${emp.name} - ${statusText}`, 15, yPosition);
          yPosition += 4;
        });

        yPosition += 3;
      }

      pdf.save(`Laporan_Absensi_${currentDate}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Gagal membuat PDF. Silakan coba lagi.");
    }
  };

  const sickEmployees = getSickEmployees();
  const leaveEmployees = getLeaveEmployees();
  const cutiEmployees = getCutiEmployees();
  const lateEmployees = getLateEmployees();
  const taskEmployees = getTaskEmployees();
  const tubelEmployees = getTubelEmployees();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-transparent"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">Detail Laporan</h1>
          <div className="w-[120px]" />
        </div>

        {/* Action buttons - hidden on print */}
        <div className="flex flex-wrap gap-2 mb-6 print:hidden">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Report Content */}
        <div ref={reportRef} className="space-y-6">
          {/* Summary Card */}
          <Card className="bg-white p-6 border-2 border-slate-200">
            <div className="space-y-4">
              <div className="text-center space-y-2 pb-4 border-b-2 border-slate-200">
                <div className="flex justify-center">
                  <Image
                    src="/logo-bpad.png"
                    alt="Logo BPAD Provinsi NTT"
                    width={88}
                    height={93}
                    className="h-[72px] w-[72px] object-contain"
                    priority
                  />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  BPAD PROVINSI NTT
                </h2>
                <p className="text-sm text-slate-600">
                  Laporan Absensi Apel Pagi
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {parseDateKey(currentDate).toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <p className="text-center text-lg font-semibold text-slate-900 py-4 whitespace-pre-line">
                {reportText}
              </p>
            </div>
          </Card>

          {/* Status Summary */}
          {(sickEmployees.length > 0 ||
            leaveEmployees.length > 0 ||
            cutiEmployees.length > 0 ||
            lateEmployees.length > 0 ||
            taskEmployees.length > 0 ||
            tubelEmployees.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 border-b-2 border-slate-300 pb-2">
                RINCIAN PEGAWAI
              </h3>

              {sickEmployees.length > 0 && (
                <Card className="bg-orange-50 p-4 border-l-4 border-orange-600">
                  <h4 className="font-bold text-orange-900 mb-3">
                    SAKIT ({sickEmployees.length} orang)
                  </h4>
                  <div className="space-y-1">
                    {sickEmployees.map((name, i) => (
                      <p key={i} className="text-orange-800 text-sm">
                        • {name}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {leaveEmployees.length > 0 && (
                <Card className="bg-blue-50 p-4 border-l-4 border-blue-600">
                  <h4 className="font-bold text-blue-900 mb-3">
                    IZIN ({leaveEmployees.length} orang)
                  </h4>
                  <div className="space-y-1">
                    {leaveEmployees.map((name, i) => (
                      <p key={i} className="text-blue-800 text-sm">
                        • {name}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {cutiEmployees.length > 0 && (
                <Card className="bg-teal-50 p-4 border-l-4 border-teal-600">
                  <h4 className="font-bold text-teal-900 mb-3">
                    CUTI ({cutiEmployees.length} orang)
                  </h4>
                  <div className="space-y-1">
                    {cutiEmployees.map((name, i) => (
                      <p key={i} className="text-teal-800 text-sm">
                        • {name}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {lateEmployees.length > 0 && (
                <Card className="bg-purple-50 p-4 border-l-4 border-purple-600">
                  <h4 className="font-bold text-purple-900 mb-3">
                    TERLAMBAT ({lateEmployees.length} orang)
                  </h4>
                  <div className="space-y-1">
                    {lateEmployees.map((name, i) => (
                      <p key={i} className="text-purple-800 text-sm">
                        • {name}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {taskEmployees.length > 0 && (
                <Card className="bg-indigo-50 p-4 border-l-4 border-indigo-600">
                  <h4 className="font-bold text-indigo-900 mb-3">
                    TUGAS ({taskEmployees.length} orang)
                  </h4>
                  <div className="space-y-1">
                    {taskEmployees.map((name, i) => (
                      <p key={i} className="text-indigo-800 text-sm">
                        • {name}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {tubelEmployees.length > 0 && (
                <Card className="bg-yellow-50 p-4 border-l-4 border-yellow-600">
                  <h4 className="font-bold text-yellow-900 mb-3">
                    TUBEL ({tubelEmployees.length} orang)
                  </h4>
                  <div className="space-y-1">
                    {tubelEmployees.map((name, i) => (
                      <p key={i} className="text-yellow-800 text-sm">
                        • {name}
                      </p>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Department Breakdown */}
          <div className="space-y-4 pt-6 border-t-2 border-slate-200">
            <h3 className="text-xl font-bold text-slate-900">
              RINCIAN PER DEPARTEMEN
            </h3>

            {departments.map((dept) => {
              const deptEmployees = employees.filter(
                (e) => e.department === dept
              );
              const absentDeptEmployees = deptEmployees.filter(
                (emp) => (attendanceData[emp.id] || "terlambat") !== "hadir"
              );

              if (absentDeptEmployees.length === 0) {
                return null;
              }

              return (
                <Card key={dept} className="bg-white p-4 border-slate-300">
                  <h4 className="font-bold text-slate-900 mb-3">
                    {dept} ({absentDeptEmployees.length} orang)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {absentDeptEmployees.map((emp) => {
                      const status = attendanceData[emp.id] || "terlambat";
                      const statusLabel = {
                        hadir: "✓ Hadir",
                        sakit: "Sakit",
                        izin: "Izin",
                        cuti: "Cuti",
                        terlambat: "Terlambat",
                        tugas: "Tugas",
                        tubel: "Tubel",
                      }[status];

                      const statusColor = {
                        hadir: "bg-green-100 text-green-800",
                        sakit: "bg-orange-100 text-orange-800",
                        izin: "bg-blue-100 text-blue-800",
                        cuti: "bg-teal-100 text-teal-800",
                        terlambat: "bg-purple-100 text-purple-800",
                        tugas: "bg-indigo-100 text-indigo-800",
                        tubel: "bg-yellow-100 text-yellow-800",
                      }[status];

                      return (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between p-2 rounded bg-slate-50"
                        >
                          <span className="text-sm text-slate-700">
                            {emp.name}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer action buttons - visible again at bottom */}
        <div className="flex flex-wrap gap-2 mt-8 pt-4 border-t border-slate-200 print:hidden">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-transparent"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Laporan
              </>
            )}
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

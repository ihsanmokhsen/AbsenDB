"use client";

import { Card } from "@/components/ui/card";
import Image from "next/image";

interface ReportSummary {
  total: number;
  kurang: number;
  hadir: number;
  sakit: number;
  izin: number;
  cuti: number;
  terlambat: number;
  tugas: number;
  tubel: number;
}

interface ReportBoxProps {
  summary: ReportSummary;
  reportDateText: string;
  officerName?: string;
  isDisplayMode?: boolean;
  absentByDepartment?: {
    department: string;
    employees: { name: string; status: string }[];
  }[];
}

export function ReportBox({
  summary,
  reportDateText,
  officerName = "-",
  isDisplayMode = false,
  absentByDepartment = [],
}: ReportBoxProps) {
  const primaryRows = [
    { label: "Jumlah", value: summary.total },
    { label: "Kurang", value: summary.kurang },
    { label: "Hadir", value: summary.hadir },
  ];

  const detailRows = [
    { label: "Sakit", value: summary.sakit },
    { label: "Izin", value: summary.izin },
    { label: "Cuti", value: summary.cuti },
    { label: "Terlambat", value: summary.terlambat },
    { label: "Tugas", value: summary.tugas },
    { label: "Tubel", value: summary.tubel },
  ];

  if (isDisplayMode) {
    return (
      <div className="w-full">
        <div className="mx-auto max-w-[95vw] md:max-w-3xl">
          <div className="flex justify-center">
            <Image
              src="/logo-bpad.png"
              alt="Logo BPAD Provinsi NTT"
              width={96}
              height={102}
              className="h-12 w-12 md:h-20 md:w-20 object-contain"
              priority
            />
          </div>
          <h3 className="text-xl md:text-4xl font-bold text-slate-900 text-center">
            BPAD Provinsi Nusa Tenggara Timur
          </h3>
          <p className="mt-2 text-sm md:text-xl text-slate-700 text-center">
            Hari/Tanggal: {reportDateText}
          </p>
          <p className="text-sm md:text-xl text-slate-700 text-center">
            Petugas: {officerName}
          </p>

          <div className="mt-3 md:mt-6 space-y-2 text-slate-900 w-fit mx-auto">
            {primaryRows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-3 text-sm md:text-3xl">
                <span className="font-bold w-40 md:w-64">{row.label}</span>
                <span className="font-bold">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 md:mt-6 text-slate-900 w-fit mx-auto">
            <p className="font-normal text-sm md:text-3xl mb-2">Keterangan</p>
            {detailRows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-3 text-sm md:text-3xl">
                <span className="font-normal w-40 md:w-64">{row.label}</span>
                <span className="font-bold">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-slate-50 p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Image
            src="/logo-bpad.png"
            alt="Logo BPAD Provinsi NTT"
            width={44}
            height={47}
            className="h-11 w-11 object-contain"
          />
          <h3 className="font-bold text-slate-900">
            BPAD Provinsi Nusa Tenggara Timur
          </h3>
        </div>
        <div className="w-fit mx-auto text-left">
          <p className="text-sm text-slate-700">Hari/Tanggal: {reportDateText}</p>
          <p className="text-sm text-slate-700">Petugas: {officerName}</p>

          <div className="space-y-1 text-slate-900 mt-2">
            {primaryRows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-3 text-sm">
                <span className="font-bold w-40">{row.label}</span>
                <span className="font-bold">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-slate-900">
            <p className="font-normal text-sm mb-1">Keterangan</p>
            {detailRows.map((row) => (
              <div key={row.label} className="flex items-baseline gap-3 text-sm">
                <span className="font-normal w-40">{row.label}</span>
                <span className="font-bold">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 text-slate-900">
            <p className="font-semibold text-sm mb-2">Tidak Hadir per Bidang</p>
            {absentByDepartment.length > 0 ? (
              <div className="space-y-3">
                {absentByDepartment.map((dept) => (
                  <div key={dept.department}>
                    <p className="font-semibold text-sm">{dept.department}</p>
                    <div className="text-sm text-slate-700">
                      {dept.employees.map((emp, idx) => (
                        <p key={`${dept.department}-${idx}`}>
                          - {emp.name} ({emp.status})
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">Semua pegawai hadir.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

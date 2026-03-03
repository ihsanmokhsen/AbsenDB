"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { AttendanceStatus } from "@/lib/types";

interface EmployeeChecklistRowProps {
  employeeId: string;
  employeeName: string;
  status: AttendanceStatus;
  onStatusChange: (employeeId: string, status: AttendanceStatus) => void;
}

export function EmployeeChecklistRow({
  employeeId,
  employeeName,
  status,
  onStatusChange,
}: EmployeeChecklistRowProps) {
  const isPresent = status === "hadir";

  const handleCheckChange = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      onStatusChange(employeeId, "hadir");
    } else {
      onStatusChange(employeeId, "terlambat");
    }
  };

  const handleReasonClick = (reason: "sakit" | "izin" | "cuti" | "terlambat" | "tugas" | "tubel") => {
    onStatusChange(employeeId, reason);
  };

  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-3 px-2">
      <div className="flex items-center gap-3 flex-1">
        <Checkbox
          checked={isPresent}
          onCheckedChange={handleCheckChange}
          id={employeeId}
        />
        <label
          htmlFor={employeeId}
          className="flex-1 text-sm font-medium text-slate-900 cursor-pointer"
        >
          {employeeName}
        </label>
      </div>

      {!isPresent && (
        <div className="flex gap-2 flex-wrap justify-end">
          <button
            onClick={() => handleReasonClick("sakit")}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
              status === "sakit"
                ? "bg-orange-500 text-white"
                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
            }`}
          >
            Sakit
          </button>
          <button
            onClick={() => handleReasonClick("izin")}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
              status === "izin"
                ? "bg-blue-500 text-white"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            Izin
          </button>
          <button
            onClick={() => handleReasonClick("cuti")}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
              status === "cuti"
                ? "bg-teal-500 text-white"
                : "bg-teal-100 text-teal-700 hover:bg-teal-200"
            }`}
          >
            Cuti
          </button>
          <button
            onClick={() => handleReasonClick("terlambat")}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
              status === "terlambat"
                ? "bg-purple-500 text-white"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
          >
            Terlambat
          </button>
          <button
            onClick={() => handleReasonClick("tugas")}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
              status === "tugas"
                ? "bg-indigo-500 text-white"
                : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            }`}
          >
            Tugas
          </button>
          <button
            onClick={() => handleReasonClick("tubel")}
            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${
              status === "tubel"
                ? "bg-yellow-500 text-white"
                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            }`}
          >
            Tubel
          </button>
        </div>
      )}
    </div>
  );
}

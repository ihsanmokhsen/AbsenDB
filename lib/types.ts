export type AttendanceStatus = "hadir" | "sakit" | "izin" | "cuti" | "terlambat" | "tugas" | "tubel";

export interface AttendanceRecord {
  employeeId: string;
  status: AttendanceStatus;
}

export interface AttendanceData {
  date: string; // YYYY-MM-DD
  records: Record<string, AttendanceStatus>; // employeeId -> status
}

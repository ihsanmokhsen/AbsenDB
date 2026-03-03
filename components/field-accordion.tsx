"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Employee, Department } from "@/data/employees";
import { AttendanceStatus } from "@/lib/types";
import { EmployeeChecklistRow } from "./employee-checklist-row";

interface FieldAccordionProps {
  department: Department;
  employees: Employee[];
  attendanceData: Record<string, AttendanceStatus>;
  onStatusChange: (employeeId: string, status: AttendanceStatus) => void;
  employmentType?: "ASN" | "PPPK";
}

export function FieldAccordion({
  department,
  employees,
  attendanceData,
  onStatusChange,
  employmentType,
}: FieldAccordionProps) {
  const isPPPK = (employee: Employee) => employee.name.includes("(PPPK)");

  const departmentEmployees = employees
    .filter((e) => e.department === department)
    .filter((e) => {
      if (!employmentType) return true;
      const pppk = isPPPK(e);
      return employmentType === "PPPK" ? pppk : !pppk;
    });

  const stats = departmentEmployees.reduce(
    (acc, emp) => {
      const status = attendanceData[emp.id] || "terlambat";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<AttendanceStatus, number>
  );

  const hadir = stats.hadir || 0;
  const sakit = stats.sakit || 0;
  const izin = stats.izin || 0;
  const cuti = stats.cuti || 0;
  const terlambat = stats.terlambat || 0;
  const tugas = stats.tugas || 0;
  const tubel = stats.tubel || 0;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={department}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full pr-4">
            <span className="font-semibold text-slate-900">{department}</span>
            <div className="flex gap-2 text-xs font-medium">
              <span className="text-green-600">
                H: <strong>{hadir}</strong>
              </span>
              <span className="text-orange-600">
                S: <strong>{sakit}</strong>
              </span>
              <span className="text-blue-600">
                I: <strong>{izin}</strong>
              </span>
              <span className="text-teal-600">
                C: <strong>{cuti}</strong>
              </span>
              <span className="text-red-600">
                T: <strong>{terlambat}</strong>
              </span>
              <span className="text-indigo-600">
                Tg: <strong>{tugas}</strong>
              </span>
              <span className="text-yellow-700">
                Tb: <strong>{tubel}</strong>
              </span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-0">
            {departmentEmployees.map((employee) => (
              <EmployeeChecklistRow
                key={employee.id}
                employeeId={employee.id}
                employeeName={employee.name}
                status={attendanceData[employee.id] || "terlambat"}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

import { Card } from "@/components/ui/card";

interface SummaryCardsProps {
  total: number;
  hadir: number;
  sakit: number;
  izin: number;
  cuti?: number;
  terlambat: number;
  tugas: number;
  tubel: number;
}

export function SummaryCards({
  total,
  hadir,
  sakit,
  izin,
  cuti = 0,
  terlambat,
  tugas,
  tubel,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
      <Card className="bg-slate-50 p-4">
        <div className="text-xs font-semibold text-slate-600">Total</div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{total}</div>
      </Card>
      <Card className="bg-green-50 p-4">
        <div className="text-xs font-semibold text-green-700">Hadir</div>
        <div className="mt-2 text-2xl font-bold text-green-600">{hadir}</div>
      </Card>
      <Card className="bg-orange-50 p-4">
        <div className="text-xs font-semibold text-orange-700">Sakit</div>
        <div className="mt-2 text-2xl font-bold text-orange-600">{sakit}</div>
      </Card>
      <Card className="bg-blue-50 p-4">
        <div className="text-xs font-semibold text-blue-700">Izin</div>
        <div className="mt-2 text-2xl font-bold text-blue-600">{izin}</div>
      </Card>
      <Card className="bg-teal-50 p-4">
        <div className="text-xs font-semibold text-teal-700">Cuti</div>
        <div className="mt-2 text-2xl font-bold text-teal-600">{cuti}</div>
      </Card>
      <Card className="bg-purple-50 p-4">
        <div className="text-xs font-semibold text-purple-700">Terlambat</div>
        <div className="mt-2 text-2xl font-bold text-purple-600">{terlambat}</div>
      </Card>
      <Card className="bg-indigo-50 p-4">
        <div className="text-xs font-semibold text-indigo-700">Tugas</div>
        <div className="mt-2 text-2xl font-bold text-indigo-600">{tugas}</div>
      </Card>
      <Card className="bg-yellow-50 p-4">
        <div className="text-xs font-semibold text-yellow-700">Tubel</div>
        <div className="mt-2 text-2xl font-bold text-yellow-600">{tubel}</div>
      </Card>
    </div>
  );
}

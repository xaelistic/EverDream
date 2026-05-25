import { LucideIcon } from 'lucide-react';

type StatCardProps = {
  icon: LucideIcon;
  value: string | number;
  label: string;
};

export default function StatCard({ icon: Icon, value, label }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-cream px-3 py-4 text-center shadow-paper">
      <Icon className="w-5 h-5 text-sageDark mx-auto mb-2 opacity-90" strokeWidth={1.5} />
      <div className="text-xl font-semibold text-ink font-serif">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted mt-1">{label}</div>
    </div>
  );
}

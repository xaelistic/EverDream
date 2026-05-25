import { LucideIcon } from 'lucide-react';

type InsightItem = {
  label: string;
  value: string | number;
  badge?: boolean;
};

type InsightCardProps = {
  title: string;
  icon: LucideIcon;
  items: InsightItem[];
};

export default function InsightCard({ title, icon: Icon, items }: InsightCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-ink">
        <Icon className="w-5 h-5 text-duskDeep" strokeWidth={1.5} />
        {title}
      </h3>
      <div className="space-y-2 text-sm">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-center gap-3">
            <span className="text-muted capitalize">{item.label}</span>
            {item.badge ? (
              <span className="bg-parchment border border-line px-2 py-1 rounded-lg text-xs font-semibold text-ink">
                {item.value}
              </span>
            ) : (
              <span className="font-semibold text-ink">{item.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

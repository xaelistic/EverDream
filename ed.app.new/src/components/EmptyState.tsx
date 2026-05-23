import { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
};

export default function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="text-center py-14 text-muted border border-dashed border-line rounded-3xl bg-parchment/35">
      <Icon className="w-14 h-14 mx-auto mb-4 opacity-35 text-duskDeep" strokeWidth={1.25} />
      <p className="text-ink font-medium">{message}</p>
    </div>
  );
}

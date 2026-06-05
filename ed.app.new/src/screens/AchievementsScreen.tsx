import { Award } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface AchievementsScreenProps {
  achievements: Achievement[];
  EmptyState: React.ComponentType<{ icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; message: string }>;
}

export function AchievementsScreen({ achievements, EmptyState }: AchievementsScreenProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl font-medium text-ink">Achievements</h2>

      {achievements.length === 0 ? (
        <EmptyState icon={Award} message="Complete challenges to unlock achievements" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map(achievement => (
            <div
              key={achievement.id}
              className="rounded-2xl border border-line bg-cream p-4 shadow-paper"
            >
              <div className="text-4xl mb-2">{achievement.icon}</div>
              <h3 className="font-semibold text-lg text-ink">{achievement.title}</h3>
              <p className="text-sm text-muted mt-1">{achievement.description}</p>
              <div className="text-xs text-muted mt-2">
                Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper mt-6">
        <h3 className="font-semibold mb-3 text-sm text-ink">Coming Soon...</h3>
        <div className="space-y-2 text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-parchment border border-line flex items-center justify-center">🏆</div>
            <div>Dream Master - Record 50 dreams</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-parchment border border-line flex items-center justify-center">🌙</div>
            <div>Night Owl - Record dreams for 30 days straight</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-parchment border border-line flex items-center justify-center">💎</div>
            <div>Rare Collection - 5 high-rarity dream assets</div>
          </div>
        </div>
      </div>
    </div>
  );
}

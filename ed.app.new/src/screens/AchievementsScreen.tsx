import { useMemo, useState } from 'react';
import {
  Award,
  Copy,
  Check,
  Gift,
  Share2,
  Users,
  Sparkles,
  Lock,
  ChevronRight,
} from 'lucide-react';
import {
  buildAchievementCards,
  type UnlockedAchievement,
} from '../lib/achievements';
import {
  buildReferralLink,
  getFreeMonthCredits,
  getGenerationTokenBalance,
  getOrCreateReferralCode,
  getReferralStats,
  FREE_MONTHS_ON_SUBSCRIBE,
  TOKENS_PER_SIGNUP,
  TOKENS_WELCOME_REFEREE,
  type ReferralStats,
} from '../lib/referral';

interface AchievementRow {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

interface AchievementsScreenProps {
  achievements: AchievementRow[] | UnlockedAchievement[];
  EmptyState?: React.ComponentType<{
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    message: string;
  }>;
  onShareReferral?: (link: string, code: string) => void;
}

export function AchievementsScreen({
  achievements,
  onShareReferral,
}: AchievementsScreenProps) {
  const [copied, setCopied] = useState(false);
  const [stats] = useState<ReferralStats>(() => getReferralStats());
  const code = useMemo(() => getOrCreateReferralCode(), []);
  const link = useMemo(() => buildReferralLink(code), [code]);
  const tokens = getGenerationTokenBalance();
  const freeMonths = getFreeMonthCredits();

  const cards = useMemo(
    () => buildAchievementCards(achievements as UnlockedAchievement[]),
    [achievements],
  );

  const unlockedCount = cards.filter((c) => c.unlocked).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    const text = `Join me on EverDream — journal dreams, track sleep, and create dream art. Use my code ${code} for free generation tokens: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'EverDream referral', text, url: link });
        onShareReferral?.(link, code);
        return;
      } catch {
        /* cancelled */
      }
    }
    await handleCopy();
    onShareReferral?.(link, code);
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="font-serif text-2xl font-medium text-ink">Achievements</h2>
        <p className="text-sm text-muted mt-1">
          {unlockedCount} of {cards.length} unlocked · milestones that grow the dream circle
        </p>
      </div>

      {/* Referral incentive */}
      <section className="rounded-3xl border border-line bg-gradient-to-br from-sage/10 via-cream to-dusk/10 p-5 shadow-lift">
        <div className="flex items-start gap-3 mb-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage/15 border border-sage/25">
            <Gift className="w-5 h-5 text-sageDark" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="font-semibold text-ink">Invite friends · earn rewards</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Share EverDream for viral growth. You get free generation tokens for every signup,
              and a free month when they subscribe.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <RewardPill
            icon={<Sparkles className="w-3.5 h-3.5" />}
            label={`+${TOKENS_PER_SIGNUP} tokens / signup`}
            sub="Image generation"
          />
          <RewardPill
            icon={<Award className="w-3.5 h-3.5" />}
            label={`+${FREE_MONTHS_ON_SUBSCRIBE} free month`}
            sub="When they subscribe"
          />
          <RewardPill
            icon={<Users className="w-3.5 h-3.5" />}
            label={`They get +${TOKENS_WELCOME_REFEREE} tokens`}
            sub="Welcome bonus"
          />
          <RewardPill
            icon={<Gift className="w-3.5 h-3.5" />}
            label={`${tokens} tokens · ${freeMonths} mo`}
            sub="Your balance"
          />
        </div>

        <div className="rounded-2xl border border-line bg-cream/90 p-3 mb-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">Your code</p>
          <p className="font-mono text-xl font-semibold tracking-widest text-ink">{code}</p>
          <p className="text-xs text-muted mt-2 break-all">{link}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-parchment hover:bg-cream py-2.5 text-sm font-medium text-ink transition"
          >
            {copied ? <Check className="w-4 h-4 text-sageDark" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sage hover:bg-sageDark text-cream py-2.5 text-sm font-semibold transition"
          >
            <Share2 className="w-4 h-4" />
            Share invite
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          <span>{stats.signups} signups</span>
          <span>·</span>
          <span>{stats.paidConversions} subscribed</span>
          <span>·</span>
          <span>{stats.tokensEarned} tokens earned</span>
        </div>
      </section>

      {/* Featured social / growth achievements */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted font-medium mb-3">
          Growth milestones
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards
            .filter((c) => ['first_journal', 'first_share', 'first_friend', 'first_referral', 'referral_subscriber'].includes(c.id))
            .map((card) => (
              <AchievementCard key={card.id} card={card} highlight />
            ))}
        </div>
      </section>

      {/* All achievements */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.18em] text-muted font-medium mb-3">
          All achievements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map((card) => (
            <AchievementCard key={card.id} card={card} />
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-muted leading-relaxed px-2">
        Sharing dreams unlocks social achievements and helps EverDream grow.
        Referrals reward both of you — tokens for generation, free months when friends subscribe.
      </p>
    </div>
  );
}

function RewardPill({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-cream/80 p-2.5">
      <div className="flex items-center gap-1.5 text-sageDark mb-0.5">{icon}</div>
      <p className="text-xs font-semibold text-ink leading-snug">{label}</p>
      <p className="text-[10px] text-muted mt-0.5">{sub}</p>
    </div>
  );
}

function AchievementCard({
  card,
  highlight,
}: {
  card: ReturnType<typeof buildAchievementCards>[number];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        card.unlocked
          ? highlight
            ? 'border-sage/40 bg-gradient-to-br from-sage/15 to-cream shadow-paper'
            : 'border-line bg-cream shadow-paper'
          : 'border-line/70 bg-parchment/50 opacity-80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`text-3xl w-12 h-12 flex items-center justify-center rounded-xl ${
            card.unlocked ? 'bg-sage/10' : 'bg-line/40 grayscale'
          }`}
        >
          {card.unlocked ? card.icon : <Lock className="w-5 h-5 text-muted" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-ink text-sm">{card.title}</h4>
            {card.unlocked && (
              <span className="text-[10px] uppercase tracking-wide text-sageDark font-medium">
                Unlocked
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-0.5 leading-snug">
            {card.unlocked ? card.description : card.howTo}
          </p>
          {card.unlocked && card.unlockedAt && (
            <p className="text-[11px] text-muted mt-2">
              {new Date(card.unlockedAt).toLocaleDateString()}
            </p>
          )}
          {!card.unlocked && (
            <p className="text-[11px] text-muted mt-2 inline-flex items-center gap-0.5">
              Locked <ChevronRight className="w-3 h-3" />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

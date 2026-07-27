import { ArrowLeft, BookOpen, Heart, Lightbulb } from 'lucide-react';
import type { EducationModule } from '../lib/sleepEducation';
import { SLEEP_EDUCATION_CONTENT } from '../lib/sleepEducation';

interface EducationDetailScreenProps {
  education: EducationModule;
  onBack: () => void;
  /** Optional: jump to another module in the library */
  onSelectModule?: (module: EducationModule) => void;
}

const CATEGORY_LABELS: Record<EducationModule['category'], string> = {
  sleep_hygiene: 'Sleep hygiene',
  circadian: 'Circadian rhythm',
  dreams: 'Dream science',
  supplements: 'Supplements',
  environment: 'Environment',
};

/**
 * Full-screen education piece — opened from home "Learn more", not embedded in Tracker.
 */
export function EducationDetailScreen({
  education,
  onBack,
  onSelectModule,
}: EducationDetailScreenProps) {
  const related = SLEEP_EDUCATION_CONTENT.filter((m) => m.id !== education.id).slice(0, 4);

  return (
    <div className="min-h-[70vh] space-y-5 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-sageDark inline-flex items-center gap-1.5 hover:opacity-80 transition"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        Back
      </button>

      <article className="rounded-3xl border border-line bg-gradient-to-br from-cream via-parchment to-moon/15 p-5 sm:p-6 shadow-lift overflow-hidden relative">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-dusk/10 blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3 mb-4">
          <span className="text-4xl shrink-0" aria-hidden>
            {education.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
              Sleep & wellness · {education.readTimeMinutes} min read
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-ink leading-snug">
              {education.title}
            </h1>
            <span className="inline-flex mt-2 text-[11px] font-medium px-2.5 py-1 rounded-full bg-sage/10 text-sageDark border border-sage/20">
              {CATEGORY_LABELS[education.category] || education.category}
            </span>
          </div>
        </div>

        <div className="prose-education space-y-4">
          {education.content
            .split(/\n\n+/)
            .map((para) => para.trim())
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="text-base text-ink/90 leading-relaxed whitespace-pre-line">
                {para}
              </p>
            ))}
        </div>

        {education.tips.length > 0 && (
          <div className="mt-6 rounded-2xl border border-line bg-cream/90 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
              <h2 className="text-sm font-semibold text-ink">Try this</h2>
            </div>
            <ul className="space-y-2.5">
              {education.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink/85 leading-relaxed">
                  <Heart className="w-3.5 h-3.5 text-sageDark shrink-0 mt-0.5" strokeWidth={2} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      {onSelectModule && related.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-ink">More to explore</h2>
          </div>
          <div className="space-y-2">
            {related.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => onSelectModule(mod)}
                className="w-full text-left rounded-2xl border border-line bg-cream hover:bg-parchment p-3.5 transition flex items-start gap-3"
              >
                <span className="text-2xl shrink-0" aria-hidden>
                  {mod.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-ink text-sm">{mod.title}</span>
                  <span className="block text-xs text-muted mt-0.5 line-clamp-2">{mod.content}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

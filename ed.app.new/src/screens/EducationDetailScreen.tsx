import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { EducationModule } from '../lib/sleepEducation';
import {
  SLEEP_CARD_GRADIENTS,
  SLEEP_EDUCATION_CONTENT,
  educationPalette,
} from '../lib/sleepEducation';

interface EducationDetailScreenProps {
  education: EducationModule;
  onBack: () => void;
  onSelectModule?: (module: EducationModule) => void;
}

function isQuoteCard(education: EducationModule): boolean {
  return education.kind === 'quote' || Boolean(education.quote);
}

/** Shared quote/guide body — used by the full-screen route and wind-down. */
export function SleepCardArticle({ education }: { education: EducationModule }) {
  const quote = education.quote || education.content.split('\n')[0];
  const prompt = education.tips[0];
  const longQuote = quote.length > 140;

  if (isQuoteCard(education)) {
    return (
      <>
        <p
          className={`font-serif leading-[1.15] tracking-tight ${
            longQuote ? 'text-[1.65rem] sm:text-4xl' : 'text-[2.15rem] sm:text-5xl'
          }`}
        >
          &ldquo;{quote}&rdquo;
        </p>
        {education.source && (
          <p className="mt-8 text-sm tracking-[0.18em] uppercase text-white/70">
            {education.source}
          </p>
        )}
        {prompt && (
          <p className="mt-10 font-serif italic text-lg text-white/85 leading-relaxed">
            {prompt}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/55 mb-4">
        {education.readTimeMinutes} min · {education.title}
      </p>
      <h1 className="font-serif text-4xl sm:text-5xl leading-[1.12] mb-6">
        {education.title}
      </h1>
      <div className="space-y-4 text-base sm:text-lg leading-relaxed text-white/88">
        {education.content
          .split(/\n\n+/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
      </div>
      {education.tips.length > 0 && (
        <ul className="mt-8 space-y-3 text-sm text-white/80">
          {education.tips.slice(0, 3).map((tip) => (
            <li key={tip} className="pl-4 border-l border-white/30 leading-relaxed">
              {tip}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Immersive full-screen sleep card — quote or short guide.
 */
export function EducationDetailScreen({
  education,
  onBack,
  onSelectModule,
}: EducationDetailScreenProps) {
  const palette = educationPalette(education);
  const quote = isQuoteCard(education);
  const index = SLEEP_EDUCATION_CONTENT.findIndex((m) => m.id === education.id);
  const next = SLEEP_EDUCATION_CONTENT[(index + 1) % SLEEP_EDUCATION_CONTENT.length];

  return (
    <div className={`fixed inset-0 z-[80] flex flex-col bg-gradient-to-br ${SLEEP_CARD_GRADIENTS[palette]} text-[#f7f1e8]`}>
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.18),_transparent_55%)]" />

      <div className="relative flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Close
        </button>
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">
          {quote ? 'Night note' : 'Sleep guide'}
        </p>
      </div>

      <article className="relative flex-1 flex flex-col justify-center px-7 sm:px-12 pb-8 max-w-lg mx-auto w-full overflow-y-auto">
        <SleepCardArticle education={education} />
      </article>

      {onSelectModule && next && (
        <div className="relative px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onSelectModule(next)}
            className="w-full max-w-lg mx-auto flex items-center justify-between rounded-2xl bg-white/10 hover:bg-white/16 border border-white/15 px-4 py-3.5 text-left"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-white/55">Next card</span>
              <span className="block font-serif text-lg mt-0.5">{next.title}</span>
            </span>
            <ChevronRight className="w-5 h-5 text-white/80" />
          </button>
        </div>
      )}
    </div>
  );
}

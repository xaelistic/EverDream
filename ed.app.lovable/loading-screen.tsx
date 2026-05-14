import { useEffect, useState } from "react";
import { Moon, Quote, Brain, Activity, Sparkles } from "lucide-react";

type Slide = {
  id: string;
  kind: "quote" | "science" | "stats" | "dreams";
  title: string;
  body: React.ReactNode;
  icon: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    id: "quote",
    kind: "quote",
    icon: <Quote className="size-5 text-primary" strokeWidth={1.5} />,
    title: "Tonight's reflection",
    body: (
      <p
        className="text-2xl leading-snug text-foreground"
        style={{ fontFamily: "var(--font-display)" }}
      >
        "Dreams are the touchstones of our character."
        <span className="block mt-3 text-sm text-muted-foreground not-italic">
          — Henry David Thoreau
        </span>
      </p>
    ),
  },
  {
    id: "science",
    kind: "science",
    icon: <Brain className="size-5 text-primary" strokeWidth={1.5} />,
    title: "Sleep hygiene",
    body: (
      <div className="space-y-3">
        <p className="text-base text-foreground">
          A consistent wind-down routine improves REM sleep by up to{" "}
          <span className="font-medium">23%</span>.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Dim lights 60 minutes before bed</li>
          <li>• Cool room: 65–68°F (18–20°C)</li>
          <li>• No screens in the last 30 minutes</li>
        </ul>
      </div>
    ),
  },
  {
    id: "stats",
    kind: "stats",
    icon: <Activity className="size-5 text-primary" strokeWidth={1.5} />,
    title: "Your sleep, this week",
    body: (
      <div className="grid grid-cols-3 gap-3">
        {[
          { v: "7h 24m", l: "Avg. sleep" },
          { v: "82%", l: "Sleep score" },
          { v: "4", l: "Dreams logged" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border bg-muted/30 p-3 text-center">
            <div
              className="text-xl text-foreground"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {s.v}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.l}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "dreams",
    kind: "dreams",
    icon: <Sparkles className="size-5 text-primary" strokeWidth={1.5} />,
    title: "Dream gallery",
    body: (
      <div>
        <div className="grid grid-cols-3 gap-2">
          {[
            "from-indigo-300 to-purple-300",
            "from-rose-200 to-amber-200",
            "from-sky-200 to-emerald-200",
            "from-violet-300 to-fuchsia-200",
            "from-amber-200 to-rose-300",
            "from-teal-200 to-indigo-300",
          ].map((g, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl bg-gradient-to-br ${g} opacity-40 grayscale`}
              aria-hidden
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground italic">
          Your dream entries will appear here once recorded.
        </p>
      </div>
    ),
  },
];

const SLIDE_MS = 1800;

export function LoadingScreen({
  onComplete,
  message = "Signing you in…",
}: {
  onComplete?: () => void;
  message?: string;
}) {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= total) {
          clearInterval(t);
          onComplete?.();
          return i;
        }
        return next;
      });
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [total, onComplete]);

  const progress = ((index + 1) / total) * 100;

  return (
    <main
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 py-10"
      style={{ background: "var(--gradient-calm)" }}
    >
      <div className="flex flex-col items-center mb-8">
        <div className="size-12 rounded-full bg-card flex items-center justify-center shadow-sm border animate-pulse">
          <Moon className="size-5 text-primary" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>

      <div className="w-full max-w-md relative" style={{ minHeight: 280 }}>
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            className="absolute inset-0 transition-all duration-500 ease-out"
            style={{
              opacity: i === index ? 1 : 0,
              transform: i === index ? "translateY(0)" : "translateY(8px)",
              pointerEvents: i === index ? "auto" : "none",
            }}
          >
            <div
              className="bg-card rounded-3xl border p-6 sm:p-7 h-full"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                  {s.icon}
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {s.title}
                </span>
              </div>
              {s.body}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 w-full max-w-md">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className="size-1.5 rounded-full transition-colors"
              style={{
                background: i <= index ? "var(--primary)" : "var(--muted)",
              }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

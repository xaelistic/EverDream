import {
  BookOpen,
  Home,
  Menu,
  Mic,
  Moon,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { RouteScreen } from '../hooks/useHashRoute';

type ShellProps = {
  active: RouteScreen;
  onNavigate: (screen: RouteScreen) => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
};

const navItems: { screen: RouteScreen; label: string; icon: typeof Home }[] = [
  { screen: 'home', label: 'Home', icon: Home },
  { screen: 'journal', label: 'Journal', icon: BookOpen },
  { screen: 'record', label: 'Record', icon: Mic },
  { screen: 'insights', label: 'Insights', icon: Sparkles },
  { screen: 'more', label: 'More', icon: Menu },
];

function isNavActive(active: RouteScreen, screen: RouteScreen): boolean {
  if (screen === 'more') {
    return ['more', 'wearables', 'privacy', 'achievements', 'assets'].includes(active);
  }
  return active === screen;
}

export default function Shell({ active, onNavigate, onOpenSettings, children }: ShellProps) {
  return (
    <div className="min-h-screen bg-paper flex flex-col font-sans text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-parchment border border-line flex items-center justify-center shadow-paper shrink-0">
              <Moon className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-lg font-medium tracking-tight text-ink truncate">
                EverDream Journal
              </p>
              <p className="text-[11px] text-muted uppercase tracking-[0.14em] truncate">
                Dreams · Sleep · Calm reflection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-full border border-line bg-cream hover:bg-parchment transition-colors shrink-0"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-muted" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-5 pb-28">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-cream/98 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-lg mx-auto px-2 pt-2 pb-3 flex justify-around items-end">
          {navItems.map(({ screen, label, icon: Icon }) => {
            const on = isNavActive(active, screen);
            const isRecord = screen === 'record';
            return (
              <button
                key={screen}
                type="button"
                onClick={() => onNavigate(screen)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors min-w-[56px] ${
                  on ? 'text-sageDark' : 'text-muted hover:text-ink'
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-full transition-all ${
                    isRecord
                      ? on
                        ? 'w-12 h-12 -mt-4 bg-sage text-cream shadow-lift border border-sageDark/20'
                        : 'w-11 h-11 -mt-3 bg-parchment border border-line text-ink shadow-paper'
                      : 'w-9 h-9'
                  }`}
                >
                  <Icon
                    className={isRecord ? 'w-5 h-5' : 'w-[18px] h-[18px]'}
                    strokeWidth={1.75}
                  />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

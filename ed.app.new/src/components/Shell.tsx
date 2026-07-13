import {
  BookOpen,
  CalendarDays,
  Home,
  Loader2,
  Menu,
  Moon,
  User,
} from 'lucide-react';
import type { RouteScreen } from '../hooks/useHashRoute';
import { useSkinFull } from '../contexts/SkinContext';
import { useProfile } from '../hooks/useProfile';

type ShellProps = {
  active: RouteScreen;
  onNavigate: (screen: RouteScreen) => void;
  onOpenProfile: () => void;
  processingDreamCount?: number;
  children: React.ReactNode;
};

const navItems: { screen: RouteScreen; label: string; icon: typeof Home }[] = [
  { screen: 'home', label: 'Home', icon: Home },
  { screen: 'journal', label: 'Journal', icon: BookOpen },
  { screen: 'tracker', label: 'Tracker', icon: CalendarDays },
  { screen: 'more', label: 'More', icon: Menu },
];

// Center Record button (the primary action for capturing new dreams, video-first)
// Toggles between overview (home/journal) and the record/capture flow
function getRecordButtonTarget(active: RouteScreen): RouteScreen {
  if (active === 'home' || active === 'journal') {
    return 'record';
  }
  return 'home';
}

function isNavActive(active: RouteScreen, screen: RouteScreen): boolean {
  if (screen === 'home') {
    return active === 'home' || active === 'reflection';
  }
  if (screen === 'more') {
    return ['more', 'wearables', 'privacy', 'achievements', 'assets', 'import-photos', 'admin', 'settings'].includes(active);
  }
  return active === screen;
}

function isRecordActive(active: RouteScreen): boolean {
  return active === 'record' || active === 'capture';
}

function navItemClasses(on: boolean, isThemed: boolean): string {
  if (on) {
    return isThemed
      ? 'text-[var(--aqua-deep)]'
      : 'text-sageDark';
  }
  return isThemed
    ? 'text-[var(--text-label)] hover:text-[var(--text-primary)]'
    : 'text-muted hover:text-ink';
}

function navIconClasses(on: boolean, isThemed: boolean): string {
  const base = 'flex items-center justify-center rounded-full transition-all w-9 h-9';
  if (!on) return base;
  return isThemed
    ? `${base} bg-[var(--aqua-deep)]/12 ring-2 ring-[var(--aqua-deep)]/35`
    : `${base} bg-sage/15 ring-2 ring-sage/40`;
}

export default function Shell({ active, onNavigate, onOpenProfile, processingDreamCount = 0, children }: ShellProps) {
  const { isThemed } = useSkinFull();
  const { profile } = useProfile();
  const recordTarget = getRecordButtonTarget(active);
  const recordActive = isRecordActive(active);

  const renderNavButton = ({ screen, label, icon: Icon }: (typeof navItems)[number]) => {
    const on = isNavActive(active, screen);
    return (
      <button
        key={screen}
        type="button"
        onClick={() => onNavigate(screen)}
        aria-current={on ? 'page' : undefined}
        className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-colors min-w-[44px] ${navItemClasses(on, isThemed)}`}
      >
        <span className={navIconClasses(on, isThemed)}>
          <Icon className="w-[18px] h-[18px]" strokeWidth={on ? 2.25 : 1.75} />
        </span>
        <span className={`text-[10px] uppercase tracking-wide ${on ? 'font-bold' : 'font-medium'}`}>
          {label}
        </span>
        {on && (
          <span
            className={`w-1 h-1 rounded-full ${isThemed ? 'bg-[var(--aqua-deep)]' : 'bg-sageDark'}`}
            aria-hidden
          />
        )}
      </button>
    );
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans ${isThemed ? 'text-[var(--text-primary)]' : 'text-ink'}`}>
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${isThemed ? 'border-[var(--glass-border)] bg-[var(--header-bg)]' : 'border-line bg-cream/95'}`}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-9 h-9 rounded-full border flex items-center justify-center shadow-paper shrink-0 ${isThemed ? 'bg-[var(--glass-bg)] border-[var(--glass-border)]' : 'bg-parchment border-line'}`}>
              <Moon className="w-4 h-4 text-duskDeep" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              {isThemed ? (
                <>
                  <p className="text-[18px] font-light tracking-[6px] uppercase text-[var(--text-primary)] truncate">
                    EVERDREAM
                  </p>
                  <p className="text-[10px] text-[var(--text-label)] tracking-[1px] truncate">
                    Dreams · Sleep · Calm reflection
                  </p>
                </>
              ) : (
                <>
                  <p className="font-serif text-lg font-medium tracking-tight text-ink truncate">
                    EverDream Journal
                  </p>
                  <p className="text-[11px] text-muted uppercase tracking-[0.14em] truncate">
                    Dreams · Sleep · Calm reflection
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {processingDreamCount > 0 && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[10px] font-medium uppercase tracking-wide ${isThemed ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--aqua-deep)]' : 'border-sage/25 bg-sage/10 text-sageDark'}`}
                title="Dream processing in background"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="hidden sm:inline">Building XAEL</span>
              </div>
            )}
            <button
              type="button"
              onClick={onOpenProfile}
              className={`w-10 h-10 rounded-full border transition-colors overflow-hidden flex items-center justify-center shrink-0 ${isThemed ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-white/80' : 'border-line bg-cream hover:bg-parchment'}`}
              aria-label="Profile"
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-5 h-5 text-muted" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-5 pb-28">{children}</main>

      <nav className={`fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] ${isThemed ? 'border-[var(--glass-border)] bg-[var(--nav-bg)]' : 'border-line bg-cream/98'}`}>
        <div className="max-w-lg mx-auto px-2 pt-2 pb-3 flex justify-around items-end">
          {/* Left nav items: Home, Journal */}
          {navItems.slice(0, 2).map(renderNavButton)}

          {/* Center Record button - larger, elevated, the prominent CTA for video/text dream capture (video-first) */}
          <button
            type="button"
            onClick={() => onNavigate(recordTarget)}
            aria-current={recordActive ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-colors min-w-[64px] ${
              recordActive
                ? isThemed ? 'text-[var(--aqua-deep)]' : 'text-sageDark'
                : isThemed ? 'text-[var(--text-label)] hover:text-[var(--text-primary)]' : 'text-muted hover:text-ink'
            }`}
          >
            <span
              className={`flex items-center justify-center rounded-full transition-all shadow-lift ${
                recordActive
                  ? isThemed
                    ? 'w-14 h-14 -mt-5 bg-gradient-to-br from-[var(--aqua-deep)] to-[var(--aqua)] text-white border-2 border-[var(--aqua-deep)]/40 ring-4 ring-[var(--aqua-deep)]/20'
                    : 'w-14 h-14 -mt-5 bg-gradient-to-br from-sage to-sageDark text-cream border-2 border-sageDark/40 ring-4 ring-sage/25'
                  : isThemed
                    ? 'w-13 h-13 -mt-4 bg-gradient-to-br from-[var(--glass-bg)] to-white border border-[var(--glass-border)] text-[var(--text-primary)] shadow-paper'
                    : 'w-13 h-13 -mt-4 bg-gradient-to-br from-parchment to-cream border border-line text-ink shadow-paper'
              }`}
            >
              <Moon className="w-6 h-6" strokeWidth={recordActive ? 2.25 : 1.75} />
            </span>
            <span className={`text-[10px] uppercase tracking-wide ${recordActive ? 'font-bold' : 'font-medium'}`}>
              Record
            </span>
            {recordActive && (
              <span
                className={`w-1 h-1 rounded-full ${isThemed ? 'bg-[var(--aqua-deep)]' : 'bg-sageDark'}`}
                aria-hidden
              />
            )}
          </button>

          {/* Right nav items: Tracker, More */}
          {navItems.slice(2).map(renderNavButton)}
        </div>
      </nav>
    </div>
  );
}

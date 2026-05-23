import {
  BookOpen,
  Home,
  Menu,
  Mic,
  Moon,
  Settings,
  Sparkles,
  LogIn,
  User,
  Zap,
} from 'lucide-react';
import type { RouteScreen } from '../hooks/useHashRoute';
import { useAuth } from '../hooks/useAuth';

type ShellProps = {
  active: RouteScreen;
  onNavigate: (screen: RouteScreen) => void;
  onOpenSettings: () => void;
  children: React.ReactNode;
};

const navItems: { screen: RouteScreen; label: string; icon: typeof Home }[] = [
  { screen: 'home', label: 'Home', icon: Home },
  { screen: 'reflection', label: 'Reflect', icon: Moon },
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
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Modern Header - Glass Morphism */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
              <Moon className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg text-white truncate">
                EverDream
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest truncate">
                Dream Journal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </div>
                <span className="text-xs font-medium text-white truncate max-w-[100px]">
                  {user.email?.split('@')[0]}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (window as any).openAuthModal?.()}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/30 shrink-0"
                aria-label="Sign in"
              >
                <LogIn className="w-4 h-4" strokeWidth={2} />
                Sign In
              </button>
            )}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2.5 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-all shrink-0"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 pb-32">{children}</main>

      {/* Modern Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-lg mx-auto px-2 pt-3 pb-4 flex justify-around items-center">
          {navItems.map(({ screen, label, icon: Icon }) => {
            const on = isNavActive(active, screen);
            const isRecord = screen === 'record';
            return (
              <button
                key={screen}
                type="button"
                onClick={() => onNavigate(screen)}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all duration-300 min-w-[64px] relative ${
                  on ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {on && (
                  <span className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-2xl animate-fade-in" />
                )}
                <span
                  className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 ${
                    isRecord
                      ? on
                        ? 'w-14 h-14 -mt-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-xl shadow-purple-500/40 scale-110'
                        : 'w-12 h-12 -mt-4 bg-white/10 border border-white/20'
                      : 'w-10 h-10'
                  }`}
                >
                  <Icon
                    className={isRecord ? 'w-6 h-6' : 'w-5 h-5'}
                    strokeWidth={on ? 2.5 : 1.75}
                  />
                </span>
                <span className="relative text-[9px] font-semibold uppercase tracking-wider">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

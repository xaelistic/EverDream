import { useState } from 'react';
import { Palette, Brain, Camera, Watch, Shield, Award, Eye, ChevronRight } from 'lucide-react';
import type { SkinId } from '../contexts/SkinContext';
import { getSkinMeta } from '../lib/skins';
import { SkinPickerModal } from '../components/settings/SkinPickerModal';

interface MoreScreenProps {
  skin: SkinId;
  isThemed: boolean;
  navigate: (screen: string) => void;
}

export function MoreScreen({ skin, isThemed, navigate }: MoreScreenProps) {
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);
  const currentSkin = getSkinMeta(skin);
  const card = isThemed
    ? 'border-[var(--glass-border)] bg-[var(--glass-bg)]'
    : 'border-line bg-cream';
  const cardBorder = isThemed ? 'border-[var(--glass-border)]' : 'border-line';
  const iconWrap = isThemed
    ? 'bg-[var(--aqua-light)]/20 border-[var(--glass-border)]'
    : 'bg-parchment border-line';
  const rowHover = isThemed ? 'hover:bg-white/60' : 'hover:bg-parchment/80';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-medium text-ink">More</h2>
        <p className="text-sm text-muted mt-1">
          Sleep sync, keepsakes, milestones, and your data choices.
        </p>
      </div>

      {/* Appearance */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b ${cardBorder}`}>
          <h3 className="text-xs uppercase tracking-wider text-muted font-medium">Appearance</h3>
        </div>
        <button
          type="button"
          onClick={() => setSkinPickerOpen(true)}
          className={`w-full flex items-center gap-3 p-4 text-left transition ${rowHover}`}
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${iconWrap}`}>
            <Palette className="w-5 h-5 text-duskDeep" strokeWidth={1.75} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-medium text-ink">App Skin</span>
            <span className="block text-xs text-muted">
              {currentSkin.name} — {currentSkin.tagline}
            </span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="w-8 h-8 rounded-lg border border-white/50 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${currentSkin.preview[0]}, ${currentSkin.preview[1]}, ${currentSkin.preview[2]})`,
              }}
            />
            <ChevronRight className="w-4 h-4 text-muted" strokeWidth={1.75} />
          </div>
        </button>
      </div>

      <SkinPickerModal isOpen={skinPickerOpen} onClose={() => setSkinPickerOpen(false)} />

      {/* Features */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b ${cardBorder}`}>
          <h3 className="text-xs uppercase tracking-wider text-muted font-medium">Features</h3>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {[
            { label: 'Insights', sub: 'Patterns & correlations', screen: 'dashboard', icon: Brain },
            { label: 'Import journal photos', sub: 'OCR from pictures', screen: 'import-photos', icon: Camera },
            { label: 'Sleep & wearables', sub: 'Sessions and sync', screen: 'wearables', icon: Watch },
            { label: 'Keepsakes', sub: 'Images & provenance', screen: 'assets', icon: Shield },
            { label: 'Achievements', sub: 'Small wins', screen: 'achievements', icon: Award },
          ].map(({ label, sub, screen, icon: Icon }) => (
            <button
              key={screen}
              type="button"
              onClick={() => navigate(screen)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${rowHover}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${iconWrap}`}>
                <Icon className="w-5 h-5 text-duskDeep" strokeWidth={1.75} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-ink">{label}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </div>

      {/* Privacy & Data */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className={`px-4 py-3 border-b ${cardBorder}`}>
          <h3 className="text-xs uppercase tracking-wider text-muted font-medium">Privacy & Data</h3>
        </div>
        <div className="divide-y divide-[var(--glass-border)]">
          {[
            { label: 'Privacy policy', sub: 'Your rights & controls', screen: 'privacy', icon: Eye },
          ].map(({ label, sub, screen, icon: Icon }) => (
            <button
              key={screen}
              type="button"
              onClick={() => navigate(screen)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${rowHover}`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-full border ${iconWrap}`}>
                <Icon className="w-5 h-5 text-duskDeep" strokeWidth={1.75} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-ink">{label}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted shrink-0" strokeWidth={1.75} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
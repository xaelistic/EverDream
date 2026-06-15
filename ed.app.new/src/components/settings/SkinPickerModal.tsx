import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { SkinId } from '../../contexts/SkinContext';
import { SKINS } from '../../lib/skins';
import { useSkinFull } from '../../contexts/SkinContext';

interface SkinPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SkinPickerModal({ isOpen, onClose }: SkinPickerModalProps) {
  const { skin, setSkin, isThemed } = useSkinFull();

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (id: SkinId) => {
    setSkin(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Choose app skin"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close skin picker"
      />

      <div
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
          isThemed
            ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl'
            : 'border-line bg-cream'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isThemed ? 'border-[var(--glass-border)]' : 'border-line'
          }`}
        >
          <div>
            <h2 className="font-serif text-xl font-medium text-ink">App Skin</h2>
            <p className="text-xs text-muted mt-0.5">Pick a look to experiment with</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full transition ${
              isThemed
                ? 'hover:bg-white/50 text-[var(--text-label)]'
                : 'hover:bg-parchment text-muted'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 gap-3 max-h-[70vh] overflow-y-auto">
          {SKINS.map((meta) => {
            const selected = skin === meta.id;
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => handleSelect(meta.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl border text-left transition-all ${
                  selected
                    ? isThemed
                      ? 'border-[var(--aqua-deep)] bg-white/40 ring-2 ring-[var(--aqua-deep)]/25'
                      : 'border-sage ring-2 ring-sage/25 bg-parchment/60'
                    : isThemed
                      ? 'border-[var(--glass-border)] hover:bg-white/30'
                      : 'border-line hover:bg-parchment/50'
                }`}
              >
                <div
                  className="w-16 h-16 rounded-xl shrink-0 border border-white/40 shadow-inner overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${meta.preview[0]} 0%, ${meta.preview[1]} 50%, ${meta.preview[2]} 100%)`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{meta.name}</span>
                    {selected && (
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                          isThemed ? 'bg-[var(--aqua-deep)] text-white' : 'bg-sage text-cream'
                        }`}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{meta.tagline}</p>
                  <div className="flex gap-1.5 mt-2">
                    {meta.swatches.map(({ color, label }) => (
                      <span
                        key={label}
                        className="w-3 h-3 rounded-full border border-white/60"
                        style={{ background: color }}
                        title={label}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
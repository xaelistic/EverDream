import { Download, X, Shield, Cpu, Activity, Moon } from 'lucide-react';

interface PrivacySettings {
  aiAnalysis: boolean;
  imageGeneration: boolean;
  wearableSync: boolean;
  anonymousAnalytics: boolean;
  thirdPartySharing: boolean;
}

interface PrivacyScreenProps {
  privacySettings: PrivacySettings;
  setPrivacySettings: (settings: PrivacySettings) => void;
  savePrivacySettings: (settings: PrivacySettings) => void;
  exportAllData: () => void;
  deleteAllUserData: () => void;
  setShowLicensing: (show: boolean) => void;
  setShowTerms: (show: boolean) => void;
}

export function PrivacyScreen({
  privacySettings,
  setPrivacySettings,
  savePrivacySettings,
  exportAllData,
  deleteAllUserData,
  setShowLicensing,
  setShowTerms,
}: PrivacyScreenProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-2xl font-medium text-ink">Privacy & Data Sovereignty</h2>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={exportAllData}
          className="bg-sage hover:bg-sageDark text-cream py-3 rounded-lg transition flex items-center justify-center gap-2"
          aria-label="Export all data"
        >
          <Download className="w-4 h-4" strokeWidth={1.75} />
          Export All Data
        </button>
        <button
          onClick={deleteAllUserData}
          className="bg-red-600 hover:bg-red-700 py-3 rounded-lg transition flex items-center justify-center gap-2"
          aria-label="Delete all data"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
          Delete Everything
        </button>
      </div>

      {/* Privacy Settings */}
      <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm text-ink">
          <Shield className="w-5 h-5 text-sage" strokeWidth={1.75} />
          Granular Privacy Controls
        </h3>
        <div className="space-y-4">
          <PrivacyToggle
            label="AI Dream Analysis"
            description="Allow Claude AI to analyze dream content"
            value={privacySettings.aiAnalysis}
            onChange={(v) => {
              const newSettings = {...privacySettings, aiAnalysis: v};
              setPrivacySettings(newSettings);
              savePrivacySettings(newSettings);
            }}
            required={true}
            note="Required for core functionality"
          />

          <PrivacyToggle
            label="Image Generation"
            description="Generate AI images from dreams"
            value={privacySettings.imageGeneration}
            onChange={(v) => {
              const newSettings = {...privacySettings, imageGeneration: v};
              setPrivacySettings(newSettings);
              savePrivacySettings(newSettings);
            }}
          />

          <PrivacyToggle
            label="Wearable Data Sync"
            description="Sync sleep data from wearable devices"
            value={privacySettings.wearableSync}
            onChange={(v) => {
              const newSettings = {...privacySettings, wearableSync: v};
              setPrivacySettings(newSettings);
              savePrivacySettings(newSettings);
            }}
          />

          <PrivacyToggle
            label="Anonymous Analytics"
            description="Share anonymous usage patterns (helps improve app)"
            value={privacySettings.anonymousAnalytics}
            onChange={(v) => {
              const newSettings = {...privacySettings, anonymousAnalytics: v};
              setPrivacySettings(newSettings);
              savePrivacySettings(newSettings);
            }}
          />

          <PrivacyToggle
            label="Third-Party Data Sharing"
            description="Allow dream baskets to license your content"
            value={privacySettings.thirdPartySharing}
            onChange={(v) => {
              const newSettings = {...privacySettings, thirdPartySharing: v};
              setPrivacySettings(newSettings);
              savePrivacySettings(newSettings);
            }}
            note="Required for monetization (Phase 3)"
          />
        </div>
      </div>

      {/* Data Storage Info */}
      <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
        <h3 className="font-semibold mb-3 text-sm text-ink">Where Your Data Lives</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-sage flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <div className="font-semibold text-ink">Local Storage (Primary)</div>
              <div className="text-muted">Browser IndexedDB on your device</div>
              <div className="text-xs text-muted mt-1">You control this data completely</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Cpu className="w-5 h-5 text-duskDeep flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <div className="font-semibold text-ink">Data Processors</div>
              <div className="text-muted">• Claude AI (Anthropic) - Analysis only</div>
              <div className="text-muted">• DALL-E (OpenAI) - Image generation</div>
              <div className="text-xs text-muted mt-1">No data retention, processing only</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-duskDeep flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <div className="font-semibold text-ink">Transmission</div>
              <div className="text-muted">HTTPS/TLS 1.3 encrypted</div>
              <div className="text-xs text-muted mt-1">All API calls are encrypted in transit</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Moon className="w-5 h-5 text-duskDeep flex-shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <div className="font-semibold text-ink">Future: Ethereum Storage</div>
              <div className="text-muted">IPFS + Ethereum for NFT minting</div>
              <div className="text-xs text-muted mt-1">Phase 3: Decentralized storage option</div>
            </div>
          </div>
        </div>
      </div>

      {/* GDPR Rights */}
      <div className="rounded-2xl border border-line bg-cream p-4 shadow-paper">
        <h3 className="font-semibold mb-2 text-sm text-ink">Your GDPR Rights</h3>
        <div className="text-sm space-y-1 text-muted">
          <div>✓ Right to Access (export your data anytime)</div>
          <div>✓ Right to Rectification (edit your dreams)</div>
          <div>✓ Right to Erasure (delete everything)</div>
          <div>✓ Right to Data Portability (JSON export)</div>
          <div>✓ Right to Object (opt-out controls)</div>
          <div>✓ Right to Restrict Processing (granular controls)</div>
        </div>
      </div>

      {/* Licensing Info */}
      <button
        onClick={() => setShowLicensing(true)}
        className="w-full border-2 border-dusk/30 bg-dusk/5 hover:bg-dusk/10 text-duskDeep py-3 rounded-lg transition font-medium text-sm"
      >
        View Open Source Licensing
      </button>

      {/* Terms */}
      <button
        onClick={() => setShowTerms(true)}
        className="w-full border-2 border-dusk/30 bg-dusk/5 hover:bg-dusk/10 text-duskDeep py-3 rounded-lg transition font-medium text-sm"
      >
        View Terms & Conditions
      </button>
    </div>
  );
}

interface PrivacyToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
  note?: string;
}

function PrivacyToggle({ label, description, value, onChange, required = false, note }: PrivacyToggleProps) {
  return (
    <div className="border-b border-line pb-4 last:border-0">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ink">{label}</div>
          <div className="text-xs text-muted mt-0.5 leading-relaxed">{description}</div>
          {note && (
            <div className="text-xs text-muted mt-1.5">{note}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => !required && onChange(!value)}
          disabled={required}
          className={`ml-2 w-12 h-7 rounded-full transition flex-shrink-0 border border-line ${
            value ? 'bg-sage' : 'bg-parchment'
          } ${required ? 'opacity-45 cursor-not-allowed' : ''}`}
          aria-label={`Toggle ${label}`}
        >
          <div className={`w-5 h-5 bg-cream rounded-full shadow-sm transition transform mt-0.5 ${value ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
    </div>
  );
}

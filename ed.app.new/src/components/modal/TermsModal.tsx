import { useState } from 'react';
import { X, ChevronDown, ChevronUp, Shield, Database, Server, Key, AlertTriangle, FileText, Mail } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  hasAccepted?: boolean;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  colorClass: string;
  defaultOpen?: boolean;
}

const ExpandableSection = ({ title, icon, children, colorClass, defaultOpen = false }: SectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border border-line overflow-hidden ${colorClass}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white/50 hover:bg-white/70 transition"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-sm text-ink">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2 text-xs text-muted leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};

export function TermsModal({ isOpen, onClose, onAccept, hasAccepted = false }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center z-[60] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Terms and Conditions"
    >
      <div className="bg-cream w-full sm:max-w-lg rounded-3xl border border-line p-6 max-h-[85vh] overflow-y-auto relative shadow-lift">
        <button
          type="button"
          onClick={hasAccepted ? onClose : undefined}
          disabled={!hasAccepted}
          className={`absolute top-4 right-4 z-10 p-2 rounded-full transition ${
            hasAccepted 
              ? 'text-muted hover:text-ink hover:bg-parchment' 
              : 'text-muted/50 cursor-not-allowed'
          }`}
          aria-label="Close"
        >
          <X className="w-5 h-5" strokeWidth={1.75} />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-serif font-medium text-ink mb-2">Terms & Conditions</h2>
          <p className="text-sm text-muted">
            Your privacy and data sovereignty are our highest priority. Please review how we handle your dream data.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <ExpandableSection
            title="Your Data, Your Rights"
            icon={<Shield className="w-4 h-4 text-sage" />}
            colorClass="bg-sage/10"
            defaultOpen={true}
          >
            <p className="mb-2">
              You retain <strong className="text-ink">100% ownership</strong> of all dream content, metadata, and generated assets. 
              DreamScape operates on a <strong className="text-ink">"loan, not transfer"</strong> model.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>You license your data to us for processing only</li>
              <li>This license is revocable at any time</li>
              <li>You may delete all data permanently (GDPR Article 17 - Right to Erasure)</li>
            </ul>
          </ExpandableSection>

          <ExpandableSection
            title="Data Processing"
            icon={<Database className="w-4 h-4 text-dusk" />}
            colorClass="bg-dusk/10"
          >
            <div className="space-y-3">
              <div>
                <p className="font-medium text-ink mb-1">What we process:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Dream text for AI analysis (Anthropic Claude)</li>
                  <li>Dream content for image generation (OpenAI DALL-E)</li>
                  <li>Anonymized usage statistics (optional, opt-in)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-ink mb-1">What we DON'T do:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Sell your data to third parties</li>
                  <li>Use your dreams to train AI models without consent</li>
                  <li>Share personal information with advertisers</li>
                  <li>Retain data after you request deletion</li>
                </ul>
              </div>
            </div>
          </ExpandableSection>

          <ExpandableSection
            title="Data Storage & Location"
            icon={<Server className="w-4 h-4 text-sageDark" />}
            colorClass="bg-sageDark/10"
          >
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-ink">Primary Storage:</span>
                <span>Browser IndexedDB (your device)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Processing:</span>
                <span>Anthropic API (US), OpenAI API (US)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Future:</span>
                <span>IPFS (decentralized) + Ethereum (blockchain)</span>
              </div>
              <p className="mt-2 text-xs">
                Data transmission uses TLS 1.3 encryption. Processing APIs do not retain your data per their privacy policies.
              </p>
            </div>
          </ExpandableSection>

          <ExpandableSection
            title="NFT Ownership & Smart Contracts"
            icon={<Key className="w-4 h-4 text-duskDeep" />}
            colorClass="bg-duskDeep/10"
          >
            <p className="mb-2">When you mint a dream as an NFT:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>You own the NFT on-chain</li>
              <li>Content stored on IPFS remains under your license</li>
              <li>Smart contract is GPL-3.0 (open source)</li>
              <li>You can sell, transfer, or burn the NFT</li>
              <li>Original watermark proves provenance</li>
            </ul>
            <div className="mt-3 bg-amber-100/70 border border-amber-200 rounded-xl p-3">
              <p className="text-amber-900">
                <strong>⚠️ Important:</strong> Once minted to Ethereum, the NFT is permanent on-chain. 
                The content link can be updated, but the token exists forever.
              </p>
            </div>
          </ExpandableSection>

          <ExpandableSection
            title="Dream Economy Participation"
            icon={<AlertTriangle className="w-4 h-4 text-blush" />}
            colorClass="bg-blush/10"
          >
            <p className="mb-2">If you choose to participate in Dream Economy baskets (Phase 3):</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Your dreams may be licensed to third parties (with your consent)</li>
              <li>You earn yield from licensing fees</li>
              <li>You can opt-out anytime</li>
              <li>License terms are transparent in smart contracts</li>
              <li>Rarity scoring is algorithmic and auditable</li>
            </ul>
            <p className="mt-2">
              <strong className="text-ink">You control:</strong> Which dreams to include, licensing terms, opt-out timing
            </p>
          </ExpandableSection>

          <ExpandableSection
            title="Privacy & GDPR Compliance"
            icon={<FileText className="w-4 h-4 text-sage" />}
            colorClass="bg-sage/10"
          >
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-ink">Legal Basis:</span>
                <span>Consent (GDPR Article 6(1)(a))</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Data Controller:</span>
                <span>DreamScape (open source project)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Data Processors:</span>
                <span>Anthropic, OpenAI (bound by DPAs)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Retention:</span>
                <span>Until you delete (no automatic deletion)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink">Your Rights:</span>
                <span>Access, rectification, erasure, portability, restriction, objection</span>
              </div>
            </div>
            <div className="mt-3 bg-dusk/20 border border-dusk/30 rounded-xl p-3">
              <p className="text-duskDeep">
                To exercise rights: Use in-app Privacy controls or contact via GitHub
              </p>
            </div>
          </ExpandableSection>

          <ExpandableSection
            title="Disclaimers"
            icon={<AlertTriangle className="w-4 h-4 text-muted" />}
            colorClass="bg-muted/10"
          >
            <ul className="space-y-2">
              <li>
                <strong className="text-ink">Medical:</strong> DreamScape is not a medical device. 
                Dream analysis is for entertainment/insight only.
              </li>
              <li>
                <strong className="text-ink">Therapeutic:</strong> Not a replacement for professional mental health care.
              </li>
              <li>
                <strong className="text-ink">Financial:</strong> NFT and basket values may fluctuate. Not financial advice.
              </li>
              <li>
                <strong className="text-ink">Technical:</strong> Software provided "as is" under MIT license.
              </li>
            </ul>
          </ExpandableSection>

          <ExpandableSection
            title="Changes to Terms"
            icon={<FileText className="w-4 h-4 text-dusk" />}
            colorClass="bg-dusk/10"
          >
            <p>
              We may update these terms. You'll be notified in-app. Continued use after notification constitutes acceptance. 
              You can always export your data and leave if you disagree with changes.
            </p>
          </ExpandableSection>

          <ExpandableSection
            title="Contact & Support"
            icon={<Mail className="w-4 h-4 text-sageDark" />}
            colorClass="bg-sageDark/10"
          >
            <div className="space-y-1">
              <p><strong className="text-ink">GitHub:</strong> github.com/dreamscape/dreamscape</p>
              <p><strong className="text-ink">Privacy Inquiries:</strong> Via GitHub Issues</p>
              <p><strong className="text-ink">GDPR Requests:</strong> privacy@dreamscape.app (when live)</p>
            </div>
          </ExpandableSection>
        </div>

        {!hasAccepted && (
          <div className="mt-6 space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-900">
                ⚠️ You must accept these terms to use DreamScape. Your data sovereignty and privacy are our highest priority.
              </p>
            </div>
            <button
              onClick={onAccept}
              className="w-full bg-sage hover:bg-sageDark text-cream py-3.5 rounded-xl font-semibold transition shadow-lift"
            >
              I Accept - Start Dreaming
            </button>
            <button
              onClick={() => window.close()}
              className="w-full bg-parchment hover:bg-line text-muted py-2.5 rounded-xl text-sm transition border border-line"
            >
              I Don't Accept - Close App
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

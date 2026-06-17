import { ArrowLeft } from 'lucide-react';
import WebXRViewer, { type WebXRAsset } from '../components/vr/WebXRViewer';
import { getSimulacrum } from '../lib/simulacra/simulacraService';

interface DreamVRScreenProps {
  dreamId: string;
  title: string;
  imageUrl?: string;
  parallaxVideoUrl?: string;
  navigate: (screen: string, id?: string) => void;
}

export function DreamVRScreen({ dreamId, title, imageUrl, parallaxVideoUrl, navigate }: DreamVRScreenProps) {
  const sim = getSimulacrum(dreamId);

  const assets: WebXRAsset[] = [];
  if (parallaxVideoUrl || sim?.parallaxVideoUrl) {
    assets.push({
      id: 'parallax',
      type: 'parallax',
      url: parallaxVideoUrl || sim!.parallaxVideoUrl!,
      title,
    });
  } else if (imageUrl || sim?.imageUrl) {
    assets.push({
      id: 'dream-image',
      type: 'image',
      url: imageUrl || sim!.imageUrl,
      title,
    });
  }

  return (
    <div className="fixed inset-0 z-[90] bg-ink">
      <button
        type="button"
        onClick={() => navigate('simulacrum', dreamId)}
        className="absolute top-4 left-4 z-[100] inline-flex items-center gap-2 text-cream/90 text-sm bg-ink/50 px-3 py-2 rounded-full"
      >
        <ArrowLeft className="w-4 h-4" /> Exit VR
      </button>
      <WebXRViewer
        skyboxUrl={sim?.skyboxUrl}
        assets={assets}
        onBack={() => navigate('simulacrum', dreamId)}
        enableVR
      />
    </div>
  );
}
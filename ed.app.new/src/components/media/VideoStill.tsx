import { useState } from 'react';
import { Play } from 'lucide-react';

/** A video still, or a blank play button when the still is missing or landscape. */
export function VideoStill({ src }: { src?: string | null }) {
  const [shape, setShape] = useState<'pending' | 'portrait' | 'hide'>('pending');
  const showImage = Boolean(src) && shape === 'portrait';

  return (
    <div className="relative flex aspect-[9/16] max-h-72 w-full items-center justify-center bg-ink">
      {src && shape !== 'hide' && (
        <img
          src={src}
          alt=""
          className={showImage ? 'max-h-72 w-auto object-contain' : 'absolute h-px w-px opacity-0'}
          onLoad={(event) => {
            const img = event.currentTarget;
            setShape(img.naturalHeight > img.naturalWidth ? 'portrait' : 'hide');
          }}
          onError={() => setShape('hide')}
        />
      )}
      {!showImage && <Play className="h-10 w-10 text-white" strokeWidth={1.75} aria-hidden />}
    </div>
  );
}

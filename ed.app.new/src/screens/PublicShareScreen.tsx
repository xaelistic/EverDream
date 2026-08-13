import React, { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';


interface ShareLinkData {
  slug: string;
  caption?: string;
  og_title?: string;
  og_description?: string;
  og_image_url?: string;
  dream_id: string;
}

export function PublicShareScreen({ slug }: { slug: string }) {
  const [link, setLink] = useState<ShareLinkData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const base = import.meta.env.VITE_SUPABASE_URL;
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!base || !anon) {
        if (mounted) setError('Share links require Supabase configuration.');
        return;
      }

      const res = await fetch(`${base}/functions/v1/share-link?slug=${encodeURIComponent(slug)}`, {
        headers: { apikey: anon },
      });
      const json = await res.json();
      if (!mounted) return;
      if (!res.ok) {
        setError(json.error || 'Share link not found');
        return;
      }
      setLink(json.link);
    })();

    return () => { mounted = false; };
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-cream text-ink">
        <p>{error}</p>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
        <Moon className="animate-pulse text-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <div className="max-w-lg mx-auto p-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted text-center mb-4">
          EverDream · Dream journal
        </p>
        <div className="rounded-[2rem] border border-line bg-cream shadow-lift overflow-hidden">
          {link.og_image_url && (
            <img
              src={link.og_image_url}
              alt={link.og_title || 'Shared dream'}
              className="w-full object-cover"
            />
          )}
          <div className="p-6 space-y-3">
            <h1 className="font-serif text-2xl leading-snug">{link.og_title || 'A dream from EverDream'}</h1>
            <p className="font-serif italic leading-relaxed text-lg text-ink/90">
              {link.og_description || link.caption}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted text-center mt-8">
          Shared from EverDream — everdream.app
        </p>
      </div>
    </div>
  );
}
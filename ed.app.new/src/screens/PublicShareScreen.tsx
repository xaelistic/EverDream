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
    <div className="min-h-screen bg-cream text-ink p-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <Moon className="mx-auto mb-3 text-sage" />
        <h1 className="font-serif text-2xl">{link.og_title || 'A dream from EverDream'}</h1>
        <p className="text-sm text-muted mt-2">Shared dream journal entry</p>
      </div>

      {link.og_image_url && (
        <img
          src={link.og_image_url}
          alt="Dream visualization"
          className="w-full rounded-3xl border border-line shadow-paper mb-5"
        />
      )}

      <p className="font-serif italic leading-relaxed text-lg">
        {link.og_description || link.caption}
      </p>

      <p className="text-xs text-muted text-center mt-8">
        EverDream — track, reflect, and share your dreams
      </p>
    </div>
  );
}
import { ArrowLeft, User } from 'lucide-react';
import { getPublicProfileByHandle } from '../lib/profileService';

interface PublicProfileScreenProps {
  handle: string;
  navigate: (screen: string) => void;
}

export function PublicProfileScreen({ handle, navigate }: PublicProfileScreenProps) {
  const profile = getPublicProfileByHandle(handle);

  if (!profile) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('home')}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <div className="rounded-3xl border border-line bg-cream p-8 text-center">
          <User className="w-12 h-12 text-muted mx-auto mb-3" strokeWidth={1.5} />
          <h2 className="font-serif text-xl text-ink">Profile not available</h2>
          <p className="text-sm text-muted mt-2">
            This profile is private, does not exist, or has not been shared yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate('home')}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" /> Home
      </button>

      <div className="rounded-3xl border border-line bg-cream p-6 shadow-lift text-center">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="w-24 h-24 rounded-full border-4 border-sage/30 mx-auto object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full border-4 border-sage/30 bg-sage/20 flex items-center justify-center mx-auto">
            <User className="w-12 h-12 text-muted" />
          </div>
        )}
        <h1 className="mt-4 font-serif text-2xl text-ink">{profile.displayName}</h1>
        <p className="text-xs text-muted">@{profile.handle}</p>
        {profile.bio && (
          <p className="mt-4 text-sm text-ink leading-relaxed max-w-md mx-auto">{profile.bio}</p>
        )}
      </div>

      {profile.interests.length > 0 && (
        <div className="rounded-2xl border border-line bg-cream p-4">
          <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-sage/20 text-sageDark">
                {i}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
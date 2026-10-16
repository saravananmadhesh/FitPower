import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { exerciseImageUrl } from '@/utils/gallery';

interface AlbumCardProps {
  to: string;
  name: string;
  /** e.g. "60 exercises · 3 sub-albums" */
  meta: string;
  /** Cover image path relative to public/; falls back to the icon. */
  cover?: string;
  icon: LucideIcon;
}

export function AlbumCard({ to, name, meta, cover, icon: Icon }: AlbumCardProps) {
  return (
    <Link
      to={to}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-e1 transition duration-base hover:-translate-y-0.5 hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transform-none"
    >
      <div className="relative aspect-[3/2] bg-card-2">
        {cover ? (
          <img
            src={exerciseImageUrl(cover)}
            alt=""
            width={480}
            height={320}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-accent-soft">
            <Icon className="h-10 w-10 text-text" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-h3 text-text">{name}</h3>
        <p className="mt-1 text-body-sm text-text-muted">{meta}</p>
      </div>
    </Link>
  );
}

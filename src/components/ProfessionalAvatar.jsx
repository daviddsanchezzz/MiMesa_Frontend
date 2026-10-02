import { useEffect, useState } from 'react';

function initials(name = '') {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

/** Shared professional portrait. Falls back to initials if the photo is absent or cannot load. */
export default function ProfessionalAvatar({
  name,
  photo,
  color = '#7c3aed',
  size = 28,
  className = '',
  decorative = false,
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);

  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };
  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt={decorative ? '' : (name || 'Profesional')}
        aria-hidden={decorative || undefined}
        onError={() => setFailed(true)}
        style={style}
        className={`rounded-full object-cover shrink-0 bg-gray-100 ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : (name || 'Profesional')}
      role={decorative ? undefined : 'img'}
      style={{ ...style, backgroundColor: color || '#7c3aed' }}
      className={`rounded-full inline-flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
    >
      {initials(name)}
    </span>
  );
}

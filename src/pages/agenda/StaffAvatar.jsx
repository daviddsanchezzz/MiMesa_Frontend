import { initials } from './utils';

// Round photo, or initials on the professional's colour.
export default function StaffAvatar({ name, photo, color = '#7c3aed', size = 28, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) };
  if (photo) return <img src={photo} alt={name} style={style} className={`rounded-full object-cover shrink-0 ${className}`} />;
  return (
    <span style={{ ...style, backgroundColor: color }}
      className={`rounded-full inline-flex items-center justify-center text-white font-semibold shrink-0 ${className}`}>
      {initials(name)}
    </span>
  );
}

// Prefer vertical scrolling; a diagonal gesture must never turn into paging.
export function gestureAxis(dx, dy) {
  if (Math.abs(dx) >= 24 && Math.abs(dx) > Math.abs(dy) * 2.5) return 'x';
  if (Math.abs(dy) >= 8) return 'y';
  return null;
}

export function pageAfterSwipe({ axis, dx, dy, width, startLeft, maxLeft }) {
  if (axis !== 'x' || width <= 0 || Math.abs(dx) < Math.max(64, width * 0.2)
    || Math.abs(dx) <= Math.abs(dy) * 2.5) return null;
  const page = Math.round(startLeft / width) + (dx < 0 ? 1 : -1);
  return Math.max(0, Math.min(maxLeft, page * width));
}

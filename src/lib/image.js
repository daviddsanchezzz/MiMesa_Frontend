/**
 * Shrinks a photo in the browser before uploading it: a phone picture is several MB, a dish on the
 * website needs ~1200 px. Returns a JPEG/WebP Blob (≤ ~300 KB in practice) or throws if it is not an image.
 */
export async function shrinkImage(file, { maxSide = 1200, quality = 0.82 } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('Elige una imagen');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  // Safari cannot encode WebP: it hands back a PNG, which is far bigger; use JPEG then
  if (blob && blob.type === 'image/webp') return blob;
  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!jpeg) throw new Error('No se ha podido preparar la foto');
  return jpeg;
}

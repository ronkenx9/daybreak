export const MAX_PROFILE_IMAGE_BYTES = 150_000;

// Photos are re-encoded by the browser before upload. The server accepts only
// a bounded WebP data URL, excluding active formats such as SVG.
export function isValidProfileImage(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('data:image/webp;base64,UklGR')) return false;
  const encoded = value.slice(value.indexOf(',') + 1);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return false;
  return Math.floor(encoded.length * 3 / 4) <= MAX_PROFILE_IMAGE_BYTES;
}

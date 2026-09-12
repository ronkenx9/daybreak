'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { MAX_PROFILE_IMAGE_BYTES } from '@/lib/account/profile-image';

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function preparePhoto(file: File) {
  if (!ACCEPTED.has(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (file.size > 5_000_000) throw new Error('Choose an image smaller than 5 MB.');
  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (side < 64) throw new Error('Choose an image at least 64 × 64 pixels.');
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the image.');
  context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
  for (const quality of [0.82, 0.68, 0.52]) {
    const result = canvas.toDataURL('image/webp', quality);
    const bytes = Math.floor((result.length - result.indexOf(',') - 1) * 3 / 4);
    if (result.startsWith('data:image/webp;base64,') && bytes <= MAX_PROFILE_IMAGE_BYTES) return result;
  }
  throw new Error('This image is too detailed to compress. Try a simpler crop.');
}

export default function ProfilePhotoPicker({ imageUrl, disabled, signedIn, onSave, onRequireSignIn }: {
  imageUrl: string | null; disabled: boolean; signedIn: boolean;
  onSave: (imageUrl: string | null) => Promise<void>; onRequireSignIn: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choose = () => signedIn ? input.current?.click() : onRequireSignIn();
  const change = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try { await onSave(await preparePhoto(file)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Profile photo could not be saved.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError('');
    try { await onSave(null); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Profile photo could not be removed.'); }
    finally { setBusy(false); }
  };
  return <div className="db-photo-actions">
    <input ref={input} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={change}/>
    <button type="button" className="db-button db-blue-button" disabled={disabled || busy} onClick={choose}><ImagePlus size={16}/>{busy ? 'Saving…' : imageUrl ? 'Change photo' : 'Upload photo'}</button>
    {imageUrl && <button type="button" className="db-text-link" disabled={disabled || busy} onClick={remove}><Trash2 size={15}/> Remove photo</button>}
    {!signedIn && <small>Sign in to use a profile photo across your circles.</small>}
    {error && <small role="alert" className="db-photo-error">{error}</small>}
  </div>;
}

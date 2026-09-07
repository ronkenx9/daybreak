'use client';
import { useState } from 'react';

// Meme token logo: the DexScreener image when we have one, otherwise a two-letter
// monogram. Falls back to the monogram if the image fails to load.
export default function MemeLogo({ symbol, imageUrl, size = 38, className = '' }: { symbol: string; imageUrl?: string | null; size?: number; className?: string }) {
  const [broken, setBroken] = useState(false);
  const show = imageUrl && !broken;
  return (
    <span className={`db-token-mono db-meme-mono ${show ? 'has-img' : ''} ${className}`} style={{ width: size, height: size }}>
      {show
        ? <img src={imageUrl!} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} />
        : symbol.slice(0, 2)}
    </span>
  );
}

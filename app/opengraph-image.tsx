import { ImageResponse } from 'next/og';

export const alt = 'Daybreak — tokenized stocks find their people';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f7f7f2', color: '#101114', padding: '72px 78px', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: -100, top: -170, width: 580, height: 580, borderRadius: 999, background: '#0210ef' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 42, fontWeight: 800, color: '#0210ef' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: '#0210ef', transform: 'rotate(-8deg)', display: 'flex' }} />
        daybreak
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 900 }}>
        <div style={{ fontSize: 24, letterSpacing: 3, textTransform: 'uppercase', color: '#65697a', marginBottom: 22 }}>Stocks on Base · Circles · Pairing intelligence</div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 82, lineHeight: 0.96, letterSpacing: -5, fontWeight: 800 }}>
          <span>Tokenized stocks</span>
          <span>find their people.</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, color: '#65697a' }}>
        <span>daybreakcircles.lol</span>
        <span>discover · verify · gather</span>
      </div>
    </div>,
    size,
  );
}

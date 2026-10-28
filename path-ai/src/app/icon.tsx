import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: '#0A0A0A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid #F5C400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom: '7px solid #F5C400',
              transform: 'rotate(-35deg)',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}

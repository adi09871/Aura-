'use client';

interface Props {
  volume: number; // 0–100
}

export default function VolumeMeter({ volume }: Props) {
  return (
    <div className="flex items-end gap-[2px]" style={{ height: '22px' }}>
      {Array.from({ length: 20 }).map((_, i) => {
        const threshold = (i / 20) * 100;
        const active = volume > threshold;
        const color =
          i < 12 ? '#22d3ee' :
          i < 16 ? '#f59e0b' :
                   '#ef4444';
        return (
          <div
            key={i}
            style={{
              width: '3px',
              borderRadius: '1px',
              transition: 'height 80ms ease',
              height: active ? `${5 + i * 0.75}px` : '3px',
              background: active ? color : '#1e293b',
            }}
          />
        );
      })}
    </div>
  );
}

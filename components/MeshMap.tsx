'use client';

import { useEffect, useState } from 'react';

export interface MeshNode {
  id: string;
  x: number;
  y: number;
  label: string;
  status: 'online' | 'degraded' | 'offline';
  signal: number;
  isHQ?: boolean;
}

export interface MeshLink {
  from: string;
  to: string;
}

const STATUS_COLOR: Record<string, string> = {
  online:   '#22d3ee',
  degraded: '#f59e0b',
  offline:  '#374151',
};

interface Props {
  nodes: MeshNode[];
  links: MeshLink[];
}

export default function MeshMap({ nodes, links }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 800);
    return () => clearInterval(id);
  }, []);

  const getNode = (id: string) => nodes.find((n) => n.id === id)!;
  const isLinkOnline = (a: MeshNode, b: MeshNode) =>
    a.status === 'online' && b.status === 'online';

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" style={{ fontFamily: 'monospace' }}>
      <defs>
        <filter id="glow-cyan">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-amber">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id="hq-gradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Grid */}
      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
        <g key={v}>
          <line x1={v} y1="0" x2={v} y2="100" stroke="#1e293b" strokeWidth="0.3" />
          <line x1="0" y1={v} x2="100" y2={v} stroke="#1e293b" strokeWidth="0.3" />
        </g>
      ))}

      {/* Links */}
      {links.map(({ from, to }) => {
        const na = getNode(from);
        const nb = getNode(to);
        if (!na || !nb) return null;
        const on = isLinkOnline(na, nb);
        return (
          <line
            key={`${from}-${to}`}
            x1={na.x} y1={na.y}
            x2={nb.x} y2={nb.y}
            stroke={on ? '#22d3ee' : '#374151'}
            strokeWidth={on ? 0.5 : 0.3}
            strokeDasharray={on ? undefined : '1.5 1.5'}
            opacity={on ? 0.55 : 0.25}
          />
        );
      })}

      {/* Animated data packets on active links */}
      {links
        .filter(({ from, to }) => {
          const na = getNode(from);
          const nb = getNode(to);
          return na && nb && isLinkOnline(na, nb);
        })
        .map(({ from, to }, i) => {
          const na = getNode(from);
          const nb = getNode(to);
          const t = ((tick * 0.13 + i * 0.28) % 1);
          return (
            <circle
              key={`pkt-${from}-${to}`}
              cx={na.x + (nb.x - na.x) * t}
              cy={na.y + (nb.y - na.y) * t}
              r="0.7"
              fill="#22d3ee"
              opacity="0.9"
            />
          );
        })}

      {/* Nodes */}
      {nodes.map((n) => {
        const r = n.isHQ ? 3.2 : 2.2;
        return (
          <g key={n.id}>
            {n.isHQ && <circle cx={n.x} cy={n.y} r="10" fill="url(#hq-gradient)" />}

            {/* Pulse ring for online nodes */}
            {n.status === 'online' && (
              <circle
                cx={n.x} cy={n.y}
                r={n.isHQ ? 6 : 4}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="0.4"
                opacity={0.15 + 0.5 * Math.abs(Math.sin(tick * 0.4 + n.x))}
              />
            )}

            <circle
              cx={n.x} cy={n.y} r={r}
              fill={n.isHQ ? '#22d3ee' : n.status === 'offline' ? '#0f172a' : 'transparent'}
              stroke={STATUS_COLOR[n.status]}
              strokeWidth={n.isHQ ? 1.3 : 0.9}
              filter={
                n.status === 'online' ? 'url(#glow-cyan)' :
                n.status === 'degraded' ? 'url(#glow-amber)' : undefined
              }
            />

            <text x={n.x + r + 1} y={n.y + 1} fontSize="2.6" fill="#94a3b8">{n.label}</text>
            <text x={n.x + r + 1} y={n.y + 4.2} fontSize="2" fill={STATUS_COLOR[n.status]}>{n.signal}%</text>
          </g>
        );
      })}

      {/* Legend */}
      {(['online', 'degraded', 'offline'] as const).map((s, i) => (
        <g key={s} transform={`translate(2,${87 + i * 4.2})`}>
          <circle cx="1.2" cy="1.2" r="1.2" fill={STATUS_COLOR[s]} />
          <text x="4" y="2.8" fontSize="2.4" fill="#475569">{s}</text>
        </g>
      ))}

      {/* Timestamp */}
      <text x="98" y="99" fontSize="2.2" fill="#1e293b" textAnchor="end">SECTOR-7G</text>
    </svg>
  );
}

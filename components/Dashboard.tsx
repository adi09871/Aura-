'use client';

import { useEffect, useState } from 'react';
import MeshMap, { type MeshNode, type MeshLink } from './MeshMap';
import AcousticAlertFeed from './AcousticAlertFeed';
import SOSFeed from './SOSFeed';

const NODES: MeshNode[] = [
  { id: 'N01', x: 18, y: 28, label: 'Alpha',   status: 'online',   signal: 92 },
  { id: 'N02', x: 55, y: 16, label: 'Bravo',   status: 'online',   signal: 87 },
  { id: 'N03', x: 81, y: 43, label: 'Charlie', status: 'degraded', signal: 34 },
  { id: 'N04', x: 67, y: 73, label: 'Delta',   status: 'online',   signal: 78 },
  { id: 'N05', x: 28, y: 68, label: 'Echo',    status: 'offline',  signal: 0  },
  { id: 'N06', x: 46, y: 45, label: 'HQ',      status: 'online',   signal: 99, isHQ: true },
];

const LINKS: MeshLink[] = [
  { from: 'N06', to: 'N01' },
  { from: 'N06', to: 'N02' },
  { from: 'N06', to: 'N04' },
  { from: 'N01', to: 'N02' },
  { from: 'N02', to: 'N03' },
  { from: 'N04', to: 'N03' },
];

const STATUS_COLOR: Record<string, string> = {
  online:   '#22d3ee',
  degraded: '#f59e0b',
  offline:  '#374151',
};

function formatTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function Dashboard() {
  const [time, setTime]     = useState('');
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setTime(formatTime());
    const clock = setInterval(() => setTime(formatTime()), 1000);
    setOnline(navigator.onLine);
    const onOn  = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    return () => {
      clearInterval(clock);
      window.removeEventListener('online', onOn);
      window.removeEventListener('offline', onOff);
    };
  }, []);

  const onlineCount   = NODES.filter((n) => n.status === 'online').length;
  const degradedCount = NODES.filter((n) => n.status === 'degraded').length;
  const offlineCount  = NODES.filter((n) => n.status === 'offline').length;

  return (
    <div
      className="min-h-screen flex flex-col gap-2.5 p-3"
      style={{
        background: 'radial-gradient(ellipse at top left, #0a0f1a 0%, #020617 75%)',
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      }}
    >
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-[#0f172a] border border-[#1e293b] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative w-2.5 h-2.5">
            <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-40" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 8px #22d3ee' }} />
          </div>
          <span className="text-cyan-400 text-lg font-bold tracking-[0.3em]">
            AURA<span className="text-slate-500">MESH</span>
          </span>
          <span className="text-[10px] text-slate-700 border border-[#1e293b] rounded px-2 py-0.5">v2.4.1</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: online ? '#34d399' : '#ef4444',
                boxShadow: `0 0 6px ${online ? '#34d399' : '#ef4444'}`,
                animation: online ? undefined : 'pulse 1s infinite',
              }}
            />
            <span
              className="text-[11px] tracking-widest"
              style={{ color: online ? '#34d399' : '#f87171' }}
            >
              {online ? 'UPLINK ACTIVE' : 'OFFLINE MODE'}
            </span>
          </div>
          <span className="text-slate-400 text-sm tabular-nums">{time}</span>
          <span className="text-[10px] text-slate-700 border-l border-[#1e293b] pl-4">
            OPS CENTER // ALPHA
          </span>
        </div>
      </header>

      {/* ── BODY GRID ── */}
      <div className="flex-1 grid gap-2.5" style={{ gridTemplateColumns: '5fr 7fr', minHeight: 'calc(100vh - 100px)' }}>

        {/* ── LEFT: MESH MAP ── */}
        <div className="flex flex-col gap-2.5">
          <div
            className="flex-1 flex flex-col gap-3 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4"
            style={{ boxShadow: '0 0 30px rgba(34,211,238,0.04)' }}
          >
            {/* Title */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-cyan-400 rounded" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase">
                  Local Mesh Network
                </span>
              </div>
              <span className="text-[10px] text-cyan-600">
                {onlineCount}/{NODES.length} NODES · 2.4GHz
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                ['ONLINE',   onlineCount,   '#22d3ee'],
                ['DEGRADED', degradedCount, '#f59e0b'],
                ['OFFLINE',  offlineCount,  '#475569'],
              ].map(([label, val, color]) => (
                <div key={label as string} className="bg-[#020617] border border-[#1e293b] rounded-lg p-2.5">
                  <div className="text-2xl font-bold tabular-nums" style={{ color: color as string }}>{val}</div>
                  <div className="text-[9px] font-bold tracking-[0.2em] text-slate-600 uppercase mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Map */}
            <div
              className="flex-1 bg-[#020617] border border-[#1e293b]/50 rounded-lg overflow-hidden relative"
              style={{ minHeight: '220px' }}
            >
              <div className="absolute inset-0 p-3">
                <MeshMap nodes={NODES} links={LINKS} />
              </div>
            </div>

            {/* Node table */}
            <div>
              {NODES.filter((n) => !n.isHQ).map((n) => (
                <div key={n.id} className="flex items-center gap-3 text-[11px] py-1.5 border-b border-[#1e293b]/40 last:border-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: STATUS_COLOR[n.status] }}
                  />
                  <span className="text-slate-600 w-8">{n.id}</span>
                  <span className="text-slate-400 flex-1">{n.label}</span>
                  <div className="w-20 h-1 bg-[#1e293b] rounded-full">
                    <div
                      className="h-1 rounded-full transition-all"
                      style={{ width: `${n.signal}%`, background: STATUS_COLOR[n.status] }}
                    />
                  </div>
                  <span className="text-slate-600 w-8 text-right tabular-nums">{n.signal}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: ALERTS + SOS ── */}
        <div className="flex flex-col gap-2.5">
          <div style={{ flex: '0 0 auto' }}>
            <AcousticAlertFeed />
          </div>
          <div className="flex-1 flex flex-col">
            <SOSFeed />
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="flex items-center justify-between text-[10px] text-slate-800 px-1">
        <span>AURAMESH EMERGENCY COMMAND // OFFLINE-FIRST ARCHITECTURE</span>
        <div className="flex items-center gap-4">
          <span>Dexie.js IndexedDB ✓</span>
          <span>WebAudio API ✓</span>
          <span>TensorFlow.js skeleton ✓</span>
        </div>
      </footer>
    </div>
  );
}
